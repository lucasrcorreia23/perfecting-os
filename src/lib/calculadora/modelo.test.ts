import { describe, expect, it } from "vitest";
import { cenarioDefault, entradasVazias, estadoInicial } from "@/lib/calculadora/estado";
import {
  assentosEfetivos,
  computarModelo,
  parseResumo,
  resumo,
} from "@/lib/calculadora/modelo";
import type { EntradasTime, EstadoCalculadora, EstadoTime } from "@/lib/calculadora/types";

function entradasGolden(): EntradasTime {
  return {
    ...entradasVazias(),
    numVendedores: 30,
    numGestoresTreino: 3,
    horasTreinoGestorMes: 20,
    vendedoresPorGestorMes: 6,
    horasPraticaPorRepHoje: 1.5,
    receitaMensal: 900_000,
    ticketMedio: 15_000,
    conversaoPct: 25,
    margemPct: 30,
    salarioGestor: 12_000,
    rampaMeses: 4,
    contratacoesAno: 8,
    caminho: "gestores",
  };
}

function timeGolden(sobrescreve: Partial<EstadoTime> = {}): EstadoTime {
  return {
    id: "t1",
    nome: "Time 1",
    // assentos null = default (o time inteiro) — igual ao caso §14.
    proposta: { plano: "pratica", assentos: null },
    entradas: entradasGolden(),
    cenarioSel: cenarioDefault(),
    ...sobrescreve,
  };
}

function estadoGolden(sobrescreve: Partial<EstadoCalculadora> = {}): EstadoCalculadora {
  return { v: 2, prazoMeses: 3, times: [timeGolden()], ...sobrescreve };
}

describe("assentos efetivos (default = o time inteiro)", () => {
  it("sem escolha, os assentos são os vendedores do time", () => {
    expect(assentosEfetivos(timeGolden())).toBe(30);
  });

  it("a escolha do visitante manda", () => {
    expect(
      assentosEfetivos(timeGolden({ proposta: { plano: "pratica", assentos: 12 } })),
    ).toBe(12);
  });

  it("sem vendedores declarados não existe número (P6 — travessão, não zero)", () => {
    const vazio = timeGolden({ entradas: entradasVazias() });
    expect(assentosEfetivos(vazio)).toBeNull();
  });

  it("vendedores fracionários arredondam para um assento inteiro", () => {
    const time = timeGolden({
      entradas: { ...entradasGolden(), numVendedores: 12.4 },
    });
    expect(assentosEfetivos(time)).toBe(12);
  });
});

describe("computarModelo — golden §14 com a proposta escolhida pelo visitante", () => {
  it("com o default (30 assentos, Padrão, 3 meses) fecha 1,951× e 6,15 meses", () => {
    const modelo = computarModelo(estadoGolden());
    expect(modelo.preco.horasMes).toBe(120);
    expect(modelo.preco.mensal).toBe(13_000);
    expect(modelo.prazoMeses).toBe(3);
    const time = modelo.times[0];
    expect(time.assentosDefault).toBe(true);
    expect(time.proposta).toEqual({ plano: "pratica", assentos: 30 });
    if (time.resultado.status !== "ok") throw new Error("deveria estar completo");
    expect(time.resultado.valorAno).toBeCloseTo(304_380, 4);
    expect(time.resultado.roi).toBeCloseTo(304_380 / 156_000, 6);
    expect(time.resultado.paybackMeses).toBeCloseTo((156_000 / 304_380) * 12, 6);
  });

  it("escolher assentos explícitos dá o mesmo resultado do default equivalente", () => {
    const explicito = computarModelo(
      estadoGolden({
        times: [timeGolden({ proposta: { plano: "pratica", assentos: 30 } })],
      }),
    );
    const time = explicito.times[0];
    expect(time.assentosDefault).toBe(false);
    if (time.resultado.status !== "ok") throw new Error("deveria estar completo");
    expect(time.resultado.roi).toBeCloseTo(304_380 / 156_000, 6);
  });

  it("mudar o plano muda horas, preço e ROI (o visitante sente na hora)", () => {
    const intensivo = computarModelo(
      estadoGolden({
        times: [timeGolden({ proposta: { plano: "intensivo", assentos: null } })],
      }),
    );
    expect(intensivo.preco.horasMes).toBe(240); // 30 × 8 h
    expect(intensivo.preco.mensal).toBe(240 * 98); // acima do piso
    const time = intensivo.times[0];
    if (time.resultado.status !== "ok") throw new Error("deveria estar completo");
    expect(time.resultado.precoAno).toBeCloseTo(240 * 98 * 12, 4);
  });

  it("reduzir assentos nunca aumenta o ROI (trava de cobertura no novo shape)", () => {
    let roiAnterior = -Infinity;
    for (let assentos = 1; assentos <= 30; assentos += 1) {
      const modelo = computarModelo(
        estadoGolden({
          times: [timeGolden({ proposta: { plano: "pratica", assentos } })],
        }),
      );
      const time = modelo.times[0];
      if (time.resultado.status !== "ok") throw new Error("deveria estar completo");
      expect(time.resultado.roi).toBeGreaterThanOrEqual(roiAnterior - 1e-9);
      roiAnterior = time.resultado.roi;
    }
  });

  it("time sem vendedores fica incompleto sem quebrar o preço da conta", () => {
    const modelo = computarModelo(
      estadoGolden({
        times: [timeGolden(), { ...timeGolden({ id: "t2" }), entradas: entradasVazias() }],
      }),
    );
    expect(modelo.preco.horasMes).toBe(120); // só o time resolvido entra
    expect(modelo.times[1].resultado.status).toBe("incompleto");
    expect(modelo.consolidado.status).toBe("incompleto");
  });

  it("estado inicial (nada preenchido) não produz NaN em lugar nenhum", () => {
    const modelo = computarModelo(estadoInicial());
    expect(modelo.preco.horasMes).toBe(0);
    expect(Number.isFinite(modelo.preco.mensal)).toBe(true);
    expect(modelo.times[0].resultado.status).toBe("incompleto");
  });
});

describe("assentos travados no tamanho do time (Excel Engine!C19)", () => {
  it("escolher mais assentos que vendedores não passa do time", () => {
    const time = timeGolden({ proposta: { plano: "pratica", assentos: 45 } });
    expect(assentosEfetivos(time)).toBe(30);
  });

  it("sem vendedores declarados a escolha passa — o gating barra o resultado", () => {
    const time = timeGolden({
      proposta: { plano: "pratica", assentos: 45 },
      entradas: entradasVazias(),
    });
    expect(assentosEfetivos(time)).toBe(45);
    expect(computarModelo(estadoGolden({ times: [time] })).times[0].resultado.status).toBe(
      "incompleto",
    );
  });

  it("comprar além do time não muda preço, valor nem ROI", () => {
    const noLimite = computarModelo(
      estadoGolden({ times: [timeGolden({ proposta: { plano: "intensivo", assentos: 30 } })] }),
    );
    const acima = computarModelo(
      estadoGolden({ times: [timeGolden({ proposta: { plano: "intensivo", assentos: 45 } })] }),
    );
    expect(acima.preco.horasMes).toBe(noLimite.preco.horasMes);
    expect(acima.preco.mensal).toBe(noLimite.preco.mensal);
    expect(acima.times[0].proposta.assentos).toBe(30);
    expect(acima.times[0].assentosLimitados).toBe(true);
    expect(noLimite.times[0].assentosLimitados).toBe(false);
    const a = acima.times[0].resultado;
    const b = noLimite.times[0].resultado;
    if (a.status !== "ok" || b.status !== "ok") throw new Error("deveriam estar completos");
    expect(a.roi).toBeCloseTo(b.roi, 10);
    expect(a.valorAno).toBeCloseTo(b.valorAno, 10);
  });
});

describe("preço só sobre times completos (Excel Account!C13 = SUM(Engine!C20:L20))", () => {
  const soloIntensivo = () =>
    estadoGolden({ times: [timeGolden({ proposta: { plano: "intensivo", assentos: null } })] });

  // Time 2 tem assentos resolvíveis (vendedores declarados) e nada mais: no
  // Excel, C20 fica vazio e ele não soma horas na conta.
  const irmaoPelaMetade = () => ({
    ...timeGolden({ id: "t2" }),
    entradas: { ...entradasVazias(), numVendedores: 50 },
    proposta: { plano: "pratica" as const, assentos: null },
  });

  it("irmão incompleto não entra no volume do tier nem no rateio", () => {
    const solo = computarModelo(soloIntensivo());
    const comIrmao = computarModelo(
      estadoGolden({
        times: [
          timeGolden({ proposta: { plano: "intensivo", assentos: null } }),
          irmaoPelaMetade(),
        ],
      }),
    );
    expect(solo.preco.horasMes).toBe(240);
    expect(comIrmao.preco.horasMes).toBe(240);
    expect(comIrmao.preco.mensal).toBe(solo.preco.mensal);
    expect(comIrmao.times[1].precoMes).toBe(0);
    expect(comIrmao.times[1].resultado.status).toBe("incompleto");
    const a = comIrmao.times[0].resultado;
    const b = solo.times[0].resultado;
    if (a.status !== "ok" || b.status !== "ok") throw new Error("time 1 deveria fechar");
    // O ROI do time que já fechou não se mexe pelo que o vizinho digitou.
    expect(a.roi).toBeCloseTo(b.roi, 10);
    expect(comIrmao.times[0].precoMes).toBeCloseTo(solo.times[0].precoMes, 6);
  });

  it("com nenhum time completo, o preço é prévia de todos os assentos", () => {
    const modelo = computarModelo(
      estadoGolden({
        times: [
          { ...timeGolden(), entradas: { ...entradasVazias(), numVendedores: 30 } },
          irmaoPelaMetade(),
        ],
      }),
    );
    // 30 × 4 + 50 × 4 = 320 h — nenhum ROI depende desse número.
    expect(modelo.preco.horasMes).toBe(320);
    expect(modelo.times.every((time) => time.resultado.status === "incompleto")).toBe(true);
  });

  it("quando o irmão fecha, ele entra na conta e a taxa cai para os dois", () => {
    const completo = computarModelo(
      estadoGolden({
        times: [
          timeGolden({ proposta: { plano: "intensivo", assentos: null } }),
          {
            ...timeGolden({ id: "t2" }),
            entradas: { ...entradasGolden(), numVendedores: 50 },
            proposta: { plano: "pratica", assentos: null },
          },
        ],
      }),
    );
    expect(completo.preco.horasMes).toBe(440); // 240 + 200
    expect(completo.times[1].precoMes).toBeGreaterThan(0);
    expect(completo.consolidado.status).toBe("ok");
    // Rateio por horas: a soma das partes fecha o mensal da conta.
    const soma = completo.times.reduce((total, time) => total + time.precoMes, 0);
    expect(soma).toBeCloseTo(completo.preco.mensal, 2);
  });
});

describe("resumo (cache da listagem interna)", () => {
  it("carrega a proposta que o visitante montou, além do resultado", () => {
    const r = resumo(estadoGolden({ prazoMeses: 12 }));
    expect(r.v).toBe(2);
    expect(r.progresso).toEqual({ preenchidos: 13, total: 13 });
    expect(r.proposta).toEqual({ prazoMeses: 12, horasMes: 120, mensal: 13_000 });
    expect(r.times[0]).toMatchObject({ plano: "pratica", assentos: 30, status: "ok" });
    expect(r.times[0].roi).toBeCloseTo(304_380 / 156_000, 6);
    expect(r.consolidado?.roi).toBeCloseTo(304_380 / 156_000, 6);
  });

  it("estado vazio produz travessões (nulls) e consolidado nulo", () => {
    const r = resumo(estadoInicial());
    expect(r.times[0].status).toBe("incompleto");
    expect(r.times[0].roi).toBeNull();
    expect(r.times[0].assentos).toBeNull();
    expect(r.consolidado).toBeNull();
  });

  it("parseResumo aceita só o formato corrente", () => {
    expect(parseResumo(resumo(estadoGolden()))).not.toBeNull();
    expect(parseResumo({ v: 1, times: [] })).toBeNull();
    expect(parseResumo(null)).toBeNull();
    expect(parseResumo("x")).toBeNull();
  });
});

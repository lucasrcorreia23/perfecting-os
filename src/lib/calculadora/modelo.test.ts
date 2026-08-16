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
    margemFaixa: "25a35",
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
  it("com o default (30 assentos, Prática, 3 meses) fecha 1,951× e 6,15 meses", () => {
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

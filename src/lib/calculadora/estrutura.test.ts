import { describe, expect, it } from "vitest";
import { fatorEscopoDeclarado } from "./calc";
import { entradasVazias, progresso } from "./estado";
import { aplicarEstrutura, estruturaVazia, pesosPorTime } from "./estrutura";
import { computarModelo } from "./modelo";
import type { EntradasTime, EstadoCalculadora, EstadoTime } from "./types";

// Estrutura de capacitação compartilhada (§4.11): o rateio existe para impedir
// que N times atendidos pelos mesmos gestores contem a mesma economia N vezes.

const BASE: EntradasTime = {
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

function time(id: string, patch: Partial<EntradasTime> = {}): EstadoTime {
  return {
    id,
    nome: id,
    proposta: { plano: "pratica", assentos: null },
    entradas: { ...BASE, ...patch },
    cenarioSel: { modo: "preset", cenario: "conservador" },
  };
}

// Três times de tamanhos diferentes atendidos pela MESMA estrutura: 3 gestores,
// 20 h cada, salário 12.000, caminho "gestores".
function contaCompartilhada(): EstadoCalculadora {
  return {
    v: 2,
    prazoMeses: 3,
    estrutura: {
      ...estruturaVazia(),
      ativa: true,
      numGestoresTreino: 3,
      horasTreinoGestorMes: 20,
      vendedoresPorGestorMes: 6,
      salarioGestor: 12_000,
      caminho: "gestores",
    },
    times: [
      time("a", { numVendedores: 30, receitaMensal: 900_000 }),
      time("b", { numVendedores: 15, receitaMensal: 450_000 }),
      time("c", { numVendedores: 15, receitaMensal: 450_000 }),
    ],
  };
}

describe("pesos do rateio", () => {
  it("peso é a fração de vendedores do time na conta", () => {
    const pesos = pesosPorTime(contaCompartilhada());
    expect(pesos.get("a")).toBeCloseTo(0.5, 10);
    expect(pesos.get("b")).toBeCloseTo(0.25, 10);
    expect(pesos.get("c")).toBeCloseTo(0.25, 10);
  });

  it("time sem vendedores declarados fica com peso 0 (gating resolve o resto)", () => {
    const estado = contaCompartilhada();
    estado.times.push(time("d", { numVendedores: null }));
    expect(pesosPorTime(estado).get("d")).toBe(0);
  });

  it("conta sem nenhum vendedor não gera NaN", () => {
    const estado = contaCompartilhada();
    estado.times = estado.times.map((t) => ({
      ...t,
      entradas: { ...t.entradas, numVendedores: null },
    }));
    for (const peso of pesosPorTime(estado).values()) expect(peso).toBe(0);
  });
});

describe("o que rateia e o que passa inalterado (§4.11)", () => {
  it("gestores são rateados por peso e somam exatamente o declarado", () => {
    const { times } = aplicarEstrutura(contaCompartilhada());
    expect(times.map((t) => t.entradas.numGestoresTreino)).toEqual([1.5, 0.75, 0.75]);
    const soma = times.reduce((total, t) => total + t.entradas.numGestoresTreino!, 0);
    expect(soma).toBeCloseTo(3, 10);
  });

  it("horas por gestor, vendedores por gestor e salário passam inalterados", () => {
    const { times } = aplicarEstrutura(contaCompartilhada());
    for (const t of times) {
      expect(t.entradas.horasTreinoGestorMes).toBe(20);
      expect(t.entradas.vendedoresPorGestorMes).toBe(6);
      expect(t.entradas.salarioGestor).toBe(12_000);
      expect(t.entradas.caminho).toBe("gestores");
    }
  });

  it("custos do contrafactual são rateados e somam o declarado", () => {
    const estado = contaCompartilhada();
    estado.estrutura = {
      ...estado.estrutura!,
      caminho: "externo",
      custoExternoAno: 200_000,
    };
    const { times } = aplicarEstrutura(estado);
    expect(times.map((t) => t.entradas.custoExternoAno)).toEqual([100_000, 50_000, 50_000]);
  });

  it("características do time não são tocadas", () => {
    const { times } = aplicarEstrutura(contaCompartilhada());
    expect(times[0].entradas.horasPraticaPorRepHoje).toBe(1.5);
    expect(times[0].entradas.numVendedores).toBe(30);
    expect(times[1].entradas.receitaMensal).toBe(450_000);
  });

  it("o fator de escopo é invariante ao rateio (gestores cancela na fração)", () => {
    const estado = contaCompartilhada();
    const semRateio = fatorEscopoDeclarado(estado.times[0].entradas);
    const comRateio = fatorEscopoDeclarado(aplicarEstrutura(estado).times[0].entradas);
    expect(comRateio.valor).toBeCloseTo(semRateio.valor, 12);
    expect(comRateio.origem).toBe(semRateio.origem);
  });

  it("desligada, ou com um time só, o estado passa intacto", () => {
    const estado = contaCompartilhada();
    estado.estrutura = { ...estado.estrutura!, ativa: false };
    expect(aplicarEstrutura(estado)).toBe(estado);

    const umTime: EstadoCalculadora = { ...contaCompartilhada(), times: [time("a")] };
    expect(aplicarEstrutura(umTime)).toBe(umTime);
  });
});

describe("efeito no cálculo — a divergência que motivou o rateio", () => {
  it("não multiplica a eficiência: a conta compartilhada gasta o que um time gastaria", () => {
    const compartilhada = computarModelo(contaCompartilhada());
    const somaCompartilhada = compartilhada.times.reduce(
      (total, t) => total + (t.resultado.status === "ok" ? t.resultado.eficienciaAno : 0),
      0,
    );

    // Mesma estrutura declarada inteira em cada time (o comportamento antigo).
    const semRateio = computarModelo({ ...contaCompartilhada(), estrutura: undefined });
    const somaSemRateio = semRateio.times.reduce(
      (total, t) => total + (t.resultado.status === "ok" ? t.resultado.eficienciaAno : 0),
      0,
    );

    expect(somaSemRateio / somaCompartilhada).toBeCloseTo(3, 6);
  });

  it("consolidado segue ponderado e com números defensáveis", () => {
    const modelo = computarModelo(contaCompartilhada());
    expect(modelo.consolidado.status).toBe("ok");
    if (modelo.consolidado.status !== "ok") return;
    expect(modelo.consolidado.roi).toBeGreaterThan(0);
    expect(Number.isFinite(modelo.consolidado.roi)).toBe(true);
    expect(modelo.consolidado.totalVendedores).toBe(60);
  });

  it("progresso conta os campos compartilhados como preenchidos em todos os times", () => {
    const estado = contaCompartilhada();
    // Zera nos times o que agora vem da estrutura: o preenchimento não regride.
    estado.times = estado.times.map((t) => ({
      ...t,
      entradas: {
        ...t.entradas,
        numGestoresTreino: null,
        horasTreinoGestorMes: null,
        vendedoresPorGestorMes: null,
        salarioGestor: null,
        caminho: null,
      },
    }));
    const prog = progresso(estado);
    expect(prog.porTime.every((t) => t.completo)).toBe(true);
  });
});

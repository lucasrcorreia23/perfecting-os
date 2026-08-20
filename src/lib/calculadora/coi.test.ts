import { describe, expect, it } from "vitest";
import { calcResultadoTime, type PropostaEfetiva } from "@/lib/calculadora/calc";
import { calcCoi } from "@/lib/calculadora/coi";
import { entradasVazias } from "@/lib/calculadora/estado";
import { rateioPorTime } from "@/lib/calculadora/preco";
import type { CenarioSelecionado, DimensaoCoiId, EntradasTime } from "@/lib/calculadora/types";

const CONSERVADOR: CenarioSelecionado = { modo: "preset", cenario: "conservador" };

// Mesmas entradas dos goldens de `calc.test.ts` — o COI é lido sobre os casos
// que o motor já tem pinados, e não sobre um caso próprio que pudesse derivar.
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

function entradasFiesc(): EntradasTime {
  return {
    ...entradasVazias(),
    numVendedores: 100,
    numGestoresTreino: 6,
    horasTreinoGestorMes: 20,
    vendedoresPorGestorMes: 17,
    horasPraticaPorRepHoje: 2,
    receitaMensal: 750_000,
    ticketMedio: 50_000,
    conversaoPct: 15,
    margemPct: 25,
    salarioGestor: 10_000,
    rampaMeses: 4,
    contratacoesAno: 10,
    caminho: "gestores",
    cicloDias: 60,
    leadsMes: 120,
  };
}

const PROPOSTA_GOLDEN: PropostaEfetiva = { plano: "pratica", assentos: 30 };
const PROPOSTA_FIESC: PropostaEfetiva = { plano: "intensivo", assentos: 100 };

function resultadoDe(entradas: EntradasTime, proposta: PropostaEfetiva, prazoMeses = 3) {
  const precoMes = rateioPorTime([{ id: "t1", ...proposta }]).get("t1")!;
  const r = calcResultadoTime(entradas, proposta, precoMes, CONSERVADOR, prazoMeses);
  if (r.status !== "ok") throw new Error("golden deveria estar completo");
  return r;
}

function coiGolden(entradas = entradasGolden()) {
  return calcCoi(entradas, resultadoDe(entradas, PROPOSTA_GOLDEN));
}

function coiFiesc() {
  const entradas = entradasFiesc();
  return calcCoi(entradas, resultadoDe(entradas, PROPOSTA_FIESC));
}

function dim(coi: ReturnType<typeof calcCoi>, id: DimensaoCoiId) {
  const linha = coi.dimensoes.find((d) => d.id === id);
  if (!linha) throw new Error(`dimensão ${id} sumiu`);
  return linha.valorAno;
}

describe("cobertura e capacidade respondem perguntas diferentes", () => {
  it("§14: as horas existem, mas não viram prática", () => {
    const { cobertura, capacidade } = coiGolden();
    // 6 vendedores/gestor × 3 gestores × 1,5 h = 27 h chegam ao time.
    expect(cobertura.horasEntreguesMes).toBe(27);
    expect(cobertura.horasNecessariasMes).toBe(60); // 30 vendedores × 2 h
    expect(cobertura.pctAtendida).toBeCloseTo(0.45, 10);
    expect(cobertura.vendedoresNaoAtendidos).toBeCloseTo(16.5, 10);
    // O gestor TEM as 60 h — o problema é escopo, não capacidade. É a leitura
    // que a planilha embaralha ao medir a Dimensão 1 em cabeças (E-31).
    expect(capacidade.horasDisponiveisMes).toBe(60);
    expect(capacidade.gapHorasMes).toBe(0);
    expect(capacidade.pctNaoAtendida).toBe(0);
  });

  it("FIESC: a prática chega inteira, mas o gestor não tem as horas", () => {
    const { cobertura, capacidade } = coiFiesc();
    expect(cobertura.horasEntreguesMes).toBe(204); // 17 × 6 × 2
    expect(cobertura.horasNecessariasMes).toBe(200);
    expect(cobertura.pctAtendida).toBe(1); // clampado: 102% não vira crédito
    expect(cobertura.vendedoresNaoAtendidos).toBe(0);
    expect(capacidade.horasDisponiveisMes).toBe(120); // 6 × 20
    expect(capacidade.gapHorasMes).toBe(80);
    expect(capacidade.pctNaoAtendida).toBeCloseTo(0.4, 10);
  });
});

describe("golden §14 — sem salário do vendedor", () => {
  it("as três dimensões que não dependem do salário", () => {
    const coi = coiGolden();
    // 30.000/vendedor × (0,29 × 0,5) × 16,5 × 12 × 0,30
    expect(dim(coi, "subperformance")).toBeCloseTo(258_390, 4);
    // (1,4 × 0,5) × 8 contratações × (30.000 × 0,5) × 0,30
    expect(dim(coi, "rampa_estendida")).toBeCloseTo(25_200, 4);
    // 60 deals/mês × 0,5 × 0,2 × 15.000 × 12 × 0,30
    expect(dim(coi, "no_decision")).toBeCloseTo(324_000, 4);
  });

  it("turnover e fila viram travessão, nunca zero", () => {
    const coi = coiGolden();
    expect(dim(coi, "turnover")).toBeNull();
    expect(dim(coi, "fila")).toBeNull();
  });

  it("o total vai CONTRA o valor do programa, nunca somado a ele", () => {
    const coi = coiGolden();
    expect(coi.totalAno).toBeCloseTo(607_590, 4);
    expect(coi.recuperadoAno).toBeCloseTo(304_380, 4); // = valorAno do §14
    expect(coi.residualAno).toBeCloseTo(303_210, 4);
    expect(coi.pctRecuperado).toBeCloseTo(0.5009628203229152, 10);
    // total − recuperado === residual: não existe soma em lugar nenhum.
    expect(coi.totalAno - coi.recuperadoAno).toBeCloseTo(coi.residualAno, 4);
  });

  it("passa na régua dos 25% da margem anual", () => {
    const coi = coiGolden();
    expect(coi.checagemPct).toBeCloseTo(18.752777777777776, 8);
    expect(coi.checagemAlerta).toBe(false);
  });
});

describe("golden §14 — com salário do vendedor", () => {
  const comSalario = () => ({ ...entradasGolden(), salarioVendedor: 6_000 });

  it("turnover trava nas contratações do ano e só conta quem não é atendido", () => {
    const coi = coiGolden(comSalario());
    // 16,5 não atendidos × 0,40 p.p. × 0,5 = 3,3 saídas — abaixo das 8
    // contratações, então a trava não morde aqui. 3,3 × (6.000 × 1,75 × 12).
    expect(dim(coi, "turnover")).toBeCloseTo(415_800, 4);
  });

  it("fila usa o custo-hora do vendedor e carrega o haircut", () => {
    // 16,5 × 2 semanas × 0,5 h × (6.000 × 1,75 / 200) × 12 × 0,5
    expect(dim(coiGolden(comSalario()), "fila")).toBeCloseTo(5_197.5, 4);
  });

  it("a lacuna maior dispara o aviso de coerência", () => {
    const coi = coiGolden(comSalario());
    expect(coi.totalAno).toBeCloseTo(1_028_587.5, 4);
    expect(coi.checagemPct).toBeCloseTo(31.74652777777778, 8);
    expect(coi.checagemAlerta).toBe(true);
  });

  it("a trava das contratações morde quando a rotatividade atribuída passa delas", () => {
    // 100 não atendidos dariam 100 × 0,4 × 0,5 = 20 saídas; com 5 contratações
    // no ano, o teto é 5. Ninguém perde mais gente do que repõe.
    const entradas: EntradasTime = {
      ...entradasGolden(),
      numVendedores: 100,
      numGestoresTreino: 0,
      vendedoresPorGestorMes: 0,
      horasPraticaPorRepHoje: 0,
      contratacoesAno: 5,
      salarioVendedor: 6_000,
    };
    const coi = calcCoi(entradas, resultadoDe(entradas, PROPOSTA_GOLDEN));
    expect(coi.cobertura.vendedoresNaoAtendidos).toBe(100);
    expect(dim(coi, "turnover")).toBeCloseTo(5 * 6_000 * 1.75 * 12, 4);
  });
});

describe("golden FIESC", () => {
  it("cobertura cheia zera as duas dimensões que dependem dela", () => {
    const coi = coiFiesc();
    expect(dim(coi, "subperformance")).toBe(0);
    expect(dim(coi, "fila")).toBeNull(); // sem salário do vendedor
  });

  it("sobram rampa e no decision", () => {
    const coi = coiFiesc();
    expect(dim(coi, "rampa_estendida")).toBeCloseTo(6_562.5, 4);
    expect(dim(coi, "no_decision")).toBeCloseTo(225_000, 4);
    expect(coi.totalAno).toBeCloseTo(231_562.5, 4);
  });

  it("o programa cobre a lacuna inteira: residual zero, nunca negativo", () => {
    const coi = coiFiesc();
    expect(coi.recuperadoAno).toBeCloseTo(231_562.5, 4); // travado no total
    expect(coi.residualAno).toBe(0);
    expect(coi.pctRecuperado).toBe(1);
  });
});

describe("invariantes do módulo", () => {
  it("nenhuma dimensão é negativa, nem com cobertura acima do mínimo", () => {
    for (const coi of [coiGolden(), coiFiesc()]) {
      for (const d of coi.dimensoes) {
        if (d.valorAno !== null) expect(d.valorAno).toBeGreaterThanOrEqual(0);
      }
      expect(coi.totalAno).toBeGreaterThanOrEqual(0);
      expect(coi.residualAno).toBeGreaterThanOrEqual(0);
      expect(coi.pctRecuperado).toBeLessThanOrEqual(1);
    }
  });

  it("as cinco dimensões existem sempre, na mesma ordem", () => {
    const ordem: DimensaoCoiId[] = [
      "subperformance",
      "rampa_estendida",
      "turnover",
      "no_decision",
      "fila",
    ];
    for (const coi of [coiGolden(), coiFiesc()]) {
      expect(coi.dimensoes.map((d) => d.id)).toEqual(ordem);
    }
  });

  // O COI é leitura contrafactual; o ROI é atribuição. Invariante 1 do V5: ler
  // um não pode mexer no outro. Espelha o teste do invariante 4 da trajetória.
  it("calcular o COI não altera ROI, payback nem valor do ano", () => {
    for (const [entradas, proposta] of [
      [entradasGolden(), PROPOSTA_GOLDEN],
      [entradasFiesc(), PROPOSTA_FIESC],
    ] as const) {
      const antes = resultadoDe(entradas, proposta);
      const snapshot = {
        roi: antes.roi,
        paybackMeses: antes.paybackMeses,
        valorAno: antes.valorAno,
        G: antes.G,
        eficienciaAno: antes.eficienciaAno,
      };
      calcCoi(entradas, antes);
      expect({
        roi: antes.roi,
        paybackMeses: antes.paybackMeses,
        valorAno: antes.valorAno,
        G: antes.G,
        eficienciaAno: antes.eficienciaAno,
      }).toEqual(snapshot);
    }
  });

  it("o total é a soma das dimensões preenchidas, e travessão não vira zero na conta", () => {
    const coi = coiGolden();
    const soma = coi.dimensoes.reduce((s, d) => s + (d.valorAno ?? 0), 0);
    expect(coi.totalAno).toBeCloseTo(soma, 6);
    expect(coi.dimensoes.filter((d) => d.valorAno === null)).toHaveLength(2);
  });
});

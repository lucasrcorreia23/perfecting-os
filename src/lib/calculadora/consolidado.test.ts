import { describe, expect, it } from "vitest";
import { calcResultadoTime, type PropostaEfetiva } from "@/lib/calculadora/calc";
import { consolidar, type TimeParaConsolidar } from "@/lib/calculadora/consolidado";
import { entradasVazias } from "@/lib/calculadora/estado";
import { rateioPorTime, type TimePreco } from "@/lib/calculadora/preco";
import type { CenarioSelecionado, EntradasTime } from "@/lib/calculadora/types";

const CONSERVADOR: CenarioSelecionado = { modo: "preset", cenario: "conservador" };

function entradasBase(sobrescreve: Partial<EntradasTime>): EntradasTime {
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
    ...sobrescreve,
  };
}

// Time pequeno com receita alta (ROI grande, investimento pequeno) e time
// grande modesto — o par clássico em que a média superestima.
const PROPOSTAS: Record<"a" | "b", PropostaEfetiva> = {
  a: { plano: "essencial", assentos: 10 },
  b: { plano: "intensivo", assentos: 100 },
};

const PARA_PRECO: TimePreco[] = [
  { id: "a", ...PROPOSTAS.a },
  { id: "b", ...PROPOSTAS.b },
];

function montarTimes(): TimeParaConsolidar[] {
  const rateio = rateioPorTime(PARA_PRECO);
  const entradasA = entradasBase({
    numVendedores: 10,
    receitaMensal: 2_000_000,
    cicloDias: 45,
    leadsMes: 900,
  });
  const entradasB = entradasBase({ numVendedores: 120, receitaMensal: 1_200_000 });
  return [
    {
      id: "a",
      nome: "Time A",
      proposta: PROPOSTAS.a,
      entradas: entradasA,
      sel: CONSERVADOR,
      resultado: calcResultadoTime(entradasA, PROPOSTAS.a, rateio.get("a")!, CONSERVADOR),
    },
    {
      id: "b",
      nome: "Time B",
      proposta: PROPOSTAS.b,
      entradas: entradasB,
      sel: CONSERVADOR,
      resultado: calcResultadoTime(entradasB, PROPOSTAS.b, rateio.get("b")!, CONSERVADOR),
    },
  ];
}

describe("consolidação multi-time (§4.11)", () => {
  it("roi da conta é Σ valor ÷ Σ preço — e a média superestimaria (invariante 11)", () => {
    const times = montarTimes();
    const consolidado = consolidar(times);
    if (consolidado.status !== "ok") throw new Error("times deveriam estar completos");
    const [a, b] = times.map(
      (t) => t.resultado as Extract<typeof t.resultado, { status: "ok" }>,
    );
    expect(consolidado.valorAno).toBeCloseTo(a.valorAno + b.valorAno, 6);
    expect(consolidado.precoAno).toBeCloseTo(a.precoAno + b.precoAno, 6);
    expect(consolidado.roi).toBeCloseTo(
      (a.valorAno + b.valorAno) / (a.precoAno + b.precoAno),
      9,
    );
    const media = (a.roi + b.roi) / 2;
    expect(a.roi).toBeGreaterThan(b.roi); // construção: A rende mais e custa menos
    expect(media).toBeGreaterThan(consolidado.roi);
  });

  it("payback consolidado conta a mesma história do roi", () => {
    const consolidado = consolidar(montarTimes());
    if (consolidado.status !== "ok") throw new Error("deveria estar completo");
    expect(consolidado.paybackMeses).toBeCloseTo(12 / consolidado.roi, 9);
  });

  it("métricas que não se somam são recalculadas dos totais", () => {
    const consolidado = consolidar(montarTimes());
    if (consolidado.status !== "ok") throw new Error("deveria estar completo");
    expect(consolidado.totalVendedores).toBe(130);
    expect(consolidado.totalAssentos).toBe(110);
    expect(consolidado.cobertura).toBeCloseTo(110 / 130, 9);
    expect(consolidado.receitaPorVendedor).toBeCloseTo(3_200_000 / 130, 6);
    // Conversão dos totais: Σ vendas ÷ Σ oportunidades (25% nos dois → 25%).
    expect(consolidado.conversaoMediaPct).toBeCloseTo(25, 6);
    // Só o time A declarou ciclo: média ponderada pelas vendas dele.
    expect(consolidado.cicloMedioDias).toBeCloseTo(45, 6);
  });

  it("declara o mix de cenários por time", () => {
    const times = montarTimes();
    times[1].sel = { modo: "preset", cenario: "realista" };
    const consolidado = consolidar(times);
    if (consolidado.status !== "ok") throw new Error("deveria estar completo");
    expect(consolidado.mixCenarios).toHaveLength(2);
    expect(consolidado.mixCenarios[1].sel).toEqual({ modo: "preset", cenario: "realista" });
    expect(consolidado.mixCenarios[1].nome).toBe("Time B");
  });

  it("qualquer time incompleto trava o consolidado com a lista do que falta", () => {
    const times = montarTimes();
    times[0] = {
      ...times[0],
      entradas: entradasVazias(),
      resultado: calcResultadoTime(entradasVazias(), PROPOSTAS.a, 1_000, CONSERVADOR),
    };
    const consolidado = consolidar(times);
    expect(consolidado.status).toBe("incompleto");
    if (consolidado.status === "incompleto") {
      expect(consolidado.faltandoPorTime).toHaveLength(1);
      expect(consolidado.faltandoPorTime[0].timeId).toBe("a");
      expect(consolidado.faltandoPorTime[0].faltando.length).toBeGreaterThan(0);
    }
  });

  it("sem times, o consolidado é incompleto", () => {
    expect(consolidar([]).status).toBe("incompleto");
  });
});

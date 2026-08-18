import { describe, expect, it } from "vitest";
import { calcResultadoTime, type PropostaEfetiva } from "@/lib/calculadora/calc";
import { compararCenarios } from "@/lib/calculadora/cenarios-comparacao";
import { entradasVazias } from "@/lib/calculadora/estado";
import { rateioPorTime } from "@/lib/calculadora/preco";
import type { EntradasTime } from "@/lib/calculadora/types";

// Mesmas entradas do golden FIESC: é o caso com funil preenchido, onde o
// ganho de ciclo existe e a comparação por cenário tem o que provar.
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

const PROPOSTA: PropostaEfetiva = { plano: "intensivo", assentos: 100 };
const PRECO_MES = rateioPorTime([{ id: "t1", ...PROPOSTA }]).get("t1")!;

function comparar(entradas = entradasFiesc(), prazoMeses = 3) {
  const linhas = compararCenarios(entradas, PROPOSTA, PRECO_MES, prazoMeses);
  if (linhas === null) throw new Error("comparação deveria existir");
  return linhas;
}

describe("comparação de cenários (Excel, aba Scenario Comparison)", () => {
  it("a linha conservadora é idêntica ao cálculo do cenário ativo", () => {
    const linha = comparar().find((l) => l.cenario === "conservador")!;
    const direto = calcResultadoTime(
      entradasFiesc(),
      PROPOSTA,
      PRECO_MES,
      { modo: "preset", cenario: "conservador" },
      3,
    );
    if (direto.status !== "ok") throw new Error("deveria estar completo");
    expect(linha.valorAno).toBeCloseTo(direto.valorAno, 6);
    expect(linha.roi).toBeCloseTo(0.43206239328929, 10);
    expect(linha.paybackMeses).toBeCloseTo(27.77376644295304, 10);
  });

  it("a eficiência é invariante: deltas não tocam o contrafactual", () => {
    const valores = comparar().map((l) => l.eficienciaAno);
    for (const valor of valores) expect(valor).toBeCloseTo(94_500, 4);
  });

  // A planilha herda o ganho de ciclo do cenário ativo nas colunas Realista e
  // Otimista (`=C19`). Aqui cada cenário recalcula o próprio — correção
  // deliberada de 17/08/2026, e este teste é o que a trava.
  it("recalcula o ganho de ciclo por cenário (não herda o do conservador)", () => {
    const linhas = comparar();
    const cons = linhas.find((l) => l.cenario === "conservador")!;
    const real = linhas.find((l) => l.cenario === "realista")!;
    const otim = linhas.find((l) => l.cenario === "otimista")!;
    expect(real.parcelas.ganhoCicloAno).not.toBeCloseTo(
      cons.parcelas.ganhoCicloAno ?? 0,
      4,
    );
    expect(otim.parcelas.ganhoCicloAno).not.toBeCloseTo(
      cons.parcelas.ganhoCicloAno ?? 0,
      4,
    );
  });

  it("valor e ROI crescem do conservador ao otimista", () => {
    const [cons, real, otim] = comparar();
    expect(cons.cenario).toBe("conservador");
    expect(real.valorAno).toBeGreaterThan(cons.valorAno);
    expect(otim.valorAno).toBeGreaterThan(real.valorAno);
    expect(otim.roi).toBeGreaterThan(cons.roi);
    // Payback é o inverso: mais valor, menos tempo.
    expect(otim.paybackMeses).toBeLessThan(cons.paybackMeses);
  });

  it("marca quando o payback passa do prazo escolhido", () => {
    expect(comparar(entradasFiesc(), 3).every((l) => l.paybackExcedeContrato)).toBe(true);
    expect(comparar(entradasFiesc(), 24).some((l) => !l.paybackExcedeContrato)).toBe(true);
  });

  it("devolve null enquanto o time estiver incompleto", () => {
    expect(compararCenarios(entradasVazias(), PROPOSTA, PRECO_MES, 3)).toBeNull();
    expect(compararCenarios(entradasFiesc(), PROPOSTA, 0, 3)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { calcResultadoTime, type PropostaEfetiva } from "@/lib/calculadora/calc";
import {
  compararCenarios,
  linhaDoResultado,
} from "@/lib/calculadora/cenarios-comparacao";
import { CENARIOS } from "@/lib/calculadora/constants";
import { entradasVazias } from "@/lib/calculadora/estado";
import { rateioPorTime } from "@/lib/calculadora/preco";
import type { Cenario, EntradasTime } from "@/lib/calculadora/types";

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
    expect(linha.roi).toBeCloseTo(0.52514097744360866, 10);
    expect(linha.paybackMeses).toBeCloseTo(22.851006711409415, 10);
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

  // O teste acima prova que os três ciclos DIFEREM; este prova quanto valem.
  // A diferença importa: herdar o ciclo do conservador mantém a ordenação de
  // valor intacta (as outras três alavancas já crescem sozinhas), então só a
  // asserção em absoluto barra a volta do quirk. A auditoria externa de
  // 20-21/08/2026 publicou a tabela de cenários do FIESC com ROI 0,44 / 1,00 /
  // 1,28 — invertendo a aritmética, os três usam o MESMO ganho de ciclo de
  // ~84 mil, que é o quirk medido. Os nossos são estes (errata E-41).
  it("o ganho de ciclo por cenário vale o que o preset manda", () => {
    const linhas = comparar();
    const porCenario = (c: Cenario) =>
      linhas.find((l) => l.cenario === c)!.parcelas.ganhoCicloAno ?? 0;

    // Δciclo em dias inteiros (bifurcação dos 7 dias): 3, 9 e 12 de 60.
    expect(porCenario("conservador")).toBeCloseTo(82_894.736842105, 4);
    expect(porCenario("realista")).toBeCloseTo(277_941.176470588, 4);
    expect(porCenario("otimista")).toBeCloseTo(315_000, 4);
  });

  // O teto do funil (`Engine!C69`) é a única trava do motor que NÃO aparece no
  // golden FIESC: no conservador sobra capacidade. Ela só morde no otimista,
  // onde a capacidade liberada (3,75 vendas/mês) passa das oportunidades
  // ociosas (20 × 15% = 3). Sem este teste, `limitou === true` não é exercido
  // em lugar nenhum da suíte.
  it("o teto do funil só corta no cenário otimista", () => {
    const esperado: Array<[Cenario, boolean, number]> = [
      ["conservador", false, 0.789473684210525],
      ["realista", false, 2.647058823529412],
      ["otimista", true, 3.75],
    ];
    for (const [cenario, limitou, capacidade] of esperado) {
      const r = calcResultadoTime(
        entradasFiesc(),
        PROPOSTA,
        PRECO_MES,
        { modo: "preset", cenario },
        3,
      );
      if (r.status !== "ok") throw new Error("deveria estar completo");
      expect(r.tetoFunil).not.toBeNull();
      expect(r.tetoFunil!.limitou).toBe(limitou);
      expect(r.tetoFunil!.ganhoCapacidadeVendasMes).toBeCloseTo(capacidade, 6);
      // O teto em si não depende do cenário: são as oportunidades ociosas.
      expect(r.tetoFunil!.tetoVendasMes).toBeCloseTo(3, 6);
    }
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

  // Cada coluna carrega os deltas EFETIVOS que a produziram: é o que a tela
  // mostra ao lado de cada alavanca, e desde 21/08/2026 é o que o campo da
  // coluna ativa edita. Sem eles, a comparação afirmava "só os deltas mudam"
  // sem nunca exibir um.
  it("cada linha carrega os deltas efetivos do próprio preset", () => {
    for (const linha of comparar()) {
      const preset = CENARIOS[linha.cenario];
      expect(linha.deltas.ticketPct).toBeCloseTo(preset.ticketPct, 10);
      expect(linha.deltas.rampaPct).toBeCloseTo(preset.rampaPct, 10);
      expect(linha.deltas.convPp).toBeCloseTo(preset.convPp, 10);
      // Ciclo de 60 dias: o preset em % vira dias inteiros (Engine!C52–C56).
      expect(linha.deltas.cicloDiasMenos).toBe(Math.round(60 * preset.cicloPct));
    }
  });
});

// A edição na coluna ativa não pode reescrever o que os OUTROS dois cenários
// respondem: é `compararCenarios` que alimenta o FAQ ("no Conservador o ROI é
// X"), e essa frase deixaria de ser verdade se um ajuste vazasse para dentro
// dela. Quem mostra os números em uso é `linhaDoResultado`, sobre o resultado
// que o motor já devolveu.
describe("a coluna ativa quando ela deixou de ser o preset puro", () => {
  const AJUSTADA = {
    modo: "personalizado" as const,
    base: "conservador" as const,
    // Bem acima do preset conservador (5% / 20% / +0,5 p.p. / 3 dias).
    deltas: { ticketPct: 0.3, rampaPct: 0.8, cicloDiasMenos: 18, convPp: 5 },
  };

  it("compararCenarios continua devolvendo os três presets puros", () => {
    const linhas = comparar();
    for (const linha of linhas) {
      expect(linha.deltas.ticketPct).toBeCloseTo(CENARIOS[linha.cenario].ticketPct, 10);
    }
    // O mesmo ROI do golden FIESC, com ou sem ajuste em curso na tela.
    expect(linhas.find((l) => l.cenario === "conservador")!.roi).toBeCloseTo(
      0.52514097744360866,
      10,
    );
  });

  it("linhaDoResultado espelha o resultado que o relatório está mostrando", () => {
    const resultado = calcResultadoTime(
      entradasFiesc(),
      PROPOSTA,
      PRECO_MES,
      AJUSTADA,
      3,
    );
    if (resultado.status !== "ok") throw new Error("deveria estar completo");
    const linha = linhaDoResultado("conservador", resultado, 3);

    expect(linha.cenario).toBe("conservador");
    expect(linha.deltas).toEqual(resultado.deltas);
    expect(linha.roi).toBe(resultado.roi);
    expect(linha.valorAno).toBe(resultado.valorAno);
    expect(linha.paybackMeses).toBe(resultado.paybackMeses);
    expect(linha.paybackExcedeContrato).toBe(true);
    // E ela de fato difere do preset de mesmo nome — senão o campo editaria
    // um número que a coluna não mostra.
    expect(linha.roi).toBeGreaterThan(
      comparar().find((l) => l.cenario === "conservador")!.roi,
    );
  });

  it("o prazo é quem decide o aviso, não o cenário", () => {
    const resultado = calcResultadoTime(
      entradasFiesc(),
      PROPOSTA,
      PRECO_MES,
      AJUSTADA,
      24,
    );
    if (resultado.status !== "ok") throw new Error("deveria estar completo");
    expect(linhaDoResultado("conservador", resultado, 24).paybackExcedeContrato).toBe(
      false,
    );
  });
});

// Comparação dos 3 cenários lado a lado (Excel, aba Scenario Comparison):
// mesmas entradas e mesma proposta, só os deltas do preset mudam. A planilha
// tem um quirk — o ganho de ciclo não é recalculado por cenário (colunas
// Realista/Otimista fazem `=C19`); aqui cada cenário recalcula TUDO pelo
// preset, de propósito (correção registrada em 17/08/2026).

import { calcResultadoTime, camposFaltando, type PropostaEfetiva } from "./calc";
import { CENARIOS } from "./constants";
import { PREMISSAS_PADRAO, type PremissasRacional } from "./premissas";
import type {
  Cenario,
  DeltasEfetivos,
  EntradasTime,
  ParcelasPerformance,
  ResultadoTime,
} from "./types";

export type LinhaCenario = {
  cenario: Cenario;
  // Os deltas EFETIVOS da coluna, já clampados pelos tetos do modelo. São a
  // causa do que as parcelas abaixo mostram como efeito, e até 20/08/2026 a
  // tela dizia "só os deltas de melhoria mudam" sem nunca exibir um deles.
  deltas: DeltasEfetivos;
  eficienciaAno: number; // invariante entre cenários — deltas não a tocam
  parcelas: ParcelasPerformance;
  G: number;
  valorAno: number;
  roi: number;
  paybackMeses: number;
  paybackExcedeContrato: boolean;
};

export function compararCenarios(
  entradas: EntradasTime,
  proposta: PropostaEfetiva,
  precoMes: number,
  prazoMeses: number,
  p: PremissasRacional = PREMISSAS_PADRAO,
): LinhaCenario[] | null {
  if (camposFaltando(entradas).length > 0 || precoMes <= 0) return null;
  return (Object.keys(CENARIOS) as Cenario[]).map((cenario) => {
    const resultado = calcResultadoTime(
      entradas,
      proposta,
      precoMes,
      { modo: "preset", cenario },
      prazoMeses,
      p,
    );
    // Gating já passou acima; o preset nunca devolve incompleto.
    if (resultado.status !== "ok") throw new Error("cenário incompleto após gating");
    return linhaDoResultado(cenario, resultado, prazoMeses);
  });
}

/**
 * A mesma linha, montada a partir de um resultado já calculado. Existe para a
 * coluna ATIVA quando ela deixou de ser um preset puro: `compararCenarios`
 * responde "o que cada preset devolveria" — é essa pergunta que o FAQ cita, e a
 * resposta não pode mudar porque alguém ajustou um delta —, mas a coluna do
 * cenário em uso precisa mostrar os números que o relatório inteiro está
 * mostrando. Sem isso, editar o campo dentro do card não mexeria no card.
 */
export function linhaDoResultado(
  cenario: Cenario,
  resultado: Extract<ResultadoTime, { status: "ok" }>,
  prazoMeses: number,
): LinhaCenario {
  return {
    cenario,
    deltas: resultado.deltas,
    eficienciaAno: resultado.eficienciaAno,
    parcelas: resultado.parcelas,
    G: resultado.G,
    valorAno: resultado.valorAno,
    roi: resultado.roi,
    paybackMeses: resultado.paybackMeses,
    paybackExcedeContrato: resultado.paybackMeses > prazoMeses,
  };
}

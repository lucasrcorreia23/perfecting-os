// Comparação dos 3 cenários lado a lado (Excel, aba Scenario Comparison):
// mesmas entradas e mesma proposta, só os deltas do preset mudam. A planilha
// tem um quirk — o ganho de ciclo não é recalculado por cenário (colunas
// Realista/Otimista fazem `=C19`); aqui cada cenário recalcula TUDO pelo
// preset, de propósito (correção registrada em 17/08/2026).

import { calcResultadoTime, camposFaltando, type PropostaEfetiva } from "./calc";
import { CENARIOS } from "./constants";
import type { Cenario, EntradasTime, ParcelasPerformance } from "./types";

export type LinhaCenario = {
  cenario: Cenario;
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
): LinhaCenario[] | null {
  if (camposFaltando(entradas).length > 0 || precoMes <= 0) return null;
  return (Object.keys(CENARIOS) as Cenario[]).map((cenario) => {
    const resultado = calcResultadoTime(
      entradas,
      proposta,
      precoMes,
      { modo: "preset", cenario },
      prazoMeses,
    );
    // Gating já passou acima; o preset nunca devolve incompleto.
    if (resultado.status !== "ok") throw new Error("cenário incompleto após gating");
    return {
      cenario,
      eficienciaAno: resultado.eficienciaAno,
      parcelas: resultado.parcelas,
      G: resultado.G,
      valorAno: resultado.valorAno,
      roi: resultado.roi,
      paybackMeses: resultado.paybackMeses,
      paybackExcedeContrato: resultado.paybackMeses > prazoMeses,
    };
  });
}

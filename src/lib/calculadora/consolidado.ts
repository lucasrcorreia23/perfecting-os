// Consolidação multi-time (§4.11): SEMPRE ponderada, jamais média dos ROIs —
// a média superestima quando o time de maior retorno é o de menor
// investimento (invariante 11). Métricas que não se somam são recalculadas
// a partir dos totais.

import { PRAZO_DEFAULT } from "./constants";
import type { PropostaEfetiva } from "./calc";
import type {
  CenarioSelecionado,
  EntradasTime,
  ResultadoConsolidado,
  ResultadoTime,
} from "./types";

export type TimeParaConsolidar = {
  id: string;
  nome: string;
  proposta: PropostaEfetiva;
  entradas: EntradasTime;
  sel: CenarioSelecionado;
  resultado: ResultadoTime;
};

export function consolidar(
  times: TimeParaConsolidar[],
  prazoMeses: number = PRAZO_DEFAULT,
): ResultadoConsolidado {
  const incompletos = times.filter((time) => time.resultado.status === "incompleto");
  if (incompletos.length > 0 || times.length === 0) {
    return {
      status: "incompleto",
      faltandoPorTime: incompletos.map((time) => ({
        timeId: time.id,
        faltando: time.resultado.status === "incompleto" ? time.resultado.faltando : [],
      })),
    };
  }

  const oks = times.map((time) => ({
    ...time,
    resultado: time.resultado as Extract<ResultadoTime, { status: "ok" }>,
  }));

  const valorAno = oks.reduce((total, t) => total + t.resultado.valorAno, 0);
  const precoAno = oks.reduce((total, t) => total + t.resultado.precoAno, 0);
  const G = oks.reduce((total, t) => total + t.resultado.G, 0);

  const totalVendedores = oks.reduce((total, t) => total + t.entradas.numVendedores!, 0);
  const totalAssentos = oks.reduce((total, t) => total + t.proposta.assentos, 0);
  const totalReceita = oks.reduce((total, t) => total + t.entradas.receitaMensal!, 0);

  // Conversão média dos totais: Σ vendas ÷ Σ oportunidades.
  const vendasPorTime = oks.map((t) => t.entradas.receitaMensal! / t.entradas.ticketMedio!);
  const totalVendas = vendasPorTime.reduce((total, vendas) => total + vendas, 0);
  const totalOportunidades = oks.reduce(
    (total, t, index) => total + vendasPorTime[index] / (t.entradas.conversaoPct! / 100),
    0,
  );

  // Ciclo médio ponderado por vendas, só entre times que declararam ciclo.
  const comCiclo = oks
    .map((t, index) => ({ ciclo: t.entradas.cicloDias, vendas: vendasPorTime[index] }))
    .filter((t): t is { ciclo: number; vendas: number } => t.ciclo !== null && t.ciclo > 0);
  const vendasComCiclo = comCiclo.reduce((total, t) => total + t.vendas, 0);
  const cicloMedioDias =
    comCiclo.length > 0 && vendasComCiclo > 0
      ? comCiclo.reduce((total, t) => total + t.ciclo * t.vendas, 0) / vendasComCiclo
      : null;

  const paybackMeses = (precoAno / valorAno) * 12;
  return {
    status: "ok",
    valorAno,
    precoAno,
    roi: valorAno / precoAno,
    paybackMeses,
    // Excel Account!C32: o contrato termina antes de a conta se pagar.
    paybackExcedeContrato: paybackMeses > prazoMeses,
    G,
    mixCenarios: oks.map((t) => ({ timeId: t.id, nome: t.nome, sel: t.sel })),
    totalVendedores,
    totalAssentos,
    cobertura: Math.min(1, totalAssentos / totalVendedores),
    receitaPorVendedor: totalReceita / totalVendedores,
    conversaoMediaPct: (totalVendas / totalOportunidades) * 100,
    cicloMedioDias,
  };
}

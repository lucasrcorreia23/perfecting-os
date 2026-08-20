// As quatro metas do case de sucesso de 90 dias (bloco "Próximo passo").
//
// Módulo PURO e DERIVADO, no molde de `validacao-passo.ts`: não inventa
// premissa nenhuma e não toca no motor. Cada meta é uma releitura, noutra
// unidade, de um número que `calcResultadoTime` já devolveu — e é por isso que
// ela pode ir para um contrato sem virar promessa nova.
//
// A escolha das quatro é deliberada e está escrita em `CASE_JANELA_MESES`:
// rampa, tempo de gestor, adoção e satisfação são o que se mede em 90 dias.
// Ticket, conversão e ciclo ficam de fora do case — não porque não valham,
// mas porque a janela não os prova, e prometer prova que não se pode dar é o
// jeito mais rápido de queimar a credibilidade que a tela inteira construiu.

import {
  CASE_ADOCAO_PCT,
  CASE_CSAT_MIN,
  CASE_JANELA_DIAS,
  CASE_JANELA_MESES,
  HAIRCUT,
  PLANOS,
  SUPERVISAO,
} from "./constants";
import type { EntradasTime, PlanoId, ResultadoTime } from "./types";

export type MetasCase = {
  janelaMeses: number;
  janelaDias: number;
  /** Rampa hoje, em meses — o número que a pessoa declarou. */
  rampaDeMeses: number;
  /** Rampa na meta: `rampaDeMeses × (1 − Δrampa × haircut)`. */
  rampaParaMeses: number;
  /** Horas de gestor por mês que saem da agenda e passam à plataforma. */
  horasGestorDevolvidasMes: number;
  /** Verdadeiro quando quem limitou foi o plano, não a agenda de hoje. */
  gestorLimitadoPeloPlano: boolean;
  assentos: number;
  adocaoPct: number;
  csatMin: number;
};

/**
 * Horas de gestor que o programa devolve por mês.
 *
 * É o `min()` da eficiência (§4.3) expresso em HORAS em vez de reais:
 * ninguém devolve mais tempo do que hoje gasta treinando, e ninguém devolve
 * mais do que o plano contratado entrega de prática. Os dois lados vêm de
 * campos já validados pelo gating, então a conta só roda com o time completo.
 *
 * O `(1 − SUPERVISAO)` é o mesmo do motor: um quarto do tempo continua sendo
 * do gestor, porque acompanhar a prática não é a mesma coisa que conduzi-la.
 */
export function horasGestorDevolvidas(
  entradas: EntradasTime,
  plano: PlanoId,
  assentos: number,
  fatorEscopo: number,
): { horas: number; limitadoPeloPlano: boolean } {
  const hoje = entradas.horasTreinoGestorMes! * entradas.numGestoresTreino!;
  const tetoDoPlano = assentos * PLANOS[plano].horasMes * fatorEscopo * (1 - SUPERVISAO);
  return {
    horas: Math.max(0, Math.min(hoje, tetoDoPlano)),
    limitadoPeloPlano: tetoDoPlano < hoje,
  };
}

/** `null` enquanto o time estiver incompleto — nunca meta pela metade. */
export function metasCase(
  resultado: ResultadoTime,
  entradas: EntradasTime,
  plano: PlanoId,
  assentos: number,
): MetasCase | null {
  if (resultado.status !== "ok") return null;

  const gestor = horasGestorDevolvidas(
    entradas,
    plano,
    assentos,
    resultado.fatorEscopo.valor,
  );

  return {
    janelaMeses: CASE_JANELA_MESES,
    janelaDias: CASE_JANELA_DIAS,
    rampaDeMeses: entradas.rampaMeses!,
    // O haircut entra AQUI, e não vem de `deltas.rampaPct`: `deltasEfetivos`
    // devolve o delta cru do cenário e quem aplica o 0,7 é a fórmula do valor
    // (`margemRampaAno`, §4.4). Se a meta usasse o delta cru, ela prometeria
    // uma rampa mais curta do que a que o próprio ROI ao lado pagou — o case
    // viraria uma promessa acima da conta que o justifica.
    rampaParaMeses: entradas.rampaMeses! * (1 - resultado.deltas.rampaPct * HAIRCUT),
    horasGestorDevolvidasMes: gestor.horas,
    gestorLimitadoPeloPlano: gestor.limitadoPeloPlano,
    assentos,
    adocaoPct: CASE_ADOCAO_PCT,
    csatMin: CASE_CSAT_MIN,
  };
}

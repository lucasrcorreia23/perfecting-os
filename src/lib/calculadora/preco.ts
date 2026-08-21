// Preço da conta (§4.9–4.10): tabela de preços por tier sobre o total de horas
// — o volume escolhe o tier e todas as horas saem pela taxa cheia dele —, piso
// aplicado depois do desconto (desconto = 0 — prazo não altera preço) e rateio
// por horas entre times. Opera sobre os times EFETIVOS (plano + assentos
// resolvidos) que o visitante montou.

import {
  DESCONTO_PRAZO,
  NIVEIS_SERVICO,
  PRAZO_DEFAULT,
  PRAZO_DEGRAU_SERVICO,
} from "./constants";
import {
  horasDoPlano,
  PREMISSAS_PADRAO,
  type PremissasRacional,
} from "./premissas";
import type { NivelServico, PlanoId, PrecoConta, TierPreco } from "./types";

// Time com a proposta resolvida (assentos default já aplicado).
export type TimePreco = { id: string; plano: PlanoId; assentos: number };

export function horasDoTime(
  time: { plano: PlanoId; assentos: number },
  p: PremissasRacional = PREMISSAS_PADRAO,
): number {
  return time.assentos * horasDoPlano(time.plano, p);
}

export function horasDaConta(
  times: TimePreco[],
  p: PremissasRacional = PREMISSAS_PADRAO,
): number {
  return times.reduce((total, time) => total + horasDoTime(time, p), 0);
}

/**
 * O tier em que o volume total da conta cai. Conta vazia fica no Tier 1: é a
 * faixa da primeira hora, e é o que o piso vai cobrir de qualquer jeito.
 */
export function tierPorHoras(
  horasConta: number,
  p: PremissasRacional = PREMISSAS_PADRAO,
): TierPreco {
  const horas = Math.max(0, horasConta);
  const tabela = p.tabelaTiers;
  const indice = tabela.findIndex((faixa) => horas <= faixa.ateHoras);
  const posicao = indice === -1 ? tabela.length - 1 : indice;
  const faixa = tabela[posicao];
  return {
    tier: faixa.tier,
    deHoras: posicao === 0 ? 0 : tabela[posicao - 1].ateHoras + 1,
    ateHoras: faixa.ateHoras,
    taxaHora: faixa.taxaHora,
    economiaVsTier1: 1 - faixa.taxaHora / tabela[0].taxaHora,
  };
}

// Taxa cheia do tier sobre TODAS as horas — não é escada marginal. As horas
// abaixo da fronteira não guardam a taxa da faixa anterior; entrar no tier
// seguinte reprecifica a conta inteira, degrau incluído (ver TABELA_TIERS).
export function precoPorTier(
  horasConta: number,
  p: PremissasRacional = PREMISSAS_PADRAO,
): { bruto: number; tier: TierPreco } {
  const horas = Math.max(0, horasConta);
  const tier = tierPorHoras(horas, p);
  return { bruto: horas * tier.taxaHora, tier };
}

export function nivelServicoPorAssentos(assentosConta: number): NivelServico {
  for (const nivel of NIVEIS_SERVICO) {
    if (assentosConta <= nivel.ateAssentos) return nivel.nivel;
  }
  return "enterprise";
}

// O prazo não altera preço, mas 24 meses compram um degrau adicional de nível
// de serviço (§4.9) — é o que o PRAZO_COPY promete na tela.
const ESCADA_NIVEL: NivelServico[] = ["essencial", "avancado", "enterprise"];

export function nivelServico(assentosConta: number, prazoMeses: number): NivelServico {
  const base = nivelServicoPorAssentos(assentosConta);
  if (prazoMeses < PRAZO_DEGRAU_SERVICO) return base;
  const acima = ESCADA_NIVEL[ESCADA_NIVEL.indexOf(base) + 1];
  return acima ?? base;
}

export function precoConta(
  times: TimePreco[],
  prazoMeses = PRAZO_DEFAULT,
  p: PremissasRacional = PREMISSAS_PADRAO,
): PrecoConta {
  const horasMes = horasDaConta(times, p);
  const { bruto, tier } = precoPorTier(horasMes, p);
  // Piso depois do desconto: piso não se desconta (§4.9).
  const comDesconto = bruto * (1 - DESCONTO_PRAZO);
  const mensal = Math.max(comDesconto, p.taxaMinima);
  const assentosConta = times.reduce((total, time) => total + time.assentos, 0);
  const base = nivelServicoPorAssentos(assentosConta);
  const efetivo = nivelServico(assentosConta, prazoMeses);
  return {
    horasMes,
    bruto,
    mensal,
    anual: mensal * 12,
    pisoAplicado: comDesconto < p.taxaMinima,
    tier,
    // Sem piso, é a própria taxa do tier — o que a tabela comercial promete.
    // Só diverge dela quando o piso morde.
    taxaCombinada: horasMes > 0 ? mensal / horasMes : 0,
    nivelServico: efetivo,
    nivelPorPrazo: efetivo !== base,
  };
}

// Rateio do preço por HORAS, não por assentos (§4.11), com ajuste de centavos
// no último time para fechar a soma exata — taxa combinada uniforme.
export function rateioPorTime(
  times: TimePreco[],
  p: PremissasRacional = PREMISSAS_PADRAO,
): Map<string, number> {
  const preco = precoConta(times, PRAZO_DEFAULT, p);
  const horasTotal = preco.horasMes;
  const rateio = new Map<string, number>();
  if (times.length === 0) return rateio;
  let acumulado = 0;
  times.forEach((time, index) => {
    if (index === times.length - 1) {
      rateio.set(time.id, Math.round((preco.mensal - acumulado) * 100) / 100);
      return;
    }
    const fracao = horasTotal > 0 ? horasDoTime(time, p) / horasTotal : 1 / times.length;
    const parte = Math.round(preco.mensal * fracao * 100) / 100;
    rateio.set(time.id, parte);
    acumulado += parte;
  });
  return rateio;
}

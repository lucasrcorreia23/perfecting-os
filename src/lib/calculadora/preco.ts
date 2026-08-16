// Preço da conta (§4.9–4.10): escada progressiva marginal por faixa sobre o
// total de horas, piso aplicado depois do desconto (desconto = 0 — prazo não
// altera preço) e rateio por horas entre times. Opera sobre os times EFETIVOS
// (plano + assentos resolvidos) que o visitante montou.

import {
  DESCONTO_PRAZO,
  ESCADA_PRECO,
  NIVEIS_SERVICO,
  PLANOS,
  PRAZO_DEFAULT,
  PRAZO_DEGRAU_SERVICO,
  TAXA_MINIMA,
} from "./constants";
import type { FaixaExtrato, NivelServico, PlanoId, PrecoConta } from "./types";

// Time com a proposta resolvida (assentos default já aplicado).
export type TimePreco = { id: string; plano: PlanoId; assentos: number };

export function horasDoTime(time: { plano: PlanoId; assentos: number }): number {
  return time.assentos * PLANOS[time.plano].horasMes;
}

export function horasDaConta(times: TimePreco[]): number {
  return times.reduce((total, time) => total + horasDoTime(time), 0);
}

// Escada marginal: cada faixa cobra sua taxa apenas pelas horas dentro dela.
export function precoEscada(horasConta: number): { bruto: number; extrato: FaixaExtrato[] } {
  const extrato: FaixaExtrato[] = [];
  let restante = Math.max(0, horasConta);
  let pisoFaixa = 0;
  for (const faixa of ESCADA_PRECO) {
    if (restante <= 0) break;
    const capacidade = faixa.ateHoras - pisoFaixa;
    const horasNaFaixa = Math.min(restante, capacidade);
    extrato.push({
      ateHoras: faixa.ateHoras,
      horasNaFaixa,
      taxaHora: faixa.taxaHora,
      subtotal: horasNaFaixa * faixa.taxaHora,
    });
    restante -= horasNaFaixa;
    pisoFaixa = faixa.ateHoras;
  }
  const bruto = extrato.reduce((total, faixa) => total + faixa.subtotal, 0);
  return { bruto, extrato };
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

export function precoConta(times: TimePreco[], prazoMeses = PRAZO_DEFAULT): PrecoConta {
  const horasMes = horasDaConta(times);
  const { bruto, extrato } = precoEscada(horasMes);
  // Piso depois do desconto: piso não se desconta (§4.9).
  const comDesconto = bruto * (1 - DESCONTO_PRAZO);
  const mensal = Math.max(comDesconto, TAXA_MINIMA);
  const assentosConta = times.reduce((total, time) => total + time.assentos, 0);
  const base = nivelServicoPorAssentos(assentosConta);
  const efetivo = nivelServico(assentosConta, prazoMeses);
  return {
    horasMes,
    bruto,
    mensal,
    anual: mensal * 12,
    pisoAplicado: comDesconto < TAXA_MINIMA,
    extrato,
    taxaCombinada: horasMes > 0 ? mensal / horasMes : 0,
    nivelServico: efetivo,
    nivelPorPrazo: efetivo !== base,
  };
}

// Rateio do preço por HORAS, não por assentos (§4.11), com ajuste de centavos
// no último time para fechar a soma exata — taxa combinada uniforme.
export function rateioPorTime(times: TimePreco[]): Map<string, number> {
  const preco = precoConta(times);
  const horasTotal = preco.horasMes;
  const rateio = new Map<string, number>();
  if (times.length === 0) return rateio;
  let acumulado = 0;
  times.forEach((time, index) => {
    if (index === times.length - 1) {
      rateio.set(time.id, Math.round((preco.mensal - acumulado) * 100) / 100);
      return;
    }
    const fracao = horasTotal > 0 ? horasDoTime(time) / horasTotal : 1 / times.length;
    const parte = Math.round(preco.mensal * fracao * 100) / 100;
    rateio.set(time.id, parte);
    acumulado += parte;
  });
  return rateio;
}

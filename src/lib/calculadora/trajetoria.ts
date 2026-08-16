// Trajetória interativa (§4.12). Editar a trajetória NÃO altera ROI, payback
// nem valor do ano (invariante 4): nada aqui entra em calcResultadoTime — o
// fluxo é sempre resultado → trajetória, nunca o inverso. Oscilação nunca é
// gerada automaticamente: sem edição, a linha permanece reta.

import {
  RECONCILIACAO_MAX_PASSOS,
  RECONCILIACAO_TOLERANCIA,
  TRAJETORIA_MESES,
} from "./constants";
import type { PontoMes } from "./types";

// Piso por ponto: −margem_anual/12 — permite curva-J; a margem mensal com o
// programa nunca fica negativa.
export function pisoPonto(margemAnualAtual: number): number {
  return -margemAnualAtual / 12;
}

// Teto por ponto: 3 × (margem_anual + G)/12 − margem_anual/12.
export function tetoPonto(margemAnualAtual: number, G: number): number {
  return (3 * (margemAnualAtual + G)) / 12 - margemAnualAtual / 12;
}

// Reta de referência: G distribuído uniformemente nos 12 meses.
export function trajetoriaBase(G: number): number[] {
  return Array.from({ length: TRAJETORIA_MESES }, () => G / TRAJETORIA_MESES);
}

export type Reconciliacao = {
  pontos: number[];
  convergiu: boolean;
  passos: number;
};

// Reconciliação iterativa preservando Σg = G (até 50 passos, tolerância
// R$ 0,01). Convergência garantida: Σ pisos < G < Σ tetos sempre (G ≥ 0).
// `fixo` mantém o ponto arrastado imóvel enquanto os demais absorvem o
// resíduo — só é ajustado se não sobrar mais ninguém ajustável.
export function reconciliar(
  editados: number[],
  G: number,
  margemAnualAtual: number,
  fixo?: number,
): Reconciliacao {
  const piso = pisoPonto(margemAnualAtual);
  const teto = tetoPonto(margemAnualAtual, G);
  // Degenerate guard: sem margem e sem ganho não há o que reconciliar.
  if (teto <= piso + RECONCILIACAO_TOLERANCIA) {
    return { pontos: trajetoriaBase(G), convergiu: true, passos: 0 };
  }
  const pontos = Array.from({ length: TRAJETORIA_MESES }, (_, index) => {
    const valor = editados[index] ?? G / TRAJETORIA_MESES;
    return Math.min(Math.max(valor, piso), teto);
  });

  let passos = 0;
  while (passos < RECONCILIACAO_MAX_PASSOS) {
    const soma = pontos.reduce((total, ponto) => total + ponto, 0);
    const residuo = G - soma;
    if (Math.abs(residuo) < RECONCILIACAO_TOLERANCIA) {
      return { pontos, convergiu: true, passos };
    }
    passos += 1;
    let ajustaveis = pontos
      .map((ponto, index) => ({ ponto, index }))
      .filter(({ ponto, index }) => {
        if (index === fixo) return false;
        return residuo > 0 ? ponto < teto : ponto > piso;
      });
    if (ajustaveis.length === 0) {
      // Todos travados: o ponto fixo é a última válvula.
      ajustaveis = pontos
        .map((ponto, index) => ({ ponto, index }))
        .filter(({ ponto }) => (residuo > 0 ? ponto < teto : ponto > piso));
      if (ajustaveis.length === 0) break;
    }
    const delta = residuo / ajustaveis.length;
    for (const { index } of ajustaveis) {
      pontos[index] = Math.min(Math.max(pontos[index] + delta, piso), teto);
    }
  }
  const soma = pontos.reduce((total, ponto) => total + ponto, 0);
  return { pontos, convergiu: Math.abs(G - soma) < RECONCILIACAO_TOLERANCIA, passos };
}

// Quando premissas mudam entre sessões (G ou margem), a trajetória salva é
// re-reconciliada PRESERVANDO A FORMA (§8): escala proporcional ao novo G e
// depois reconcilia dentro dos novos clamps.
export function reReconciliar(
  editadaAntiga: number[],
  GNovo: number,
  margemAnualNova: number,
): Reconciliacao {
  const somaAntiga = editadaAntiga.reduce((total, ponto) => total + ponto, 0);
  const escalada =
    Math.abs(somaAntiga) > RECONCILIACAO_TOLERANCIA
      ? editadaAntiga.map((ponto) => ponto * (GNovo / somaAntiga))
      : trajetoriaBase(GNovo);
  return reconciliar(escalada, GNovo, margemAnualNova);
}

export type SeriesPainelA = {
  semPrograma: PontoMes[]; // margem atual projetada, acumulada (D-03)
  comPrograma: PontoMes[];
  gapMes12: number; // === G por construção
};

// Painel A: margem ACUMULADA sem e com o programa — séries na mesma grandeza
// (correção D-01). A eficiência fica fora: reduz custo, não gera margem.
export function painelA(margemMensalAtual: number, g: number[]): SeriesPainelA {
  const semPrograma: PontoMes[] = [];
  const comPrograma: PontoMes[] = [];
  let acumSem = 0;
  let acumCom = 0;
  for (let mes = 1; mes <= TRAJETORIA_MESES; mes += 1) {
    acumSem += margemMensalAtual;
    acumCom += margemMensalAtual + (g[mes - 1] ?? 0);
    semPrograma.push({ mes, valor: acumSem });
    comPrograma.push({ mes, valor: acumCom });
  }
  return {
    semPrograma,
    comPrograma,
    gapMes12: acumCom - acumSem,
  };
}

export type SeriesPainelB = {
  base: PontoMes[]; // valor acumulado linear — cruza o custo no payback
  editado: PontoMes[] | null; // eficiência linear + performance editada
  custoAnual: number;
  paybackMeses: number;
};

// Painel B: valor acumulado × custo anual da assinatura. O cruzamento da
// série base com o custo acontece exatamente no payback (invariante 7).
export function painelB(
  resultado: { valorAno: number; precoAno: number; eficienciaAno: number },
  gEditada?: number[],
): SeriesPainelB {
  const base: PontoMes[] = [];
  for (let mes = 1; mes <= TRAJETORIA_MESES; mes += 1) {
    base.push({ mes, valor: (resultado.valorAno / TRAJETORIA_MESES) * mes });
  }
  let editado: PontoMes[] | null = null;
  if (gEditada) {
    editado = [];
    let acum = 0;
    for (let mes = 1; mes <= TRAJETORIA_MESES; mes += 1) {
      acum += resultado.eficienciaAno / TRAJETORIA_MESES + (gEditada[mes - 1] ?? 0);
      editado.push({ mes, valor: acum });
    }
  }
  return {
    base,
    editado,
    custoAnual: resultado.precoAno,
    paybackMeses: (resultado.precoAno / resultado.valorAno) * 12,
  };
}

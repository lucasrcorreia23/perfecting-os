// Modelo derivado do estado do visitante: proposta efetiva (defaults
// resolvidos), preço da conta, resultado por time e consolidado. Puro —
// usado pela página pública (recálculo a cada tecla), pelo endpoint de
// autosave (result_summary) e pelo detalhe interno (render do mesmo cálculo).

import { calcResultadoTime, camposFaltando } from "./calc";
import { consolidar, type TimeParaConsolidar } from "./consolidado";
import { progresso } from "./estado";
import { aplicarEstrutura } from "./estrutura";
import { precoConta, rateioPorTime, type TimePreco } from "./preco";
import type {
  CenarioSelecionado,
  EstadoCalculadora,
  EstadoTime,
  PrecoConta,
  ResultadoConsolidado,
} from "./types";

// Assentos efetivos: o que o visitante escolheu ou, por default, os
// vendedores do time ("cobertura 1", caso §14). Sem vendedores declarados
// não existe número — P6 preservado.
export function assentosEfetivos(time: EstadoTime): number | null {
  if (time.proposta.assentos !== null) return time.proposta.assentos;
  const vendedores = time.entradas.numVendedores;
  if (vendedores === null || !Number.isFinite(vendedores) || vendedores <= 0) return null;
  return Math.max(1, Math.round(vendedores));
}

export type TimeModelo = TimeParaConsolidar & {
  precoMes: number;
  // true quando os assentos vieram do default (= vendedores do time).
  assentosDefault: boolean;
  estadoTime: EstadoTime;
};

export type ModeloCalculadora = {
  preco: PrecoConta;
  prazoMeses: number;
  times: TimeModelo[];
  consolidado: ResultadoConsolidado;
};

export function computarModelo(estadoBruto: EstadoCalculadora): ModeloCalculadora {
  // Rateio da estrutura compartilhada (§4.11) antes de qualquer aritmética —
  // daqui para baixo cada time já carrega a fatia que lhe cabe.
  const estado = aplicarEstrutura(estadoBruto);
  const efetivos = estado.times.map((time) => ({
    time,
    assentos: assentosEfetivos(time),
  }));

  const paraPreco: TimePreco[] = efetivos
    .filter((item) => item.assentos !== null)
    .map((item) => ({
      id: item.time.id,
      plano: item.time.proposta.plano,
      assentos: item.assentos!,
    }));
  const preco = precoConta(paraPreco, estado.prazoMeses);
  const rateio = rateioPorTime(paraPreco);

  const times: TimeModelo[] = efetivos.map(({ time, assentos }, index) => {
    const precoMes = assentos !== null ? (rateio.get(time.id) ?? 0) : 0;
    const resultado =
      assentos !== null
        ? calcResultadoTime(
            time.entradas,
            { plano: time.proposta.plano, assentos },
            precoMes,
            time.cenarioSel,
            estado.prazoMeses,
          )
        : // Sem vendedores nem assentos escolhidos: gating normal resolve
          // (numVendedores está na lista de faltantes de todo jeito).
          ({ status: "incompleto", faltando: camposFaltando(time.entradas) } as const);
    return {
      id: time.id,
      nome: time.nome,
      proposta: { plano: time.proposta.plano, assentos: assentos ?? 0 },
      entradas: time.entradas,
      sel: time.cenarioSel,
      resultado,
      precoMes,
      assentosDefault: time.proposta.assentos === null,
      // O time CRU, como está persistido — é o que os formulários editam. As
      // entradas rateadas ficam em `entradas`, para exibir o resultado.
      estadoTime: estadoBruto.times[index],
    };
  });

  return {
    preco,
    prazoMeses: estado.prazoMeses,
    times,
    consolidado: consolidar(times, estado.prazoMeses),
  };
}

// ---------------------------------------------------------------------------
// Resumo para o cache da listagem interna (`result_summary`). O detalhe
// recomputa do `state` — o estado é a fonte da verdade. Inclui a PROPOSTA que
// o visitante montou: é o que ele envia para nós.
// ---------------------------------------------------------------------------

export type ResumoTime = {
  timeId: string;
  nome: string;
  plano: string;
  assentos: number | null;
  status: "incompleto" | "ok";
  roi: number | null;
  paybackMeses: number | null;
  valorAno: number | null;
  cenario: string;
};

export type ResumoLink = {
  v: 2;
  progresso: { preenchidos: number; total: number };
  proposta: { prazoMeses: number; horasMes: number; mensal: number };
  times: ResumoTime[];
  consolidado: { roi: number; paybackMeses: number; valorAno: number } | null;
};

function labelCenario(sel: CenarioSelecionado): string {
  return sel.modo === "preset" ? sel.cenario : "personalizado";
}

export function resumo(estado: EstadoCalculadora): ResumoLink {
  const modelo = computarModelo(estado);
  const prog = progresso(estado);
  return {
    v: 2,
    progresso: { preenchidos: prog.preenchidos, total: prog.total },
    proposta: {
      prazoMeses: modelo.prazoMeses,
      horasMes: modelo.preco.horasMes,
      mensal: modelo.preco.mensal,
    },
    times: modelo.times.map((time) => ({
      timeId: time.id,
      nome: time.nome,
      plano: time.proposta.plano,
      assentos: time.proposta.assentos > 0 ? time.proposta.assentos : null,
      status: time.resultado.status,
      roi: time.resultado.status === "ok" ? time.resultado.roi : null,
      paybackMeses: time.resultado.status === "ok" ? time.resultado.paybackMeses : null,
      valorAno: time.resultado.status === "ok" ? time.resultado.valorAno : null,
      cenario: labelCenario(time.sel),
    })),
    consolidado:
      modelo.consolidado.status === "ok"
        ? {
            roi: modelo.consolidado.roi,
            paybackMeses: modelo.consolidado.paybackMeses,
            valorAno: modelo.consolidado.valorAno,
          }
        : null,
  };
}

// Leitura tolerante do result_summary para a listagem — se o cache estiver
// ausente ou noutra versão, a UI mostra travessão e o detalhe recomputa.
export function parseResumo(json: unknown): ResumoLink | null {
  if (typeof json !== "object" || json === null) return null;
  const fonte = json as Record<string, unknown>;
  if (fonte.v !== 2 || !Array.isArray(fonte.times)) return null;
  return fonte as unknown as ResumoLink;
}

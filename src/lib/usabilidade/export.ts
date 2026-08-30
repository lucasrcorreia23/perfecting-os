/*
 * O arquivo que sai da tela — cópia estrutural de `desafios-export.ts`, pelas
 * mesmas razões e com as mesmas travas.
 *
 * (a) EXPORTA O RECORTE FILTRADO, e o envelope declara "N de M". Abrir um
 *     arquivo com 12 de 300 sessões sem nada dizendo isso lê como perda de
 *     dados, e um dashboard montado sobre ele mentiria em silêncio.
 * (b) O `resumo` é PARÂMETRO, nunca cálculo. Recalcular aqui criaria a segunda
 *     aritmética que este módulo existe para não ter — e `export.test.ts` tem um
 *     teste de FONTE que reprova se este arquivo passar a importar o agregador.
 * (c) Cada resposta vai por id E POR EXTENSO, e o roteiro inteiro vai junto:
 *     arquivo que exige join não serve ao "abrir num HTML", e a FORMA da leitura
 *     não é reconstituível a partir das linhas.
 * (d) Nada de `null` onde o estado importa: `Media` e `EtapaFunil` atravessam
 *     como união discriminada, porque `null` viraria 0 em qualquer `Number(x)`
 *     de um visualizador ingênuo — e "não medido" viraria "zero".
 */

import {
  TESTE_ACHADO_STATUSES,
  TESTE_FLUXOS,
  TESTE_ORIGENS,
  TESTE_PERFIS,
  DESAFIO_SEVERIDADES,
  DESAFIO_TIPOS,
  type DesafioSeveridade,
  type DesafioTipo,
  type TesteAchadoStatus,
  type TesteFluxo,
  type TesteOrigem,
  type TestePerfil,
} from "@/lib/constants";
import type { UsabilidadeDashboard } from "./dashboard";
import { formatarResposta, type RespostaValor, type RespostasMap } from "./respostas";
import { perguntaPorId, ROTEIRO, ROTEIRO_VERSAO } from "./roteiro";
import { codigoSessao, estadoDoVinculo, type EstadoVinculo } from "./sessao";

export const USABILIDADE_EXPORT_FORMATO = "perfecting.usabilidade";
export const USABILIDADE_EXPORT_VERSAO = 1;

export type RespostaExportada = {
  perguntaId: string;
  bloco: string;
  rotulo: string;
  valor: RespostaValor;
  valorLegivel: string;
  foraDoRoteiro: boolean;
};

export type SessaoExportada = {
  id: string;
  codigo: number;
  codigoLegivel: string;
  perfil: TestePerfil;
  perfilLabel: string;
  fluxo: TesteFluxo;
  fluxoLabel: string;
  varejo: boolean;
  realizadoEm: string;
  roteiroVersao: number;
  origem: TesteOrigem;
  origemLabel: string;
  observacoes: string | null;
  respostas: RespostaExportada[];
};

export type AchadoExportado = {
  id: string;
  sessaoId: string;
  sessaoCodigo: number;
  perguntaId: string | null;
  resumo: string;
  trecho: string | null;
  tipo: DesafioTipo;
  tipoLabel: string;
  severidade: DesafioSeveridade;
  severidadeLabel: string;
  status: TesteAchadoStatus;
  statusLabel: string;
  categoria: { id: string; nome: string } | null;
  fluxo: { id: string; nome: string } | null;
  desafioId: string | null;
  desafioCodigo: number | null;
  vinculo: EstadoVinculo;
};

export type UsabilidadeExport = {
  formato: typeof USABILIDADE_EXPORT_FORMATO;
  versao: number;
  geradoEm: string;
  recorte: { total: number; deTotal: number; filtrado: boolean };
  roteiro: {
    versao: number;
    blocos: { id: string; titulo: string; perguntas: string[] }[];
  };
  sessoes: SessaoExportada[];
  achados: AchadoExportado[];
  resumo: UsabilidadeDashboard;
};

export type ExportableSessao = {
  id: string;
  codigo: number;
  perfil: TestePerfil;
  fluxo: TesteFluxo;
  varejo: boolean;
  realizado_em: string;
  roteiro_versao: number;
  origem: TesteOrigem;
  observacoes: string | null;
  respostas: RespostasMap;
};

export type ExportableAchado = {
  id: string;
  sessao_id: string;
  pergunta_id: string | null;
  resumo: string;
  trecho: string | null;
  tipo: DesafioTipo;
  severidade: DesafioSeveridade;
  status: TesteAchadoStatus;
  categoria: { id: string; nome: string } | null;
  fluxo: { id: string; nome: string } | null;
  desafio_id: string | null;
  desafio_codigo: number | null;
};

function paraResposta(perguntaId: string, valor: RespostaValor): RespostaExportada {
  const pergunta = perguntaPorId(perguntaId);
  if (!pergunta) {
    // Resposta de uma versão anterior do roteiro. Ela vai no arquivo com a
    // marca — some daqui é que não pode.
    return {
      perguntaId,
      bloco: "fora_do_roteiro",
      rotulo: perguntaId,
      valor,
      valorLegivel: String(valor),
      foraDoRoteiro: true,
    };
  }
  return {
    perguntaId,
    bloco: pergunta.bloco,
    rotulo: pergunta.rotulo,
    valor,
    // A MESMA formatação da tela: duas formatações fariam a mesma sessão ler
    // como duas.
    valorLegivel: formatarResposta(pergunta, valor),
    foraDoRoteiro: false,
  };
}

function paraSessao(sessao: ExportableSessao): SessaoExportada {
  return {
    id: sessao.id,
    codigo: sessao.codigo,
    codigoLegivel: codigoSessao(sessao.codigo),
    perfil: sessao.perfil,
    perfilLabel: TESTE_PERFIS[sessao.perfil].label,
    fluxo: sessao.fluxo,
    fluxoLabel: TESTE_FLUXOS[sessao.fluxo].label,
    varejo: sessao.varejo,
    realizadoEm: sessao.realizado_em,
    roteiroVersao: sessao.roteiro_versao,
    origem: sessao.origem,
    origemLabel: TESTE_ORIGENS[sessao.origem].label,
    observacoes: sessao.observacoes,
    respostas: Object.entries(sessao.respostas).map(([id, valor]) =>
      paraResposta(id, valor),
    ),
  };
}

function paraAchado(
  achado: ExportableAchado,
  codigoPorSessao: Map<string, number>,
): AchadoExportado {
  return {
    id: achado.id,
    sessaoId: achado.sessao_id,
    sessaoCodigo: codigoPorSessao.get(achado.sessao_id) ?? 0,
    perguntaId: achado.pergunta_id,
    resumo: achado.resumo,
    trecho: achado.trecho,
    tipo: achado.tipo,
    tipoLabel: DESAFIO_TIPOS[achado.tipo].label,
    severidade: achado.severidade,
    severidadeLabel: DESAFIO_SEVERIDADES[achado.severidade].label,
    status: achado.status,
    statusLabel: TESTE_ACHADO_STATUSES[achado.status].label,
    categoria: achado.categoria,
    fluxo: achado.fluxo,
    desafioId: achado.desafio_id,
    desafioCodigo: achado.desafio_codigo,
    // Resolvido aqui e não no visualizador: reimplementar os três estados lá
    // fora é como se perde a distinção entre "nunca virou desafio" e "virou e o
    // desafio foi excluído".
    vinculo: estadoDoVinculo(achado),
  };
}

export function usabilidadeParaJson({
  sessoes,
  achados,
  resumo,
  deTotal,
  geradoEm,
}: {
  sessoes: ExportableSessao[];
  achados: ExportableAchado[];
  resumo: UsabilidadeDashboard;
  deTotal: number;
  geradoEm: string;
}): UsabilidadeExport {
  const codigoPorSessao = new Map(sessoes.map((sessao) => [sessao.id, sessao.codigo]));

  return {
    formato: USABILIDADE_EXPORT_FORMATO,
    versao: USABILIDADE_EXPORT_VERSAO,
    geradoEm,
    recorte: {
      total: sessoes.length,
      deTotal,
      filtrado: sessoes.length !== deTotal,
    },
    roteiro: {
      versao: ROTEIRO_VERSAO,
      blocos: ROTEIRO.map((bloco) => ({
        id: bloco.id,
        titulo: bloco.titulo,
        perguntas: bloco.perguntas.map((pergunta) => pergunta.id),
      })),
    },
    sessoes: sessoes.map(paraSessao),
    achados: achados.map((achado) => paraAchado(achado, codigoPorSessao)),
    resumo,
  };
}

export function usabilidadeParaTexto(payload: UsabilidadeExport): string {
  return JSON.stringify(payload, null, 2);
}

// Local, não uma generalização de `jsonFilename` — aquele hardcoda o fallback
// "desafios", e um parâmetro a mais só moveria a string para a chamada.
export function usabilidadeFilename(prefix: string, isoDate: string): string {
  const slug = prefix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = new Date(isoDate);
  const stamp = Number.isNaN(date.getTime())
    ? ""
    : `-${date.toISOString().slice(0, 10)}`;
  return `${slug || "usabilidade"}${stamp}.json`;
}

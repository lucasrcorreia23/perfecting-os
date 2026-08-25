import {
  DESAFIO_SEVERIDADES,
  DESAFIO_STATUSES,
  DESAFIO_TIPOS,
  type DesafioSeveridade,
  type DesafioStatus,
  type DesafioTipo,
} from "@/lib/constants";
import { codigoDesafio, recorrenciaDoDesafio, type Recorrencia } from "@/lib/desafios";
import type { DesafiosDashboard, TaxonomiaLinha } from "@/lib/desafios-dashboard";

/*
 * O envelope JSON do módulo Desafios — puro, montado no browser a partir do que
 * já está hidratado na tela (mesmo arranjo de marketing-lead-export.ts: não há
 * rota nem action de export).
 *
 * O consumidor é um HTML avulso, então o arquivo tem de ser AUTOCONTIDO: cada
 * desafio carrega a categoria e o fluxo por extenso, e a recorrência vai como a
 * união discriminada — nunca como número solto, senão o não-valor morreria na
 * fronteira do arquivo (qualquer `Number(x)` ingênuo transformaria `null` em 0,
 * e "não medido" viraria "nunca falhou").
 */

export const DESAFIOS_EXPORT_FORMATO = "perfecting.desafios";
export const DESAFIOS_EXPORT_VERSAO = 1;

export type TaxonomiaExportada = {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  arquivada: boolean;
};

export type OcorrenciaExportada = {
  ocorridoEm: string;
  tentativas: number;
  falhas: number;
  nota: string | null;
  ambiente: string | null;
};

export type DesafioExportado = {
  id: string;
  codigo: number;
  codigoLegivel: string;
  titulo: string;
  tipo: DesafioTipo;
  tipoLabel: string;
  status: DesafioStatus;
  statusLabel: string;
  severidade: DesafioSeveridade;
  severidadeLabel: string;
  categoria: { id: string; nome: string; cor: string } | null;
  fluxo: { id: string; nome: string; cor: string } | null;
  recorrencia: Recorrencia;
  contador: { tentativas: number; falhas: number };
  ocorrencias: OcorrenciaExportada[];
  descricao: string | null;
  passos: string | null;
  esperado: string | null;
  obtido: string | null;
  ambiente: string | null;
  rota: string | null;
  evidenciaUrl: string | null;
  resolucao: string | null;
  resolvidoEm: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type DesafiosExport = {
  formato: typeof DESAFIOS_EXPORT_FORMATO;
  versao: number;
  geradoEm: string;
  // Abrir um arquivo com 23 de 300 registros sem nada dizendo isso lê como
  // perda de dados — e um dashboard montado sobre ele mentiria em silêncio.
  recorte: { total: number; deTotal: number; filtrado: boolean };
  taxonomias: { categorias: TaxonomiaExportada[]; fluxos: TaxonomiaExportada[] };
  desafios: DesafioExportado[];
  resumo: DesafiosDashboard;
};

// Estruturalmente compatível com o DesafioRow das telas.
export type ExportableDesafio = {
  id: string;
  codigo: number;
  titulo: string;
  descricao: string | null;
  tipo: DesafioTipo;
  severidade: DesafioSeveridade;
  status: DesafioStatus;
  categoria: { id: string; nome: string; cor: string } | null;
  fluxo: { id: string; nome: string; cor: string } | null;
  tentativas: number;
  falhas: number;
  ocorrencias: {
    ocorrido_em: string;
    tentativas: number;
    falhas: number;
    nota: string | null;
    ambiente: string | null;
  }[];
  passos: string | null;
  esperado: string | null;
  obtido: string | null;
  ambiente: string | null;
  rota: string | null;
  evidencia_url: string | null;
  resolucao: string | null;
  resolvido_em: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

/*
 * `resumo` é PARÂMETRO, não cálculo. Esta função recebe o DesafiosDashboard que
 * a tela já produziu e o serializa — ela não soma, não divide e não agrega
 * nada. É o que impede o arquivo de carregar uma segunda aritmética que
 * divergiria da tela no primeiro ajuste do motor. `desafios-export.test.ts`
 * guarda as duas pontas: a identidade do resumo e a ausência de agregação aqui.
 */
export function desafiosParaJson({
  desafios,
  categorias,
  fluxos,
  resumo,
  deTotal,
  geradoEm,
}: {
  desafios: ExportableDesafio[];
  categorias: TaxonomiaLinha[];
  fluxos: TaxonomiaLinha[];
  resumo: DesafiosDashboard;
  deTotal: number;
  geradoEm: string;
}): DesafiosExport {
  return {
    formato: DESAFIOS_EXPORT_FORMATO,
    versao: DESAFIOS_EXPORT_VERSAO,
    geradoEm,
    recorte: {
      total: desafios.length,
      deTotal,
      filtrado: desafios.length !== deTotal,
    },
    // O eixo completo e ordenado vai no topo, inclusive as linhas sem desafio
    // no recorte: a FORMA da matriz não é reconstituível a partir das linhas.
    taxonomias: {
      categorias: categorias.map(paraTaxonomia),
      fluxos: fluxos.map(paraTaxonomia),
    },
    desafios: desafios.map(paraDesafio),
    resumo,
  };
}

function paraTaxonomia(linha: TaxonomiaLinha): TaxonomiaExportada {
  return {
    id: linha.id,
    nome: linha.nome,
    cor: linha.cor,
    ordem: linha.ordem,
    arquivada: linha.arquivada,
  };
}

function paraDesafio(desafio: ExportableDesafio): DesafioExportado {
  return {
    id: desafio.id,
    codigo: desafio.codigo,
    codigoLegivel: codigoDesafio(desafio.codigo),
    titulo: desafio.titulo,
    tipo: desafio.tipo,
    tipoLabel: DESAFIO_TIPOS[desafio.tipo].label,
    status: desafio.status,
    statusLabel: DESAFIO_STATUSES[desafio.status].label,
    severidade: desafio.severidade,
    severidadeLabel: DESAFIO_SEVERIDADES[desafio.severidade].label,
    categoria: desafio.categoria,
    fluxo: desafio.fluxo,
    // A regra "log vence contador" viaja RESOLVIDA, e o contador vai junto: sem
    // ele a proporção não seria auditável, com ele reimplementado lá fora seria
    // reimplementado errado.
    recorrencia: recorrenciaDoDesafio(desafio),
    contador: { tentativas: desafio.tentativas, falhas: desafio.falhas },
    ocorrencias: desafio.ocorrencias.map((ocorrencia) => ({
      ocorridoEm: ocorrencia.ocorrido_em,
      tentativas: ocorrencia.tentativas,
      falhas: ocorrencia.falhas,
      nota: ocorrencia.nota,
      ambiente: ocorrencia.ambiente,
    })),
    descricao: desafio.descricao,
    passos: desafio.passos,
    esperado: desafio.esperado,
    obtido: desafio.obtido,
    ambiente: desafio.ambiente,
    rota: desafio.rota,
    evidenciaUrl: desafio.evidencia_url,
    resolucao: desafio.resolucao,
    resolvidoEm: desafio.resolvido_em,
    observacoes: desafio.observacoes,
    criadoEm: desafio.created_at,
    atualizadoEm: desafio.updated_at,
  };
}

// Indentado de propósito: o arquivo existe para ser aberto e lido por quem vai
// montar o HTML de visualização.
export function desafiosParaTexto(payload: DesafiosExport): string {
  return JSON.stringify(payload, null, 2);
}

/*
 * Nome de arquivo local, e não uma generalização de csvFilename: aquele
 * hardcoda ".csv" e o fallback "leads", e generalizá-lo mexeria num módulo
 * testado por ganho zero aqui.
 */
export function jsonFilename(prefix: string, isoDate: string): string {
  const slug = prefix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = new Date(isoDate);
  const stamp = Number.isNaN(date.getTime()) ? "" : `-${date.toISOString().slice(0, 10)}`;
  return `${slug || "desafios"}${stamp}.json`;
}

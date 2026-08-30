import type { TesteFluxo, TesteOrigem, TestePerfil } from "@/lib/constants";
import { parseRespostas, type RespostasMap } from "@/lib/usabilidade/respostas";

/*
 * Colunas listadas uma a uma, e NÃO `*`. A transcrição já mora noutra tabela
 * justamente para que um `*` distraído não a arraste para a listagem — listar
 * as colunas é a segunda tranca, de graça.
 */
export const SESSAO_SELECT =
  "id, codigo, perfil, fluxo, varejo, realizado_em, roteiro_versao, respostas, origem, observacoes, created_at, updated_at";

export type SessaoRow = {
  id: string;
  codigo: number;
  perfil: TestePerfil;
  fluxo: TesteFluxo;
  varejo: boolean;
  realizado_em: string;
  roteiro_versao: number;
  respostas: RespostasMap;
  origem: TesteOrigem;
  observacoes: string | null;
  created_at: string;
  achados: number;
};

type LinhaBruta = {
  id: string;
  codigo: number;
  perfil: TestePerfil;
  fluxo: TesteFluxo;
  varejo: boolean;
  realizado_em: string;
  roteiro_versao: number;
  respostas: unknown;
  origem: TesteOrigem;
  observacoes: string | null;
  created_at: string;
  teste_achados?: { count: number }[] | { count: number } | null;
};

// O embed de contagem do PostgREST volta como objeto ou array conforme a
// cardinalidade — mesmo cuidado do helper `um()` de `mapear-desafio.ts`.
function contagem(bruto: LinhaBruta["teste_achados"]): number {
  if (!bruto) return 0;
  if (Array.isArray(bruto)) return bruto[0]?.count ?? 0;
  return bruto.count ?? 0;
}

export function toSessaoRow(linha: LinhaBruta): SessaoRow {
  return {
    id: linha.id,
    codigo: linha.codigo,
    perfil: linha.perfil,
    fluxo: linha.fluxo,
    varejo: linha.varejo,
    realizado_em: linha.realizado_em,
    roteiro_versao: linha.roteiro_versao,
    respostas: parseRespostas(linha.respostas),
    origem: linha.origem,
    observacoes: linha.observacoes,
    created_at: linha.created_at,
    achados: contagem(linha.teste_achados),
  };
}

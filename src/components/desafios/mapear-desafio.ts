import type { DesafioRow } from "./desafios-view";

/*
 * Mapeia a linha do PostgREST (com os embeds de categoria, fluxo e ocorrências)
 * para o tipo que as telas consomem. Vive num módulo próprio porque a listagem
 * e o detalhe leem a MESMA forma — duplicar o mapeamento faria as duas telas
 * divergirem no primeiro campo novo.
 */

// Um embed "para um" chega como objeto ou como array de um item conforme o
// inferidor — o mesmo defensivo usado no módulo Marketing.
function um<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

// A linha vem do PostgREST com embeds que o tipo gerado não descreve.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function toDesafioRow(linha: any): DesafioRow {
  return {
    id: linha.id,
    codigo: linha.codigo,
    titulo: linha.titulo,
    descricao: linha.descricao,
    tipo: linha.tipo,
    severidade: linha.severidade,
    status: linha.status,
    categoria: um<{ id: string; nome: string; cor: string }>(linha.desafio_categorias),
    fluxo: um<{ id: string; nome: string; cor: string }>(linha.desafio_fluxos),
    tentativas: linha.tentativas,
    falhas: linha.falhas,
    ocorrencias: (linha.desafio_ocorrencias ?? [])
      .map((ocorrencia: any) => ({
        id: ocorrencia.id,
        ocorrido_em: ocorrencia.ocorrido_em,
        tentativas: ocorrencia.tentativas,
        falhas: ocorrencia.falhas,
        nota: ocorrencia.nota,
        ambiente: ocorrencia.ambiente,
      }))
      // O embed não aceita `order`, então a ordenação é aqui: mais recente
      // primeiro, como toda lista do produto.
      .sort((a: { ocorrido_em: string }, b: { ocorrido_em: string }) =>
        b.ocorrido_em.localeCompare(a.ocorrido_em),
      ),
    passos: linha.passos,
    esperado: linha.esperado,
    obtido: linha.obtido,
    ambiente: linha.ambiente,
    rota: linha.rota,
    evidencia_url: linha.evidencia_url,
    resolucao: linha.resolucao,
    resolvido_em: linha.resolvido_em,
    observacoes: linha.observacoes,
    created_at: linha.created_at,
    updated_at: linha.updated_at,
  };
}

// Recorte que a listagem e o detalhe pedem ao PostgREST. Uma constante só, pelo
// mesmo motivo do mapeador.
export const DESAFIO_SELECT = `
  *,
  desafio_categorias(id, nome, cor),
  desafio_fluxos(id, nome, cor),
  desafio_ocorrencias(id, ocorrido_em, tentativas, falhas, nota, ambiente)
`;

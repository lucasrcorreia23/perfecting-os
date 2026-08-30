"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { PALETA } from "@/lib/constants";
import { validateTaxonomiaInput, type TaxonomiaInput } from "@/lib/desafios";
import type { ActionResult } from "./clients";

/*
 * Categorias e fluxos do módulo Desafios. As duas tabelas são simétricas de
 * propósito, então cada operação é escrita uma vez e parametrizada pela tabela
 * — o que muda entre elas é só o nome da coluna de arquivamento (`arquivada`
 * contra `arquivado`, porque em pt-BR o gênero acompanha o substantivo).
 */

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";
const NOME_DUPLICADO = "23505"; // unique_violation

type Eixo = "categoria" | "fluxo";

const EIXOS = {
  categoria: {
    tabela: "desafio_categorias",
    coluna: "categoria_id",
    artigo: "Esta categoria",
    duplicado: "Já existe uma categoria com esse nome.",
  },
  fluxo: {
    tabela: "desafio_fluxos",
    coluna: "fluxo_id",
    artigo: "Este fluxo",
    duplicado: "Já existe um fluxo com esse nome.",
  },
} as const;

async function requireInternoActor() {
  if (!isSupabaseConfigured()) return null;
  const session = await getSessionProfile();
  if (!session || session.profile?.role !== "interno") return null;
  return session;
}

// Um desafio novo, uma categoria renomeada e um fluxo arquivado mudam a matriz
// do dashboard — os três caminhos revalidam as três telas.
function revalidateTaxonomiaPaths() {
  revalidatePath("/desafios");
  revalidatePath("/desafios/dashboard");
  revalidatePath("/desafios/taxonomias");
}

export async function createTaxonomia(
  eixo: Eixo,
  nome: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const config = EIXOS[eixo];
  const input: TaxonomiaInput = { nome, cor: PALETA.grafite, ordem: 0 };
  const invalid = validateTaxonomiaInput(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from(config.tabela)
    .insert({ nome: nome.trim(), cor: input.cor })
    .select("id")
    .single();

  // O índice único é sobre lower(btrim(nome)): é ele que impede "Checkout" e
  // "checkout" de virarem duas linhas no cruzamento. A frase precisa dizer isso
  // em vez de cair no erro genérico.
  if (error?.code === NOME_DUPLICADO) return { ok: false, error: config.duplicado };
  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  revalidateTaxonomiaPaths();
  return { ok: true, data: { id: data.id } };
}

export async function updateTaxonomia(
  eixo: Eixo,
  id: string,
  input: TaxonomiaInput & { descricao: string | null },
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const config = EIXOS[eixo];
  const invalid = validateTaxonomiaInput(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from(config.tabela)
    .update({
      nome: input.nome.trim(),
      cor: input.cor,
      ordem: input.ordem,
      descricao: input.descricao?.trim() || null,
    })
    .eq("id", id);

  if (error?.code === NOME_DUPLICADO) return { ok: false, error: config.duplicado };
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateTaxonomiaPaths();
  return { ok: true, data: undefined };
}

// Arquivar tira do seletor de "novo desafio" sem tocar no histórico: a linha
// continua na matriz, na listagem e no export enquanto tiver desafios.
export async function setTaxonomiaArquivada(
  eixo: Eixo,
  id: string,
  arquivada: boolean,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  // As duas colunas se chamam diferente porque em pt-BR o gênero acompanha o
  // substantivo (categoria arquivadA, fluxo arquivadO). Uma chave computada
  // alargaria o tipo para `string` e o cliente tipado do Supabase recusaria o
  // patch — daí o ramo explícito, que é o preço de manter os nomes certos.
  const { error } =
    eixo === "categoria"
      ? await supabase
          .from("desafio_categorias")
          .update({ arquivada })
          .eq("id", id)
      : await supabase
          .from("desafio_fluxos")
          .update({ arquivado: arquivada })
          .eq("id", id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateTaxonomiaPaths();
  return { ok: true, data: undefined };
}

export async function deleteTaxonomia(
  eixo: Eixo,
  id: string,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const config = EIXOS[eixo];
  const supabase = await createServerSupabase();

  // A FK é `on delete restrict`, e ela sozinha devolveria um 23503 que viraria
  // o erro genérico. Contar antes é o que permite dizer o número — molde exato
  // de deleteFunnel. Apagar não é opção: destruiria o cruzamento de N
  // registros em silêncio, o oposto do que o módulo existe para fazer.
  const [desafiosRes, achadosRes] = await Promise.all([
    supabase.from("desafios").select("id", { count: "exact", head: true }).eq(config.coluna, id),
    // Achados de teste de usabilidade também referenciam a taxonomia com
    // `on delete restrict`. Contar só desafios faria esta frase mentir: ela
    // diria "tem 0 desafio(s)", o DELETE falharia com 23503 por causa dos
    // achados, e a pessoa veria o erro genérico sem saber o que a segura.
    supabase.from("teste_achados").select("id", { count: "exact", head: true }).eq(`${config.coluna}`, id),
  ]);

  const desafios = desafiosRes.count ?? 0;
  const achados = achadosRes.count ?? 0;

  if (desafios + achados > 0) {
    const partes = [
      desafios > 0 ? `${desafios} desafio(s)` : null,
      achados > 0 ? `${achados} achado(s) de teste` : null,
    ].filter(Boolean);
    return {
      ok: false,
      error: `${config.artigo} tem ${partes.join(" e ")}. Arquive em vez de excluir.`,
    };
  }

  const { error } = await supabase.from(config.tabela).delete().eq("id", id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateTaxonomiaPaths();
  return { ok: true, data: undefined };
}

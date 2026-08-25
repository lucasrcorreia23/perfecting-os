"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import {
  DESAFIO_SEVERIDADES,
  DESAFIO_STATUSES,
  DESAFIO_TIPOS,
  type DesafioSeveridade,
  type DesafioStatus,
  type DesafioTipo,
} from "@/lib/constants";
import {
  validateDesafioInput,
  validateOcorrenciaInput,
  type Medicao,
} from "@/lib/desafios";
import type { TablesUpdate } from "@/lib/database.types";
import type { ActionResult } from "./clients";

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";

async function requireInternoActor() {
  if (!isSupabaseConfigured()) return null;
  const session = await getSessionProfile();
  if (!session || session.profile?.role !== "interno") return null;
  return session;
}

// Um desafio novo ou editado muda a matriz do dashboard, então os dois sempre
// revalidam juntos. `revalidateTag` exige 2º argumento no Next 16 — aqui é só
// revalidatePath, como no resto do projeto.
function revalidateDesafioPaths(desafioId?: string) {
  revalidatePath("/desafios");
  revalidatePath("/desafios/dashboard");
  if (desafioId) revalidatePath(`/desafios/${desafioId}`);
}

export type NovoDesafioInput = {
  titulo: string;
  tipo: DesafioTipo;
  severidade: DesafioSeveridade;
  categoria_id: string | null;
  fluxo_id: string | null;
};

export type DesafioFormInput = {
  titulo: string;
  descricao: string;
  tipo: DesafioTipo;
  severidade: DesafioSeveridade;
  categoria_id: string | null;
  fluxo_id: string | null;
  tentativas: number;
  falhas: number;
  passos: string;
  esperado: string;
  obtido: string;
  ambiente: string;
  rota: string;
  evidencia_url: string;
  resolucao: string;
  observacoes: string;
};

function limpar(texto: string): string | null {
  return texto?.trim() ? texto.trim() : null;
}

export async function createDesafio(
  input: NovoDesafioInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  // O cadastro rápido não pede contador: quem abre o modal ainda não mediu
  // nada, e exigir um placar aqui produziria "0 de 0" — que é ausência de
  // medição fingindo ser medição.
  const invalid = validateDesafioInput({
    titulo: input.titulo,
    tentativas: 0,
    falhas: 0,
  });
  if (invalid) return { ok: false, error: invalid };
  if (!(input.tipo in DESAFIO_TIPOS)) return { ok: false, error: "Tipo inválido." };
  if (!(input.severidade in DESAFIO_SEVERIDADES))
    return { ok: false, error: "Severidade inválida." };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("desafios")
    .insert({
      titulo: input.titulo.trim(),
      tipo: input.tipo,
      severidade: input.severidade,
      categoria_id: input.categoria_id,
      fluxo_id: input.fluxo_id,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  revalidateDesafioPaths();
  return { ok: true, data: { id: data.id } };
}

export async function updateDesafio(
  desafioId: string,
  input: DesafioFormInput,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const invalid = validateDesafioInput({
    titulo: input.titulo,
    tentativas: input.tentativas,
    falhas: input.falhas,
    evidencia_url: input.evidencia_url,
  });
  if (invalid) return { ok: false, error: invalid };
  if (!(input.tipo in DESAFIO_TIPOS)) return { ok: false, error: "Tipo inválido." };
  if (!(input.severidade in DESAFIO_SEVERIDADES))
    return { ok: false, error: "Severidade inválida." };

  const supabase = await createServerSupabase();
  const patch: TablesUpdate<"desafios"> = {
    titulo: input.titulo.trim(),
    descricao: limpar(input.descricao),
    tipo: input.tipo,
    severidade: input.severidade,
    categoria_id: input.categoria_id,
    fluxo_id: input.fluxo_id,
    tentativas: input.tentativas,
    falhas: input.falhas,
    passos: limpar(input.passos),
    esperado: limpar(input.esperado),
    obtido: limpar(input.obtido),
    ambiente: limpar(input.ambiente),
    rota: limpar(input.rota),
    evidencia_url: limpar(input.evidencia_url),
    resolucao: limpar(input.resolucao),
    observacoes: limpar(input.observacoes),
  };

  const { error } = await supabase.from("desafios").update(patch).eq("id", desafioId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateDesafioPaths(desafioId);
  return { ok: true, data: undefined };
}

/*
 * Transição de estado é action DEDICADA, nunca um update genérico: é ela que
 * mantém a invariante `resolvido ⇒ resolvido_em` (CHECK no banco, espelhando
 * marketing_posts_published_at_required). Sair de "resolvido" limpa a data —
 * senão um desafio reaberto continuaria carimbado como resolvido.
 */
export async function setDesafioStatus(
  desafioId: string,
  status: DesafioStatus,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };
  if (!(status in DESAFIO_STATUSES)) return { ok: false, error: "Status inválido." };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("desafios")
    .update({
      status,
      resolvido_em: status === "resolvido" ? new Date().toISOString() : null,
    })
    .eq("id", desafioId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateDesafioPaths(desafioId);
  return { ok: true, data: undefined };
}

export async function deleteDesafio(desafioId: string): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  // As ocorrências caem por cascade — elas só existem para medir este desafio.
  const { error } = await supabase.from("desafios").delete().eq("id", desafioId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateDesafioPaths();
  return { ok: true, data: undefined };
}

// =============================================================================
// Ocorrências — o log que vence o contador
// =============================================================================

export type OcorrenciaFormInput = Medicao & {
  ocorrido_em: string; // ISO
  nota: string;
  ambiente: string;
};

export async function addOcorrencia(
  desafioId: string,
  input: OcorrenciaFormInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const invalid = validateOcorrenciaInput(input);
  if (invalid) return { ok: false, error: invalid };

  const quando = new Date(input.ocorrido_em);
  if (Number.isNaN(quando.getTime())) return { ok: false, error: "Data inválida." };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("desafio_ocorrencias")
    .insert({
      desafio_id: desafioId,
      ocorrido_em: quando.toISOString(),
      tentativas: input.tentativas,
      falhas: input.falhas,
      nota: limpar(input.nota),
      ambiente: limpar(input.ambiente),
      registrado_por: session.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  revalidateDesafioPaths(desafioId);
  return { ok: true, data: { id: data.id } };
}

// Ocorrência é medição imutável: não há editar, só registrar e excluir. Por
// isso a UI oferece exclusão — é como se corrige um número errado.
export async function deleteOcorrencia(
  ocorrenciaId: string,
  desafioId: string,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("desafio_ocorrencias")
    .delete()
    .eq("id", ocorrenciaId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateDesafioPaths(desafioId);
  return { ok: true, data: undefined };
}

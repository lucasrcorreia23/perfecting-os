"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import type { FunnelStatus } from "@/lib/constants";
import {
  funnelMaxScore,
  parseQuestions,
  questionsToJson,
  validateFunnelSchema,
  type FunnelQuestion,
  type FunnelThresholds,
} from "@/lib/marketing-funnel";
import { isValidSlug, uniqueSlug } from "@/lib/marketing-slug";
import type { Json } from "@/lib/database.types";
import type { ActionResult } from "./clients";

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";

async function requireInternoActor() {
  if (!isSupabaseConfigured()) return null;
  const session = await getSessionProfile();
  if (!session || session.profile?.role !== "interno") return null;
  return session;
}

function revalidateFunnelPaths(funnelId?: string) {
  revalidatePath("/marketing/funis");
  if (funnelId) revalidatePath(`/marketing/funis/${funnelId}`);
}

async function nextFreeSlug(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  base: string,
  ignoreId?: string,
): Promise<string> {
  const query = supabase.from("marketing_funnels").select("slug");
  const { data } = ignoreId ? await query.neq("id", ignoreId) : await query;
  return uniqueSlug(base, (data ?? []).map((row) => row.slug));
}

export async function createFunnel(
  name: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const cleanName = name.trim();
  if (!cleanName) return { ok: false, error: "Informe o nome do funil." };

  const supabase = await createServerSupabase();
  const slug = await nextFreeSlug(supabase, cleanName);
  if (!slug) {
    return {
      ok: false,
      error: "O nome precisa ter ao menos uma letra ou número.",
    };
  }

  const { data, error } = await supabase
    .from("marketing_funnels")
    .insert({ name: cleanName, slug, created_by: session.userId })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  revalidateFunnelPaths();
  return { ok: true, data: { id: data.id } };
}

export type FunnelInput = {
  name: string;
  slug: string;
  description?: string | null;
  submit_label: string;
  success_message: string;
  redirect_url?: string | null;
  questions: FunnelQuestion[];
  thresholds: FunnelThresholds;
};

function validateFunnelInput(input: FunnelInput): string | null {
  if (!input.name?.trim()) return "Informe o nome do funil.";
  if (!input.slug?.trim()) return "Informe o slug do funil.";
  if (!isValidSlug(input.slug.trim()))
    return "Slug inválido. Use apenas letras minúsculas, números e hífens.";
  if (!input.submit_label?.trim()) return "Informe o texto do botão de envio.";
  if (!input.success_message?.trim()) return "Informe a mensagem de sucesso.";
  if (input.redirect_url && !/^https?:\/\/.+/i.test(input.redirect_url.trim()))
    return "A URL de redirecionamento deve começar com http:// ou https://.";
  for (const key of ["morno", "quente"] as const) {
    const value = input.thresholds?.[key];
    if (!Number.isFinite(value) || value < 0 || value > 100)
      return "Os limiares de qualificação devem estar entre 0 e 100.";
  }
  // O schema só é exigido completo na publicação — o rascunho pode ficar meio
  // montado. Aqui vale só o que já foi preenchido.
  if (input.questions.length > 0) return validateFunnelSchema(input.questions);
  return null;
}

export async function updateFunnel(
  funnelId: string,
  input: FunnelInput,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const invalid = validateFunnelInput(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("marketing_funnels")
    .select("id, slug")
    .eq("id", funnelId)
    .single();
  if (!current) return { ok: false, error: "Funil não encontrado." };

  let slug = input.slug.trim();
  if (slug !== current.slug) {
    const free = await nextFreeSlug(supabase, slug, funnelId);
    if (!free) return { ok: false, error: "Slug inválido." };
    slug = free;
  }

  const { error } = await supabase
    .from("marketing_funnels")
    .update({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      submit_label: input.submit_label.trim(),
      success_message: input.success_message.trim(),
      redirect_url: input.redirect_url?.trim() || null,
      questions: questionsToJson(input.questions),
      score_thresholds: {
        morno: input.thresholds.morno,
        quente: input.thresholds.quente,
      } as Json,
    })
    .eq("id", funnelId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateFunnelPaths(funnelId);
  return { ok: true, data: undefined };
}

// Publicar congela o schema numa versão imutável. O rascunho segue editável
// sem afetar o site; leads antigos continuam apontando para a versão que viram.
export async function publishFunnel(
  funnelId: string,
): Promise<ActionResult<{ version: number }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data: funnel } = await supabase
    .from("marketing_funnels")
    .select("id, questions, score_thresholds")
    .eq("id", funnelId)
    .single();
  if (!funnel) return { ok: false, error: "Funil não encontrado." };

  const questions = parseQuestions(funnel.questions);
  const invalid = validateFunnelSchema(questions);
  if (invalid) return { ok: false, error: invalid };

  const { data: last } = await supabase
    .from("marketing_funnel_versions")
    .select("version")
    .eq("funnel_id", funnelId)
    .order("version", { ascending: false })
    .limit(1);

  const version = (last?.[0]?.version ?? 0) + 1;

  const { data: created, error: versionError } = await supabase
    .from("marketing_funnel_versions")
    .insert({
      funnel_id: funnelId,
      version,
      questions: questionsToJson(questions),
      score_max: funnelMaxScore(questions),
      thresholds: funnel.score_thresholds,
      published_by: session.userId,
    })
    .select("id")
    .single();
  if (versionError || !created) return { ok: false, error: GENERIC_ERROR };

  const { error } = await supabase
    .from("marketing_funnels")
    .update({ status: "publicado", published_version_id: created.id })
    .eq("id", funnelId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateFunnelPaths(funnelId);
  return { ok: true, data: { version } };
}

// Despublicar/arquivar mantém as versões: o histórico dos leads não pode sumir.
export async function setFunnelStatus(
  funnelId: string,
  status: FunnelStatus,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };
  if (status === "publicado") {
    return { ok: false, error: "Use a ação de publicar para publicar o funil." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("marketing_funnels")
    .update({ status })
    .eq("id", funnelId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateFunnelPaths(funnelId);
  return { ok: true, data: undefined };
}

export async function deleteFunnel(funnelId: string): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  // A FK é cascade, mas apagar leads é destruir histórico comercial.
  const { count } = await supabase
    .from("marketing_leads")
    .select("id", { count: "exact", head: true })
    .eq("funnel_id", funnelId);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Este funil tem ${count} lead(s). Arquive-o em vez de excluir.`,
    };
  }

  const { error } = await supabase
    .from("marketing_funnels")
    .delete()
    .eq("id", funnelId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateFunnelPaths();
  return { ok: true, data: undefined };
}

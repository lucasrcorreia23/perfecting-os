"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import {
  ACTIVITY_STATUSES,
  ATIVIDADE_TIPOS,
  RESPONSAVEIS,
  STAGES,
  type ActivityStatus,
  type AtividadeTipo,
  type Responsavel,
  type WorkflowStage,
} from "@/lib/constants";
import type { ActionResult } from "./clients";

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";

async function requireInternoActor() {
  if (!isSupabaseConfigured()) return null;
  const session = await getSessionProfile();
  if (!session || session.profile?.role !== "interno") return null;
  return session;
}

function revalidateActivityPaths(clientId: string) {
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
  revalidatePath("/workflow");
  revalidatePath("/");
}

export type ActivityInput = {
  title: string;
  description?: string;
  stage: WorkflowStage;
  due_date?: string; // YYYY-MM-DD
  responsavel?: Responsavel | ""; // "" = sem categoria
  tipo?: AtividadeTipo | ""; // "" = sem tipo
};

function validateActivityInput(input: ActivityInput): string | null {
  if (!input.title?.trim()) return "Informe o título da atividade.";
  if (!(input.stage in STAGES)) return "Etapa inválida.";
  if (input.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(input.due_date)) {
    return "Prazo inválido.";
  }
  if (input.responsavel && !(input.responsavel in RESPONSAVEIS)) {
    return "Responsável inválido.";
  }
  if (input.tipo && !(input.tipo in ATIVIDADE_TIPOS)) {
    return "Tipo inválido.";
  }
  return null;
}

export async function createActivity(
  clientId: string,
  input: ActivityInput,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const invalid = validateActivityInput(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createServerSupabase();

  const { data: last } = await supabase
    .from("activities")
    .select("position")
    .eq("client_id", clientId)
    .eq("stage", input.stage)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("activities")
    .insert({
      client_id: clientId,
      stage: input.stage,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      due_date: input.due_date || null,
      responsavel: input.responsavel || null,
      tipo: input.tipo || null,
      position: (last?.position ?? -1) + 1,
    })
    .select("title")
    .single();

  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  await supabase.from("events").insert({
    client_id: clientId,
    actor_id: session.userId,
    type: "atividade_criada",
    payload: { title: data.title },
  });

  revalidateActivityPaths(clientId);
  return { ok: true, data: undefined };
}

export async function updateActivity(
  id: string,
  input: ActivityInput,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const invalid = validateActivityInput(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("activities")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      stage: input.stage,
      due_date: input.due_date || null,
      responsavel: input.responsavel || null,
      tipo: input.tipo || null,
    })
    .eq("id", id)
    .select("client_id")
    .single();

  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  revalidateActivityPaths(data.client_id);
  return { ok: true, data: undefined };
}

export async function updateActivityStatus(
  id: string,
  status: ActivityStatus,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };
  if (!(status in ACTIVITY_STATUSES)) {
    return { ok: false, error: "Status inválido." };
  }

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("activities")
    .select("status, title, client_id")
    .eq("id", id)
    .single();
  if (!current) return { ok: false, error: "Atividade não encontrada." };

  const { error } = await supabase
    .from("activities")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  // Evento apenas na transição para concluída.
  if (status === "concluida" && current.status !== "concluida") {
    await supabase.from("events").insert({
      client_id: current.client_id,
      actor_id: session.userId,
      type: "atividade_concluida",
      payload: { title: current.title },
    });
  }

  revalidateActivityPaths(current.client_id);
  return { ok: true, data: undefined };
}

// Define (ou remove, com null) o responsável da atividade. assigneeId deve ser
// um membro interno; a FK garante que referencie um profile válido.
export async function setActivityAssignee(
  id: string,
  assigneeId: string | null,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("activities")
    .select("client_id")
    .eq("id", id)
    .single();
  if (!current) return { ok: false, error: "Atividade não encontrada." };

  const { error } = await supabase
    .from("activities")
    .update({ assignee_id: assigneeId })
    .eq("id", id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateActivityPaths(current.client_id);
  return { ok: true, data: undefined };
}

// Alterna o responsável entre "ninguém" e o usuário atual (interno): se já há
// responsável, remove; caso contrário, atribui a quem clicou. Usado no avatar
// de responsável da drawer do workflow.
export async function toggleActivityAssignee(id: string): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("activities")
    .select("client_id, assignee_id")
    .eq("id", id)
    .single();
  if (!current) return { ok: false, error: "Atividade não encontrada." };

  const nextAssignee = current.assignee_id ? null : session.userId;
  const { error } = await supabase
    .from("activities")
    .update({ assignee_id: nextAssignee })
    .eq("id", id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateActivityPaths(current.client_id);
  return { ok: true, data: undefined };
}

export async function deleteActivity(id: string): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .select("client_id")
    .single();

  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  revalidateActivityPaths(data.client_id);
  return { ok: true, data: undefined };
}

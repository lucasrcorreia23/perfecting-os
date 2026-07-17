"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import {
  ACTIVITY_STATUSES,
  ATIVIDADE_TIPOS,
  CANAIS,
  CRITICIDADES,
  RESPONSAVEIS,
  STAGES,
  type ActivityStatus,
  type AtividadeTipo,
  type Canal,
  type Criticidade,
  type Responsavel,
  type WorkflowStage,
} from "@/lib/constants";
import { parseSubatividades, subatividadesToJson } from "@/lib/methodology";
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
  canal?: Canal | ""; // "" = sem canal
  criticidade?: Criticidade | ""; // "" = sem criticidade
  depends_on_cat?: string; // código da atividade da qual depende ("1.1")
  parallel_with_cat?: string; // código da atividade paralela
  modelo_mensagem?: string; // template para e-mail/WhatsApp
  setor_responsavel?: string;
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
  if (input.canal && !(input.canal in CANAIS)) {
    return "Canal inválido.";
  }
  if (input.criticidade && !(input.criticidade in CRITICIDADES)) {
    return "Criticidade inválida.";
  }
  return null;
}

// Campos opcionais compartilhados entre create/update. `cat` não entra: é o
// código canônico da planilha, gerado pelo seed da etapa (não editável).
function optionalActivityFields(input: ActivityInput) {
  return {
    responsavel: input.responsavel || null,
    tipo: input.tipo || null,
    canal: input.canal || null,
    criticidade: input.criticidade || null,
    depends_on_cat: input.depends_on_cat?.trim() || null,
    parallel_with_cat: input.parallel_with_cat?.trim() || null,
    modelo_mensagem: input.modelo_mensagem?.trim() || null,
    setor_responsavel: input.setor_responsavel?.trim() || null,
  };
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
      position: (last?.position ?? -1) + 1,
      ...optionalActivityFields(input),
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
      ...optionalActivityFields(input),
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

// Marca/desmarca uma subatividade do checklist. `done` explícito (não flip)
// para um duplo clique não desfazer a intenção. Regrava o array normalizado
// inteiro — o que também migra o formato legado (string[]) na primeira
// marcação. A UI usa o MESMO parseSubatividades, então o índice casa com o
// array persistido.
export async function toggleSubatividade(
  activityId: string,
  index: number,
  done: boolean,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("activities")
    .select("client_id, subatividades")
    .eq("id", activityId)
    .single();
  if (!current) return { ok: false, error: "Atividade não encontrada." };

  const subs = parseSubatividades(current.subatividades);
  if (!Number.isInteger(index) || index < 0 || index >= subs.length) {
    return { ok: false, error: "Subatividade não encontrada." };
  }
  subs[index] = { ...subs[index], done };

  const { error } = await supabase
    .from("activities")
    .update({ subatividades: subatividadesToJson(subs) })
    .eq("id", activityId);
  if (error) return { ok: false, error: GENERIC_ERROR };

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

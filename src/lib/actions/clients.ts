"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import {
  STAGES,
  STATUSES,
  type ClientStatus,
  type WorkflowStage,
} from "@/lib/constants";
import type { Json, TablesUpdate } from "@/lib/database.types";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";

async function requireInternoActor() {
  if (!isSupabaseConfigured()) return null;
  const session = await getSessionProfile();
  if (!session || session.profile?.role !== "interno") return null;
  return session;
}

async function logEvent(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  clientId: string | null,
  actorId: string | null,
  type: string,
  payload: Json,
) {
  // Falha no log não bloqueia a ação principal.
  await supabase
    .from("events")
    .insert({ client_id: clientId, actor_id: actorId, type, payload });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type ClientInput = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  stage?: WorkflowStage;
  status?: ClientStatus;
  stage_deadline_days?: number;
  notes?: string;
};

function validateClientInput(input: ClientInput): string | null {
  if (!input.name?.trim()) return "Informe o nome do cliente.";
  if (input.email && !isValidEmail(input.email)) return "E-mail inválido.";
  if (input.stage && !(input.stage in STAGES)) return "Etapa inválida.";
  if (input.status && !(input.status in STATUSES)) return "Status inválido.";
  if (
    input.stage_deadline_days !== undefined &&
    (!Number.isInteger(input.stage_deadline_days) ||
      input.stage_deadline_days < 1)
  ) {
    return "O prazo da etapa deve ser de pelo menos 1 dia.";
  }
  return null;
}

export async function createClient(
  input: ClientInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const invalid = validateClientInput(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name.trim(),
      company: input.company?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      stage: input.stage ?? "diagnosticar",
      status: input.status ?? "ativo",
      created_by: session.userId,
    })
    .select("id, name")
    .single();

  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  await logEvent(supabase, data.id, session.userId, "cliente_criado", {
    name: data.name,
  });

  revalidatePath("/clientes");
  revalidatePath("/workflow");
  revalidatePath("/");
  return { ok: true, data: { id: data.id } };
}

export async function updateClient(
  id: string,
  input: ClientInput,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const invalid = validateClientInput(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("clients")
    .select("stage")
    .eq("id", id)
    .single();
  if (!current) return { ok: false, error: "Cliente não encontrado." };

  const update: TablesUpdate<"clients"> = {
    name: input.name.trim(),
    company: input.company?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    notes: input.notes?.trim() || null,
  };
  if (input.stage) update.stage = input.stage;
  if (input.status) update.status = input.status;
  if (input.stage_deadline_days !== undefined) {
    update.stage_deadline_days = input.stage_deadline_days;
  }

  const { error } = await supabase.from("clients").update(update).eq("id", id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  if (input.stage && input.stage !== current.stage) {
    await logEvent(supabase, id, session.userId, "etapa_alterada", {
      from: current.stage,
      to: input.stage,
    });
  }

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/workflow");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

// Usada pelo Kanban: o trigger do banco reseta stage_entered_at.
export async function updateClientStage(
  id: string,
  stage: WorkflowStage,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };
  if (!(stage in STAGES)) return { ok: false, error: "Etapa inválida." };

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("clients")
    .select("stage")
    .eq("id", id)
    .single();
  if (!current) return { ok: false, error: "Cliente não encontrado." };
  if (current.stage === stage) return { ok: true, data: undefined };

  const { error } = await supabase
    .from("clients")
    .update({ stage })
    .eq("id", id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  await logEvent(supabase, id, session.userId, "etapa_alterada", {
    from: current.stage,
    to: stage,
  });

  revalidatePath("/workflow");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/");
  return { ok: true, data: undefined };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();

  // Remove os arquivos do storage antes do registro (cascade cuida do resto).
  const { data: objects } = await supabase.storage
    .from("client-files")
    .list(id, { limit: 1000 });
  if (objects && objects.length > 0) {
    await supabase.storage
      .from("client-files")
      .remove(objects.map((object) => `${id}/${object.name}`));
  }

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidatePath("/clientes");
  revalidatePath("/workflow");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

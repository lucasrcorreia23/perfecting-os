"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { LEAD_STATUSES, type LeadStatus, type WorkflowStage } from "@/lib/constants";
import { createClient, type ActionResult } from "./clients";

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";

async function requireInternoActor() {
  if (!isSupabaseConfigured()) return null;
  const session = await getSessionProfile();
  if (!session || session.profile?.role !== "interno") return null;
  return session;
}

function revalidateLeadPaths() {
  revalidatePath("/marketing/leads");
  revalidatePath("/marketing/funis");
}

export async function setLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };
  if (!(status in LEAD_STATUSES)) return { ok: false, error: "Status inválido." };
  if (status === "convertido") {
    return {
      ok: false,
      error: "Use a conversão em cliente para marcar o lead como convertido.",
    };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("marketing_leads")
    .update({ status })
    .eq("id", leadId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateLeadPaths();
  return { ok: true, data: undefined };
}

export async function setLeadNotes(
  leadId: string,
  notes: string,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("marketing_leads")
    .update({ notes: notes.trim() || null })
    .eq("id", leadId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateLeadPaths();
  return { ok: true, data: undefined };
}

export type ConvertLeadInput = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  stage?: WorkflowStage;
};

// Reusa createClient: herda de graça o seed do cronograma da etapa e o evento
// cliente_criado, sem duplicar regra de negócio do outro módulo.
export async function convertLeadToClient(
  leadId: string,
  input: ConvertLeadInput,
): Promise<ActionResult<{ clientId: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data: lead } = await supabase
    .from("marketing_leads")
    .select("id, client_id")
    .eq("id", leadId)
    .single();
  if (!lead) return { ok: false, error: "Lead não encontrado." };
  if (lead.client_id) {
    return { ok: false, error: "Este lead já foi convertido em cliente." };
  }

  const created = await createClient({
    name: input.name,
    company: input.company,
    email: input.email,
    phone: input.phone,
    stage: input.stage ?? "diagnosticar",
  });
  if (!created.ok) return created;

  const { error } = await supabase
    .from("marketing_leads")
    .update({ client_id: created.data.id, status: "convertido" })
    .eq("id", leadId);
  if (error) {
    // O cliente já existe e o cronograma foi semeado; só o vínculo falhou.
    return {
      ok: false,
      error: "Cliente criado, mas não foi possível vincular ao lead.",
    };
  }

  revalidateLeadPaths();
  return { ok: true, data: { clientId: created.data.id } };
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("marketing_leads")
    .delete()
    .eq("id", leadId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateLeadPaths();
  return { ok: true, data: undefined };
}

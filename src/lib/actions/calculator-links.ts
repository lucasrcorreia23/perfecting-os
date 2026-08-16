"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { deriveToken, tokenHash } from "@/lib/api/calculator-token";
import { getSessionProfile } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { isCalculatorConfigured, isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ActionResult } from "./clients";

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";
const EXPIRACAO_MAX_DIAS = 365;

async function requireInternoActor() {
  if (!isSupabaseConfigured()) return null;
  const session = await getSessionProfile();
  if (!session || session.profile?.role !== "interno") return null;
  return session;
}

// URL absoluta a partir dos headers da requisição (padrão do endpoint do
// funil) — sem env nova de URL.
async function absoluteUrl(path: string): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}${path}`;
}

async function linkUrl(linkId: string, tokenVersion: number): Promise<string | null> {
  const token = deriveToken(linkId, tokenVersion);
  if (!token) return null;
  return absoluteUrl(`/calculadora/${token}`);
}

type SupabaseServer = Awaited<ReturnType<typeof createServerSupabase>>;

// Rastreio das ações internas. Falha no log nunca bloqueia a ação.
async function logLinkEvent(
  supabase: SupabaseServer,
  linkId: string,
  type: string,
  actorId: string,
  payload: Json = {},
) {
  try {
    await supabase
      .from("calculator_link_events")
      .insert({ link_id: linkId, type, payload, actor_id: actorId });
  } catch {
    // Evento é rastro, não pré-condição.
  }
}

function revalidateLinkPaths(clientId: string | null) {
  // As avulsas aparecem na listagem de clientes.
  revalidatePath("/clientes");
  if (clientId) revalidatePath(`/clientes/${clientId}`);
}

// O interno só define validade e identificação — a PROPOSTA (times, plano,
// assentos, prazo) é montada pelo próprio visitante na página.
export type CalculatorLinkInput = {
  label?: string | null;
  expiresAt: string; // ISO
};

function validarInput(input: CalculatorLinkInput): string | null {
  const expira = new Date(input.expiresAt).getTime();
  if (!Number.isFinite(expira)) return "Defina a data de expiração do link.";
  if (expira <= Date.now()) return "A expiração precisa estar no futuro.";
  if (expira > Date.now() + EXPIRACAO_MAX_DIAS * 86_400_000) {
    return "A expiração máxima é de 1 ano.";
  }
  return null;
}

// clientId null = calculadora avulsa ("Gerar calculadora" na listagem),
// importável depois para qualquer cliente via linkCalculatorToClient.
export async function createCalculatorLink(
  clientId: string | null,
  input: CalculatorLinkInput,
): Promise<ActionResult<{ id: string; url: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };
  if (!isCalculatorConfigured()) {
    return { ok: false, error: "Calculadora não configurada (CALCULATOR_LINK_SECRET)." };
  }

  const invalido = validarInput(input);
  if (invalido) return { ok: false, error: invalido };

  // O token deriva do id — gerar o id antes resolve o ovo-e-galinha sem
  // segunda escrita.
  const id = randomUUID();
  const token = deriveToken(id, 1);
  if (!token) return { ok: false, error: GENERIC_ERROR };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("calculator_links").insert({
    id,
    client_id: clientId,
    label: input.label?.trim() ? input.label.trim().slice(0, 120) : null,
    token_version: 1,
    token_hash: tokenHash(token),
    expires_at: new Date(input.expiresAt).toISOString(),
    created_by: session.userId,
  });
  if (error) return { ok: false, error: GENERIC_ERROR };

  await logLinkEvent(supabase, id, "criado", session.userId, {
    avulso: clientId === null,
    expira_em: new Date(input.expiresAt).toISOString(),
  });

  const url = await linkUrl(id, 1);
  if (!url) return { ok: false, error: GENERIC_ERROR };

  revalidateLinkPaths(clientId);
  return { ok: true, data: { id, url } };
}

// Importa uma calculadora (avulsa ou de outro cliente) para o cliente
// escolhido. Serve também para mover — o evento registra origem/destino.
export async function linkCalculatorToClient(
  linkId: string,
  clientId: string,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const [{ data: atual }, { data: cliente }] = await Promise.all([
    supabase.from("calculator_links").select("id, client_id").eq("id", linkId).single(),
    supabase.from("clients").select("id, name").eq("id", clientId).single(),
  ]);
  if (!atual || !cliente) return { ok: false, error: GENERIC_ERROR };
  if (atual.client_id === clientId) {
    return { ok: false, error: "O link já pertence a este cliente." };
  }

  const { error } = await supabase
    .from("calculator_links")
    .update({ client_id: clientId })
    .eq("id", linkId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  await logLinkEvent(supabase, linkId, "vinculado_a_cliente", session.userId, {
    client_id: cliente.id,
    client_name: cliente.name,
    origem_client_id: atual.client_id,
  });

  revalidateLinkPaths(atual.client_id);
  revalidateLinkPaths(clientId);
  return { ok: true, data: undefined };
}

// Rederiva a URL a qualquer momento — o token nunca é persistido.
export async function getCalculatorLinkUrl(
  linkId: string,
): Promise<ActionResult<{ url: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("calculator_links")
    .select("id, token_version")
    .eq("id", linkId)
    .single();
  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  const url = await linkUrl(data.id, data.token_version);
  if (!url) return { ok: false, error: GENERIC_ERROR };
  return { ok: true, data: { url } };
}

export async function updateCalculatorLinkLabel(
  linkId: string,
  label: string | null,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("calculator_links")
    .update({ label: label?.trim() ? label.trim().slice(0, 120) : null })
    .eq("id", linkId)
    .select("client_id")
    .single();
  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  revalidateLinkPaths(data.client_id);
  return { ok: true, data: undefined };
}

export async function revokeCalculatorLink(linkId: string): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("calculator_links")
    .update({ revoked_at: new Date().toISOString(), revoked_by: session.userId })
    .eq("id", linkId)
    .select("client_id")
    .single();
  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  await logLinkEvent(supabase, linkId, "revogado", session.userId);
  revalidateLinkPaths(data.client_id);
  return { ok: true, data: undefined };
}

export async function extendCalculatorLink(
  linkId: string,
  expiresAt: string,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const expira = new Date(expiresAt).getTime();
  if (!Number.isFinite(expira) || expira <= Date.now()) {
    return { ok: false, error: "A nova expiração precisa estar no futuro." };
  }
  if (expira > Date.now() + EXPIRACAO_MAX_DIAS * 86_400_000) {
    return { ok: false, error: "A expiração máxima é de 1 ano." };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("calculator_links")
    // Prorrogar também reativa um link revogado por engano.
    .update({
      expires_at: new Date(expira).toISOString(),
      revoked_at: null,
      revoked_by: null,
    })
    .eq("id", linkId)
    .select("client_id")
    .single();
  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  await logLinkEvent(supabase, linkId, "prorrogado", session.userId, {
    expira_em: new Date(expira).toISOString(),
  });
  revalidateLinkPaths(data.client_id);
  return { ok: true, data: undefined };
}

// Invalida a URL antiga imediatamente (versão + 1) e devolve a nova.
export async function rotateCalculatorLink(
  linkId: string,
): Promise<ActionResult<{ url: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data: atual, error: erroLeitura } = await supabase
    .from("calculator_links")
    .select("id, client_id, token_version")
    .eq("id", linkId)
    .single();
  if (erroLeitura || !atual) return { ok: false, error: GENERIC_ERROR };

  const novaVersao = atual.token_version + 1;
  const token = deriveToken(linkId, novaVersao);
  if (!token) return { ok: false, error: GENERIC_ERROR };

  const { error } = await supabase
    .from("calculator_links")
    .update({ token_version: novaVersao, token_hash: tokenHash(token) })
    .eq("id", linkId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  await logLinkEvent(supabase, linkId, "link_rotacionado", session.userId, {
    versao: novaVersao,
  });

  const url = await linkUrl(linkId, novaVersao);
  if (!url) return { ok: false, error: GENERIC_ERROR };
  revalidateLinkPaths(atual.client_id);
  return { ok: true, data: { url } };
}

export async function deleteCalculatorLink(linkId: string): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("calculator_links")
    .delete()
    .eq("id", linkId)
    .select("client_id")
    .single();
  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  revalidateLinkPaths(data.client_id);
  return { ok: true, data: undefined };
}

import type { Json, Tables, TablesUpdate } from "@/lib/database.types";
import { createServiceSupabase } from "@/lib/supabase/service";

// Segundo consumidor autorizado do cliente service-role (além de
// marketing-queries): a página pública da calculadora e o autosave não têm
// sessão — o gate é o token do link, verificado por hash. Todas as funções
// têm finalidade fixa; nada além do link do portador entra ou sai.

export type CalculatorLinkRow = Tables<"calculator_links">;

export type CalculatorLinkComCliente = CalculatorLinkRow & {
  clients: { name: string; company: string | null } | null;
};

// Convenção: undefined = serviço indisponível · null = não encontrado.
export async function fetchLinkByTokenHash(
  hash: string,
): Promise<CalculatorLinkComCliente | null | undefined> {
  const supabase = createServiceSupabase();
  if (!supabase) return undefined;
  const { data, error } = await supabase
    .from("calculator_links")
    .select("*, clients(name, company)")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error) return undefined;
  return (data as CalculatorLinkComCliente | null) ?? null;
}

export type NovoEvento = {
  linkId: string;
  type: string;
  payload?: Json;
  actorId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
};

export async function insertEvents(eventos: NovoEvento[]): Promise<boolean> {
  if (eventos.length === 0) return true;
  const supabase = createServiceSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("calculator_link_events").insert(
    eventos.map((evento) => ({
      link_id: evento.linkId,
      type: evento.type,
      payload: evento.payload ?? {},
      actor_id: evento.actorId ?? null,
      ip_hash: evento.ipHash ?? null,
      user_agent: evento.userAgent ? evento.userAgent.slice(0, 300) : null,
    })),
  );
  return !error;
}

// Um "acesso" é uma sessão: o mesmo link + IP dentro da janela não conta de
// novo (refresh não é visita). access_count/last_access_at só avançam quando
// o evento grava.
export async function registerAccess(
  link: CalculatorLinkRow,
  ipHash: string | null,
  userAgent: string | null,
  windowMs: number,
): Promise<void> {
  const supabase = createServiceSupabase();
  if (!supabase) return;

  const since = new Date(Date.now() - windowMs).toISOString();
  let query = supabase
    .from("calculator_link_events")
    .select("id", { count: "exact", head: true })
    .eq("link_id", link.id)
    .eq("type", "acesso")
    .gte("created_at", since);
  if (ipHash) query = query.eq("ip_hash", ipHash);
  const { count, error } = await query;
  if (error || (count ?? 0) > 0) return;

  const agora = new Date().toISOString();
  await Promise.all([
    insertEvents([{ linkId: link.id, type: "acesso", ipHash, userAgent }]),
    supabase
      .from("calculator_links")
      .update({
        access_count: link.access_count + 1,
        last_access_at: agora,
        first_access_at: link.first_access_at ?? agora,
      })
      .eq("id", link.id),
  ]);
}

export async function saveEstado(params: {
  linkId: string;
  state: Json;
  resultSummary: Json;
  marcarEnvio: boolean;
}): Promise<{ submittedAt: string | null } | null> {
  const supabase = createServiceSupabase();
  if (!supabase) return null;
  const agora = new Date().toISOString();
  const patch: TablesUpdate<"calculator_links"> = {
    state: params.state,
    result_summary: params.resultSummary,
    last_saved_at: agora,
  };
  if (params.marcarEnvio) patch.submitted_at = agora;
  const { data, error } = await supabase
    .from("calculator_links")
    .update(patch)
    .eq("id", params.linkId)
    .select("submitted_at")
    .single();
  if (error) return null;
  return { submittedAt: data.submitted_at };
}

export async function savePremissas(params: {
  linkId: string;
  premissas: Json | null;
  resultSummary: Json;
}): Promise<boolean> {
  const supabase = createServiceSupabase();
  if (!supabase) return false;
  const { error } = await supabase
    .from("calculator_links")
    .update({
      premissas: params.premissas,
      result_summary: params.resultSummary,
    })
    .eq("id", params.linkId);
  return !error;
}

// Throttle no banco: atravessa lambdas, diferente do Map em memória.
export async function countRecentEventsByIp(
  ipHash: string,
  sinceIso: string,
): Promise<number> {
  const supabase = createServiceSupabase();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("calculator_link_events")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", sinceIso);
  if (error) return 0;
  return count ?? 0;
}

// Coalescência: rajadas de autosave pós-envio viram um evento só.
export async function hasRecentEvent(
  linkId: string,
  type: string,
  sinceIso: string,
): Promise<boolean> {
  const supabase = createServiceSupabase();
  if (!supabase) return false;
  const { count, error } = await supabase
    .from("calculator_link_events")
    .select("id", { count: "exact", head: true })
    .eq("link_id", linkId)
    .eq("type", type)
    .gte("created_at", sinceIso);
  if (error) return false;
  return (count ?? 0) > 0;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireInterno } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { LinkDetail } from "@/components/calculadora/link-detail";

export const metadata: Metadata = { title: "Calculadora" };

export default async function CalculadoraLinkPage({
  params,
}: {
  params: Promise<{ id: string; linkId: string }>;
}) {
  // Gate explícito: o layout (app) só exige sessão, e o role cliente pode
  // acessar o próprio /clientes/[id]/* — mas o rastreio comercial é interno.
  await requireInterno();
  const { id, linkId } = await params;

  const supabase = await createServerSupabase();
  const [linkRes, eventsRes, clientRes, clientesRes] = await Promise.all([
    supabase
      .from("calculator_links")
      .select("*")
      .eq("id", linkId)
      .eq("client_id", id)
      .maybeSingle(),
    supabase
      .from("calculator_link_events")
      .select("*")
      .eq("link_id", linkId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("clients").select("id, name, company").eq("id", id).single(),
    supabase.from("clients").select("id, name, company").order("name"),
  ]);

  const link = linkRes.data;
  const client = clientRes.data;
  if (!link || !client) notFound();

  // Nomes dos atores internos dos eventos (visitante = actor_id nulo).
  const atorIds = Array.from(
    new Set((eventsRes.data ?? []).map((event) => event.actor_id).filter(Boolean)),
  ) as string[];
  const atorNomes: Record<string, string> = {};
  if (atorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", atorIds);
    for (const profile of profiles ?? []) {
      if (profile.full_name) atorNomes[profile.id] = profile.full_name;
    }
  }

  return (
    <LinkDetail
      link={link}
      events={eventsRes.data ?? []}
      client={client}
      atorNomes={atorNomes}
      clientes={clientesRes.data ?? []}
    />
  );
}

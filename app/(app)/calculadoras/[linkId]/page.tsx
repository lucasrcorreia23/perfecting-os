import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireInterno } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { LinkDetail } from "@/components/calculadora/link-detail";

export const metadata: Metadata = { title: "Calculadora avulsa" };

// Detalhe de uma calculadora AVULSA (sem cliente): dá para avaliar o
// preenchimento completo antes de decidir a quem vincular.
export default async function CalculadoraAvulsaPage({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  await requireInterno();
  const { linkId } = await params;

  const supabase = await createServerSupabase();
  const [linkRes, eventsRes, clientesRes] = await Promise.all([
    supabase.from("calculator_links").select("*").eq("id", linkId).maybeSingle(),
    supabase
      .from("calculator_link_events")
      .select("*")
      .eq("link_id", linkId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("clients").select("id, name, company").order("name"),
  ]);

  const link = linkRes.data;
  if (!link) notFound();
  // Já vinculado: o detalhe canônico é o do cliente.
  if (link.client_id) {
    redirect(`/clientes/${link.client_id}/calculadora/${link.id}`);
  }

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
      client={null}
      atorNomes={atorNomes}
      clientes={clientesRes.data ?? []}
    />
  );
}

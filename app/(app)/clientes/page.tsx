import type { Metadata } from "next";
import { requireInterno } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_PRAZO_ETAPA_DIAS } from "@/lib/constants";
import type { Preferences } from "@/lib/actions/profile";
import { ClientsView, type ClientRow } from "@/components/clients/clients-view";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const session = await requireInterno();
  const stageDeadlineDays =
    (session.profile?.preferences as Preferences | null)?.prazo_etapa_dias ??
    DEFAULT_PRAZO_ETAPA_DIAS;

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("clients")
    .select("*, activities(id, status)")
    .order("name");

  return (
    <ClientsView
      clients={(data ?? []) as ClientRow[]}
      stageDeadlineDays={stageDeadlineDays}
    />
  );
}

import type { Metadata } from "next";
import { requireInterno } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { ClientsView, type ClientRow } from "@/components/clients/clients-view";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  await requireInterno();

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("clients")
    .select("*, activities(id, status)")
    .order("name");

  return <ClientsView clients={(data ?? []) as ClientRow[]} />;
}

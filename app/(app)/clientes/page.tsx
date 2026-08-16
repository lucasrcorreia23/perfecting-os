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
  const [clientsRes, avulsasRes] = await Promise.all([
    supabase.from("clients").select("*, activities(id, status)").order("name"),
    // Calculadoras geradas sem cliente ("Gerar calculadora"), à espera de
    // importação para um perfil.
    supabase
      .from("calculator_links")
      .select("*")
      .is("client_id", null)
      .order("created_at", { ascending: false }),
  ]);

  const clients = (clientsRes.data ?? []) as ClientRow[];

  return (
    <ClientsView
      clients={clients}
      stageDeadlineDays={stageDeadlineDays}
      avulsas={avulsasRes.data ?? []}
      clienteOptions={clients.map((client) => ({
        id: client.id,
        name: client.name,
        company: client.company,
      }))}
    />
  );
}

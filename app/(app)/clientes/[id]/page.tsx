import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { clienteHome, requireSession } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { ClientHeader } from "@/components/clients/client-header";
import { ClientTabs } from "@/components/clients/client-tabs";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const role = session.profile?.role ?? "interno";

  // Role cliente só enxerga o próprio cliente.
  if (role === "cliente" && session.profile?.client_id !== id) {
    redirect(clienteHome(session));
  }

  const supabase = await createServerSupabase();
  const interno = role !== "cliente";
  const [clientRes, activitiesRes, filesRes, linksRes, avulsasRes, clientesRes] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase
        .from("activities")
        .select("*")
        .eq("client_id", id)
        .order("position"),
      supabase
        .from("client_files")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      // Calculadora é interna; para role cliente a RLS devolveria vazio de todo
      // jeito, mas nem consultamos.
      interno
        ? supabase
            .from("calculator_links")
            .select("*")
            .eq("client_id", id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as never[] }),
      // Avulsas disponíveis para importar neste perfil.
      interno
        ? supabase
            .from("calculator_links")
            .select("*")
            .is("client_id", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as never[] }),
      // Opções para mover um link para outro cliente.
      interno
        ? supabase.from("clients").select("id, name, company").order("name")
        : Promise.resolve({ data: [] as never[] }),
    ]);

  const client = clientRes.data;
  if (!client) notFound();

  const files = filesRes.data ?? [];

  // client_files.uploaded_by referencia auth.users (sem FK p/ profiles),
  // então os nomes vêm numa consulta separada.
  const uploaderIds = Array.from(
    new Set(files.map((file) => file.uploaded_by).filter(Boolean)),
  ) as string[];
  const uploaderNames: Record<string, string> = {};
  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", uploaderIds);
    for (const profile of profiles ?? []) {
      if (profile.full_name) uploaderNames[profile.id] = profile.full_name;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ClientHeader client={client} readOnly={role === "cliente"} />
      {/* Divider entre header rico e abas (§8.9) */}
      <div className="border-t border-slate-200" aria-hidden />
      <ClientTabs
        client={client}
        activities={activitiesRes.data ?? []}
        files={files}
        uploaderNames={uploaderNames}
        readOnly={role === "cliente"}
        calculatorLinks={linksRes.data ?? []}
        calculatorAvulsas={avulsasRes.data ?? []}
        clienteOptions={clientesRes.data ?? []}
      />
    </div>
  );
}

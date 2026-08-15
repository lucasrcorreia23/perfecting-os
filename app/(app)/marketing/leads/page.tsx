import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { parseQuestions } from "@/lib/marketing-funnel";
import type { AnswerMap } from "@/lib/marketing-answers";
import { LeadsView, type LeadRow } from "@/components/marketing/leads-view";

export const metadata: Metadata = { title: "Leads · Marketing" };

export default async function MarketingLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ funil?: string }>;
}) {
  const { funil } = await searchParams;
  if (!isSupabaseConfigured()) {
    return <LeadsView leads={[]} funnels={[]} initialFunnel={funil ?? "todos"} />;
  }

  const supabase = await createServerSupabase();
  const [{ data: leads }, { data: funnels }] = await Promise.all([
    supabase
      .from("marketing_leads")
      .select(
        "*, marketing_funnels(id, name), marketing_funnel_versions(version, questions)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("marketing_funnels").select("id, name").order("name"),
  ]);

  const rows: LeadRow[] = (leads ?? []).map((lead) => {
    const funnel = lead.marketing_funnels as { id: string; name: string } | null;
    const version = lead.marketing_funnel_versions as
      | { version: number; questions: unknown }
      | null;
    return {
      id: lead.id,
      funnelId: lead.funnel_id,
      funnelName: funnel?.name ?? "Funil removido",
      version: version?.version ?? null,
      // Perguntas da versão congelada: a folha de respostas continua fiel ao
      // que o visitante viu, mesmo após publicar uma versão nova.
      questions: parseQuestions(version?.questions),
      answers: (lead.answers ?? {}) as AnswerMap,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      roleTitle: lead.role_title,
      score: lead.score,
      scoreMax: lead.score_max,
      scorePct: lead.score_pct,
      qualificacao: lead.qualificacao,
      status: lead.status,
      clientId: lead.client_id,
      notes: lead.notes,
      sourceUrl: lead.source_url,
      utm: (lead.utm ?? {}) as Record<string, string>,
      created_at: lead.created_at,
    };
  });

  return (
    <LeadsView
      leads={rows}
      funnels={funnels ?? []}
      initialFunnel={funil ?? "todos"}
    />
  );
}

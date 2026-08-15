import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { parseQuestions } from "@/lib/marketing-funnel";
import type { AnswerMap } from "@/lib/marketing-answers";
import { LeadDetail } from "@/components/marketing/lead-detail";
import type { LeadRow } from "@/components/marketing/leads-view";

export const metadata: Metadata = { title: "Lead · Marketing" };

export default async function MarketingLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createServerSupabase();
  const { data: lead } = await supabase
    .from("marketing_leads")
    .select(
      "*, marketing_funnels(id, name), marketing_funnel_versions(version, questions)",
    )
    .eq("id", id)
    .single();

  if (!lead) notFound();

  const funnel = lead.marketing_funnels as { id: string; name: string } | null;
  const version = lead.marketing_funnel_versions as
    | { version: number; questions: unknown }
    | null;

  const row: LeadRow = {
    id: lead.id,
    funnelId: lead.funnel_id,
    funnelName: funnel?.name ?? "Funil removido",
    version: version?.version ?? null,
    // Perguntas da versão congelada: a folha de respostas continua fiel ao que
    // o visitante viu, mesmo após publicar uma versão nova.
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

  return <LeadDetail lead={row} />;
}

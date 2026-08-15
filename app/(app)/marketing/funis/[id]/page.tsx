import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { parseQuestions, parseThresholds } from "@/lib/marketing-funnel";
import {
  FunnelBuilder,
  type FunnelDraft,
} from "@/components/marketing/funnel-builder";

export const metadata: Metadata = { title: "Editar funil · Marketing" };

export default async function MarketingFunnelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createServerSupabase();
  const { data: funnel } = await supabase
    .from("marketing_funnels")
    .select(
      "*, marketing_funnel_versions!marketing_funnels_published_version_id_fkey(version)",
    )
    .eq("id", id)
    .single();

  if (!funnel) notFound();

  const published = funnel.marketing_funnel_versions as
    | { version: number }
    | { version: number }[]
    | null;
  const publishedVersion = Array.isArray(published)
    ? (published[0]?.version ?? null)
    : (published?.version ?? null);

  const draft: FunnelDraft = {
    id: funnel.id,
    name: funnel.name,
    slug: funnel.slug,
    description: funnel.description ?? "",
    status: funnel.status,
    submitLabel: funnel.submit_label,
    successMessage: funnel.success_message,
    redirectUrl: funnel.redirect_url ?? "",
    questions: parseQuestions(funnel.questions),
    thresholds: parseThresholds(funnel.score_thresholds),
    publishedVersion,
  };

  // Origem do próprio OS: é dele que o site consome a API pública.
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  return <FunnelBuilder funnel={draft} endpointUrl={`${proto}://${host}`} />;
}

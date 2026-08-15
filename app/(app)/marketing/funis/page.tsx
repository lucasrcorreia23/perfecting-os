import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { parseQuestions } from "@/lib/marketing-funnel";
import { FunnelsView, type FunnelRow } from "@/components/marketing/funnels-view";

export const metadata: Metadata = { title: "Funis · Marketing" };

export default async function MarketingFunisPage() {
  if (!isSupabaseConfigured()) return <FunnelsView funnels={[]} />;

  const supabase = await createServerSupabase();
  const [{ data: funnels }, { data: leads }] = await Promise.all([
    supabase
      .from("marketing_funnels")
      .select(
        "id, name, slug, status, questions, updated_at, published_version_id, marketing_funnel_versions!marketing_funnels_published_version_id_fkey(version)",
      )
      .order("updated_at", { ascending: false }),
    supabase.from("marketing_leads").select("funnel_id"),
  ]);

  const leadCounts = new Map<string, number>();
  for (const lead of leads ?? []) {
    leadCounts.set(lead.funnel_id, (leadCounts.get(lead.funnel_id) ?? 0) + 1);
  }

  const rows: FunnelRow[] = (funnels ?? []).map((funnel) => {
    const published = funnel.marketing_funnel_versions as
      | { version: number }
      | { version: number }[]
      | null;
    const version = Array.isArray(published)
      ? (published[0]?.version ?? null)
      : (published?.version ?? null);
    return {
      id: funnel.id,
      name: funnel.name,
      slug: funnel.slug,
      status: funnel.status,
      questionCount: parseQuestions(funnel.questions).length,
      leadCount: leadCounts.get(funnel.id) ?? 0,
      publishedVersion: version,
      updated_at: funnel.updated_at,
    };
  });

  return <FunnelsView funnels={rows} />;
}

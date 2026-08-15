import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { parseQuestions, parseThresholds } from "@/lib/marketing-funnel";
import { FunnelQuiz, type FunnelQuizData } from "@/components/marketing/funnel-quiz";

export const metadata: Metadata = { title: "Testar funil · Marketing" };

// Simulador do funil como o lead vê: por padrão testa o rascunho salvo (link
// do builder); com ?versao=publicada testa o snapshot que o site está
// servindo (link da lista).
export default async function TestarFunilPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ versao?: string }>;
}) {
  const [{ id }, { versao }] = await Promise.all([params, searchParams]);
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createServerSupabase();
  const { data: funnel } = await supabase
    .from("marketing_funnels")
    .select(
      "id, name, description, submit_label, success_message, redirect_url, questions, score_thresholds, published_version_id",
    )
    .eq("id", id)
    .single();

  if (!funnel) notFound();

  let questions = parseQuestions(funnel.questions);
  let thresholds = parseThresholds(funnel.score_thresholds);
  let sourceLabel = "o rascunho salvo";

  if (versao === "publicada") {
    if (!funnel.published_version_id) notFound();
    const { data: version } = await supabase
      .from("marketing_funnel_versions")
      .select("version, questions, thresholds")
      .eq("id", funnel.published_version_id)
      .single();
    if (!version) notFound();
    questions = parseQuestions(version.questions);
    thresholds = parseThresholds(version.thresholds);
    sourceLabel = `a versão v${version.version} publicada`;
  }

  const quiz: FunnelQuizData = {
    funnelId: funnel.id,
    name: funnel.name,
    description: funnel.description,
    submitLabel: funnel.submit_label,
    successMessage: funnel.success_message,
    redirectUrl: funnel.redirect_url,
    questions,
    thresholds,
    sourceLabel,
  };

  return <FunnelQuiz quiz={quiz} />;
}

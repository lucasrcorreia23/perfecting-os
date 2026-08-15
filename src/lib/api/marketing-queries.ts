import { MARKETING_MEDIA_BUCKET } from "@/lib/constants";
import type { Json } from "@/lib/database.types";
import { getSupabaseEnv } from "@/lib/env";
import type { AnswerMap } from "@/lib/marketing-answers";
import {
  parseQuestions,
  parseThresholds,
  publicQuestions,
  type FunnelQuestion,
  type FunnelThresholds,
  type PublicFunnelQuestion,
} from "@/lib/marketing-funnel";
import { seoDescriptionFor, seoTitleFor } from "@/lib/marketing-post";
import { createServiceSupabase } from "@/lib/supabase/service";

// ÚNICO consumidor do cliente service-role. Todas as funções aqui têm
// finalidade fixa e moldam a resposta à mão: rascunho, pesos de pontuação e
// dados de outro lead nunca saem daqui.

export type PublicPostSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[];
  cover: { url: string; alt: string | null } | null;
  published_at: string;
  updated_at: string;
  reading_minutes: number;
};

export type PublicPost = PublicPostSummary & {
  body_md: string;
  seo: {
    title: string;
    description: string;
    canonical_url: string | null;
    noindex: boolean;
  };
  author: { name: string | null } | null;
};

export type PublicFunnel = {
  slug: string;
  name: string;
  description: string | null;
  version: number;
  submit_label: string;
  success_message: string;
  redirect_url: string | null;
  questions: PublicFunnelQuestion[];
};

function coverUrl(path: string | null, alt: string | null) {
  if (!path) return null;
  const { url } = getSupabaseEnv();
  if (!url) return null;
  return {
    url: `${url.replace(/\/$/, "")}/storage/v1/object/public/${MARKETING_MEDIA_BUCKET}/${path}`,
    alt,
  };
}

const LIST_COLUMNS =
  "slug, title, excerpt, tags, cover_path, cover_alt, published_at, updated_at, reading_minutes";

export async function fetchPublishedPosts(params: {
  limit: number;
  offset: number;
  tag?: string;
}): Promise<{ posts: PublicPostSummary[]; total: number } | null> {
  const supabase = createServiceSupabase();
  if (!supabase) return null;

  let query = supabase
    .from("marketing_posts")
    .select(LIST_COLUMNS, { count: "exact" })
    // Agendado é publicado com data futura: este predicado é o filtro inteiro.
    .eq("status", "publicado")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.tag) query = query.contains("tags", [params.tag]);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    total: count ?? 0,
    posts: (data ?? []).map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      tags: post.tags,
      cover: coverUrl(post.cover_path, post.cover_alt),
      published_at: post.published_at as string,
      updated_at: post.updated_at,
      reading_minutes: post.reading_minutes,
    })),
  };
}

export async function fetchPublishedPostBySlug(
  slug: string,
): Promise<PublicPost | null | undefined> {
  const supabase = createServiceSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("marketing_posts")
    .select(`${LIST_COLUMNS}, body_md, seo_title, seo_description, canonical_url, noindex, author_id`)
    .eq("slug", slug)
    .eq("status", "publicado")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // author_id aponta para auth.users, sem FK para profiles — busca à parte.
  let author: { name: string | null } | null = null;
  if (data.author_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.author_id)
      .maybeSingle();
    if (profile) author = { name: profile.full_name };
  }

  return {
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt,
    tags: data.tags,
    cover: coverUrl(data.cover_path, data.cover_alt),
    published_at: data.published_at as string,
    updated_at: data.updated_at,
    reading_minutes: data.reading_minutes,
    body_md: data.body_md,
    seo: {
      title: seoTitleFor({ title: data.title, seo_title: data.seo_title }),
      description: seoDescriptionFor({
        title: data.title,
        excerpt: data.excerpt,
        body_md: data.body_md,
        seo_description: data.seo_description,
      }),
      canonical_url: data.canonical_url,
      noindex: data.noindex,
    },
    author,
  };
}

export type FunnelVersionRecord = {
  funnelId: string;
  versionId: string;
  version: number;
  questions: FunnelQuestion[];
  thresholds: FunnelThresholds;
  scoreMax: number;
  submitLabel: string;
  successMessage: string;
  redirectUrl: string | null;
  name: string;
  description: string | null;
  slug: string;
};

// A versão publicada é um artefato imutável — é exatamente o que o site recebe.
async function loadPublishedVersion(
  slug: string,
): Promise<FunnelVersionRecord | null | undefined> {
  const supabase = createServiceSupabase();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("marketing_funnels")
    .select(
      "id, slug, name, description, submit_label, success_message, redirect_url, published_version_id",
    )
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();

  if (error) throw error;
  if (!data?.published_version_id) return null;

  const { data: version, error: versionError } = await supabase
    .from("marketing_funnel_versions")
    .select("id, version, questions, thresholds, score_max")
    .eq("id", data.published_version_id)
    .maybeSingle();

  if (versionError) throw versionError;
  if (!version) return null;

  return {
    funnelId: data.id,
    versionId: version.id,
    version: version.version,
    questions: parseQuestions(version.questions),
    thresholds: parseThresholds(version.thresholds),
    scoreMax: version.score_max,
    submitLabel: data.submit_label,
    successMessage: data.success_message,
    redirectUrl: data.redirect_url,
    name: data.name,
    description: data.description,
    slug: data.slug,
  };
}

export async function fetchPublishedFunnel(
  slug: string,
): Promise<PublicFunnel | null | undefined> {
  const record = await loadPublishedVersion(slug);
  if (!record) return record;

  return {
    slug: record.slug,
    name: record.name,
    description: record.description,
    version: record.version,
    submit_label: record.submitLabel,
    success_message: record.successMessage,
    redirect_url: record.redirectUrl,
    // publicQuestions remove score, weight e maps_to.
    questions: publicQuestions(record.questions),
  };
}

// Exposta para o handler de envio: precisa das perguntas com peso para pontuar.
export async function fetchFunnelVersion(
  slug: string,
  version: number,
): Promise<FunnelVersionRecord | null | undefined | "version_mismatch"> {
  const current = await loadPublishedVersion(slug);
  if (!current) return current;
  if (current.version === version) return current;

  const supabase = createServiceSupabase();
  if (!supabase) return undefined;

  // Cache antigo do site: pontua contra o schema que o visitante viu.
  const { data, error } = await supabase
    .from("marketing_funnel_versions")
    .select("id, version, questions, thresholds, score_max")
    .eq("funnel_id", current.funnelId)
    .eq("version", version)
    .maybeSingle();

  if (error) throw error;
  if (!data) return "version_mismatch";

  return {
    ...current,
    versionId: data.id,
    version: data.version,
    questions: parseQuestions(data.questions),
    thresholds: parseThresholds(data.thresholds),
    scoreMax: data.score_max,
  };
}

export async function insertLead(lead: {
  funnelId: string;
  funnelVersionId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  roleTitle: string | null;
  answers: AnswerMap;
  score: number;
  scoreMax: number;
  scorePct: number;
  qualificacao: "frio" | "morno" | "quente";
  sourceUrl: string | null;
  utm: Json;
  ipHash: string | null;
  userAgent: string | null;
}): Promise<{ id: string } | null> {
  const supabase = createServiceSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("marketing_leads")
    .insert({
      funnel_id: lead.funnelId,
      funnel_version_id: lead.funnelVersionId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      role_title: lead.roleTitle,
      answers: lead.answers as Json,
      score: lead.score,
      score_max: lead.scoreMax,
      score_pct: lead.scorePct,
      qualificacao: lead.qualificacao,
      source_url: lead.sourceUrl,
      utm: lead.utm,
      ip_hash: lead.ipHash,
      user_agent: lead.userAgent,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

// Throttle que atravessa instâncias serverless, ao contrário do Map em memória.
export async function countRecentLeadsByIp(
  ipHash: string,
  sinceIso: string,
): Promise<number> {
  const supabase = createServiceSupabase();
  if (!supabase) return 0;

  const { count } = await supabase
    .from("marketing_leads")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", sinceIso);

  return count ?? 0;
}

import type { PostState, PostStatus } from "@/lib/constants";
import { parseMarkdown, plainText } from "@/lib/marketing-markdown";
import { isValidSlug } from "@/lib/marketing-slug";

export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

const WORDS_PER_MINUTE = 200;

type PostTiming = { status: PostStatus; published_at: string | null };

// "agendado" não existe no banco: é publicado com data no futuro. Assim a API
// filtra com um predicado só e nada precisa "virar" publicado — logo, sem cron.
export function postState(post: PostTiming, now: Date = new Date()): PostState {
  if (post.status === "rascunho") return "rascunho";
  if (post.status === "arquivado") return "arquivado";
  if (!post.published_at) return "rascunho";
  return new Date(post.published_at).getTime() > now.getTime()
    ? "agendado"
    : "publicado";
}

// Fail-closed: sem data, não é público — mesmo que o check do banco garanta
// que publicado sempre tem published_at.
export function isPubliclyVisible(
  post: PostTiming,
  now: Date = new Date(),
): boolean {
  return postState(post, now) === "publicado";
}

export function readingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

type PostSeoInput = {
  title: string;
  excerpt?: string | null;
  body_md?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

export function seoTitleFor(post: PostSeoInput): string {
  return truncate((post.seo_title || post.title || "").trim(), SEO_TITLE_MAX);
}

export function seoDescriptionFor(post: PostSeoInput): string {
  const fallback = post.body_md ? plainText(parseMarkdown(post.body_md)) : "";
  const source = (post.seo_description || post.excerpt || fallback).trim();
  return truncate(source, SEO_DESCRIPTION_MAX);
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export type PostInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  body_md?: string | null;
  status?: PostStatus;
  published_at?: string | null;
  cover_path?: string | null;
  cover_alt?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  canonical_url?: string | null;
  noindex?: boolean;
  tags?: string[];
};

// HTML executável no corpo é rejeitado no save: a API entrega body_md cru ao
// site externo, e um render sem sanitização ali viraria XSS armazenado.
const DANGEROUS_MARKUP =
  /(<\s*(script|iframe|object|embed|style|link|meta)\b)|(\bjavascript\s*:)|(\son\w+\s*=)/i;

export function validatePostInput(input: PostInput): string | null {
  if (!input.title?.trim()) return "Informe o título do post.";
  if (input.title.trim().length > 200)
    return "O título deve ter no máximo 200 caracteres.";
  if (!input.slug?.trim()) return "Informe o slug do post.";
  if (!isValidSlug(input.slug.trim()))
    return "Slug inválido. Use apenas letras minúsculas, números e hífens.";
  if (input.published_at && Number.isNaN(Date.parse(input.published_at)))
    return "Data de publicação inválida.";
  if (input.status === "publicado" && !input.published_at)
    return "Defina a data de publicação para publicar o post.";
  if (input.canonical_url && !/^https?:\/\/.+/i.test(input.canonical_url.trim()))
    return "A URL canônica deve começar com http:// ou https://.";
  if (input.body_md && DANGEROUS_MARKUP.test(input.body_md))
    return "O conteúdo não pode conter HTML executável (script, iframe, javascript: ou atributos on*).";
  if (input.tags && input.tags.some((tag) => !isValidSlug(tag)))
    return "Tags devem usar apenas letras minúsculas, números e hífens.";
  return null;
}

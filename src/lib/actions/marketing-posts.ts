"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { MARKETING_MEDIA_BUCKET, type PostStatus } from "@/lib/constants";
import { readingMinutes, validatePostInput, type PostInput } from "@/lib/marketing-post";
import { slugify, uniqueSlug } from "@/lib/marketing-slug";
import type { TablesUpdate } from "@/lib/database.types";
import type { ActionResult } from "./clients";

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";

async function requireInternoActor() {
  if (!isSupabaseConfigured()) return null;
  const session = await getSessionProfile();
  if (!session || session.profile?.role !== "interno") return null;
  return session;
}

function revalidatePostPaths(postId?: string) {
  revalidatePath("/marketing/blog");
  if (postId) revalidatePath(`/marketing/blog/${postId}`);
}

async function nextFreeSlug(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  base: string,
  ignoreId?: string,
): Promise<string> {
  const query = supabase.from("marketing_posts").select("slug");
  const { data } = ignoreId ? await query.neq("id", ignoreId) : await query;
  return uniqueSlug(base, (data ?? []).map((row) => row.slug));
}

export async function createPost(
  title: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const cleanTitle = title.trim();
  if (!cleanTitle) return { ok: false, error: "Informe o título do post." };

  const supabase = await createServerSupabase();
  const slug = await nextFreeSlug(supabase, cleanTitle);
  if (!slug) {
    return {
      ok: false,
      error: "O título precisa ter ao menos uma letra ou número.",
    };
  }

  const { data, error } = await supabase
    .from("marketing_posts")
    .insert({
      title: cleanTitle,
      slug,
      status: "rascunho",
      author_id: session.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  revalidatePostPaths();
  return { ok: true, data: { id: data.id } };
}

export async function updatePost(
  postId: string,
  input: PostInput,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const invalid = validatePostInput(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("marketing_posts")
    .select("id, slug")
    .eq("id", postId)
    .single();
  if (!current) return { ok: false, error: "Post não encontrado." };

  // Slug informado já é validado no formato; aqui só garantimos unicidade.
  let slug = input.slug.trim();
  if (slug !== current.slug) {
    const free = await nextFreeSlug(supabase, slug, postId);
    if (!free) return { ok: false, error: "Slug inválido." };
    slug = free;
  }

  const body = input.body_md ?? "";
  const patch: TablesUpdate<"marketing_posts"> = {
    title: input.title.trim(),
    slug,
    excerpt: input.excerpt?.trim() || null,
    body_md: body,
    status: input.status ?? "rascunho",
    published_at: input.published_at || null,
    cover_path: input.cover_path || null,
    cover_alt: input.cover_alt?.trim() || null,
    seo_title: input.seo_title?.trim() || null,
    seo_description: input.seo_description?.trim() || null,
    canonical_url: input.canonical_url?.trim() || null,
    noindex: input.noindex ?? false,
    tags: input.tags ?? [],
    reading_minutes: readingMinutes(body),
  };

  const { error } = await supabase
    .from("marketing_posts")
    .update(patch)
    .eq("id", postId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidatePostPaths(postId);
  return { ok: true, data: undefined };
}

// Publicar sem data agenda para agora. Data futura mantém o post "agendado" —
// a API pública filtra por published_at <= now(), sem precisar de cron.
export async function publishPost(
  postId: string,
  publishedAt?: string | null,
): Promise<ActionResult<{ published_at: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  if (publishedAt && Number.isNaN(Date.parse(publishedAt))) {
    return { ok: false, error: "Data de publicação inválida." };
  }

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("marketing_posts")
    .select("published_at")
    .eq("id", postId)
    .single();
  if (!current) return { ok: false, error: "Post não encontrado." };

  const when = publishedAt || current.published_at || new Date().toISOString();
  const { error } = await supabase
    .from("marketing_posts")
    .update({ status: "publicado", published_at: when })
    .eq("id", postId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidatePostPaths(postId);
  return { ok: true, data: { published_at: when } };
}

// Arquivar preserva published_at e a URL histórica; voltar para rascunho não.
export async function setPostStatus(
  postId: string,
  status: PostStatus,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };
  if (status === "publicado") {
    return { ok: false, error: "Use a ação de publicar para publicar o post." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("marketing_posts")
    .update({ status })
    .eq("id", postId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidatePostPaths(postId);
  return { ok: true, data: undefined };
}

export async function setPostCover(
  postId: string,
  coverPath: string | null,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };
  if (coverPath && !coverPath.startsWith(`posts/${postId}/`)) {
    return { ok: false, error: "Caminho de imagem inválido." };
  }

  const supabase = await createServerSupabase();
  const { data: current } = await supabase
    .from("marketing_posts")
    .select("cover_path")
    .eq("id", postId)
    .single();
  if (!current) return { ok: false, error: "Post não encontrado." };

  const { error } = await supabase
    .from("marketing_posts")
    .update({ cover_path: coverPath })
    .eq("id", postId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  // Não deixa objeto órfão no bucket ao trocar ou remover a capa.
  if (current.cover_path && current.cover_path !== coverPath) {
    await supabase.storage
      .from(MARKETING_MEDIA_BUCKET)
      .remove([current.cover_path]);
  }

  revalidatePostPaths(postId);
  return { ok: true, data: undefined };
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data: post } = await supabase
    .from("marketing_posts")
    .select("id")
    .eq("id", postId)
    .single();
  if (!post) return { ok: false, error: "Post não encontrado." };

  // O cascade do banco não alcança o bucket. Limpa a pasta inteira: além da
  // capa, ela guarda as imagens do corpo, que só existem dentro do markdown.
  const raiz = `posts/${postId}`;
  const paths: string[] = [];
  for (const prefixo of [raiz, `${raiz}/corpo`]) {
    const { data: objetos } = await supabase.storage
      .from(MARKETING_MEDIA_BUCKET)
      .list(prefixo, { limit: 1000 });
    for (const objeto of objetos ?? []) {
      // Subpasta vem como entrada sem id — só arquivo é removível.
      if (objeto.id) paths.push(`${prefixo}/${objeto.name}`);
    }
  }
  if (paths.length > 0) {
    await supabase.storage.from(MARKETING_MEDIA_BUCKET).remove(paths);
  }

  const { error } = await supabase
    .from("marketing_posts")
    .delete()
    .eq("id", postId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidatePostPaths();
  return { ok: true, data: undefined };
}

// Usada pelo editor para sugerir o slug a partir do título sem colidir.
export async function suggestPostSlug(
  title: string,
  postId: string,
): Promise<ActionResult<{ slug: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };
  const base = slugify(title);
  if (!base) return { ok: false, error: "Título sem letras ou números." };

  const supabase = await createServerSupabase();
  const slug = await nextFreeSlug(supabase, base, postId);
  return { ok: true, data: { slug } };
}

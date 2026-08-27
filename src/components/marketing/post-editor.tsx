"use client";

import { useMemo, useState, useTransition } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  publishPost,
  setPostStatus,
  suggestPostSlug,
  updatePost,
} from "@/lib/actions/marketing-posts";
import type { Tables } from "@/lib/database.types";
import { dateTimeInputToISO, toDateTimeInputValue } from "@/lib/format";
import {
  postState,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
} from "@/lib/marketing-post";
import { reviewPost } from "@/lib/marketing-post-review";
import { slugify } from "@/lib/marketing-slug";
import { cn } from "@/lib/utils";
import { ActionBar } from "@/components/ui/action-bar";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, FormSection, Input, Textarea } from "@/components/ui/form";
import { PostStateChip } from "@/components/ui/post-state-chip";
import { Tabs } from "@/components/ui/tabs";
import { CoverUploader } from "./cover-uploader";
import { MarkdownEditor } from "./markdown-editor";
import { RevisaoEditorial } from "./revisao-editorial";
import { SeoPreview } from "./seo-preview";

type Post = Tables<"marketing_posts">;

type FormValues = {
  title: string;
  slug: string;
  excerpt: string;
  body_md: string;
  cover_alt: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  noindex: boolean;
  tags: string[];
  published_at: string; // valor de <input type="datetime-local">
};

function toValues(post: Post): FormValues {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    body_md: post.body_md,
    cover_alt: post.cover_alt ?? "",
    seo_title: post.seo_title ?? "",
    seo_description: post.seo_description ?? "",
    canonical_url: post.canonical_url ?? "",
    noindex: post.noindex,
    tags: post.tags,
    published_at: post.published_at ? toDateTimeInputValue(post.published_at) : "",
  };
}

const TABS = [
  { id: "conteudo", label: "Conteúdo" },
  { id: "seo", label: "SEO e capa" },
  { id: "publicacao", label: "Publicação" },
];

function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span
      className={cn(
        "tabular-nums",
        over ? "font-medium text-trend-negative" : "text-slate-500",
      )}
    >
      {value.length}/{max}
    </span>
  );
}

export function PostEditor({ post, siteUrl }: { post: Post; siteUrl: string }) {
  const [initial, setInitial] = useState(() => toValues(post));
  const [values, setValues] = useState(initial);
  const [coverPath, setCoverPath] = useState(post.cover_path);
  const [status, setStatus] = useState(post.status);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<
    "publicar" | "despublicar" | "arquivar" | "slug" | null
  >(null);
  const [saving, startSaving] = useTransition();
  const [acting, startActing] = useTransition();

  // Slug travado fora de rascunho: mudar quebra a URL e a SEO já acumulada.
  const [slugUnlocked, setSlugUnlocked] = useState(false);

  const state = postState({ status, published_at: post.published_at });
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const slugLocked = state !== "rascunho" && !slugUnlocked;
  const publicUrl = `${siteUrl}/blog/${values.slug}`;

  const achados = useMemo(
    () =>
      reviewPost({
        title: values.title,
        cover_path: coverPath,
        cover_alt: values.cover_alt,
        body_md: values.body_md,
      }),
    [values.title, coverPath, values.cover_alt, values.body_md],
  );

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function save(nextStatus = status) {
    setError(null);
    startSaving(async () => {
      const result = await updatePost(post.id, {
        ...values,
        status: nextStatus,
        cover_path: coverPath,
        published_at: values.published_at
          ? dateTimeInputToISO(values.published_at)
          : null,
      });
      if (result.ok) setInitial(values);
      else setError(result.error);
    });
  }

  function addTag() {
    const tag = slugify(tagDraft);
    if (!tag || values.tags.includes(tag)) {
      setTagDraft("");
      return;
    }
    set("tags", [...values.tags, tag]);
    setTagDraft("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <BackButton href="/marketing/blog" />
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-slate-900">
              {values.title || "Post sem título"}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <PostStateChip state={state} />
              <span className="text-xs text-slate-500">{publicUrl}</span>
              <CopyButton text={publicUrl} label="Copiar URL do site" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {state === "publicado" || state === "agendado" ? (
            <Button
              variant="secondary"
              onClick={() => setConfirming("arquivar")}
              disabled={acting}
            >
              Arquivar
            </Button>
          ) : null}
          {status === "publicado" ? (
            <Button
              variant="secondary"
              onClick={() => setConfirming("despublicar")}
              disabled={acting}
            >
              Voltar a rascunho
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setConfirming("publicar")}
              disabled={acting}
            >
              Publicar
            </Button>
          )}
        </div>
      </div>

      <Tabs tabs={TABS} panelClassName="p-4 sm:p-8">
        {(active) => (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            {active === "conteudo" ? (
              <>
                <FormSection title="Identificação" first>
                  <Field label="Título" htmlFor="post-title">
                    <Input
                      id="post-title"
                      value={values.title}
                      onChange={(event) => set("title", event.target.value)}
                      required
                    />
                  </Field>
                  <Field
                    label="Slug"
                    help={
                      slugLocked
                        ? "Travado após a publicação: mudar quebraria a URL no site."
                        : "Aparece na URL do post no site."
                    }
                    htmlFor="post-slug"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        id="post-slug"
                        value={values.slug}
                        disabled={slugLocked}
                        onChange={(event) => set("slug", event.target.value)}
                      />
                      {slugLocked ? (
                        <Button
                          variant="tertiary"
                          onClick={() => setConfirming("slug")}
                          className="shrink-0"
                        >
                          Destravar
                        </Button>
                      ) : (
                        <Button
                          variant="tertiary"
                          className="shrink-0"
                          onClick={() =>
                            startActing(async () => {
                              const result = await suggestPostSlug(
                                values.title,
                                post.id,
                              );
                              if (result.ok) set("slug", result.data.slug);
                              else setError(result.error);
                            })
                          }
                        >
                          Gerar do título
                        </Button>
                      )}
                    </div>
                  </Field>
                  <Field
                    label="Resumo"
                    help="Usado no card do site e como descrição padrão nas buscas."
                    htmlFor="post-excerpt"
                  >
                    <Textarea
                      id="post-excerpt"
                      value={values.excerpt}
                      onChange={(event) => set("excerpt", event.target.value)}
                      className="min-h-20"
                    />
                  </Field>
                </FormSection>

                <FormSection
                  title="Conteúdo"
                  description="Markdown. Quem renderiza o HTML final é o site do blog."
                >
                  <MarkdownEditor
                    postId={post.id}
                    value={values.body_md}
                    onChange={(value) => set("body_md", value)}
                  />
                </FormSection>
              </>
            ) : null}

            {active === "seo" ? (
              <>
                <FormSection title="Capa" first>
                  <CoverUploader
                    postId={post.id}
                    coverPath={coverPath}
                    onChange={setCoverPath}
                  />
                  <Field
                    label="Texto alternativo da capa"
                    help="Escreva o assunto do post, não a cena da imagem. É o que leitores de tela e redes sociais leem."
                    htmlFor="post-cover-alt"
                  >
                    <Input
                      id="post-cover-alt"
                      value={values.cover_alt}
                      onChange={(event) => set("cover_alt", event.target.value)}
                    />
                  </Field>
                  <RevisaoEditorial
                    findings={achados}
                    onFix={(valor) => set("cover_alt", valor)}
                    disabled={saving}
                  />
                </FormSection>

                <FormSection title="Busca">
                  <Field label="Título de SEO" htmlFor="post-seo-title">
                    <div className="flex flex-col gap-1">
                      <Input
                        id="post-seo-title"
                        value={values.seo_title}
                        placeholder={values.title}
                        onChange={(event) => set("seo_title", event.target.value)}
                      />
                      <span className="text-xs">
                        <CharCount value={values.seo_title} max={SEO_TITLE_MAX} />
                      </span>
                    </div>
                  </Field>
                  <Field label="Descrição de SEO" htmlFor="post-seo-description">
                    <div className="flex flex-col gap-1">
                      <Textarea
                        id="post-seo-description"
                        value={values.seo_description}
                        placeholder={values.excerpt}
                        onChange={(event) =>
                          set("seo_description", event.target.value)
                        }
                        className="min-h-20"
                      />
                      <span className="text-xs">
                        <CharCount
                          value={values.seo_description}
                          max={SEO_DESCRIPTION_MAX}
                        />
                      </span>
                    </div>
                  </Field>
                  <Field
                    label="URL canônica"
                    help="Preencha só se este conteúdo também existir em outro endereço."
                    htmlFor="post-canonical"
                  >
                    <Input
                      id="post-canonical"
                      value={values.canonical_url}
                      placeholder="https://…"
                      onChange={(event) => set("canonical_url", event.target.value)}
                    />
                  </Field>
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
                    <Checkbox
                      checked={values.noindex}
                      onChange={(event) => set("noindex", event.target.checked)}
                    />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">
                        Não indexar (noindex)
                      </span>
                      <span className="text-xs text-slate-500">
                        O site pede aos buscadores que não listem este post.
                      </span>
                    </span>
                  </label>
                  <SeoPreview
                    siteUrl={siteUrl}
                    slug={values.slug}
                    title={values.title}
                    excerpt={values.excerpt}
                    bodyMd={values.body_md}
                    seoTitle={values.seo_title}
                    seoDescription={values.seo_description}
                  />
                </FormSection>

                <FormSection title="Tags">
                  <Field
                    label="Adicionar tag"
                    help="Enter para incluir. Viram slugs, usados no filtro do site."
                    htmlFor="post-tag"
                  >
                    <Input
                      id="post-tag"
                      value={tagDraft}
                      onChange={(event) => setTagDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addTag();
                        }
                      }}
                    />
                  </Field>
                  {values.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {values.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 text-xs text-slate-700"
                        >
                          {tag}
                          <button
                            type="button"
                            aria-label={`Remover tag ${tag}`}
                            onClick={() =>
                              set(
                                "tags",
                                values.tags.filter((item) => item !== tag),
                              )
                            }
                            className={cn(
                              "inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-slate-400",
                              "transition-colors hover:bg-slate-100 hover:text-slate-600",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                            )}
                          >
                            <XMarkIcon className="h-4 w-4" aria-hidden />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Nenhuma tag ainda.</p>
                  )}
                </FormSection>
              </>
            ) : null}

            {active === "publicacao" ? (
              <FormSection title="Agendamento" first>
                <Field
                  label="Data e hora de publicação"
                  help="No horário de Brasília. Data futura mantém o post agendado: o site só passa a exibi-lo a partir dela."
                  htmlFor="post-published-at"
                >
                  <Input
                    id="post-published-at"
                    type="datetime-local"
                    value={values.published_at}
                    onChange={(event) => set("published_at", event.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-slate-700">Estado</span>
                    <PostStateChip state={state} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-slate-700">
                      Tempo de leitura
                    </span>
                    <span className="text-sm tabular-nums text-slate-600">
                      {post.reading_minutes} min
                    </span>
                  </div>
                </div>
              </FormSection>
            ) : null}

            {error ? (
              <p role="alert" className="text-xs text-trend-negative">
                {error}
              </p>
            ) : null}

            <ActionBar
              dirty={dirty}
              saving={saving}
              onSave={() => save()}
              onDiscard={() => setValues(initial)}
            />
          </div>
        )}
      </Tabs>

      <ConfirmModal
        open={confirming === "publicar"}
        onClose={() => setConfirming(null)}
        tone="primary"
        title="Publicar post?"
        description={
          values.published_at
            ? "O post será publicado na data e hora agendadas. Alterações não salvas serão salvas junto."
            : "O post ficará disponível no site imediatamente. Alterações não salvas serão salvas junto."
        }
        confirmLabel={achados.length > 0 ? "Publicar assim" : "Publicar"}
        cancelLabel={achados.length > 0 ? "Revisar" : "Cancelar"}
        loading={acting}
        onConfirm={() => {
          setError(null);
          startActing(async () => {
            const saved = await updatePost(post.id, {
              ...values,
              status: "publicado",
              cover_path: coverPath,
              published_at: values.published_at
                ? dateTimeInputToISO(values.published_at)
                : new Date().toISOString(),
            });
            if (!saved.ok) {
              setError(saved.error);
              setConfirming(null);
              return;
            }
            const result = await publishPost(
              post.id,
              values.published_at ? dateTimeInputToISO(values.published_at) : null,
            );
            if (result.ok) {
              setStatus("publicado");
              setInitial(values);
            } else {
              setError(result.error);
            }
            setConfirming(null);
          });
        }}
      >
        <RevisaoEditorial findings={achados} />
      </ConfirmModal>

      <ConfirmModal
        open={confirming === "despublicar"}
        onClose={() => setConfirming(null)}
        tone="warning"
        title="Voltar o post a rascunho?"
        description="Ele sai do ar no site na próxima revalidação e a data de publicação é perdida. Para tirar do ar mantendo a data, use Arquivar."
        confirmLabel="Voltar a rascunho"
        loading={acting}
        onConfirm={() => {
          setError(null);
          startActing(async () => {
            const result = await setPostStatus(post.id, "rascunho");
            if (result.ok) setStatus("rascunho");
            else setError(result.error);
            setConfirming(null);
          });
        }}
      />

      <ConfirmModal
        open={confirming === "arquivar"}
        onClose={() => setConfirming(null)}
        tone="warning"
        title="Arquivar post?"
        description="Ele sai do ar no site mas mantém a data de publicação e o histórico. A URL antiga passará a dar 404."
        confirmLabel="Arquivar"
        loading={acting}
        onConfirm={() => {
          setError(null);
          startActing(async () => {
            const result = await setPostStatus(post.id, "arquivado");
            if (result.ok) setStatus("arquivado");
            else setError(result.error);
            setConfirming(null);
          });
        }}
      />

      <ConfirmModal
        open={confirming === "slug"}
        onClose={() => setConfirming(null)}
        tone="warning"
        title="Editar o slug de um post publicado?"
        description="A URL antiga passará a dar 404 no site e a autoridade de busca acumulada será perdida. Se houver um endereço antigo a preservar, ajuste a URL canônica."
        confirmLabel="Editar mesmo assim"
        onConfirm={() => {
          setSlugUnlocked(true);
          setConfirming(null);
        }}
      />
    </div>
  );
}

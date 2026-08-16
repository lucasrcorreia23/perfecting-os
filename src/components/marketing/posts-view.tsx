"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  NewspaperIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { deletePost } from "@/lib/actions/marketing-posts";
import { POST_STATES, POST_STATE_ORDER, type PostStatus } from "@/lib/constants";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { postState } from "@/lib/marketing-post";
import { cn } from "@/lib/utils";
import { ActionMenu } from "@/components/ui/action-menu";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteNamedModal } from "@/components/ui/delete-named-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { PostStateChip } from "@/components/ui/post-state-chip";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { NewPostButton } from "./new-post-modal";

export type PostRow = {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  published_at: string | null;
  tags: string[];
  updated_at: string;
  reading_minutes: number;
};

const STATE_OPTIONS = [
  { value: "todos", label: "Todos os estados" },
  ...POST_STATE_ORDER.map((state) => ({
    value: state,
    label: POST_STATES[state].label,
  })),
];

// Pura e exportada para o teste (padrão de client-card.test.ts).
export function filterPosts(
  posts: PostRow[],
  query: string,
  state: string,
  now: Date = new Date(),
): PostRow[] {
  const term = query.trim().toLowerCase();
  return posts.filter((post) => {
    if (state !== "todos" && postState(post, now) !== state) return false;
    if (!term) return true;
    return (
      post.title.toLowerCase().includes(term) ||
      post.slug.toLowerCase().includes(term) ||
      post.tags.some((tag) => tag.includes(term))
    );
  });
}

// `limit` menor e `wrap: false` na tabela: lá as tags dividem a linha com as
// outras colunas e uma segunda linha empurraria a altura da célula.
function Tags({
  tags,
  limit = 3,
  wrap = true,
}: {
  tags: string[];
  limit?: number;
  wrap?: boolean;
}) {
  if (tags.length === 0) return <span className="text-slate-400">—</span>;
  const extra = tags.length - limit;
  return (
    <span
      className={cn("flex items-center gap-1", wrap ? "flex-wrap" : "flex-nowrap")}
      title={tags.join(", ")}
    >
      {tags.slice(0, limit).map((tag) => (
        <span
          key={tag}
          className="max-w-28 truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-normal text-slate-600"
        >
          {tag}
        </span>
      ))}
      {extra > 0 ? (
        <span className="text-[11px] font-normal text-slate-500">+{extra}</span>
      ) : null}
    </span>
  );
}

export function PostsView({ posts }: { posts: PostRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("todos");
  const [deleting, setDeleting] = useState<PostRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => filterPosts(posts, query, state),
    [posts, query, state],
  );

  function menuFor(post: PostRow) {
    return (
      <ActionMenu
        ariaLabel={`Ações de ${post.title}`}
        items={[
          {
            label: "Editar",
            icon: PencilSquareIcon,
            href: `/marketing/blog/${post.id}`,
          },
          {
            label: "Excluir",
            icon: TrashIcon,
            destructive: true,
            onSelect: () => setDeleting(post),
          },
        ]}
      />
    );
  }

  const columns: Column<PostRow>[] = [
    {
      key: "titulo",
      header: "Título",
      // `w-full max-w-0` faz a coluna absorver a sobra e habilita o truncate
      // dentro da célula — sem isso a tabela cresce em vez de cortar.
      className: "w-full max-w-0",
      render: (post) => (
        <span className="flex flex-col">
          <span
            title={post.title}
            className="truncate text-sm font-medium text-slate-800"
          >
            {post.title}
          </span>
          <span
            title={`/${post.slug}`}
            className="truncate text-xs font-normal text-slate-500"
          >
            /{post.slug}
          </span>
        </span>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      className: "whitespace-nowrap",
      render: (post) => <Tags tags={post.tags} limit={2} wrap={false} />,
    },
    {
      key: "publicacao",
      header: "Publicação",
      className: "whitespace-nowrap",
      render: (post) => (
        <span className="tabular-nums text-slate-600">
          {post.published_at ? formatDate(post.published_at) : "—"}
        </span>
      ),
    },
    {
      key: "atualizado",
      header: "Atualizado",
      className: "whitespace-nowrap",
      render: (post) => (
        <span className="text-slate-600">{formatRelativeTime(post.updated_at)}</span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      className: "whitespace-nowrap",
      render: (post) => <PostStateChip state={postState(post)} />,
    },
    {
      key: "acoes",
      header: <span className="sr-only">Ações</span>,
      className: "w-14 text-right",
      render: (post) => menuFor(post),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Posts do blog</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por título, slug ou tag"
            size="lg"
            className="sm:w-72"
          />
          <Select
            aria-label="Filtrar por estado"
            options={STATE_OPTIONS}
            value={state}
            onChange={(event) => setState(event.target.value)}
            className="sm:w-52"
          />
          <NewPostButton />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(post) => post.id}
        rowHref={(post) => `/marketing/blog/${post.id}`}
        empty={
          <EmptyState
            icon={NewspaperIcon}
            title={
              query || state !== "todos"
                ? "Nenhum post encontrado"
                : "Nenhum post ainda"
            }
            description={
              query || state !== "todos"
                ? "Ajuste a busca ou o filtro e tente novamente."
                : "Escreva o primeiro post para o blog do site."
            }
            action={query || state !== "todos" ? undefined : <NewPostButton />}
          />
        }
        mobileCard={(post) => (
          <div
            role="link"
            tabIndex={0}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("a,button,select,input,label")) return;
              router.push(`/marketing/blog/${post.id}`);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") router.push(`/marketing/blog/${post.id}`);
            }}
            className={cn(
              "flex cursor-pointer flex-col gap-3 rounded-sm border border-slate-200 bg-white p-4",
              "transition-colors hover:border-slate-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-slate-800">
                  {post.title}
                </span>
                <span className="truncate text-xs text-slate-500">/{post.slug}</span>
              </div>
              {menuFor(post)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PostStateChip state={postState(post)} compact />
              <Tags tags={post.tags} />
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="tabular-nums">
                {post.published_at ? formatDate(post.published_at) : "Sem data"}
              </span>
              <span>{formatRelativeTime(post.updated_at)}</span>
            </div>
          </div>
        )}
      />

      <DeleteNamedModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        itemName={deleting?.title ?? ""}
        title="Excluir post"
        description={`O post "${deleting?.title ?? ""}" e sua imagem de capa serão excluídos permanentemente. Se ele estiver publicado, a URL no site passará a dar 404.`}
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          const post = deleting;
          setError(null);
          startTransition(async () => {
            const result = await deletePost(post.id);
            if (result.ok) setDeleting(null);
            else setError(result.error);
          });
        }}
      />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  EyeIcon,
  FunnelIcon,
  PencilSquareIcon,
  TrashIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { deleteFunnel } from "@/lib/actions/marketing-funnels";
import type { FunnelStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ActionMenu } from "@/components/ui/action-menu";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteNamedModal } from "@/components/ui/delete-named-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { FunnelStatusChip } from "@/components/ui/funnel-status-chip";
import { RelativeTime } from "@/components/ui/relative-time";
import { SearchInput } from "@/components/ui/search-input";
import { NewFunnelButton } from "./new-funnel-modal";

export type FunnelRow = {
  id: string;
  name: string;
  slug: string;
  status: FunnelStatus;
  questionCount: number;
  leadCount: number;
  publishedVersion: number | null;
  updated_at: string;
};

export function FunnelsView({ funnels }: { funnels: FunnelRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<FunnelRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return funnels;
    return funnels.filter(
      (funnel) =>
        funnel.name.toLowerCase().includes(term) ||
        funnel.slug.toLowerCase().includes(term),
    );
  }, [funnels, query]);

  function menuFor(funnel: FunnelRow) {
    return (
      <ActionMenu
        ariaLabel={`Ações de ${funnel.name}`}
        items={[
          {
            label: "Editar",
            icon: PencilSquareIcon,
            href: `/marketing/funis/${funnel.id}`,
          },
          // Só faz sentido depois de publicar: o quiz da lista simula a
          // versão que o site está servindo.
          ...(funnel.publishedVersion
            ? [
                {
                  label: "Pré-visualizar",
                  icon: EyeIcon,
                  href: `/marketing/funis/${funnel.id}/testar?versao=publicada`,
                },
              ]
            : []),
          {
            label: "Ver leads",
            icon: UserGroupIcon,
            href: `/marketing/leads?funil=${funnel.id}`,
          },
          {
            label: "Excluir",
            icon: TrashIcon,
            destructive: true,
            onSelect: () => setDeleting(funnel),
          },
        ]}
      />
    );
  }

  const columns: Column<FunnelRow>[] = [
    {
      key: "funil",
      header: "Funil",
      render: (funnel) => (
        <span className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{funnel.name}</span>
          <span className="text-xs font-normal text-slate-500">/{funnel.slug}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (funnel) => <FunnelStatusChip status={funnel.status} />,
    },
    {
      key: "perguntas",
      header: "Perguntas",
      render: (funnel) => (
        <span className="tabular-nums text-slate-600">{funnel.questionCount}</span>
      ),
    },
    {
      key: "leads",
      header: "Leads",
      render: (funnel) => (
        <span className="tabular-nums text-slate-600">{funnel.leadCount}</span>
      ),
    },
    {
      key: "versao",
      header: "Versão no ar",
      render: (funnel) => (
        <span className="tabular-nums text-slate-600">
          {funnel.publishedVersion ? `v${funnel.publishedVersion}` : "—"}
        </span>
      ),
    },
    {
      key: "atualizado",
      header: "Atualizado",
      render: (funnel) => (
        <RelativeTime iso={funnel.updated_at} className="text-slate-600" />
      ),
    },
    {
      key: "acoes",
      header: <span className="sr-only">Ações</span>,
      className: "w-14 text-right",
      render: (funnel) => menuFor(funnel),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Funis de qualificação
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nome ou slug"
            size="lg"
            className="sm:w-72"
          />
          <NewFunnelButton />
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
        rowKey={(funnel) => funnel.id}
        rowHref={(funnel) => `/marketing/funis/${funnel.id}`}
        empty={
          <EmptyState
            icon={FunnelIcon}
            title={query ? "Nenhum funil encontrado" : "Nenhum funil ainda"}
            description={
              query
                ? "Ajuste a busca e tente novamente."
                : "Crie um funil de perguntas para captar e qualificar leads no site."
            }
            action={query ? undefined : <NewFunnelButton />}
          />
        }
        mobileCard={(funnel) => (
          <div
            role="link"
            tabIndex={0}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("a,button,select,input,label")) return;
              router.push(`/marketing/funis/${funnel.id}`);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") router.push(`/marketing/funis/${funnel.id}`);
            }}
            className={cn(
              "flex cursor-pointer flex-col gap-3 rounded-sm border border-slate-200 bg-white p-4",
              "transition-colors hover:border-slate-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-800">
                  {funnel.name}
                </span>
                <span className="text-xs text-slate-500">/{funnel.slug}</span>
              </div>
              {menuFor(funnel)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FunnelStatusChip status={funnel.status} compact />
              {funnel.publishedVersion ? (
                <span className="text-xs tabular-nums text-slate-500">
                  v{funnel.publishedVersion} no ar
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="tabular-nums">{funnel.questionCount} perguntas</span>
              <span className="tabular-nums">{funnel.leadCount} leads</span>
              <RelativeTime iso={funnel.updated_at} />
            </div>
          </div>
        )}
      />

      <DeleteNamedModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        itemName={deleting?.name ?? ""}
        title="Excluir funil"
        description={`O funil "${deleting?.name ?? ""}" e suas versões publicadas serão excluídos permanentemente. Funis com leads não podem ser excluídos — arquive-os.`}
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          const funnel = deleting;
          setError(null);
          startTransition(async () => {
            const result = await deleteFunnel(funnel.id);
            if (result.ok) setDeleting(null);
            else {
              setError(result.error);
              setDeleting(null);
            }
          });
        }}
      />
    </div>
  );
}

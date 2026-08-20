"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { deleteLead } from "@/lib/actions/marketing-leads";
import {
  LEAD_STATUSES,
  LEAD_STATUS_ORDER,
  QUALIFICACAO_ORDER,
  QUALIFICACOES,
  type LeadQualificacao,
  type LeadStatus,
} from "@/lib/constants";
import { downloadText } from "@/lib/download";
import type { AnswerMap } from "@/lib/marketing-answers";
import type { FunnelQuestion } from "@/lib/marketing-funnel";
import { csvFilename, leadsToCsv } from "@/lib/marketing-lead-export";
import { cn } from "@/lib/utils";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LeadStatusChip } from "@/components/ui/lead-status-chip";
import { QualificacaoChip } from "@/components/ui/qualificacao-chip";
import { RelativeTime } from "@/components/ui/relative-time";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { ConvertLeadModal } from "./convert-lead-modal";

export type LeadRow = {
  id: string;
  funnelId: string;
  funnelName: string;
  version: number | null;
  questions: FunnelQuestion[];
  answers: AnswerMap;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  roleTitle: string | null;
  score: number;
  scoreMax: number;
  scorePct: number;
  qualificacao: LeadQualificacao;
  status: LeadStatus;
  clientId: string | null;
  notes: string | null;
  sourceUrl: string | null;
  utm: Record<string, string>;
  created_at: string;
};

export type LeadFilters = {
  query: string;
  funnel: string;
  status: string;
  qualificacao: string;
};

// Pura e exportada para o teste (padrão de client-card.test.ts).
export function filterLeads(leads: LeadRow[], filters: LeadFilters): LeadRow[] {
  const term = filters.query.trim().toLowerCase();
  return leads.filter((lead) => {
    if (filters.funnel !== "todos" && lead.funnelId !== filters.funnel) return false;
    if (filters.status !== "todos" && lead.status !== filters.status) return false;
    if (
      filters.qualificacao !== "todas" &&
      lead.qualificacao !== filters.qualificacao
    ) {
      return false;
    }
    if (!term) return true;
    return [lead.name, lead.email, lead.company].some((field) =>
      (field ?? "").toLowerCase().includes(term),
    );
  });
}

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos os status" },
  ...LEAD_STATUS_ORDER.map((status) => ({
    value: status,
    label: LEAD_STATUSES[status].label,
  })),
];

const QUALIFICACAO_OPTIONS = [
  { value: "todas", label: "Todas as faixas" },
  ...QUALIFICACAO_ORDER.map((key) => ({
    value: key,
    label: QUALIFICACOES[key].label,
  })),
];

function LeadIdentity({ lead }: { lead: LeadRow }) {
  return (
    <span className="flex flex-col">
      <span className="text-sm font-medium text-slate-800">
        {lead.name || "Sem nome"}
      </span>
      <span className="text-xs font-normal text-slate-500">
        {lead.email || lead.company || "Sem contato"}
      </span>
    </span>
  );
}

function Score({ lead }: { lead: LeadRow }) {
  return (
    <span className="flex items-center gap-2">
      <span className="tabular-nums text-slate-600">{lead.scorePct}%</span>
      <QualificacaoChip qualificacao={lead.qualificacao} compact />
    </span>
  );
}

export function LeadsView({
  leads,
  funnels,
  initialFunnel,
}: {
  leads: LeadRow[];
  funnels: { id: string; name: string }[];
  initialFunnel: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [funnel, setFunnel] = useState(initialFunnel);
  const [status, setStatus] = useState("todos");
  const [qualificacao, setQualificacao] = useState("todas");
  const [converting, setConverting] = useState<LeadRow | null>(null);
  const [deleting, setDeleting] = useState<LeadRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => filterLeads(leads, { query, funnel, status, qualificacao }),
    [leads, query, funnel, status, qualificacao],
  );

  const funnelOptions = [
    { value: "todos", label: "Todos os funis" },
    ...funnels.map((item) => ({ value: item.id, label: item.name })),
  ];

  const filtering =
    query !== "" ||
    funnel !== "todos" ||
    status !== "todos" ||
    qualificacao !== "todas";

  function menuFor(lead: LeadRow) {
    return (
      <ActionMenu
        ariaLabel={`Ações do lead ${lead.name ?? lead.email ?? "sem nome"}`}
        items={[
          {
            label: "Ver respostas",
            icon: EyeIcon,
            href: `/marketing/leads/${lead.id}`,
          },
          lead.clientId
            ? {
                label: "Ver cliente",
                icon: UserGroupIcon,
                href: `/clientes/${lead.clientId}`,
              }
            : {
                label: "Converter em cliente",
                icon: UserPlusIcon,
                onSelect: () => setConverting(lead),
              },
          {
            label: "Excluir",
            icon: TrashIcon,
            destructive: true,
            onSelect: () => setDeleting(lead),
          },
        ]}
      />
    );
  }

  const columns: Column<LeadRow>[] = [
    { key: "lead", header: "Lead", render: (lead) => <LeadIdentity lead={lead} /> },
    {
      key: "funil",
      header: "Funil",
      render: (lead) => (
        <span className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">
            {lead.funnelName}
          </span>
          {lead.version ? (
            <span className="text-xs font-normal tabular-nums text-slate-500">
              v{lead.version}
            </span>
          ) : null}
        </span>
      ),
    },
    { key: "pontuacao", header: "Pontuação", render: (lead) => <Score lead={lead} /> },
    {
      key: "status",
      header: "Status",
      render: (lead) => <LeadStatusChip status={lead.status} />,
    },
    {
      key: "recebido",
      header: "Recebido",
      render: (lead) => (
        <RelativeTime iso={lead.created_at} className="text-slate-600" />
      ),
    },
    {
      key: "acoes",
      header: <span className="sr-only">Ações</span>,
      className: "w-14 text-right",
      render: (lead) => menuFor(lead),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Leads captados</h2>
          {/* Exporta o recorte visível, não a base inteira: o que está na
              tela é o que vai para a planilha. */}
          <Button
            icon={ArrowDownTrayIcon}
            disabled={filtered.length === 0}
            onClick={() =>
              downloadText(
                csvFilename("leads", new Date().toISOString()),
                leadsToCsv(filtered),
              )
            }
          >
            Exportar {filtered.length} {filtered.length === 1 ? "lead" : "leads"}
          </Button>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nome, e-mail ou empresa"
            size="lg"
            className="lg:w-72"
          />
          <Select
            aria-label="Filtrar por funil"
            options={funnelOptions}
            value={funnel}
            onChange={(event) => setFunnel(event.target.value)}
            className="lg:w-52"
          />
          <Select
            aria-label="Filtrar por status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="lg:w-48"
          />
          <Select
            aria-label="Filtrar por qualificação"
            options={QUALIFICACAO_OPTIONS}
            value={qualificacao}
            onChange={(event) => setQualificacao(event.target.value)}
            className="lg:w-44"
          />
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
        rowKey={(lead) => lead.id}
        rowHref={(lead) => `/marketing/leads/${lead.id}`}
        empty={
          <EmptyState
            icon={UserGroupIcon}
            title={filtering ? "Nenhum lead encontrado" : "Nenhum lead ainda"}
            description={
              filtering
                ? "Ajuste a busca ou os filtros e tente novamente."
                : "Publique um funil no site: as respostas aparecem aqui automaticamente."
            }
          />
        }
        mobileCard={(lead) => (
          <div
            role="link"
            tabIndex={0}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("a,button,select,input,label")) return;
              router.push(`/marketing/leads/${lead.id}`);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") router.push(`/marketing/leads/${lead.id}`);
            }}
            className={cn(
              "flex cursor-pointer flex-col gap-3 rounded-sm border border-slate-200 bg-white p-4",
              "transition-colors hover:border-slate-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <LeadIdentity lead={lead} />
              {menuFor(lead)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Score lead={lead} />
              <LeadStatusChip status={lead.status} compact />
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>{lead.funnelName}</span>
              <RelativeTime iso={lead.created_at} />
            </div>
          </div>
        )}
      />

      <ConvertLeadModal
        lead={converting}
        onClose={() => setConverting(null)}
      />

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        tone="danger"
        title="Excluir lead?"
        description="As respostas enviadas serão apagadas permanentemente. O cliente já criado a partir deste lead, se houver, não é afetado."
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          const lead = deleting;
          setError(null);
          startTransition(async () => {
            const result = await deleteLead(lead.id);
            if (!result.ok) setError(result.error);
            setDeleting(null);
          });
        }}
      />
    </div>
  );
}

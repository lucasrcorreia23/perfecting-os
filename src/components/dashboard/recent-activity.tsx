"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowsPointingOutIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { STAGE_ORDER, STAGES, type WorkflowStage } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import type { HeroIcon } from "@/components/ui/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { RelativeTime } from "@/components/ui/relative-time";

export type FeedEvent = Tables<"events"> & {
  clients: { name: string } | null;
};

const VISIBLE_LIMIT = 5;

const ICONS: Record<string, HeroIcon> = {
  cliente_criado: PlusIcon,
  etapa_alterada: ArrowRightIcon,
  atividade_criada: PlusIcon,
  atividade_concluida: CheckCircleIcon,
  arquivo_enviado: DocumentTextIcon,
  arquivo_excluido: TrashIcon,
};

type Payload = {
  from?: string;
  to?: string;
  title?: string;
  name?: string;
};

function stageLabel(stage: string | undefined): string {
  return stage && stage in STAGES
    ? STAGES[stage as WorkflowStage].label
    : (stage ?? "");
}

function eventText(event: FeedEvent): string {
  const clientName =
    event.clients?.name ?? (event.payload as Payload)?.name ?? "Cliente";
  const payload = (event.payload ?? {}) as Payload;

  switch (event.type) {
    case "cliente_criado":
      return `${clientName} foi adicionado como cliente`;
    case "etapa_alterada": {
      const fromIndex = STAGE_ORDER.indexOf(payload.from as WorkflowStage);
      const toIndex = STAGE_ORDER.indexOf(payload.to as WorkflowStage);
      const verb = toIndex >= fromIndex ? "avançou" : "voltou";
      return `${clientName} ${verb} de ${stageLabel(payload.from)} para ${stageLabel(payload.to)}`;
    }
    case "atividade_criada":
      return `${clientName}: atividade "${payload.title ?? ""}" criada`;
    case "atividade_concluida":
      return `${clientName}: atividade "${payload.title ?? ""}" concluída`;
    case "arquivo_enviado":
      return `${clientName}: arquivo "${payload.name ?? ""}" enviado`;
    case "arquivo_excluido":
      return `${clientName}: arquivo "${payload.name ?? ""}" excluído`;
    default:
      return clientName;
  }
}

function EventRow({ event, detailed }: { event: FeedEvent; detailed?: boolean }) {
  const Icon = ICONS[event.type] ?? ClockIcon;
  const row = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50">
        <Icon className="h-4 w-4 text-slate-500" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
        {eventText(event)}
      </span>
      <span className="shrink-0 text-xs text-slate-400">
        {detailed ? (
          formatDateTime(event.created_at)
        ) : (
          <RelativeTime iso={event.created_at} />
        )}
      </span>
    </>
  );

  if (!event.client_id) {
    return (
      <div className="flex min-h-[44px] items-center gap-3 rounded-sm px-2 py-2">
        {row}
      </div>
    );
  }

  return (
    <Link
      href={`/clientes/${event.client_id}`}
      className="flex min-h-[44px] items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
    >
      {row}
    </Link>
  );
}

function EmptyFeed() {
  return (
    <EmptyState
      icon={ClockIcon}
      title="Nada por aqui ainda"
      description="As movimentações dos seus clientes aparecerão neste feed."
      discreet
    />
  );
}

function RecentActivityModal({
  open,
  onClose,
  events,
}: {
  open: boolean;
  onClose: () => void;
  events: FeedEvent[];
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Todas as atividades"
      width="max-w-2xl"
    >
      {events.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="flex max-h-[70vh] flex-col divide-y divide-slate-100 overflow-y-auto">
          {events.map((event) => (
            <EventRow key={event.id} event={event} detailed />
          ))}
        </div>
      )}
    </Modal>
  );
}

export function RecentActivity({ events }: { events: FeedEvent[] }) {
  const [showAll, setShowAll] = useState(false);
  const visibleEvents = events.slice(0, VISIBLE_LIMIT);

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-slate-800">
          Atividades Recentes
        </h2>
        {events.length > 0 ? (
          <button
            type="button"
            aria-label="Ver todas as atividades"
            onClick={() => setShowAll(true)}
            className={cn(
              "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full sm:h-9 sm:w-9",
              "text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
          >
            <ArrowsPointingOutIcon className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </div>

      {events.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="flex flex-col">
          {visibleEvents.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}

      <RecentActivityModal
        open={showAll}
        onClose={() => setShowAll(false)}
        events={events}
      />
    </div>
  );
}

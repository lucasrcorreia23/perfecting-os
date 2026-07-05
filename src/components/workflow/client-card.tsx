"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { daysSince } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/ui/status-chip";

export type BoardClient = Tables<"clients"> & {
  activities: Tables<"activities">[];
};

export function cardStats(client: BoardClient) {
  const stageActivities = client.activities.filter(
    (activity) => activity.stage === client.stage,
  );
  const done = stageActivities.filter(
    (activity) => activity.status === "concluida",
  ).length;
  const days = daysSince(client.stage_entered_at);
  const over = days > client.stage_deadline_days;
  return { done, total: stageActivities.length, days, over };
}

export function CardContent({
  client,
  overlay = false,
}: {
  client: BoardClient;
  overlay?: boolean;
}) {
  const { done, total, days, over } = cardStats(client);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-sm border border-slate-200 bg-white p-3 shadow-[var(--shadow-sm)]",
        "transition-colors hover:border-slate-300",
        overlay && "rotate-2 shadow-[var(--shadow-md)]",
      )}
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-800">
          {client.name}
        </span>
        {client.company ? (
          <span className="text-xs text-slate-500">{client.company}</span>
        ) : null}
      </div>
      {client.status !== "ativo" ? (
        <StatusChip status={client.status} compact />
      ) : null}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="tabular-nums">
          {done}/{total} atividades
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 tabular-nums",
            over && "font-semibold text-trend-negative",
          )}
        >
          {over ? (
            <ExclamationTriangleIcon className="h-4 w-4" aria-hidden />
          ) : null}
          {days}/{client.stage_deadline_days} dias
        </span>
      </div>
    </div>
  );
}

export function ClientCard({
  client,
  onOpen,
}: {
  client: BoardClient;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: client.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`Mover ${client.name}`}
      style={{ transform: CSS.Translate.toString(transform) }}
      onClick={() => onOpen()}
      className={cn(
        "cursor-grab rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        isDragging && "opacity-40",
      )}
    >
      <CardContent client={client} />
      {/* Alvo de teclado para abrir o painel (Enter/Espaço no card iniciam o drag) */}
      <button
        type="button"
        aria-label={`Abrir detalhes de ${client.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="sr-only focus-visible:not-sr-only"
      >
        Abrir detalhes
      </button>
    </div>
  );
}

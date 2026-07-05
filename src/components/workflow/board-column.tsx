"use client";

import { useDroppable } from "@dnd-kit/core";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { STAGES, withAlpha, type WorkflowStage } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientCard, type BoardClient } from "./client-card";

export function BoardColumn({
  stage,
  clients,
  onOpen,
}: {
  stage: WorkflowStage;
  clients: BoardClient[];
  onOpen: (clientId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const { label, color } = STAGES[stage];

  return (
    <section
      ref={setNodeRef}
      aria-label={`Etapa ${label}`}
      className={cn(
        "flex w-[300px] shrink-0 snap-start flex-col gap-3 rounded-md border border-slate-200/60 bg-slate-50/60 p-3",
        "transition-shadow",
      )}
      style={{
        boxShadow: isOver
          ? `inset 0 0 0 2px ${withAlpha(color, 0.5)}`
          : undefined,
      }}
    >
      <header className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <h2 className="text-sm font-semibold text-slate-800">{label}</h2>
        <span
          className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums"
          style={{
            backgroundColor: withAlpha(color, 0.08),
            border: `1px solid ${withAlpha(color, 0.35)}`,
            color,
          }}
        >
          {clients.length}
        </span>
      </header>

      <div className="flex min-h-24 flex-col gap-2">
        {clients.length === 0 ? (
          <EmptyState
            icon={UserGroupIcon}
            title="Nenhum cliente nesta etapa"
            discreet
          />
        ) : (
          clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onOpen={() => onOpen(client.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

"use client";

import { useDroppable } from "@dnd-kit/core";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { STAGES, withAlpha, type WorkflowStage } from "@/lib/constants";
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
      className="flex min-h-0 w-[300px] shrink-0 flex-col gap-3 rounded-md border p-3 transition-shadow"
      style={{
        // Estilo ClickUp: leve cor de fundo da etapa; cards brancos destacam.
        backgroundColor: withAlpha(color, 0.05),
        borderColor: withAlpha(color, 0.14),
        boxShadow: isOver ? `inset 0 0 0 2px ${withAlpha(color, 0.5)}` : undefined,
      }}
    >
      {/* Header estilo ClickUp: nome em pill tingido (sem dot) + contagem simples
          em cinza à direita. */}
      <header className="flex items-center gap-2">
        <h2
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: withAlpha(color, 0.12), color }}
        >
          {label}
        </h2>
        <span className="ml-auto text-xs font-medium tabular-nums text-slate-400">
          {clients.length}
        </span>
      </header>

      <div className="scrollbar-thin -mr-1 flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto pr-1">
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

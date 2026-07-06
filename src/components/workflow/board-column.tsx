"use client";

import { useDroppable } from "@dnd-kit/core";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { STAGES, withAlpha, type WorkflowStage } from "@/lib/constants";
import { stageSchedule, weekRangeShortLabel } from "@/lib/methodology";
import { EmptyState } from "@/components/ui/empty-state";
import { AddClientPicker } from "./add-client-picker";
import { ClientCard, type BoardClient } from "./client-card";

export function BoardColumn({
  stage,
  clients,
  allClients,
  onOpen,
  onMoveClient,
}: {
  stage: WorkflowStage;
  clients: BoardClient[];
  allClients: BoardClient[];
  onOpen: (clientId: string) => void;
  onMoveClient: (clientId: string, stage: WorkflowStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const { label, color } = STAGES[stage];
  const schedule = stageSchedule(stage);

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
      {/* Header estilo ClickUp: nome em pill tingido com contagem de clientes
          num badge de fundo sólido (mais contrastante) dentro do próprio
          chip; à direita, a semana da etapa no cronograma da POC (abreviada
          — ver src/lib/methodology.ts). */}
      <header className="flex items-center gap-2">
        <h2
          className="inline-flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-xs font-semibold"
          style={{ backgroundColor: withAlpha(color, 0.12), color }}
        >
          {label}
          <span
            className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white"
            style={{ backgroundColor: color }}
          >
            {clients.length}
          </span>
        </h2>
        <div className="ml-auto flex items-center gap-1.5">
          {schedule ? (
            <span className="text-xs font-medium tabular-nums text-slate-400">
              {weekRangeShortLabel(schedule.weekFrom, schedule.weekTo)}
            </span>
          ) : null}
          <AddClientPicker
            stageLabel={label}
            candidates={allClients.filter((client) => client.stage !== stage)}
            onSelect={(clientId) => onMoveClient(clientId, stage)}
          />
        </div>
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

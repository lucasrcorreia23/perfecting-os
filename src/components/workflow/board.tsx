"use client";

import Link from "next/link";
import {
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { BellAlertIcon } from "@heroicons/react/24/outline";
import { updateClientStage } from "@/lib/actions/clients";
import { STAGE_ORDER, STAGES, type WorkflowStage } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import { BoardColumn } from "./board-column";
import { CardContent, type BoardClient } from "./client-card";
import { ClientSheet } from "./client-sheet";

type Move = { id: string; stage: WorkflowStage };

function stageLabel(stage: WorkflowStage) {
  return STAGES[stage].label;
}

export function Board({ initialClients }: { initialClients: BoardClient[] }) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [clients, applyMove] = useOptimistic(
    initialClients,
    (state: BoardClient[], move: Move) =>
      state.map((client) =>
        client.id === move.id
          ? {
              ...client,
              stage: move.stage,
              // O trigger do banco fará o mesmo; aqui só para o feedback imediato.
              stage_entered_at: new Date().toISOString(),
            }
          : client,
      ),
  );

  const sensors = useSensors(
    // 8px de tolerância: clique simples abre o painel em vez de iniciar drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(term) ||
        (client.company ?? "").toLowerCase().includes(term),
    );
  }, [clients, query]);

  const byStage = useMemo(() => {
    const map = new Map<WorkflowStage, BoardClient[]>(
      STAGE_ORDER.map((stage) => [stage, []]),
    );
    for (const client of filtered) {
      map.get(client.stage)?.push(client);
    }
    return map;
  }, [filtered]);

  const activeClient = activeId
    ? (clients.find((client) => client.id === activeId) ?? null)
    : null;
  const openClient = openId
    ? (clients.find((client) => client.id === openId) ?? null)
    : null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const clientId = String(active.id);
    const stage = String(over.id) as WorkflowStage;
    const client = clients.find((item) => item.id === clientId);
    if (!client || !STAGE_ORDER.includes(stage) || client.stage === stage) {
      return;
    }

    setError(null);
    startTransition(async () => {
      applyMove({ id: clientId, stage });
      const result = await updateClientStage(clientId, stage);
      // Em caso de erro, o estado otimista reverte sozinho ao fim da transição.
      if (!result.ok) setError(result.error);
    });
  }

  const clientName = (id: string | number) =>
    clients.find((client) => client.id === String(id))?.name ?? "cliente";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Workflow</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Filtrar clientes"
            size="sm"
            className="sm:w-64"
          />
          <Link
            href="/workflow/alertas"
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium sm:h-9",
              "border border-slate-200 bg-white text-slate-900",
              "transition-colors hover:border-slate-300 hover:bg-[#f8fafc]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
          >
            <BellAlertIcon className="h-5 w-5" aria-hidden />
            Alertas
          </Link>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Pressione espaço ou enter para pegar o cliente, use as setas para levá-lo a outra etapa e espaço ou enter para soltar. Pressione esc para cancelar.",
          },
          announcements: {
            onDragStart: ({ active }) =>
              `${clientName(active.id)} selecionado.`,
            onDragOver: ({ active, over }) =>
              over
                ? `${clientName(active.id)} sobre a etapa ${stageLabel(String(over.id) as WorkflowStage)}.`
                : `${clientName(active.id)} fora de uma etapa.`,
            onDragEnd: ({ active, over }) =>
              over
                ? `${clientName(active.id)} movido para a etapa ${stageLabel(String(over.id) as WorkflowStage)}.`
                : `Movimentação de ${clientName(active.id)} cancelada.`,
            onDragCancel: ({ active }) =>
              `Movimentação de ${clientName(active.id)} cancelada.`,
          },
        }}
      >
        <div className="flex snap-x gap-4 overflow-x-auto pb-2">
          {STAGE_ORDER.map((stage) => (
            <BoardColumn
              key={stage}
              stage={stage}
              clients={byStage.get(stage) ?? []}
              onOpen={setOpenId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeClient ? <CardContent client={activeClient} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {openClient ? (
        <ClientSheet client={openClient} onClose={() => setOpenId(null)} />
      ) : null}
    </div>
  );
}

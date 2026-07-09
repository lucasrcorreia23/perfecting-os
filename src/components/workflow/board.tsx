"use client";

import {
  useId,
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
import { updateClientStage } from "@/lib/actions/clients";
import { STAGE_ORDER, STAGES, type WorkflowStage } from "@/lib/constants";
import { SearchInput } from "@/components/ui/search-input";
import { BoardColumn } from "./board-column";
import { CardContent, type BoardClient } from "./client-card";
import { ClientSheet } from "./client-sheet";

type Move = { id: string; stage: WorkflowStage };

function stageLabel(stage: WorkflowStage) {
  return STAGES[stage].label;
}

export function Board({ initialClients }: { initialClients: BoardClient[] }) {
  // id estável (SSR-safe) p/ o DndContext — evita mismatch de hidratação nos
  // aria-describedby que o dnd-kit gera por contador de módulo.
  const dndContextId = useId();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Cliente cuja mudança de etapa está em voo: enquanto o servidor gera as
  // atividades da nova etapa e revalida, o drawer mostra skeleton no lugar das
  // atividades (o estado otimista já trocou o stage, mas a lista ainda é a antiga).
  const [movingId, setMovingId] = useState<string | null>(null);
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

  // Caminho único de mudança de etapa — usado tanto pelo drag-and-drop quanto
  // pelo picker "+" de cada coluna (clique também move, sem duplicar lógica).
  function moveClient(clientId: string, stage: WorkflowStage) {
    const client = clients.find((item) => item.id === clientId);
    if (!client || client.stage === stage) return;

    setError(null);
    setMovingId(clientId);
    startTransition(async () => {
      applyMove({ id: clientId, stage });
      const result = await updateClientStage(clientId, stage);
      // Em caso de erro, o estado otimista reverte sozinho ao fim da transição.
      if (!result.ok) setError(result.error);
      // A revalidação já trouxe as atividades da nova etapa nesta transição.
      setMovingId(null);
    });
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const stage = String(over.id) as WorkflowStage;
    if (!STAGE_ORDER.includes(stage)) return;
    moveClient(String(active.id), stage);
  }

  const clientName = (id: string | number) =>
    clients.find((client) => client.id === String(id))?.name ?? "cliente";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {/* Header do board: limitado ao max-w-7xl (alinhado à esquerda). */}
      <div className="flex w-full w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Workflow</h1>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar cliente"
          size="sm"
          className="sm:w-64"
        />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      <DndContext
        id={dndContextId}
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
        {/* Sangra até as bordas da viewport nos dois lados (margens negativas),
            então o corte do scroll horizontal fica na beirada da tela — não num
            limite interno com padding sobrando. O padding interno espelhado
            devolve o alinhamento inicial com o header e dá respiro no fim. */}
        <div className="scrollbar-thin -mx-4 flex min-h-0 flex-1 gap-4 overflow-x-auto overflow-y-hidden px-4 pb-4 sm:-mx-12 sm:px-12 lg:-mx-24 lg:px-24">
          {STAGE_ORDER.map((stage) => (
            <BoardColumn
              key={stage}
              stage={stage}
              clients={byStage.get(stage) ?? []}
              allClients={clients}
              onOpen={setOpenId}
              onMoveClient={moveClient}
            />
          ))}
        </div>

        <DragOverlay>
          {activeClient ? <CardContent client={activeClient} overlay /> : null}
        </DragOverlay>
      </DndContext>

      {openClient ? (
        <ClientSheet
          client={openClient}
          activitiesLoading={movingId === openClient.id}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

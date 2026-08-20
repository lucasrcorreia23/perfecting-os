"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { daysSince, formatDate } from "@/lib/format";
import { ACTIVITY_STATUSES, RESPONSAVEIS, withAlpha } from "@/lib/constants";
import { PROGRAM_TOTAL_DAYS, parseSubatividades } from "@/lib/methodology";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { ActivityType } from "@/components/ui/activity-type";
import { StatusChip } from "@/components/ui/status-chip";
import { TOOLTIP, TooltipRow } from "@/components/ui/tooltip";

export type ActivityAssignee = Pick<
  Tables<"profiles">,
  "id" | "full_name" | "avatar_url"
>;

export type BoardActivity = Tables<"activities"> & {
  assignee: ActivityAssignee | null;
};

export type BoardClient = Tables<"clients"> & {
  activities: BoardActivity[];
  client_files: Tables<"client_files">[];
};

export function cardStats(client: BoardClient) {
  const stageActivities = client.activities
    .filter((activity) => activity.stage === client.stage)
    .sort((a, b) => a.position - b.position);
  const done = stageActivities.filter(
    (activity) => activity.status === "concluida",
  ).length;
  // Bloqueadas não contam como feitas nem viram a "atividade do momento" —
  // são gargalo, sinalizado à parte no rodapé e na linha do tempo.
  const blocked = stageActivities.filter(
    (activity) => activity.status === "bloqueada",
  ).length;
  // Linha do tempo da POC: começa na criação do cliente e deve terminar em
  // PROGRAM_TOTAL_DAYS dias corridos (fim do cronograma canônico).
  const elapsed = daysSince(client.created_at);
  const progress = Math.min(1, elapsed / PROGRAM_TOTAL_DAYS);
  // Atividade do momento = a primeira em andamento da etapa (resumo do card).
  const current =
    stageActivities.find((activity) => activity.status === "em_andamento") ??
    null;
  // Linha do tempo do card: todas as atividades da etapa (concluídas, atual e
  // pendentes), na ordem do drawer (position).
  const timeline = stageActivities;
  // "No prazo" = dias corridos dentro do dia planejado ("Dias totais") em que
  // a atividade em andamento deveria estar concluída.
  const onTime =
    current?.cumulative_days != null
      ? elapsed <= current.cumulative_days
      : null;
  return {
    done,
    blocked,
    total: stageActivities.length,
    current,
    timeline,
    elapsed,
    progress,
    onTime,
  };
}

// Pontualidade da POC no canto do card (padrão de acento do §1).
function OnTimeBadge({ onTime }: { onTime: boolean }) {
  const color = onTime ? "#0F9F2E" : "#9F0F0F";
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: withAlpha(color, 0.08),
        border: `1px solid ${withAlpha(color, 0.35)}`,
        color,
      }}
    >
      {onTime ? "No prazo" : "Atrasado"}
    </span>
  );
}

export function CardContent({
  client,
  overlay = false,
}: {
  client: BoardClient;
  overlay?: boolean;
}) {
  const { done, blocked, total, current, timeline, elapsed, progress, onTime } =
    cardStats(client);
  const pocEnd = new Date(
    new Date(client.created_at).getTime() + PROGRAM_TOTAL_DAYS * 86_400_000,
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-sm border border-slate-200 bg-white p-3 shadow-[var(--shadow-sm)]",
        "transition-colors hover:border-slate-300",
        overlay && "rotate-2 shadow-[var(--shadow-md)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-slate-800">
            {client.name}
          </span>
          {client.company ? (
            <span className="truncate text-xs text-slate-500">
              {client.company}
            </span>
          ) : null}
        </div>
        {onTime !== null ? <OnTimeBadge onTime={onTime} /> : null}
      </div>
      {client.status !== "ativo" ? (
        <StatusChip status={client.status} compact />
      ) : null}
      {timeline.length > 0 ? (
        // Trajeto da etapa na ordem do drawer: concluídas esmaecidas com risco
        // leve, a atual em destaque, pendentes neutras. Detalhes (responsável,
        // anexos, prazos, conclusão) no balão do hover de cada linha.
        <div className="flex flex-col gap-1">
          {timeline.map((activity) => {
            const isDone = activity.status === "concluida";
            const isCurrent = activity.status === "em_andamento";
            const isBlocked = activity.status === "bloqueada";
            const anexos = client.client_files.filter(
              (file) => file.activity_id === activity.id,
            ).length;
            const subs = parseSubatividades(activity.subatividades);
            return (
              <div
                key={activity.id}
                className="group relative flex items-center gap-1.5 text-xs"
              >
                {isDone ? (
                  <CheckCircleIcon
                    className="h-4 w-4 shrink-0 text-trend-positive"
                    aria-hidden
                  />
                ) : isBlocked ? (
                  <ExclamationTriangleIcon
                    className="h-4 w-4 shrink-0 text-[#D97706]"
                    aria-hidden
                  />
                ) : activity.tipo ? (
                  <ActivityType tipo={activity.tipo} />
                ) : null}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    isDone && "text-slate-400 line-through decoration-slate-300",
                    isCurrent && "font-medium text-slate-700",
                    !isDone && !isCurrent && "text-slate-500",
                  )}
                >
                  {activity.title}
                </span>
                <div role="tooltip" className={TOOLTIP}>
                  {isBlocked ? (
                    <TooltipRow
                      label="Status"
                      value={ACTIVITY_STATUSES.bloqueada.label}
                    />
                  ) : null}
                  {activity.responsavel ? (
                    <TooltipRow
                      label="Responsável"
                      value={RESPONSAVEIS[activity.responsavel].label}
                    />
                  ) : null}
                  {subs.length > 0 ? (
                    <TooltipRow
                      label="Subatividades"
                      value={`${subs.filter((sub) => sub.done).length}/${subs.length}`}
                    />
                  ) : null}
                  {activity.depends_on_cat ? (
                    <TooltipRow
                      label="Depende de"
                      value={activity.depends_on_cat}
                    />
                  ) : null}
                  {activity.week !== null ? (
                    <TooltipRow
                      label="Semana"
                      value={`Semana ${activity.week}`}
                    />
                  ) : null}
                  {activity.duration_days !== null ? (
                    <TooltipRow
                      label="Prazo"
                      value={
                        activity.duration_days === 1
                          ? "1 dia"
                          : `${activity.duration_days} dias`
                      }
                    />
                  ) : null}
                  {activity.cumulative_days !== null ? (
                    <TooltipRow
                      label="Previsto até"
                      value={`Dia ${activity.cumulative_days}/${PROGRAM_TOTAL_DAYS}`}
                    />
                  ) : null}
                  {isDone ? (
                    <TooltipRow
                      label="Concluída em"
                      value={formatDate(activity.updated_at)}
                    />
                  ) : null}
                  <TooltipRow
                    label="Anexos"
                    value={
                      anexos > 0
                        ? `${anexos} ${anexos === 1 ? "arquivo" : "arquivos"}`
                        : "Sem anexos"
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5 tabular-nums">
          {done}/{total} atividades
          {blocked > 0 ? (
            <span
              className="inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums"
              style={{
                backgroundColor: withAlpha("#D97706", 0.08),
                border: `1px solid ${withAlpha("#D97706", 0.35)}`,
                color: "#D97706",
              }}
            >
              {blocked} bloqueada{blocked > 1 ? "s" : ""}
            </span>
          ) : null}
        </span>
        <span className="tabular-nums">
          Dia {elapsed}/{PROGRAM_TOTAL_DAYS}
        </span>
      </div>
      {/* Linha do tempo da POC como rodapé do card, dentro do padding.
          Datas, semana e prazo aparecem no balão do hover. */}
      <div className="group relative cursor-help">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              onTime === false ? "bg-trend-negative" : "bg-primary",
            )}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div role="tooltip" className={TOOLTIP}>
          <TooltipRow label="Início" value={formatDate(client.created_at)} />
          <TooltipRow label="Fim previsto" value={formatDate(pocEnd)} />
          {current?.week ? (
            <TooltipRow
              label="Semana atual"
              value={`Semana ${current.week}`}
            />
          ) : null}
          {current?.cumulative_days != null ? (
            <TooltipRow
              label="Previsto até"
              value={`Dia ${current.cumulative_days}/${PROGRAM_TOTAL_DAYS}`}
            />
          ) : null}
        </div>
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

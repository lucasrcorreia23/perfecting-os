import { ClockIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import {
  ACTIVITY_STATUSES,
  STAGE_ORDER,
  STAGES,
  withAlpha,
  type WorkflowStage,
} from "@/lib/constants";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { ActivityType } from "@/components/ui/activity-type";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsavelChip } from "@/components/ui/responsavel-chip";
import { InfoTooltip, TooltipRow } from "@/components/ui/tooltip";
import type { BoardActivity } from "./client-card";

type ClientFile = Tables<"client_files">;

// Status somente leitura (mesma cor semântica do Select da aba Atividades,
// mas como chip — histórico não é editável por aqui).
function HistoryStatusBadge({ status }: { status: BoardActivity["status"] }) {
  const { label, color } = ACTIVITY_STATUSES[status];
  return (
    <span
      className="inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: withAlpha(color, 0.08),
        border: `1px solid ${withAlpha(color, 0.35)}`,
        color,
      }}
    >
      {label}
    </span>
  );
}

// Linha somente leitura: mesmo layout da aba "Atividades" (tipo à esquerda,
// título com tooltip de prazo, responsável embaixo), status vira chip e o
// anexo vira ícone com contagem — sem select/upload, é histórico. Os anexos
// vinculados continuam listados como links de download abaixo.
function HistoryActivityRow({
  activity,
  files,
  onDownload,
}: {
  activity: BoardActivity;
  files: ClientFile[];
  onDownload: (fileId: string) => void;
}) {
  const hasDeadline =
    activity.week !== null || activity.duration_days !== null;

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-3">
        {activity.tipo ? <ActivityType tipo={activity.tipo} /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-4">
            <span
              className={cn(
                "truncate text-sm font-medium text-slate-800",
                activity.status === "concluida" &&
                  "text-slate-400 line-through",
              )}
            >
              {activity.title}
            </span>
            {hasDeadline ? (
              <InfoTooltip>
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
              </InfoTooltip>
            ) : null}
          </div>
          {activity.responsavel ? (
            <ResponsavelChip responsavel={activity.responsavel} compact />
          ) : null}
          {activity.description ? (
            <span className="truncate text-xs text-slate-500">
              {activity.description}
            </span>
          ) : null}
        </div>
        <div className="relative shrink-0">
          <PaperClipIcon className="h-5 w-5 text-slate-300" aria-hidden />
          {files.length > 0 ? (
            <span
              aria-hidden
              className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-500 px-1 text-[10px] font-semibold tabular-nums text-white"
            >
              {files.length}
            </span>
          ) : null}
        </div>
        <HistoryStatusBadge status={activity.status} />
      </div>

      {/* Anexos da atividade nesta etapa — links de download (signed URL). */}
      {files.length > 0 ? (
        <div className="flex flex-col items-start gap-1 pl-7">
          {files.map((file) => (
            <button
              key={file.id}
              type="button"
              title={`Baixar ${file.name}`}
              onClick={() => onDownload(file.id)}
              className={cn(
                "inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full text-xs font-medium text-primary",
                "hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              )}
            >
              <PaperClipIcon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{file.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ClientHistoryTab({
  currentStage,
  activities,
  files,
  onDownload,
}: {
  currentStage: WorkflowStage;
  activities: BoardActivity[];
  files: ClientFile[];
  onDownload: (fileId: string) => void;
}) {
  const pastStages = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(currentStage));

  if (pastStages.length === 0) {
    return (
      <EmptyState
        icon={ClockIcon}
        title="Ainda sem histórico"
        description="As etapas concluídas pelo cliente aparecerão aqui."
        discreet
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {pastStages.map((stage, index) => {
        const stageActivities = activities
          .filter((activity) => activity.stage === stage)
          .sort((a, b) => a.position - b.position);
        return (
          <section
            key={stage}
            className={cn(
              "flex flex-col gap-1",
              index > 0 && "border-t border-slate-100 pt-6",
            )}
          >
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: STAGES[stage].color }}
                aria-hidden
              />
              {STAGES[stage].label}
            </h3>
            {stageActivities.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">
                Nenhuma atividade nesta etapa.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100">
                {stageActivities.map((activity) => (
                  <HistoryActivityRow
                    key={activity.id}
                    activity={activity}
                    files={files
                      .filter((file) => file.activity_id === activity.id)
                      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))}
                    onDownload={onDownload}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

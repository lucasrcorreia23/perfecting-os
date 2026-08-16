"use client";

import { useState, useTransition } from "react";
import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  deleteActivity,
  updateActivityStatus,
} from "@/lib/actions/activities";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_ORDER,
  STAGE_ORDER,
  STAGES,
  type ActivityStatus,
  type WorkflowStage,
} from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/format";
import { parseSubatividades } from "@/lib/methodology";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { ActionMenu } from "@/components/ui/action-menu";
import { ActivityType } from "@/components/ui/activity-type";
import { Button } from "@/components/ui/button";
import { CanalChip } from "@/components/ui/canal-chip";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { CopyButton } from "@/components/ui/copy-button";
import { CriticidadeChip } from "@/components/ui/criticidade-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsavelChip } from "@/components/ui/responsavel-chip";
import { Select } from "@/components/ui/select";
import { InfoTooltip, TooltipRow } from "@/components/ui/tooltip";
import { ActivityModal } from "./activity-modal";
import { SubactivityChecklist } from "./subactivity-checklist";

type Activity = Tables<"activities">;

const STATUS_OPTIONS = ACTIVITY_STATUS_ORDER.map((status) => ({
  value: status,
  label: ACTIVITY_STATUSES[status].label,
}));

function ActivityRow({
  activity,
  readOnly,
  onEdit,
  onDelete,
  onError,
}: {
  activity: Activity;
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onError: (message: string) => void;
}) {
  const [, startTransition] = useTransition();
  const overdue =
    isOverdue(activity.due_date) && activity.status !== "concluida";
  const subatividades = parseSubatividades(activity.subatividades);
  // Truthiness (não `!== null`): antes da migration os campos vêm undefined.
  const hasDeps = Boolean(activity.depends_on_cat || activity.parallel_with_cat);

  return (
    <div className="flex flex-col gap-1 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {readOnly ? (
          <span className="w-36 shrink-0 text-xs font-medium text-slate-500">
            {ACTIVITY_STATUSES[activity.status].label}
          </span>
        ) : (
          <Select
            size="sm"
            className="w-40 shrink-0"
            color={ACTIVITY_STATUSES[activity.status].color}
            aria-label={`Status de ${activity.title}`}
            options={STATUS_OPTIONS}
            value={activity.status}
            onChange={(event) =>
              startTransition(async () => {
                const result = await updateActivityStatus(
                  activity.id,
                  event.target.value as ActivityStatus,
                );
                if (!result.ok) onError(result.error);
              })
            }
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-1.5">
            {activity.cat ? (
              <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-500">
                {activity.cat}
              </span>
            ) : null}
            <span
              className={cn(
                "truncate text-sm font-medium text-slate-800",
                activity.status === "concluida" &&
                  "text-slate-400 line-through",
              )}
            >
              {activity.title}
            </span>
            {hasDeps ? (
              <InfoTooltip>
                {activity.depends_on_cat ? (
                  <TooltipRow
                    label="Depende de"
                    value={activity.depends_on_cat}
                  />
                ) : null}
                {activity.parallel_with_cat ? (
                  <TooltipRow
                    label="Em paralelo com"
                    value={activity.parallel_with_cat}
                  />
                ) : null}
              </InfoTooltip>
            ) : null}
          </span>
          {activity.description ? (
            <span className="truncate text-xs text-slate-500">
              {activity.description}
            </span>
          ) : null}
          {activity.setor_responsavel ? (
            <span className="truncate text-xs text-slate-400">
              Setor: {activity.setor_responsavel}
            </span>
          ) : null}
        </div>

        {/* Cronograma da POC: semana, criticidade (só alta), responsável,
            canal e tipo. */}
        {activity.week !== null ? (
          <span className="shrink-0 text-xs tabular-nums text-slate-400">
            Sem. {activity.week}
          </span>
        ) : null}
        {activity.criticidade === "alta" ? (
          <CriticidadeChip criticidade={activity.criticidade} />
        ) : null}
        {activity.responsavel ? (
          <ResponsavelChip responsavel={activity.responsavel} compact />
        ) : null}
        {activity.canal ? <CanalChip canal={activity.canal} /> : null}
        {activity.tipo ? <ActivityType tipo={activity.tipo} /> : null}

        {activity.due_date ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 text-xs",
              overdue ? "font-semibold text-trend-negative" : "text-slate-500",
            )}
          >
            <CalendarDaysIcon className="h-4 w-4" aria-hidden />
            {formatDate(activity.due_date)}
          </span>
        ) : null}

        {activity.modelo_mensagem ? (
          <CopyButton
            text={activity.modelo_mensagem}
            label={`Copiar modelo de mensagem de ${activity.title}`}
          />
        ) : null}

        {!readOnly ? (
          <ActionMenu
            ariaLabel={`Ações de ${activity.title}`}
            items={[
              { label: "Editar", icon: PencilSquareIcon, onSelect: onEdit },
              {
                label: "Excluir",
                icon: TrashIcon,
                destructive: true,
                onSelect: onDelete,
              },
            ]}
          />
        ) : null}
      </div>

      {subatividades.length > 0 ? (
        <SubactivityChecklist
          activityId={activity.id}
          subatividades={subatividades}
          readOnly={readOnly}
          onError={onError}
        />
      ) : null}
    </div>
  );
}

export function ActivitiesTab({
  clientId,
  currentStage,
  activities,
  readOnly,
}: {
  clientId: string;
  currentStage: WorkflowStage;
  activities: Activity[];
  readOnly: boolean;
}) {
  const [modal, setModal] = useState<
    { activity: Activity | null } | null
  >(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Etapa atual do cliente primeiro (§6.3).
  const orderedStages = [
    currentStage,
    ...STAGE_ORDER.filter((stage) => stage !== currentStage),
  ];

  if (activities.length === 0 && readOnly) {
    return (
      <EmptyState
        icon={ClipboardDocumentListIcon}
        title="Nenhuma atividade ainda"
        description="As atividades do seu workflow aparecerão aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        {error ? (
          <p role="alert" className="text-xs text-trend-negative">
            {error}
          </p>
        ) : (
          <span />
        )}
        {!readOnly ? (
          <Button
            variant="tertiary"
            icon={PlusIcon}
            onClick={() => setModal({ activity: null })}
          >
            Adicionar atividade
          </Button>
        ) : null}
      </div>

      {orderedStages.map((stage, index) => {
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
            <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: STAGES[stage].color }}
                aria-hidden
              />
              {STAGES[stage].label}
              {stage === currentStage ? (
                <span className="font-normal text-slate-400">
                  · etapa atual
                </span>
              ) : null}
            </h3>
            {stageActivities.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">
                Nenhuma atividade nesta etapa.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100">
                {stageActivities.map((activity) => (
                  <ActivityRow
                    key={activity.id}
                    activity={activity}
                    readOnly={readOnly}
                    onEdit={() => setModal({ activity })}
                    onDelete={() => setDeleting(activity)}
                    onError={setError}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <ActivityModal
        open={modal !== null}
        onClose={() => setModal(null)}
        clientId={clientId}
        defaultStage={currentStage}
        activity={modal?.activity ?? null}
      />

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        tone="danger"
        title="Excluir atividade"
        description={`A atividade "${deleting?.title ?? ""}" será excluída permanentemente.`}
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          const activity = deleting;
          setError(null);
          startTransition(async () => {
            const result = await deleteActivity(activity.id);
            if (result.ok) {
              setDeleting(null);
            } else {
              setError(result.error);
            }
          });
        }}
      />
    </div>
  );
}

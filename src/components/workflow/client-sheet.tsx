"use client";

import { useEffect, useState, useTransition } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { updateActivityStatus } from "@/lib/actions/activities";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_ORDER,
  type ActivityStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StageBadge } from "@/components/ui/stage-badge";
import { TextLink } from "@/components/ui/text-link";
import { ActivityModal } from "@/components/activities/activity-modal";
import type { BoardClient } from "./client-card";

const STATUS_OPTIONS = ACTIVITY_STATUS_ORDER.map((status) => ({
  value: status,
  label: ACTIVITY_STATUSES[status].label,
}));

// Painel lateral do Kanban: overlay z-80 contendo o sheet z-70 à direita.
export function ClientSheet({
  client,
  onClose,
}: {
  client: BoardClient;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const stageActivities = client.activities
    .filter((activity) => activity.stage === client.stage)
    .sort((a, b) => a.position - b.position);

  return (
    <div
      className="fixed inset-0 z-(--z-overlay) flex bg-slate-900/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes de ${client.name}`}
        className="fade-in-up z-(--z-modal) ml-auto flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-[var(--shadow-lg)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={client.name} size={48} />
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-slate-900">
                {client.name}
              </span>
              <StageBadge stage={client.stage} />
              <TextLink href={`/clientes/${client.id}`}>
                Ver perfil completo
              </TextLink>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar painel"
            onClick={onClose}
            className={cn(
              "-m-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400",
              "transition-colors hover:bg-slate-50 hover:text-slate-600",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
          >
            <XMarkIcon className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Atividades da etapa atual
            </h3>
            <Button
              variant="tertiary"
              size="sm"
              icon={PlusIcon}
              onClick={() => setAdding(true)}
            >
              Adicionar
            </Button>
          </div>

          {error ? (
            <p role="alert" className="text-xs text-trend-negative">
              {error}
            </p>
          ) : null}

          {stageActivities.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">
              Nenhuma atividade nesta etapa.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {stageActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 py-3"
                >
                  <Select
                    size="sm"
                    className="w-36 shrink-0"
                    aria-label={`Status de ${activity.title}`}
                    options={STATUS_OPTIONS}
                    value={activity.status}
                    onChange={(event) =>
                      startTransition(async () => {
                        const result = await updateActivityStatus(
                          activity.id,
                          event.target.value as ActivityStatus,
                        );
                        if (!result.ok) setError(result.error);
                      })
                    }
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={cn(
                        "truncate text-sm font-medium text-slate-800",
                        activity.status === "concluida" &&
                          "text-slate-400 line-through",
                      )}
                    >
                      {activity.title}
                    </span>
                    {activity.description ? (
                      <span className="truncate text-xs text-slate-500">
                        {activity.description}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ActivityModal
          open={adding}
          onClose={() => setAdding(false)}
          clientId={client.id}
          defaultStage={client.stage}
          activity={null}
        />
      </div>
    </div>
  );
}

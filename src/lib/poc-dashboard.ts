import {
  ACTIVITY_STATUS_ORDER,
  STAGE_ORDER,
  type ActivityStatus,
  type WorkflowStage,
} from "@/lib/constants";
import { PROGRAM_TOTAL_DAYS } from "@/lib/methodology";
import type { Tables } from "@/lib/database.types";

// KPIs da POC de UM cliente (aba "Dashboard" da planilha "Atividades da
// POC"): visão geral, gargalos, coordenação e progresso por etapa —
// computados em memória a partir das atividades do cliente.

export type PocDashboardActivity = Pick<
  Tables<"activities">,
  "stage" | "status" | "responsavel" | "tipo" | "criticidade" | "duration_days"
>;

export type PocStageProgress = {
  stage: WorkflowStage;
  total: number; // atividades da etapa
  done: number;
  durationDays: number; // soma dos prazos planejados (duration_days)
  pct: number; // done/total, 0..1 (0 quando total = 0)
};

export type PocDashboard = {
  totalActivities: number;
  completionPct: number; // concluídas/total, 0..1
  elapsedDays: number;
  totalDays: number; // PROGRAM_TOTAL_DAYS
  schedulePct: number; // min(1, elapsed/total), 0..1
  statusBreakdown: Record<ActivityStatus, number>;
  bottlenecks: {
    blocked: number; // status bloqueada
    waitingOnClient: number; // responsável cliente|ambos, não concluída
    highCriticality: number; // criticidade alta, não concluída
  };
  coordination: {
    sincronas: number;
    assincronas: number;
    soPerfecting: number;
    soCliente: number;
    conjuntas: number; // responsável ambos
  };
  byStage: PocStageProgress[]; // na ordem de STAGE_ORDER
};

export function computePocDashboard({
  activities,
  createdAt,
  now = new Date(),
}: {
  activities: PocDashboardActivity[];
  createdAt: string; // clients.created_at (início da POC)
  now?: Date; // injetável nos testes
}): PocDashboard {
  const total = activities.length;
  const done = activities.filter(
    (activity) => activity.status === "concluida",
  ).length;

  const elapsedDays = Math.max(
    0,
    Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86_400_000),
  );

  const statusBreakdown = Object.fromEntries(
    ACTIVITY_STATUS_ORDER.map((status) => [status, 0]),
  ) as Record<ActivityStatus, number>;
  for (const activity of activities) {
    statusBreakdown[activity.status] += 1;
  }

  const open = (activity: PocDashboardActivity) =>
    activity.status !== "concluida";

  const bottlenecks = {
    blocked: statusBreakdown.bloqueada,
    waitingOnClient: activities.filter(
      (activity) =>
        open(activity) &&
        (activity.responsavel === "cliente" ||
          activity.responsavel === "ambos"),
    ).length,
    highCriticality: activities.filter(
      (activity) => open(activity) && activity.criticidade === "alta",
    ).length,
  };

  const coordination = {
    sincronas: activities.filter((activity) => activity.tipo === "sincrono")
      .length,
    assincronas: activities.filter(
      (activity) => activity.tipo === "assincrono",
    ).length,
    soPerfecting: activities.filter(
      (activity) => activity.responsavel === "perfecting",
    ).length,
    soCliente: activities.filter(
      (activity) => activity.responsavel === "cliente",
    ).length,
    conjuntas: activities.filter(
      (activity) => activity.responsavel === "ambos",
    ).length,
  };

  const byStage: PocStageProgress[] = STAGE_ORDER.map((stage) => {
    const stageActivities = activities.filter(
      (activity) => activity.stage === stage,
    );
    const stageDone = stageActivities.filter(
      (activity) => activity.status === "concluida",
    ).length;
    return {
      stage,
      total: stageActivities.length,
      done: stageDone,
      durationDays: stageActivities.reduce(
        (sum, activity) => sum + (activity.duration_days ?? 0),
        0,
      ),
      pct: stageActivities.length ? stageDone / stageActivities.length : 0,
    };
  });

  return {
    totalActivities: total,
    completionPct: total ? done / total : 0,
    elapsedDays,
    totalDays: PROGRAM_TOTAL_DAYS,
    schedulePct: Math.min(1, elapsedDays / PROGRAM_TOTAL_DAYS),
    statusBreakdown,
    bottlenecks,
    coordination,
    byStage,
  };
}

import { daysSince, isOverdue } from "@/lib/format";
import type { TrendDirection } from "@/components/ui/trend-inline";

// Tendências reconstruídas a partir de events (janela: últimos 30 dias).
// São aproximações documentadas: o log de eventos não permite reconstituir
// todos os estados passados com exatidão.

type KpiClient = {
  id: string;
  status: string;
  stage_entered_at: string;
};

type KpiActivity = {
  status: string;
  due_date: string | null;
};

type KpiEvent = {
  type: string;
  client_id: string | null;
  created_at: string;
};

export type Kpi = {
  label: string;
  value: number;
  direction: TrendDirection;
  trendLabel: string;
  goodDirection: "up" | "down";
};

const THIRTY_DAYS_MS = 30 * 86_400_000;

function trendFromDelta(delta: number): {
  direction: TrendDirection;
  trendLabel: string;
} {
  if (delta > 0) return { direction: "up", trendLabel: `+${delta}` };
  if (delta < 0) return { direction: "down", trendLabel: `−${Math.abs(delta)}` };
  return { direction: "flat", trendLabel: "—" };
}

export function computeKpis({
  clients,
  activities,
  events,
  stageDeadlineDays,
}: {
  clients: KpiClient[];
  activities: KpiActivity[];
  events: KpiEvent[];
  stageDeadlineDays: number;
}): Kpi[] {
  const windowStart = Date.now() - THIRTY_DAYS_MS;
  const recent = events.filter(
    (event) => new Date(event.created_at).getTime() >= windowStart,
  );

  // 1. Clientes ativos — prev ≈ atual − criados na janela.
  const activeClients = clients.filter(
    (client) => client.status === "ativo",
  ).length;
  const createdInWindow = recent.filter(
    (event) => event.type === "cliente_criado",
  ).length;
  const activeTrend =
    createdInWindow === 0
      ? trendFromDelta(0)
      : trendFromDelta(createdInWindow);

  // 2. Clientes acima do prazo da etapa (↑ é ruim).
  // 30 dias atrás: quem trocou de etapa na janela contava como dentro do prazo.
  const overDeadline = clients.filter(
    (client) => daysSince(client.stage_entered_at) > stageDeadlineDays,
  ).length;
  const changedStage = new Set(
    recent
      .filter((event) => event.type === "etapa_alterada")
      .map((event) => event.client_id),
  );
  const overDeadline30dAgo = clients.filter((client) => {
    if (changedStage.has(client.id)) return false;
    const daysAgo = daysSince(client.stage_entered_at) - 30;
    return daysAgo > stageDeadlineDays;
  }).length;
  const overTrend = trendFromDelta(overDeadline - overDeadline30dAgo);

  // 3. Atividades em aberto — prev ≈ atual − criadas + concluídas na janela.
  const openActivities = activities.filter(
    (activity) => activity.status !== "concluida",
  ).length;
  const createdActivities = recent.filter(
    (event) => event.type === "atividade_criada",
  ).length;
  const concludedActivities = recent.filter(
    (event) => event.type === "atividade_concluida",
  ).length;
  const openTrend =
    createdActivities === 0 && concludedActivities === 0
      ? trendFromDelta(0)
      : trendFromDelta(createdActivities - concludedActivities);

  // 4. Atividades atrasadas (↑ é ruim) — histórico não reconstituível → "—".
  const overdueActivities = activities.filter(
    (activity) =>
      activity.status !== "concluida" && isOverdue(activity.due_date),
  ).length;

  return [
    {
      label: "Clientes ativos",
      value: activeClients,
      goodDirection: "up",
      ...activeTrend,
    },
    {
      label: "Clientes acima do prazo da etapa",
      value: overDeadline,
      goodDirection: "down",
      ...overTrend,
    },
    {
      label: "Atividades em aberto",
      value: openActivities,
      goodDirection: "up",
      ...openTrend,
    },
    {
      label: "Atividades atrasadas",
      value: overdueActivities,
      goodDirection: "down",
      direction: "flat",
      trendLabel: "—",
    },
  ];
}

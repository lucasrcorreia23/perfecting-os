import { requireInterno } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { isoDaysAgo } from "@/lib/format";
import { computeKpis } from "@/lib/kpis";
import {
  DEFAULT_PRAZO_ETAPA_DIAS,
  STAGE_ORDER,
  type WorkflowStage,
} from "@/lib/constants";
import type { Preferences } from "@/lib/actions/profile";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StageDistribution } from "@/components/dashboard/stage-distribution";
import {
  RecentActivity,
  type FeedEvent,
} from "@/components/dashboard/recent-activity";

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function InicioPage() {
  const session = await requireInterno();
  const firstName = (session.profile?.full_name ?? "").split(" ")[0];

  const stageDeadlineDays =
    (session.profile?.preferences as Preferences | null)?.prazo_etapa_dias ??
    DEFAULT_PRAZO_ETAPA_DIAS;

  const supabase = await createServerSupabase();
  const sixtyDaysAgo = isoDaysAgo(60);

  const [clientsRes, activitiesRes, feedRes, trendRes] = await Promise.all([
    supabase.from("clients").select("id, status, stage, stage_entered_at"),
    supabase.from("activities").select("status, due_date"),
    supabase
      .from("events")
      .select("*, clients(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("events")
      .select("type, client_id, created_at")
      .gte("created_at", sixtyDaysAgo),
  ]);

  const clients = clientsRes.data ?? [];
  const kpis = computeKpis({
    clients,
    activities: activitiesRes.data ?? [],
    events: trendRes.data ?? [],
    stageDeadlineDays,
  });

  const counts = Object.fromEntries(
    STAGE_ORDER.map((stage) => [stage, 0]),
  ) as Record<WorkflowStage, number>;
  for (const client of clients) {
    counts[client.stage as WorkflowStage] += 1;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">Início</h1>
        <p className="text-sm text-slate-500">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}! Aqui está o panorama dos seus
          clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <StageDistribution counts={counts} />
        </div>
        <div className="lg:col-span-3">
          <RecentActivity events={(feedRes.data ?? []) as FeedEvent[]} />
        </div>
      </div>
    </div>
  );
}

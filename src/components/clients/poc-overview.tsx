import {
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_ORDER,
  STAGES,
  withAlpha,
} from "@/lib/constants";
import {
  computePocDashboard,
  type PocDashboardActivity,
} from "@/lib/poc-dashboard";

// Painel "Visão geral" da POC de um cliente (aba Dashboard da planilha):
// conclusão × cronograma, quebra por status, gargalos, coordenação e
// progresso por etapa. Usado na página do cliente e no drawer do workflow.

function percentLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function BigTile({
  label,
  value,
  help,
  barPct,
  barClassName,
}: {
  label: string;
  value: string;
  help: string;
  barPct: number;
  barClassName: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-4">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-(length:--text-score-md) font-semibold leading-none tabular-nums text-slate-900">
        {value}
      </span>
      <span className="text-xs tabular-nums text-slate-500">{help}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${Math.round(barPct * 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium tabular-nums text-slate-800">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h3>
  );
}

export function PocOverview({
  activities,
  createdAt,
}: {
  activities: PocDashboardActivity[];
  createdAt: string;
}) {
  const dashboard = computePocDashboard({ activities, createdAt });
  const { statusBreakdown, bottlenecks, coordination, byStage } = dashboard;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BigTile
          label="Conclusão do plano"
          value={percentLabel(dashboard.completionPct)}
          help={`${statusBreakdown.concluida}/${dashboard.totalActivities} atividades concluídas`}
          barPct={dashboard.completionPct}
          barClassName="bg-primary"
        />
        <BigTile
          label="Cronograma decorrido"
          value={`Dia ${dashboard.elapsedDays}/${dashboard.totalDays}`}
          help={`${percentLabel(dashboard.schedulePct)} do prazo da POC`}
          barPct={dashboard.schedulePct}
          barClassName="bg-slate-400"
        />
      </div>

      {/* Quebra por status, no padrão de acento do §1. */}
      <div className="flex flex-wrap items-center gap-2">
        {ACTIVITY_STATUS_ORDER.map((status) => {
          const { label, color } = ACTIVITY_STATUSES[status];
          return (
            <span
              key={status}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums"
              style={{
                backgroundColor: withAlpha(color, 0.08),
                border: `1px solid ${withAlpha(color, 0.35)}`,
                color,
              }}
            >
              {label}
              <span>{statusBreakdown[status]}</span>
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <SectionTitle>Gargalos e riscos</SectionTitle>
          <StatRow label="Atividades bloqueadas" value={bottlenecks.blocked} />
          <StatRow
            label="Dependem do cliente"
            value={bottlenecks.waitingOnClient}
          />
          <StatRow
            label="Criticidade alta em aberto"
            value={bottlenecks.highCriticality}
          />
        </section>
        <section className="flex flex-col gap-2">
          <SectionTitle>Coordenação</SectionTitle>
          <StatRow label="Síncronas (reuniões)" value={coordination.sincronas} />
          <StatRow label="Assíncronas" value={coordination.assincronas} />
          <StatRow label="Só da Perfecting" value={coordination.soPerfecting} />
          <StatRow label="Só do cliente" value={coordination.soCliente} />
          <StatRow label="Conjuntas" value={coordination.conjuntas} />
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <SectionTitle>Progresso por etapa</SectionTitle>
        <div className="flex flex-col gap-2.5">
          {byStage.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-3">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: STAGES[stage.stage].color }}
                aria-hidden
              />
              <span className="w-28 shrink-0 text-sm text-slate-700">
                {STAGES[stage.stage].label}
              </span>
              <span className="w-14 shrink-0 text-xs tabular-nums text-slate-500">
                {stage.done}/{stage.total}
              </span>
              <span className="w-16 shrink-0 text-xs tabular-nums text-slate-400">
                {stage.durationDays}{" "}
                {stage.durationDays === 1 ? "dia" : "dias"}
              </span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(stage.pct * 100)}%`,
                    backgroundColor: STAGES[stage.stage].color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

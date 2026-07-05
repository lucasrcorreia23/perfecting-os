import type { Kpi } from "@/lib/kpis";
import { TrendInline } from "@/components/ui/trend-inline";

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-4">
      <span className="text-xs text-slate-500">{kpi.label}</span>
      <span className="text-(length:--text-score-md) font-semibold leading-none tabular-nums text-slate-900">
        {kpi.value}
      </span>
      <TrendInline
        direction={kpi.direction}
        label={kpi.trendLabel}
        goodDirection={kpi.goodDirection}
        size="sm"
      />
    </div>
  );
}

import { STAGE_ORDER, STAGES, type WorkflowStage } from "@/lib/constants";

export function StageDistribution({
  counts,
}: {
  counts: Record<WorkflowStage, number>;
}) {
  const max = Math.max(1, ...STAGE_ORDER.map((stage) => counts[stage] ?? 0));

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-800">
        Clientes por etapa
      </h2>
      <div className="flex flex-col gap-3">
        {STAGE_ORDER.map((stage) => {
          const { label, color } = STAGES[stage];
          const count = counts[stage] ?? 0;
          return (
            <div key={stage} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs font-medium text-slate-600">
                {label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / max) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

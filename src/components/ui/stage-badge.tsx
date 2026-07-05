import { STAGES, type WorkflowStage } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Dot + label na cor da etapa (paleta categórica do §1).
export function StageBadge({
  stage,
  size = "sm",
}: {
  stage: WorkflowStage;
  size?: "sm" | "md";
}) {
  const { label, color } = STAGES[stage];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 font-medium text-slate-700",
        size === "sm" ? "text-xs" : "text-sm",
      )}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

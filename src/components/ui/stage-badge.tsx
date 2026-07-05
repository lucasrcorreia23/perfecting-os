import { STAGES, withAlpha, type WorkflowStage } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Etapa do workflow. "plain": dot + label na cor da etapa (paleta categórica do
// §1). "tag": chip pill com fundo/borda/texto na cor (padrão de acento do §1).
export function StageBadge({
  stage,
  size = "sm",
  variant = "plain",
}: {
  stage: WorkflowStage;
  size?: "sm" | "md";
  variant?: "plain" | "tag";
}) {
  const { label, color } = STAGES[stage];

  if (variant === "tag") {
    return (
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full font-medium",
          size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1 text-sm",
        )}
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

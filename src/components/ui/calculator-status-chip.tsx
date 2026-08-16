import { CALCULATOR_LINK_STATUSES, withAlpha } from "@/lib/constants";
import type { LinkStatus } from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";

export function CalculatorStatusChip({
  status,
  compact = false,
}: {
  status: LinkStatus;
  compact?: boolean;
}) {
  const { label, color } = CALCULATOR_LINK_STATUSES[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full font-medium",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
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

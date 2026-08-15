import { LEAD_STATUSES, withAlpha, type LeadStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function LeadStatusChip({
  status,
  compact = false,
}: {
  status: LeadStatus;
  compact?: boolean;
}) {
  const { label, color } = LEAD_STATUSES[status];
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

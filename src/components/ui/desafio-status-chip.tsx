import { DESAFIO_STATUSES, withAlpha, type DesafioStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function DesafioStatusChip({
  status,
  compact = false,
}: {
  status: DesafioStatus;
  compact?: boolean;
}) {
  const { label, color } = DESAFIO_STATUSES[status];

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full font-medium",
        compact ? "px-2 py-0.5 text-[11px] leading-4" : "px-2.5 py-1 text-xs",
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

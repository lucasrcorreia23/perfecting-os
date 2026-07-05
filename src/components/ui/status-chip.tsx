import { STATUSES, withAlpha, type ClientStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Chip de status do cliente — padrão de acento do §1:
// fundo alpha .08, borda alpha .35, texto na cor cheia.
export function StatusChip({
  status,
  compact = false,
}: {
  status: ClientStatus;
  compact?: boolean;
}) {
  const { label, color } = STATUSES[status];
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

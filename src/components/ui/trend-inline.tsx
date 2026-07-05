import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  MinusSmallIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "flat";

// Tendência (§8.12): ícone + texto na mesma cor, sem chip, tabular-nums.
// Por padrão ↑ é bom (verde); goodDirection="down" inverte (ex.: atrasos).
export function TrendInline({
  direction,
  label,
  goodDirection = "up",
  size = "sm",
}: {
  direction: TrendDirection;
  label: string;
  goodDirection?: "up" | "down";
  size?: "sm" | "md";
}) {
  const Icon =
    direction === "up"
      ? ArrowTrendingUpIcon
      : direction === "down"
        ? ArrowTrendingDownIcon
        : MinusSmallIcon;

  const colorClass =
    direction === "flat"
      ? "text-trend-neutral"
      : direction === goodDirection
        ? "text-trend-positive"
        : "text-trend-negative";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        size === "sm" ? "text-xs" : "text-sm",
        colorClass,
      )}
    >
      <Icon
        className={cn("shrink-0", size === "sm" ? "h-4 w-4" : "h-5 w-5")}
        aria-hidden
      />
      {label}
    </span>
  );
}

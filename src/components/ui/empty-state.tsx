import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { HeroIcon } from "./types";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  discreet = false,
}: {
  icon: HeroIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  discreet?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        discreet ? "py-6" : "py-10",
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full">
        <Icon className="h-6 w-6 text-slate-400" aria-hidden />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        {description ? (
          <span className="text-xs text-slate-300">{description}</span>
        ) : null}
      </span>
      {action}
    </div>
  );
}

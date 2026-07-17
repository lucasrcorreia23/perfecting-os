import type { ReactNode } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// Balão de hover (activities/cards) — fundo claro e sutil, nunca escuro.
// Uso: envolva o gatilho num `group relative` e renderize este balão como
// filho absoluto — some/aparece via `group-hover:visible`.
export const TOOLTIP = cn(
  "pointer-events-none invisible absolute left-0 top-full z-(--z-tooltip) mt-1.5 flex w-60 flex-col gap-1",
  "rounded-sm border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-[var(--shadow-md)]",
  "opacity-0 transition-opacity group-hover:visible group-hover:opacity-100",
);

export function TooltipRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="tabular-nums text-slate-700">{value}</span>
    </div>
  );
}

// Ícone de info com balão no hover — cursor padrão (não usa o "?" nativo do
// cursor:help, que destoa do resto da UI). `align="right"` ancora o balão na
// borda direita do ícone (para gatilhos no extremo direito da linha).
export function InfoTooltip({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className="group relative flex shrink-0">
      <InformationCircleIcon className="h-4 w-4 text-slate-400" aria-hidden />
      <div
        role="tooltip"
        className={cn(TOOLTIP, align === "right" && "left-auto right-0")}
      >
        {children}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// Balão de hover (activities/cards) — fundo claro e sutil, nunca escuro.
const TOOLTIP_BASE = cn(
  "pointer-events-none invisible absolute left-0 top-full z-(--z-tooltip) mt-1.5 flex w-60 flex-col gap-1",
  "rounded-sm border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-[var(--shadow-md)]",
  "opacity-0 transition-opacity",
);

// Uso: envolva o gatilho num `group relative` e renderize este balão como
// filho absoluto — some/aparece via `group-hover:visible`.
export const TOOLTIP = cn(TOOLTIP_BASE, "group-hover:visible group-hover:opacity-100");

// Variante presa a um gatilho `peer` irmão anterior: abre no hover e também
// no foco, que é o que faz o balão funcionar no toque (sem hover no mobile).
const TOOLTIP_PEER = cn(
  TOOLTIP_BASE,
  "peer-hover:visible peer-hover:opacity-100 peer-focus:visible peer-focus:opacity-100",
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

// Ícone de ajuda ao lado de um label (ver `Field.hint`). O texto vive no
// balão e no nome acessível do botão — leitor de tela e teclado alcançam a
// mesma informação, e no mobile o toque dá foco e abre o balão.
// Precisa de um pai `relative`: o balão se ancora nele, não no ícone, para
// não estourar a coluna do campo.
export function HintTooltip({
  text,
  align = "left",
}: {
  text: string;
  align?: "left" | "right";
}) {
  return (
    <>
      <button
        type="button"
        aria-label={`Ajuda: ${text}`}
        className="peer -my-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      >
        <InformationCircleIcon className="h-4 w-4" aria-hidden />
      </button>
      <span
        aria-hidden
        className={cn(TOOLTIP_PEER, align === "right" && "left-auto right-0")}
      >
        {text}
      </span>
    </>
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

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HintTooltip } from "@/components/ui/tooltip";

// Formulários (§8.10): label → ajuda → input, nessa ordem.
export function Field({
  label,
  help,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  help?: string;
  // Mesma explicação do `help`, mas guardada num ícone de info ao lado do
  // label — para formulários longos, onde uma linha de texto por campo
  // empurra tudo para baixo.
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  const labelEl = (
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
      {label}
    </label>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        {/* A linha só vira `relative flex` quando há hint — o balão se ancora
            nela, e os formulários sem hint ficam com o DOM de sempre. */}
        {hint ? (
          <div className="relative flex items-center gap-1.5">
            {labelEl}
            <HintTooltip text={hint} />
          </div>
        ) : (
          labelEl
        )}
        {help ? <p className="text-xs text-slate-500">{help}</p> : null}
      </div>
      {children}
      {error ? <p className="text-xs text-trend-negative">{error}</p> : null}
    </div>
  );
}

// Seção de formulário: título xs uppercase; seções separadas por border-t.
export function FormSection({
  title,
  description,
  first = false,
  children,
}: {
  title: string;
  description?: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        !first && "border-t border-slate-100 pt-6",
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const INPUT_CLASSES = cn(
  "w-full border border-slate-200 bg-white px-4 text-sm text-slate-900",
  "outline-none transition-colors placeholder:text-slate-400",
  "focus:border-[#2E63CD]/40",
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
);

// ComponentProps (e não InputHTMLAttributes) para aceitar `ref` — no React 19
// ela é uma prop comum e o editor de markdown precisa dela para manipular a
// seleção do textarea.
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(INPUT_CLASSES, "h-12 rounded-full", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(INPUT_CLASSES, "min-h-28 rounded-sm py-3", className)}
      {...props}
    />
  );
}

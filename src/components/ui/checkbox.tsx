import type { InputHTMLAttributes } from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// Checkbox estilizado para uso CONTROLADO (checked vem de fora): o <input>
// nativo com appearance-none é o próprio círculo — teclado e leitores de tela
// sem custo —, sutil em repouso e preenchido com a primária ao marcar, com
// check branco por cima. Visual dirigido pela prop (não por variantes
// checked:/peer-checked:), o que também evita depender de classes novas.
export function Checkbox({
  className,
  checked,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className={cn("relative inline-flex h-5 w-5 shrink-0", className)}>
      <input
        type="checkbox"
        checked={checked}
        {...props}
        className={cn(
          "h-5 w-5 cursor-pointer appearance-none rounded-full border transition-colors",
          checked
            ? "border-primary bg-primary"
            : "border-slate-300 bg-white hover:border-slate-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />
      {checked ? (
        <CheckIcon
          className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-white"
          aria-hidden
        />
      ) : null}
    </span>
  );
}

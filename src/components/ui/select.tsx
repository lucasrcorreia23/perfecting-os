import type { CSSProperties, SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { withAlpha } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  options: SelectOption[];
  size?: "md" | "sm";
  // Cor de acento (hex) opcional — pinta o trigger no padrão de acento do
  // guideline (§1: fundo alpha .08, borda alpha .35, texto na cor cheia),
  // mantendo o <select> nativo editável. Sem cor, comportamento inalterado.
  color?: string;
};

// Select de formulário (§8.8): trigger branco, foco SEM ring colorida.
// <select> nativo — acessibilidade de teclado sem custo.
export function Select({
  options,
  size = "md",
  color,
  className,
  style,
  ...props
}: SelectProps) {
  const accentStyle: CSSProperties | undefined = color
    ? {
        backgroundColor: withAlpha(color, 0.08),
        borderColor: withAlpha(color, 0.35),
        color,
      }
    : undefined;

  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          "w-full cursor-pointer appearance-none rounded-full border bg-white",
          "text-sm outline-none transition-colors",
          "focus:border-slate-300 disabled:cursor-not-allowed disabled:opacity-70",
          color ? "font-medium" : "border-slate-200 text-[#314158]",
          size === "md" ? "h-11 pl-4 pr-9 sm:h-10" : "h-11 pl-3.5 pr-8 sm:h-8",
        )}
        style={{ ...accentStyle, ...style }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className={cn(
          "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2",
          !color && "text-[#64748b]",
          size === "md" ? "right-3" : "right-2.5",
        )}
        style={color ? { color } : undefined}
        aria-hidden
      />
    </div>
  );
}

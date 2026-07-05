import type { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  options: SelectOption[];
  size?: "md" | "sm";
};

// Select de formulário (§8.8): trigger branco, foco SEM ring colorida.
// <select> nativo — acessibilidade de teclado sem custo.
export function Select({
  options,
  size = "md",
  className,
  ...props
}: SelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          "w-full cursor-pointer appearance-none rounded-full border border-slate-200 bg-white",
          "text-sm text-[#314158] outline-none transition-colors",
          "focus:border-slate-300 disabled:cursor-not-allowed disabled:opacity-70",
          size === "md" ? "h-11 pl-4 pr-9 sm:h-10" : "h-11 pl-3.5 pr-8 sm:h-8",
        )}
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
          "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]",
          size === "md" ? "right-3" : "right-2.5",
        )}
        aria-hidden
      />
    </div>
  );
}

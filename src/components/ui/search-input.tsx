"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// Campo de busca (§8.7): caixa branca, foco na borda (sem ring colorida).
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar",
  size = "lg",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "lg" | "sm";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4",
        "transition-colors focus-within:border-[#2E63CD]/40",
        size === "lg" ? "h-11" : "h-11 sm:h-9",
        className,
      )}
    >
      <MagnifyingGlassIcon
        className="h-4 w-4 shrink-0 text-slate-400"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

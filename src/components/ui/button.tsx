import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { HeroIcon } from "./types";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  icon?: HeroIcon;
  size?: "md" | "sm";
};

// Botões do guideline (§8.1): primary com gradiente + brilho no hover,
// secondary branco, tertiary estilo link, danger sólido.
const VARIANTS = {
  primary: cn(
    "bg-[linear-gradient(145deg,#3d75dd,#2e63cd)] text-white",
    "border border-white/20 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.18)]",
    "hover:[filter:brightness(1.07)_saturate(1.04)]",
    "disabled:bg-none disabled:bg-[#94A3B8] disabled:hover:[filter:none]",
  ),
  secondary: cn(
    "bg-white text-slate-900 border border-slate-200",
    "hover:bg-[#f8fafc] hover:border-slate-300",
    "disabled:opacity-70 disabled:hover:bg-white disabled:hover:border-slate-200",
  ),
  tertiary: cn(
    "text-primary bg-transparent border border-transparent",
    "hover:text-primary-link-hover",
    "disabled:opacity-70 disabled:hover:text-primary",
  ),
  danger: cn(
    "bg-[#DC2626] text-white border border-transparent",
    "hover:bg-[#B91C1C]",
    "disabled:bg-[#94A3B8] disabled:hover:bg-[#94A3B8]",
  ),
} as const;

export function Button({
  variant = "secondary",
  icon: Icon,
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium",
        "transition-[filter,background-color,border-color,color,opacity] duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        "disabled:cursor-not-allowed",
        // Tap target ≥ 44px no mobile (§11)
        size === "md" ? "h-11 px-5 sm:h-10" : "h-11 px-4 sm:h-9",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="h-5 w-5 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
}

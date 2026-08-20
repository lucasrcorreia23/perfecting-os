import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Link textual (§8.4): 13px, primary p/ fluxos principais, secondary p/ recuperação.
export function TextLink({
  href,
  tone = "primary",
  className,
  children,
}: {
  href: string;
  tone?: "primary" | "secondary";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full text-[13px] font-medium underline-offset-[3px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        tone === "primary"
          ? "text-primary hover:text-primary-link-hover hover:underline"
          : "text-slate-800 hover:opacity-70 hover:underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}

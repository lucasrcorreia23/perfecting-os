"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Mesmo visual do strip de abas (§8.9), porém em <Link>: cada seção do módulo
// é uma rota de servidor independente, com página de detalhe e deep link — o
// Tabs de ui/ exigiria as três seções num payload só.
const SECTIONS = [
  { href: "/marketing/blog", label: "Blog" },
  { href: "/marketing/funis", label: "Funis" },
  { href: "/marketing/leads", label: "Leads" },
];

export function MarketingNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Seções de marketing"
      className="scrollbar-thin flex w-fit max-w-full gap-1 overflow-x-auto border-b border-slate-200"
    >
      {SECTIONS.map((section) => {
        const active =
          pathname === section.href || pathname.startsWith(`${section.href}/`);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative min-h-[48px] whitespace-nowrap rounded-t-[12px] px-4 py-2.5 text-sm font-medium",
              "flex items-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              active
                ? cn(
                    "text-primary",
                    "[background:radial-gradient(60%_80%_at_50%_100%,rgba(255,255,255,0.95),transparent)]",
                    // bottom-0, nunca -bottom-px: overflow-x:auto força overflow-y:auto,
                    // então 1px pra fora do strip já faz nascer barra de rolagem vertical.
                    "after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-0.5 after:bg-primary",
                  )
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

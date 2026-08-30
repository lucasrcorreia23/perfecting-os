"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Mesmo strip de abas do módulo Marketing (§8.9), em <Link>: cada seção é rota
// de servidor independente, com deep link.
const SECTIONS = [
  { href: "/desafios", label: "Desafios" },
  { href: "/desafios/dashboard", label: "Dashboard" },
  { href: "/desafios/usabilidade", label: "Usabilidade" },
  { href: "/desafios/taxonomias", label: "Categorias e fluxos" },
];

/*
 * A raiz do módulo é PREFIXO das outras duas, então a regra do marketing-nav
 * (`pathname === href || startsWith(href + "/")`) deixaria "Desafios" aceso em
 * todas as telas. Aqui a raiz vence só quando nenhuma outra seção casa — e com
 * isso a página de detalhe (/desafios/[id]) acende a seção certa de graça.
 */
function activeHref(pathname: string): string {
  const especifica = SECTIONS.slice(1).find(
    (section) =>
      pathname === section.href || pathname.startsWith(`${section.href}/`),
  );
  return especifica?.href ?? SECTIONS[0].href;
}

export function DesafiosNav() {
  const pathname = usePathname();
  const atual = activeHref(pathname);

  return (
    <nav
      aria-label="Seções de desafios"
      className="scrollbar-thin flex w-fit max-w-full gap-1 overflow-x-auto border-b border-slate-200"
    >
      {SECTIONS.map((section) => {
        const active = section.href === atual;
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

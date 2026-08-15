"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  HomeIcon,
  MegaphoneIcon,
  UserCircleIcon,
  UserGroupIcon,
  ViewColumnsIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import type { UserRole } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu } from "@/components/ui/action-menu";
import type { HeroIcon } from "@/components/ui/types";

type NavItem = { href: string; label: string; icon: HeroIcon };

function navItems(role: UserRole, clientId: string | null): NavItem[] {
  if (role === "cliente") {
    const items: NavItem[] = [];
    if (clientId) {
      items.push({
        href: `/clientes/${clientId}`,
        label: "Meu cliente",
        icon: UserGroupIcon,
      });
    }
    return items;
  }
  return [
    { href: "/", label: "Início", icon: HomeIcon },
    { href: "/workflow", label: "Workflow", icon: ViewColumnsIcon },
    { href: "/clientes", label: "Clientes", icon: UserGroupIcon },
    { href: "/marketing", label: "Marketing", icon: MegaphoneIcon },
  ];
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Item da barra central (desktop): só texto, pill preenchida quando ativo.
function TopNavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        active
          ? "bg-slate-100/80 text-primary"
          : "text-slate-500 hover:bg-slate-100/60 hover:text-slate-800",
      )}
    >
      {item.label}
    </Link>
  );
}

// Item do menu mobile: ícone + label, tap target ≥ 44px.
function MobileNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[44px] items-center gap-3 rounded-full px-4 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        active
          ? "bg-slate-100/75 text-primary"
          : "text-slate-500 hover:bg-slate-100/75 hover:text-slate-700",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AppShell({
  role,
  clientId,
  name,
  email,
  avatarUrl,
  children,
}: {
  role: UserRole;
  clientId: string | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, startTransition] = useTransition();

  const items = navItems(role, clientId);
  const homeHref = role === "cliente" && clientId ? `/clientes/${clientId}` : "/";
  // Full-bleed (altura cheia até o rodapé, largura total) é exclusivo do board.
  const isWorkflow = pathname === "/workflow";
  const roleLabel = role === "interno" ? "Equipe Perfecting" : "Cliente";
  // Secundária do perfil: e-mail (padrão de account menu); cai no papel quando o
  // nome já é o próprio e-mail (sem full_name) ou não há e-mail.
  const subtitle = !email || name === email ? roleLabel : email;

  return (
    <div className="min-h-[100dvh]">
      {/* Barra superior flutuante (§10: z-header) — sem barra branca/stroke; fundo
          cor-da-página (opaco, esconde conteúdo ao rolar) e nav em pill flutuante. */}
      <header className="fixed inset-x-0 top-0 z-(--z-header) grid py-4 h-11 grid-cols-[1fr_auto_1fr] items-center gap-4 bg-[#f3f6fc] px-4 sm:px-6">
        {/* Esquerda: menu mobile + logo */}
        <div className="flex items-center gap-2 justify-self-start">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
            className={cn(
              "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-slate-600 md:hidden",
              "transition-colors hover:bg-slate-50 hover:text-slate-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
          >
            <Bars3Icon className="h-5 w-5" aria-hidden />
          </button>
          <Link
            href={homeHref}
            className="rounded-full text-base font-semibold tracking-tight text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
           perfectingOS
          </Link>
        </div>

        {/* Centro: navegação em pill (desktop) */}
        {items.length > 0 ? (
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-1 justify-self-center rounded-full border border-slate-200 bg-white p-1 shadow-[var(--shadow-sm)] md:flex"
          >
            {items.map((item) => (
              <TopNavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
        ) : (
          <span aria-hidden />
        )}

        {/* Direita: perfil → dropdown com Meu Perfil + Sair */}
        <div className="justify-self-end">
          <DropdownMenu
            ariaLabel="Menu do usuário"
            align="right"
            header={
              <div className="flex flex-col gap-0.5">
                <span className="max-w-[220px] truncate text-sm font-medium text-slate-900">
                  {name}
                </span>
                <span className="max-w-[220px] truncate text-xs text-slate-500">
                  {subtitle}
                </span>
              </div>
            }
            triggerClassName={cn(
              "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white shadow-[var(--shadow-sm)] transition-colors hover:border-slate-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
            trigger={<Avatar name={name} src={avatarUrl} size={32} />}
            items={[
              {
                label: "Meu Perfil",
                icon: UserCircleIcon,
                href: "/perfil",
              },
              {
                label: "Sair",
                icon: ArrowRightStartOnRectangleIcon,
                destructive: true,
                onSelect: () => startTransition(() => signOut()),
              },
            ]}
          />
        </div>
      </header>

      {/* Menu mobile: overlay z-80 + painel lateral */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-(--z-overlay) bg-slate-900/40 md:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMobileOpen(false);
          }}
        >
          <div className="z-(--z-modal) flex h-full w-64 flex-col gap-4 border-r border-slate-200 bg-white p-4 shadow-[var(--shadow-lg)]">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-slate-900">
                Perfecting
              </span>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-slate-500",
                  "transition-colors hover:bg-slate-50 hover:text-slate-700",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                )}
              >
                <XMarkIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav
              className="flex flex-col gap-1"
              aria-label="Navegação principal"
            >
              {items.map((item) => (
                <MobileNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      {/* Conteúdo — sem sidebar. Workflow ocupa toda a altura/largura até o rodapé;
          demais páginas mantêm o padding e a largura máxima padrão. */}
      <main
        className={cn(
          "flex flex-col px-4  mx-auto pt-[calc(3.5rem+var(--page-content-pt-below-header))] sm:px-12 lg:px-24",
          // Workflow trava na altura exata da viewport (scroll só interno ao board,
          // com a barra sempre visível no rodapé); demais páginas crescem com o conteúdo.
          isWorkflow ? "h-[100dvh] overflow-hidden pb-2" : "min-h-[100dvh] pb-12",
        )}
      >
        <div
          className={cn(
            "page-fade-in mx-auto flex w-full flex-1 flex-col gap-6",
            isWorkflow ? "max-w-none" : "max-w-[1400px]",
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

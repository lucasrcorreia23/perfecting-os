"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
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
    items.push({ href: "/perfil", label: "Meu Perfil", icon: UserCircleIcon });
    return items;
  }
  return [
    { href: "/", label: "Início", icon: HomeIcon },
    { href: "/clientes", label: "Clientes", icon: UserGroupIcon },
    { href: "/workflow", label: "Workflow", icon: ViewColumnsIcon },
    { href: "/perfil", label: "Meu Perfil", icon: UserCircleIcon },
  ];
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[44px] items-center gap-3 rounded-full px-4 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        collapsed && "justify-center px-0",
        active
          ? "bg-slate-100/75 text-primary"
          : "text-slate-500 hover:bg-slate-100/75 hover:text-slate-700",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

export function AppShell({
  role,
  clientId,
  name,
  avatarUrl,
  initialCollapsed,
  children,
}: {
  role: UserRole;
  clientId: string | null;
  name: string;
  avatarUrl: string | null;
  initialCollapsed: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, startTransition] = useTransition();

  const items = navItems(role, clientId);
  const homeHref = role === "cliente" && clientId ? `/clientes/${clientId}` : "/";

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `sidebar=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="min-h-[100dvh]">
      {/* Header fixo (§10: z-header) */}
      <header className="fixed inset-x-0 top-0 z-(--z-header) flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-2">
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
            className="rounded-full text-base font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            Perfecting
          </Link>
        </div>

        <DropdownMenu
          ariaLabel="Menu do usuário"
          align="right"
          triggerClassName={cn(
            "flex cursor-pointer items-center rounded-full",
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
      </header>

      {/* Sidebar fixa (§10: z-shell) — desktop */}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-14 z-(--z-shell) hidden flex-col justify-between border-r border-slate-200 bg-white p-2 md:flex",
          "transition-[width] duration-200 ease-out",
          collapsed ? "w-[60px]" : "w-[220px]",
        )}
      >
        <nav className="flex flex-col gap-1" aria-label="Navegação principal">
          {items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
            />
          ))}
        </nav>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-full px-4 text-sm font-medium text-slate-500",
            "transition-colors hover:bg-slate-100/75 hover:text-slate-700",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <>
              <ChevronLeftIcon className="h-5 w-5 shrink-0" aria-hidden />
              <span>Recolher</span>
            </>
          )}
        </button>
      </aside>

      {/* Menu mobile: overlay z-80 + painel */}
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
            <nav className="flex flex-col gap-1" aria-label="Navegação principal">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={false}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </nav>
          </div>
        </div>
      ) : null}

      {/* Conteúdo */}
      <main
        className={cn(
          "px-4 pb-12 sm:px-6 lg:px-8",
          "pt-[calc(3.5rem+var(--page-content-pt-below-header))]",
          "transition-[padding] duration-200 ease-out",
          collapsed ? "md:pl-[calc(60px+1.5rem)]" : "md:pl-[calc(220px+1.5rem)]",
        )}
      >
        <div className="page-fade-in mx-auto flex w-full max-w-[1400px] flex-col gap-6">
          {children}
        </div>
      </main>
    </div>
  );
}

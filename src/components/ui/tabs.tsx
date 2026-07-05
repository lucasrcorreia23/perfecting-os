"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabDef = { id: string; label: string };

// Abas underlined (§8.9): strip w-fit fora do card; o painel É o card.
// Estado sincronizado com ?tab= (deep link para "Editar dados" etc.).
export function Tabs({
  tabs,
  paramName = "tab",
  panelClassName,
  children,
}: {
  tabs: TabDef[];
  paramName?: string;
  panelClassName?: string;
  children: (activeId: string) => ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);

  const requested = searchParams.get(paramName);
  const active =
    tabs.find((tab) => tab.id === requested)?.id ?? tabs[0]?.id ?? "";

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === active);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    select(next.id);
    listRef.current
      ?.querySelector<HTMLElement>(`[data-tab-id="${next.id}"]`)
      ?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={listRef}
        role="tablist"
        onKeyDown={onKeyDown}
        className="flex w-fit max-w-full gap-1 overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-tab-id={tab.id}
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(tab.id)}
              className={cn(
                "relative min-h-[44px] cursor-pointer whitespace-nowrap rounded-t-[12px] px-3 pb-2.5 pt-2 text-sm font-medium",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                isActive
                  ? cn(
                      "text-primary",
                      // "sol" radial branco sutil subindo de baixo
                      "[background:radial-gradient(60%_80%_at_50%_100%,rgba(255,255,255,0.95),transparent)]",
                      "after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-0.5 after:bg-primary",
                    )
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        className={cn(
          "rounded-md border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60",
          "shadow-sm",
          panelClassName ?? "p-4 sm:p-6",
        )}
      >
        {children(active)}
      </div>
    </div>
  );
}

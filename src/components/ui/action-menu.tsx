"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { HeroIcon } from "./types";

// useLayoutEffect avisa no SSR; no client precisamos dele para medir/posicionar
// o popover antes da pintura (sem "flash" na posição errada).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Todo item de menu exige ícone (§8.8).
export type MenuItem = {
  label: string;
  icon: HeroIcon;
  onSelect?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
  // Chip curto à direita do label — ex.: "Em breve" para placeholders.
  badge?: string;
};

const ITEM_CLASSES = cn(
  "flex w-full cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-left text-sm",
  "transition-colors focus-visible:outline-none focus-visible:bg-slate-100/75",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

function itemToneClasses(destructive?: boolean) {
  return destructive
    ? "text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:bg-red-50"
    : "text-slate-700 hover:bg-slate-100/75";
}

// Dropdown genérico com o popover padrão do §8.8 — também usado por triggers
// custom (avatar do header, "Entrar em contato").
export function DropdownMenu({
  items,
  trigger,
  triggerClassName,
  ariaLabel,
  align = "right",
  header,
}: {
  items: MenuItem[];
  trigger: ReactNode;
  triggerClassName?: string;
  ariaLabel: string;
  align?: "right" | "left";
  header?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Posiciona o popover em coordenadas de viewport (position: fixed) via portal,
  // para que ele escape de qualquer ancestral com overflow-hidden (ex.: a borda
  // arredondada da DataTable, que antes cortava o menu nas últimas linhas).
  useIsomorphicLayoutEffect(() => {
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menu = menuRef.current;
      const menuHeight = menu?.offsetHeight ?? 0;
      const menuWidth = menu?.offsetWidth ?? 0;
      const gap = 4; // mt-1

      // Abre pra cima se não couber abaixo e houver mais espaço acima.
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + gap && rect.top > spaceBelow;
      const top = openUp ? rect.top - menuHeight - gap : rect.bottom + gap;

      const left =
        align === "right"
          ? Math.max(8, rect.right - menuWidth)
          : Math.min(rect.left, window.innerWidth - menuWidth - 8);

      setCoords({ top, left });
    }

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target))
        return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function moveFocus(delta: 1 | -1) {
    const focusables = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ??
        [],
    );
    if (focusables.length === 0) return;
    const index = focusables.indexOf(document.activeElement as HTMLElement);
    const next =
      focusables[(index + delta + focusables.length) % focusables.length];
    next?.focus();
  }

  return (
    <div ref={rootRef} className="inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveFocus(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              moveFocus(-1);
            }
          }}
          style={{
            position: "fixed",
            top: coords?.top ?? 0,
            left: coords?.left ?? 0,
            visibility: coords ? "visible" : "hidden",
          }}
          className={cn(
            "z-(--z-tooltip) min-w-[12rem] p-1.5",
            "rounded-md border border-slate-200 bg-white shadow-lg",
          )}
        >
          {header ? (
            <div className="mb-1 border-b border-slate-100 px-3 pb-2 pt-1">
              {header}
            </div>
          ) : null}
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    !item.destructive && "text-slate-400",
                  )}
                  aria-hidden
                />
                {item.label}
                {item.badge ? (
                  <span
                    className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: "#FFFBEB", color: "#973C00" }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </>
            );

            if (item.href && !item.disabled) {
              const isExternal = /^(https?:|mailto:)/.test(item.href);
              if (isExternal) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    role="menuitem"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(false);
                      item.onSelect?.();
                    }}
                    className={cn(
                      ITEM_CLASSES,
                      itemToneClasses(item.destructive),
                    )}
                  >
                    {content}
                  </a>
                );
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen(false);
                    item.onSelect?.();
                  }}
                  className={cn(ITEM_CLASSES, itemToneClasses(item.destructive))}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  item.onSelect?.();
                }}
                className={cn(ITEM_CLASSES, itemToneClasses(item.destructive))}
              >
                {content}
              </button>
            );
          })}
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// Menu "⋯" (§8.8): trigger sutil, tap target ≥ 44px no mobile.
export function ActionMenu({
  items,
  ariaLabel = "Ações",
}: {
  items: MenuItem[];
  ariaLabel?: string;
}) {
  return (
    <DropdownMenu
      items={items}
      ariaLabel={ariaLabel}
      align="right"
      triggerClassName={cn(
        "inline-flex h-11 w-11 sm:h-9 sm:w-9 cursor-pointer items-center justify-center rounded-full",
        "text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
      )}
      trigger={<EllipsisHorizontalIcon className="h-5 w-5" aria-hidden />}
    />
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { HeroIcon } from "./types";

// Todo item de menu exige ícone (§8.8).
export type MenuItem = {
  label: string;
  icon: HeroIcon;
  onSelect?: () => void;
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
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
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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
    <div ref={rootRef} className="relative inline-flex">
      <button
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
      {open ? (
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
          className={cn(
            "absolute top-full z-(--z-tooltip) mt-1 min-w-[12rem] p-1.5",
            "rounded-md border border-slate-200 bg-white shadow-lg",
            align === "right" ? "right-0" : "left-0",
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
        </div>
      ) : null}
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

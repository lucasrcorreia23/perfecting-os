"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type { SelectOption } from "./select";

// useLayoutEffect avisa no SSR; no client precisamos dele para posicionar o
// popover antes da pintura (mesmo padrão do DropdownMenu).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Select com lista própria, para telas onde o popover nativo destoa demais
// (no macOS ele vem escuro e ignora todos os tokens). Trigger é o mesmo pill
// do Select nativo; a lista é o popover branco do §8.8, em portal — assim
// escapa de qualquer ancestral com overflow ou transform.
export function SelectMenu({
  id,
  options,
  value,
  onChange,
  placeholder = "Escolha…",
  size = "md",
  ariaLabel,
  disabled = false,
  className,
}: {
  id?: string;
  options: SelectOption[];
  // Vazio significa "nada escolhido" — o trigger mostra o placeholder.
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "md" | "sm";
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const listaId = useId();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<
    { top: number; left: number; width: number } | null
  >(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selecionada = options.find((option) => option.value === value) ?? null;

  useIsomorphicLayoutEffect(() => {
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const altura = listRef.current?.offsetHeight ?? 0;
      const gap = 4;
      const espacoAbaixo = window.innerHeight - rect.bottom;
      const abrirPraCima = espacoAbaixo < altura + gap && rect.top > espacoAbaixo;
      setCoords({
        top: abrirPraCima ? rect.top - altura - gap : rect.bottom + gap,
        left: rect.left,
        width: rect.width,
      });
    }

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // Ao abrir, o foco vai para a opção atual: teclado navega a lista, e o
  // Escape devolve o foco ao trigger.
  useEffect(() => {
    if (!open) return;
    const alvo =
      listRef.current?.querySelector<HTMLElement>("[aria-selected='true']") ??
      listRef.current?.querySelector<HTMLElement>("[role='option']");
    alvo?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const alvo = event.target as Node;
      if (triggerRef.current?.contains(alvo) || listRef.current?.contains(alvo))
        return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function moverFoco(delta: 1 | -1) {
    const opcoes = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[role='option']") ?? [],
    );
    if (opcoes.length === 0) return;
    const atual = opcoes.indexOf(document.activeElement as HTMLElement);
    opcoes[(atual + delta + opcoes.length) % opcoes.length]?.focus();
  }

  function escolher(opcao: SelectOption) {
    onChange(opcao.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={listaId}
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((atual) => !atual)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-full border border-slate-200 bg-white",
          "text-left text-sm outline-none transition-colors",
          "focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-primary/35",
          "disabled:cursor-not-allowed disabled:opacity-70",
          size === "md" ? "h-11 px-4 sm:h-10" : "h-11 px-3.5 sm:h-8",
          className,
        )}
      >
        <span
          className={cn(
            "truncate",
            selecionada ? "text-[#314158]" : "text-slate-400",
          )}
        >
          {selecionada?.label ?? placeholder}
        </span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-[#64748b]" aria-hidden />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={listRef}
              id={listaId}
              role="listbox"
              aria-label={ariaLabel}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  moverFoco(1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  moverFoco(-1);
                }
              }}
              style={{
                position: "fixed",
                top: coords?.top ?? 0,
                left: coords?.left ?? 0,
                width: coords?.width,
                visibility: coords ? "visible" : "hidden",
              }}
              className={cn(
                "z-(--z-tooltip) flex max-h-72 flex-col gap-0.5 overflow-y-auto p-1.5",
                "rounded-md border border-slate-200 bg-white shadow-lg",
              )}
            >
              {options.map((option) => {
                const ativa = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={ativa}
                    onClick={() => escolher(option)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-left text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:bg-slate-100/75",
                      ativa
                        ? "bg-[#2E63CD]/8 font-medium text-[#2E63CD]"
                        : "text-slate-700 hover:bg-slate-100/75",
                    )}
                  >
                    <CheckIcon
                      className={cn("h-4 w-4 shrink-0", !ativa && "invisible")}
                      aria-hidden
                    />
                    {option.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

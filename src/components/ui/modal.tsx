"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// Base de modal (§8.11 / §10): overlay z-80 contendo o painel z-70.
export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // O efeito abaixo NÃO pode depender de `onClose`. Quase todo modal declara o
  // handler no corpo do componente (`function fechar() {…}`), então cada
  // re-render — inclusive o de digitar uma letra num input — cria uma
  // identidade nova. Com `onClose` na lista de deps o efeito rodava a cada
  // tecla e o `focus()` roubava o cursor do campo, cancelando a edição. O
  // handler mais recente chega por ref: o listener lê no momento do Esc.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    // Foco só na abertura: leitor de tela anuncia o dialog e o Tab começa
    // dentro dele. Se algum campo já se declarou dono do foco (`autoFocus`),
    // ele fica — o painel é o destino de fallback, não um roubo.
    const painel = panelRef.current;
    if (painel && !painel.contains(document.activeElement)) painel.focus();
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  // Portal para o body: o overlay fixed cobre a viewport mesmo se algum ancestral
  // (ex.: o transform de .page-fade-in) criar um containing block.
  return createPortal(
    <div
      className="fixed inset-0 z-(--z-overlay) flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "fade-in-up z-(--z-modal) flex w-full flex-col gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-[var(--shadow-lg)] outline-none sm:p-6",
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className={cn(
              "-m-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400",
              "transition-colors hover:bg-slate-50 hover:text-slate-600",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
          >
            <XMarkIcon className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

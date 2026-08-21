"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { termosGlossario } from "@/lib/calculadora/glossario";
import { usePremissas } from "./premissas-context";

// Os termos moram em `@/lib/calculadora/glossario` desde 22/08/2026: as
// explicações de "como chegamos a este número" (`explicacoes.ts`) citam as
// MESMAS definições, e um módulo puro não pode importar um "use client".
// Aqui ficou só a gaveta.

// Painel lateral, não modal: sem overlay e sem trava de scroll, para que o
// visitante consulte um termo com o formulário ainda editável ao lado. Quem
// abre espaço é o `main` da calculadora, que ganha padding à direita.
export function Glossario({ open, onClose }: { open: boolean; onClose: () => void }) {
  const termos = termosGlossario(usePremissas());
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Portal no body: o transform de .page-fade-in ancoraria o painel fixo. Os
  // tokens da pele chegam aqui porque o CSS os declara também em
  // `body:has(.pf-calc)` — fora do wrapper, eles não herdariam.
  return createPortal(
    <aside
      aria-label="Glossário"
      className="slide-in-right fixed right-0 top-0 z-(--z-modal) flex h-[100dvh] w-full flex-col border-l border-(--pf-line) bg-(--pf-surface) shadow-[var(--shadow-lg)] sm:w-[360px]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-(--pf-line) px-5 py-4">
        <h2 className="pf-title text-(--pf-ink)">Glossário</h2>
        <button
          type="button"
          aria-label="Fechar glossário"
          onClick={onClose}
          className="-mr-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-(--pf-ink-faint) transition-colors hover:bg-(--pf-surface-alt) hover:text-(--pf-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <dl className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        {termos.map(({ id, termo, definicao }) => (
          <div key={id} className="flex flex-col gap-1">
            <dt className="text-sm font-semibold text-(--pf-ink)">{termo}</dt>
            <dd className="text-sm leading-6 text-(--pf-ink-soft)">{definicao}</dd>
          </div>
        ))}
      </dl>
    </aside>,
    document.body,
  );
}

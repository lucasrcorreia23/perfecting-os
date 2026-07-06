"use client";

import { useEffect, useRef, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { SearchInput } from "@/components/ui/search-input";
import { StageBadge } from "@/components/ui/stage-badge";
import type { BoardClient } from "./client-card";

// Alternativa ao drag-and-drop para mover um cliente de outra etapa para esta
// (bom pra mobile/acessibilidade). Popover próprio (não o DropdownMenu
// genérico): precisa de busca + lista rolável, o que o menu de ações não tem.
export function AddClientPicker({
  stageLabel,
  candidates,
  onSelect,
}: {
  stageLabel: string;
  candidates: BoardClient[];
  onSelect: (clientId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Fechar limpa a busca junto (em vez de um effect que observa `open` —
  // setState síncrono em effect causa render em cascata).
  function close() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const term = query.trim().toLowerCase();
  const filtered = term
    ? candidates.filter(
        (client) =>
          client.name.toLowerCase().includes(term) ||
          (client.company ?? "").toLowerCase().includes(term),
      )
    : candidates;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Adicionar cliente em ${stageLabel}`}
        title="Mover cliente para esta etapa"
        onClick={(event) => {
          event.stopPropagation();
          if (open) close();
          else setOpen(true);
        }}
        className={cn(
          "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full sm:h-9 sm:w-9",
          "text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        )}
      >
        <PlusIcon className="h-5 w-5" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-(--z-tooltip) mt-1 flex w-72 flex-col gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-lg"
        >
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar cliente"
            size="sm"
          />
          <div className="scrollbar-thin flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-slate-400">
                {candidates.length === 0
                  ? "Todos os clientes já estão nesta etapa."
                  : "Nenhum cliente encontrado."}
              </p>
            ) : (
              filtered.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onSelect(client.id);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-full px-2 py-1.5 text-left",
                    "transition-colors hover:bg-slate-100/75 focus-visible:outline-none focus-visible:bg-slate-100/75",
                  )}
                >
                  <Avatar name={client.name} size={24} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-slate-800">
                      {client.name}
                    </span>
                    {client.company ? (
                      <span className="truncate text-xs text-slate-500">
                        {client.company}
                      </span>
                    ) : null}
                  </span>
                  <StageBadge stage={client.stage} size="sm" />
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

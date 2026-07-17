"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { toggleSubatividade } from "@/lib/actions/activities";
import { ATIVIDADE_TIPOS, CANAIS, RESPONSAVEIS } from "@/lib/constants";
import type { Subatividade } from "@/lib/methodology";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoTooltip, TooltipRow } from "@/components/ui/tooltip";

// Checklist das subatividades de uma atividade (planilha da POC), compartilhado
// entre o drawer do workflow e a aba de atividades do perfil do cliente.
// Disclosure colapsado por padrão; marcar/desmarcar grava no jsonb via
// toggleSubatividade (o índice casa porque os dois lados usam o mesmo
// parseSubatividades).
export function SubactivityChecklist({
  activityId,
  subatividades,
  readOnly,
  onError,
}: {
  activityId: string;
  subatividades: Subatividade[];
  readOnly: boolean;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [subs, applyToggle] = useOptimistic(
    subatividades,
    (current, { index, done }: { index: number; done: boolean }) =>
      current.map((sub, i) => (i === index ? { ...sub, done } : sub)),
  );

  if (subs.length === 0) return null;
  const doneCount = subs.filter((sub) => sub.done).length;

  function toggle(index: number, done: boolean) {
    startTransition(async () => {
      applyToggle({ index, done });
      const result = await toggleSubatividade(activityId, index, done);
      if (!result.ok) onError(result.error);
    });
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex w-fit cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs tabular-nums text-slate-500",
          "transition-colors hover:bg-slate-50 hover:text-slate-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        )}
      >
        <ChevronDownIcon
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
        {doneCount}/{subs.length} subatividades
      </button>

      {open ? (
        <div className="flex flex-col pl-2">
          {subs.map((sub, index) => {
            const hasMeta = Boolean(sub.responsavel || sub.canal || sub.tipo);
            return (
              <div
                key={`${sub.code || sub.title}-${index}`}
                className="flex min-h-[44px] items-center gap-2 py-1.5 sm:min-h-0"
              >
                {/* O ícone de info fica FORA do label: clique nele não pode
                    marcar/desmarcar o checkbox. */}
                <label
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2",
                    !readOnly && "cursor-pointer",
                  )}
                >
                  <Checkbox
                    checked={sub.done}
                    disabled={readOnly}
                    onChange={(event) => toggle(index, event.target.checked)}
                    aria-label={`Concluir ${sub.title}`}
                  />
                  {sub.code ? (
                    <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                      {sub.code}
                    </span>
                  ) : null}
                  {/* Sem truncate/title: o texto quebra linha — nada de
                      tooltip nativo do navegador por cima das linhas. */}
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-xs text-slate-700",
                      sub.done && "text-slate-400 line-through",
                    )}
                  >
                    {sub.title}
                  </span>
                </label>
                {/* Responsável/canal/tipo no balão do ícone, no extremo
                    direito da linha — mesma linguagem do resto do produto. */}
                {hasMeta ? (
                  <InfoTooltip align="right">
                    {sub.responsavel ? (
                      <TooltipRow
                        label="Responsável"
                        value={RESPONSAVEIS[sub.responsavel].label}
                      />
                    ) : null}
                    {sub.canal ? (
                      <TooltipRow label="Canal" value={CANAIS[sub.canal].label} />
                    ) : null}
                    {sub.tipo ? (
                      <TooltipRow
                        label="Tipo"
                        value={ATIVIDADE_TIPOS[sub.tipo].label}
                      />
                    ) : null}
                  </InfoTooltip>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

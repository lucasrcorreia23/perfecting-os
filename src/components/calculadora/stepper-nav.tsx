"use client";

import { CheckIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { TIMES_HELP } from "@/lib/calculadora/campos";
import { PASSOS, passoCompleto } from "@/lib/calculadora/estado";
import type { EstadoTime } from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { HintTooltip } from "@/components/ui/tooltip";

// Mapa times × passos, sempre visível no wizard. Tap targets ≥ 44px (§11).
export function StepperNav({
  times,
  timeAtual,
  passoAtual,
  onIrPara,
  onAddTime,
  onRemoverTime,
  podeAdicionar,
}: {
  times: EstadoTime[];
  timeAtual: string;
  passoAtual: number;
  onIrPara: (timeId: string, passo: 1 | 2 | 3 | 4 | 5) => void;
  onAddTime: () => void;
  onRemoverTime?: (time: EstadoTime) => void;
  podeAdicionar: boolean;
}) {
  const multiTime = times.length > 1;

  return (
    <nav aria-label="Progresso do preenchimento" className="flex flex-col gap-4">
      {times.map((time) => (
        <div key={time.id} className="group/time flex flex-col gap-2">
          {multiTime ? (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-semibold",
                  time.id === timeAtual ? "text-slate-700" : "text-slate-400",
                )}
              >
                {time.nome}
              </span>
              {onRemoverTime ? (
                // Sempre visível: escondido no hover, remover um time virava
                // achado por acaso — e é a única forma de desfazer um time
                // criado sem querer.
                <button
                  type="button"
                  aria-label={`Remover ${time.nome}`}
                  onClick={() => onRemoverTime(time)}
                  className={cn(
                    "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors",
                    "hover:bg-red-50 hover:text-red-600",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  )}
                >
                  <TrashIcon className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
          <ol className="flex flex-wrap items-center gap-2">
            {PASSOS.map((passo) => {
              const completo = passoCompleto(time.entradas, passo.id);
              const atual = time.id === timeAtual && passo.id === passoAtual;
              return (
                <li key={passo.id}>
                  <button
                    type="button"
                    onClick={() => onIrPara(time.id, passo.id)}
                    aria-current={atual ? "step" : undefined}
                    aria-label={`${time.nome}, passo ${passo.id}: ${passo.titulo}${completo ? " (completo)" : ""}`}
                    className={cn(
                      "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                      atual
                        ? "border-[#2E63CD] bg-[#2E63CD] text-white"
                        : completo
                          ? "border-trend-positive bg-trend-positive text-white hover:border-trend-positive-ink hover:bg-trend-positive-ink"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                    )}
                  >
                    {completo && !atual ? (
                      <CheckIcon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                    ) : (
                      passo.id
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}

      {podeAdicionar ? (
        // O balão explica POR QUE simular mais de um time — contexto que a
        // intro perguntava antes de a pessoa ter visto o formulário. Irmão do
        // botão, nunca dentro dele: botão aninhado em botão é HTML inválido.
        <div className="relative flex items-center gap-1 self-start">
          <button
            type="button"
            onClick={onAddTime}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-dashed border-slate-300 bg-white px-4 text-sm font-medium text-slate-500 sm:min-h-8 transition-colors hover:border-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            <PlusIcon className="h-4 w-4" aria-hidden />
            Adicionar time
          </button>
          <HintTooltip text={TIMES_HELP} />
        </div>
      ) : null}
    </nav>
  );
}

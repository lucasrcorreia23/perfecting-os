"use client";

import { CheckIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { TIMES_HELP } from "@/lib/calculadora/campos";
import { PASSOS, passoCompleto } from "@/lib/calculadora/estado";
import type { EstadoTime, PassoId } from "@/lib/calculadora/types";
import { HintTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// O mapa times × perguntas, à esquerda do quiz.
//
// É a mesma peça que existia antes das oito perguntas, na linguagem da pele:
// superfície `--pf-surface`, eyebrow monoespaçado e bolhas em pílula. Duas
// coisas mudaram com a numeração:
//
// (a) OITO bolhas não cabem numa fita: 8 × 44px passa de 350px, e a coluna tem
//     264. Viraram uma grade 4 × 2 — o alvo de toque de 44px da §11 fica de pé
//     e o bloco continua legível de relance, que é a função dele.
//
// (b) A pergunta 8 NUNCA fica verde. Ela edita a proposta e tem `campos: []`,
//     então `passoCompleto` devolve true por `every` — o que é certo para o
//     gating e seria mentira aqui: um tique numa pergunta que ninguém abriu diz
//     que ela foi respondida. Quem não tem campo obrigatório não tem "completo".
export function TimesSidebar({
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
  passoAtual: PassoId;
  onIrPara: (timeId: string, passo: PassoId) => void;
  onAddTime: () => void;
  onRemoverTime?: (time: EstadoTime) => void;
  podeAdicionar: boolean;
}) {
  const multiTime = times.length > 1;

  return (
    <nav
      aria-label="Progresso do preenchimento"
      className="flex flex-col gap-5 rounded-md border border-(--pf-line) bg-(--pf-surface) p-4"
    >
      <span
        className="pf-panel-title text-(--pf-brand)"
        aria-hidden
      >
        {multiTime ? "Seus times" : "Seu time"}
      </span>

      {times.map((time) => (
        <div key={time.id} className="flex flex-col gap-2">
          {multiTime ? (
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  time.id === timeAtual ? "text-(--pf-ink)" : "text-(--pf-ink-faint)",
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
                    "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-(--pf-ink-faint) transition-colors",
                    "hover:bg-red-50 hover:text-red-600",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
                  )}
                >
                  <TrashIcon className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}

          <ol className="grid grid-cols-4 gap-2">
            {PASSOS.map((passo) => {
              const podeCompletar = passo.campos.length > 0;
              const completo = podeCompletar && passoCompleto(time.entradas, passo.id);
              const atual = time.id === timeAtual && passo.id === passoAtual;
              return (
                <li key={passo.id}>
                  <button
                    type="button"
                    onClick={() => onIrPara(time.id, passo.id)}
                    aria-current={atual ? "step" : undefined}
                    aria-label={`${time.nome}, pergunta ${passo.id}: ${passo.titulo}${completo ? " (completa)" : ""}`}
                    className={cn(
                      "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
                      atual
                        ? "border-(--pf-brand) bg-(--pf-brand) text-white"
                        : completo
                          ? "border-trend-positive bg-trend-positive text-white hover:border-trend-positive-ink hover:bg-trend-positive-ink"
                          : "border-(--pf-line) bg-(--pf-surface-alt) text-(--pf-ink-soft) hover:border-(--pf-ink-faint)/40",
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
        // O balão explica POR QUE simular mais de um time — contexto que se lê
        // uma vez, no momento da decisão. Irmão do botão, nunca dentro dele:
        // botão aninhado em botão é HTML inválido.
        <div className="flex items-center gap-1 border-t border-(--pf-line) pt-4">
          <button
            type="button"
            onClick={onAddTime}
            className={cn(
              "inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-dashed border-(--pf-line) px-4 text-sm font-medium text-(--pf-ink-soft) transition-colors sm:min-h-9",
              "hover:border-(--pf-ink-faint)/50 hover:text-(--pf-ink)",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
            )}
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

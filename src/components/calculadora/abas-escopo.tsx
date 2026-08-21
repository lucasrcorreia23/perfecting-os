"use client";

import { ExclamationCircleIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { TimeModelo } from "@/lib/calculadora/modelo";
import { cn } from "@/lib/utils";

// De quem fala este relatório: a conta inteira ou um time.
//
// Substitui os chips que viviam no rodapé do `ConsolidadoView` (removido em
// 20/08/2026), 800px abaixo dos números que eles governavam — quem lia os KPIs
// não tinha como saber que dava para trocar de escopo sem rolar até depois da
// capa. As abas ocupam agora o slot do eyebrow "Etapa 03 · Relatório de ROI",
// que dizia onde a pessoa está e a régua de etapas no topo já dizia.
//
// **A aba muda a CAPA e as chapters juntas.** Escolher "Time 2" torna o time 2
// o ativo, então os capítulos abaixo (trajetória, eficiência, COI, preço) falam
// dele também — duas seleções independentes na mesma tela dariam KPIs de um
// time sobre o cálculo de outro.
//
// Elas vivem FORA da capa (o chamador as injeta) porque a capa não existe
// quando o time ativo está incompleto: presas lá dentro, escolher um time sem
// conta fechada apagaria a própria fita que traria a pessoa de volta.
//
// Contraste (decisão do decisor, 20/08/2026): a ativa é chapada na primária, as
// outras levam o fio de CONTROLE (`--pf-line-strong`). O par tinta-sobre-tinta
// que os chips usavam — borda de marca + `--pf-brand-tint` — separava por
// temperatura, e sobre um canvas azul temperatura não separa mais nada.
export type EscopoCapa = "consolidado" | (string & {});

export function AbasEscopo({
  times,
  escopo,
  onEscopo,
  onAddTime,
}: {
  times: TimeModelo[];
  escopo: EscopoCapa;
  onEscopo: (escopo: EscopoCapa) => void;
  /** Ausente quando a conta já bateu o teto de times. */
  onAddTime?: () => void;
}) {
  const abas: { id: EscopoCapa; nome: string; incompleto: boolean }[] = [
    { id: "consolidado", nome: "Consolidado", incompleto: false },
    ...times.map((time) => ({
      id: time.id,
      nome: time.nome,
      incompleto: time.resultado.status !== "ok",
    })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Escopo do relatório"
      className="flex flex-wrap items-center gap-2"
    >
      {abas.map((aba) => {
        const ativo = aba.id === escopo;
        return (
          <button
            key={aba.id}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onEscopo(aba.id)}
            className={cn(
              // `pf-label` é o mesmo nível do eyebrow que estas abas
              // substituem: 12px/700/+10%, com a caixa alta vindo do CSS.
              "pf-label flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full px-4 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
              ativo
                ? "bg-(--pf-brand) text-(--pf-on-brand)"
                : "border border-(--pf-line-strong) bg-(--pf-surface) text-(--pf-ink-soft) hover:border-(--pf-ink-faint) hover:text-(--pf-ink)",
            )}
          >
            {aba.incompleto ? (
              <ExclamationCircleIcon
                className={cn(
                  "h-4 w-4 shrink-0",
                  ativo ? "text-(--pf-on-brand)" : "text-(--pf-ink-faint)",
                )}
                aria-hidden
              />
            ) : null}
            {aba.nome}
            {aba.incompleto ? (
              <span className="sr-only">— a conta deste time ainda não fechou</span>
            ) : null}
          </button>
        );
      })}

      {onAddTime ? (
        <button
          type="button"
          onClick={onAddTime}
          className="pf-label flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-dashed border-(--pf-line-strong) px-4 text-(--pf-ink-faint) transition-colors hover:border-(--pf-ink-faint) hover:text-(--pf-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35"
        >
          <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
          Adicionar time
        </button>
      ) : null}
    </div>
  );
}

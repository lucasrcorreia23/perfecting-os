"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// A passagem do quiz para o relatório.
//
// Antes daqui vinha um modal de comemoração: o número aparecia atrás dele e a
// pessoa tinha de fechar uma janela para chegar ao próprio resultado. O modal
// saiu (decisão do decisor, 20/08/2026) e no lugar ficou esta tela — ela não
// pede clique nenhum e entrega o relatório sozinha.
//
// Os quatro passos NÃO são teatro: são as quatro coisas que o motor de fato faz
// entre o último campo e a capa, na ordem em que `computarModelo` as faz. O que
// é deliberado é o RITMO — o cálculo é instantâneo, e a espera existe para
// separar "eu preenchi" de "aqui está a resposta", que é a fronteira que o modal
// marcava. Por isso a tela descreve o trabalho e nunca promete duração.

const PASSOS = [
  "Lendo os números que você preencheu",
  "Aplicando as premissas declaradas",
  "Rodando os três cenários",
  "Montando o relatório",
] as const;

const DURACAO_MS = 3000;
const PASSO_MS = DURACAO_MS / PASSOS.length;

export function ProcessandoResultado({
  nomeTime,
  multiTime,
  onPronto,
}: {
  nomeTime: string;
  multiTime: boolean;
  onPronto: () => void;
}) {
  const [concluidos, setConcluidos] = useState(0);

  // O efeito roda UMA vez. `onPronto` vem de um closure novo a cada render do
  // pai (ele fecha sobre `setView`), e depender dele reiniciaria a contagem no
  // primeiro re-render — a tela nunca chegaria ao fim.
  const pronto = useRef(onPronto);
  // A escrita vive num efeito sem deps, não no corpo do render: escrever em ref
  // durante o render é o que `react-hooks/refs` barra, porque no modo
  // concorrente o render pode ser descartado e a ref ficaria com o valor de uma
  // árvore que nunca foi montada. Este efeito roda depois de todo commit, então
  // `pronto.current` está sempre no closure mais recente quando o timeout
  // dispara — que é exatamente o que o comentário acima pede.
  useEffect(() => {
    pronto.current = onPronto;
  });

  useEffect(() => {
    const marcas = PASSOS.map((_, i) =>
      window.setTimeout(() => setConcluidos(i + 1), (i + 1) * PASSO_MS),
    );
    // A folga deixa o último passo ser DESENHADO como concluído antes da troca;
    // sem ela a tela sai no mesmo quadro em que o quarto tique aparece.
    const fim = window.setTimeout(() => pronto.current(), DURACAO_MS + 160);
    return () => {
      marcas.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(fim);
    };
  }, []);

  const pct = Math.round((concluidos / PASSOS.length) * 100);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div
        // `status` e não `alert`: é progresso, não interrupção. O `aria-busy`
        // diz ao leitor de tela que a região ainda está mudando, e o texto de
        // cada passo é anunciado sozinho conforme o `aria-live` do rótulo.
        role="status"
        aria-busy={concluidos < PASSOS.length}
        className="fade-in-up flex w-full max-w-xl flex-col gap-8 rounded-md border border-(--pf-line) bg-(--pf-surface) p-8 shadow-[var(--shadow-sm)] sm:p-10"
      >
        <div className="flex flex-col gap-3">
          <span
            className="pf-panel-title text-(--pf-brand)"
            aria-hidden
          >
            Calculando
          </span>
          <h1 className="pf-display text-(--pf-ink)">
            {multiTime
              ? `Montando o relatório de ${nomeTime}.`
              : "Montando o seu relatório."}
          </h1>
          <p className="pf-lead text-(--pf-ink-soft)">
            Todas as premissas ficam declaradas na tela — nada aqui vem de fora
            dos números que você preencheu.
          </p>
        </div>

        {/* A mesma régua de 3px do cabeçalho de etapas: é a barra que o produto
            já usa para dizer "quanto disto já foi vencido". */}
        <span
          className="h-[3px] w-full overflow-hidden rounded-full bg-(--pf-line)"
          aria-hidden
        >
          <span
            className="block h-full rounded-full bg-(--pf-brand) transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </span>

        <ol className="flex flex-col gap-4">
          {PASSOS.map((passo, i) => {
            const feito = i < concluidos;
            const atual = i === concluidos;
            return (
              <li
                key={passo}
                className={cn(
                  "flex items-center gap-3 pf-lead transition-colors duration-300 motion-reduce:transition-none",
                  feito || atual ? "text-(--pf-ink)" : "text-(--pf-ink-faint)",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 motion-reduce:transition-none",
                    // Azul, nunca verde: nesta pele o verde significa "entra
                    // na conta" e marca só as parcelas que somam ao ROI. Um
                    // tique de progresso pintado de verde emprestaria esse
                    // significado a uma etapa de carregamento.
                    feito
                      ? "border-(--pf-brand) bg-(--pf-brand) text-white"
                      : "border-(--pf-line)",
                  )}
                  aria-hidden
                >
                  {feito ? (
                    <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        atual
                          ? "animate-pulse bg-(--pf-brand) motion-reduce:animate-none"
                          : "bg-(--pf-line)",
                      )}
                    />
                  )}
                </span>
                {passo}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

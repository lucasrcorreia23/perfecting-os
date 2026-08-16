"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

const TERMOS: { termo: string; definicao: string }[] = [
  {
    termo: "ROI",
    definicao:
      "Retorno sobre o investimento: o valor projetado no ano dividido pelo custo anual da assinatura. 2× significa que cada real investido projeta dois de volta.",
  },
  {
    termo: "Payback",
    definicao:
      "Quantos meses de valor gerado são necessários para cobrir o custo anual total, não fluxo a fluxo.",
  },
  {
    termo: "Margem de contribuição",
    definicao:
      "O que sobra da receita depois dos custos diretos da venda. É sobre ela que os ganhos são calculados, nunca sobre a receita cheia.",
  },
  {
    termo: "Oportunidades trabalhadas",
    definicao:
      "As oportunidades que o time efetivamente atende. A taxa de conversão é medida sobre elas.",
  },
  {
    termo: "Rampa",
    definicao:
      "O período entre a contratação de um vendedor e a produtividade plena. Encurtar a rampa antecipa receita: a folha é a mesma.",
  },
  {
    termo: "Cobertura",
    definicao:
      "A fração do time com assento para praticar. Ganhos de performance são proporcionais a ela.",
  },
  {
    termo: "Haircut",
    definicao:
      "Redução de 30% aplicada aos ganhos de rampa, ciclo e conversão antes de entrarem na conta: anti-otimismo deliberado.",
  },
  {
    termo: "Teto de funil",
    definicao:
      "Encurtar o ciclo só vira receita se houver oportunidade sobrando no funil. Sem folga, o ganho de ciclo é zero.",
  },
  {
    termo: "Fator de escopo",
    definicao:
      "Quantas horas de gestor cada hora de prática consome (preparar, conduzir, dar feedback). Calculado dos seus números; fora da faixa 0,25–6 usamos a premissa declarada de 2,1.",
  },
  {
    termo: "Cenário",
    definicao:
      "O conjunto de deltas usados na projeção. Conservador é o default e o recomendado para decidir; os sliders permitem modelar dentro dos tetos do modelo.",
  },
];

// Painel lateral, não modal: sem overlay e sem trava de scroll, para que o
// visitante consulte um termo com o formulário ainda editável ao lado. Quem
// abre espaço é o `main` da calculadora, que ganha padding à direita.
export function Glossario({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Portal no body: o transform de .page-fade-in ancoraria o painel fixo.
  return createPortal(
    <aside
      aria-label="Glossário"
      className="slide-in-right fixed right-0 top-0 z-(--z-modal) flex h-[100dvh] w-full flex-col border-l border-slate-200 bg-white shadow-[var(--shadow-lg)] sm:w-[360px]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Glossário</h2>
        <button
          type="button"
          aria-label="Fechar glossário"
          onClick={onClose}
          className="-mr-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <dl className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        {TERMOS.map(({ termo, definicao }) => (
          <div key={termo} className="flex flex-col gap-1">
            <dt className="text-sm font-semibold text-slate-900">{termo}</dt>
            <dd className="text-sm leading-6 text-slate-600">{definicao}</dd>
          </div>
        ))}
      </dl>
    </aside>,
    document.body,
  );
}

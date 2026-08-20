"use client";

import type { ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { PASSOS } from "@/lib/calculadora/estado";
import type { PassoId } from "@/lib/calculadora/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A casca de uma pergunta do quiz. Um card centrado e nada mais na tela: o
// stepper de times que morava à esquerda saiu (times agora vivem na etapa
// avançada), e sem ele a pergunta ocupa a coluna de leitura inteira.
//
// A largura vem do PAI, não daqui. Enquanto o card era o único elemento da
// tela ele carregava `mx-auto max-w-2xl`; com a sidebar de times ao lado isso
// passou a centralizá-lo dentro da própria coluna, abrindo ~160px de vazio
// entre os dois blocos — dois cards a essa distância leem como duas telas
// diferentes coladas. Quem centraliza é a grade inteira (`max-w-5xl` no
// wrapper), e aqui o card só preenche a coluna que sobra.

export function PerguntaCard({
  passo,
  titulo,
  texto,
  children,
  erro,
  onVoltar,
  onAvancar,
  rotuloAvancar = "Avançar",
  acaoSecundaria,
}: {
  passo: PassoId;
  titulo: string;
  texto: string;
  children: ReactNode;
  erro?: string | null;
  onVoltar: () => void;
  onAvancar: () => void;
  rotuloAvancar?: string;
  /** A saída digna da pergunta opcional. */
  acaoSecundaria?: { label: string; onClick: () => void };
}) {
  const total = PASSOS.length;
  const pct = (passo / total) * 100;

  return (
    <div className="fade-in-up flex w-full flex-col gap-6 rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 shadow-[var(--shadow-sm)] sm:p-8">
      {/* Eyebrow + barra na mesma linha: a contagem diz onde você está e a
          barra diz quanto falta. Separados, viravam dois indicadores de
          progresso empilhados dizendo a mesma coisa. */}
      <div className="flex items-center gap-4">
        <span
          className="pf-panel-title shrink-0 text-(--pf-brand)"
          aria-hidden
        >
          Pergunta {passo} de {total}
        </span>
        <span
          className="h-1 flex-1 overflow-hidden rounded-full bg-(--pf-line)"
          role="progressbar"
          aria-valuenow={passo}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={`Pergunta ${passo} de ${total}`}
        >
          <span
            className="block h-full rounded-full bg-(--pf-brand) transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {/* `.pf-title` é o "título de card de quiz" do §3.2: Archivo 900,
            22→28px fluidos, tracking −2,5%. O contraste com o corpo continua
            sendo de PESO antes de ser de tamanho. */}
        <h1 className="pf-title text-(--pf-ink)">
          {titulo}
        </h1>
        {/* §8.12b: a introdução da pergunta é leitura corrida — corpo em
            text-base e o cinza parando no -soft. */}
        <p className="pf-lead text-(--pf-ink-soft)">{texto}</p>
      </div>

      {children}

      {/* Anúncio único para leitor de tela. A marcação por campo já está lá em
          cima; aqui é só o aviso de que algo travou. */}
      {erro ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-sm bg-[#FEF2F2] p-4 pf-lead text-trend-negative"
        >
          <ExclamationCircleIcon className="mt-1 h-5 w-5 shrink-0" aria-hidden />
          {erro}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--pf-line) pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" icon={ArrowLeftIcon} onClick={onVoltar}>
            Voltar
          </Button>
          {acaoSecundaria ? (
            <button
              type="button"
              onClick={acaoSecundaria.onClick}
              className={cn(
                "inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-2 text-sm font-medium text-(--pf-ink-soft) sm:min-h-8",
                "transition-colors hover:text-(--pf-ink) hover:underline hover:underline-offset-[3px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
              )}
            >
              {acaoSecundaria.label}
            </button>
          ) : null}
        </div>
        <Button
          variant="primary"
          icon={ArrowRightIcon}
          iconPosition="right"
          onClick={onAvancar}
        >
          {rotuloAvancar}
        </Button>
      </div>
    </div>
  );
}

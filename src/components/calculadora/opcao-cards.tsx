"use client";

import { useRef } from "react";
import { PLANOS, DIAS_UTEIS_MES } from "@/lib/calculadora/constants";
import { formatNumero } from "@/lib/calculadora/format";
import type { PlanoId } from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { usePremissas } from "./premissas-context";

// Os dois formatos de escolha do quiz, num lugar só.
//
// Antes do quiz de oito perguntas existia UM radiogroup no produto (o caminho,
// dentro do `passo-form`), com o roving tabindex escrito à mão ali. A pergunta
// 8 trouxe mais três escolhas (cenário, prazo, plano) e a etapa 1 trouxe a
// quarta: copiar o `onKeyDown` cinco vezes era garantir que quatro delas
// ficassem para trás no próximo ajuste de acessibilidade.

export type Opcao<T extends string | number> = {
  id: T;
  label: string;
  descricao?: string;
  /** Linha extra à direita do rótulo — o "Recomendado" do cenário. */
  selo?: string;
};

/**
 * Radiogroup de verdade: UM tab stop para o grupo e setas para trocar a opção.
 * N botões tabbáveis passam a semântica ARIA mas não o comportamento — quem
 * navega por teclado atravessava quatro paradas para responder uma pergunta.
 */
export function GrupoOpcoes<T extends string | number>({
  nome,
  opcoes,
  valor,
  onChange,
  colunas = 1,
  invalido,
}: {
  nome: string;
  opcoes: Opcao<T>[];
  valor: T | null;
  onChange: (id: T) => void;
  colunas?: 1 | 2;
  invalido?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div
      role="radiogroup"
      aria-label={nome}
      aria-invalid={invalido ? true : undefined}
      className={cn("grid gap-2", colunas === 2 && "sm:grid-cols-2")}
      onKeyDown={(event) => {
        const teclas = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
        if (!teclas.includes(event.key)) return;
        event.preventDefault();
        const atual = valor === null ? -1 : opcoes.findIndex((o) => o.id === valor);
        const passo = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
        const indice = (atual + passo + opcoes.length) % opcoes.length;
        onChange(opcoes[indice].id);
        refs.current[indice]?.focus();
      }}
    >
      {opcoes.map((opcao, indice) => {
        const ativo = valor === opcao.id;
        // Sem nada escolhido o primeiro carrega o tab stop, senão o grupo
        // inteiro sai da ordem de foco.
        const focavel = valor === null ? indice === 0 : ativo;
        return (
          <button
            key={String(opcao.id)}
            ref={(node) => {
              refs.current[indice] = node;
            }}
            type="button"
            role="radio"
            aria-checked={ativo}
            tabIndex={focavel ? 0 : -1}
            onClick={() => onChange(opcao.id)}
            className={cn(
              "flex min-h-[44px] cursor-pointer flex-col gap-1 rounded-sm border px-4 py-3 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
              ativo
                ? "border-[1.5px] border-(--pf-brand) bg-(--pf-brand-tint) ring-2 ring-(--pf-brand)/15"
                : "border-[1.5px] border-(--pf-line-strong) bg-(--pf-surface-alt) hover:border-(--pf-brand) hover:bg-(--pf-brand-tint)/50",
            )}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "pf-label",
                  ativo ? "text-(--pf-brand-ink)" : "text-(--pf-ink)",
                )}
              >
                {opcao.label}
              </span>
              {opcao.selo ? (
                <span className="rounded-full border border-(--pf-line) px-2 py-0.5 text-xs font-medium text-(--pf-ink-soft)">
                  {opcao.selo}
                </span>
              ) : null}
            </span>
            {opcao.descricao ? (
              <span className="pf-hint text-(--pf-ink-soft)">
                {opcao.descricao}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

const PLANOS_IDS = Object.keys(PLANOS) as PlanoId[];

const DIAS_UTEIS_SEMANA = 5;

/** Nh/mês → minutos por dia útil e horas por semana útil. */
export function praticaDiariaSemanal(horasMes: number): {
  minutosDia: number;
  horasSemana: number;
} {
  if (horasMes <= 0) return { minutosDia: 0, horasSemana: 0 };
  const horasDia = horasMes / DIAS_UTEIS_MES;
  return {
    minutosDia: Math.round(horasDia * 60),
    horasSemana: horasDia * DIAS_UTEIS_SEMANA,
  };
}

/**
 * A cadência de treino, em três cards lado a lado. Formato próprio porque o
 * que decide aqui é o NÚMERO de horas, que precisa ser o maior elemento do
 * card — numa lista vertical ele viraria mais uma linha de descrição.
 */
export function GrupoPlanos({
  valor,
  onChange,
  unidade = "por vendedor / mês",
}: {
  valor: PlanoId;
  onChange: (plano: PlanoId) => void;
  unidade?: string;
}) {
  const p = usePremissas();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div
      role="radiogroup"
      aria-label="Cadência de treino"
      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
      onKeyDown={(event) => {
        const teclas = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
        if (!teclas.includes(event.key)) return;
        event.preventDefault();
        const atual = PLANOS_IDS.indexOf(valor);
        const passo = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
        const indice = (atual + passo + PLANOS_IDS.length) % PLANOS_IDS.length;
        onChange(PLANOS_IDS[indice]);
        refs.current[indice]?.focus();
      }}
    >
      {PLANOS_IDS.map((id, indice) => {
        const ativo = valor === id;
        const { minutosDia, horasSemana } = praticaDiariaSemanal(p.horasPlanos[id]);
        return (
          <button
            key={id}
            ref={(node) => {
              refs.current[indice] = node;
            }}
            type="button"
            role="radio"
            aria-checked={ativo}
            tabIndex={ativo ? 0 : -1}
            onClick={() => onChange(id)}
            className={cn(
              "flex min-h-[44px] cursor-pointer flex-col items-center gap-1 rounded-sm border px-4 py-4 text-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35",
              ativo
                ? "border-[1.5px] border-(--pf-brand) bg-(--pf-brand-tint) ring-2 ring-(--pf-brand)/15"
                : "border-[1.5px] border-(--pf-line-strong) bg-(--pf-surface-alt) hover:border-(--pf-brand) hover:bg-(--pf-brand-tint)/50",
            )}
          >
            <span
              className={cn(
                "pf-label",
                ativo ? "text-(--pf-brand-ink)" : "text-(--pf-ink)",
              )}
            >
              {PLANOS[id].label}
            </span>
            <span className="pf-num-kpi text-(--pf-ink)">
              {p.horasPlanos[id]}h
            </span>
            <span className="pf-hint text-(--pf-ink-soft)">{unidade}</span>
            {/* "8 h/mês" é a unidade do contrato, não a da agenda de ninguém:
                ninguém pratica em blocos mensais, e a pergunta que o card
                precisa responder é "isso cabe no meu dia?". As duas linhas são
                a MESMA hora noutra régua — não é conta de preço, é tradução de
                unidade, e é por isso que elas ficam mesmo com a mecânica de
                precificação fora da tela. */}
            <span className="pf-hint text-(--pf-ink-faint)">≈ {minutosDia} min/dia</span>
            <span className="pf-hint text-(--pf-ink-faint)">
              ≈ {formatNumero(horasSemana)}h/semana
            </span>
          </button>
        );
      })}
    </div>
  );
}

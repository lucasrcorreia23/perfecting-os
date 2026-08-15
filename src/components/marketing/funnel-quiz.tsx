"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  scoreSubmission,
  validateAnswers,
  type ScoreResult,
} from "@/lib/marketing-answers";
import type { FunnelQuestion, FunnelThresholds } from "@/lib/marketing-funnel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QualificacaoChip } from "@/components/ui/qualificacao-chip";

// Tudo que o quiz precisa para se comportar como o site: apresentação do funil
// + o schema escolhido na página (rascunho salvo ou versão publicada).
export type FunnelQuizData = {
  funnelId: string;
  name: string;
  description: string | null;
  submitLabel: string;
  successMessage: string;
  redirectUrl: string | null;
  questions: FunnelQuestion[];
  thresholds: FunnelThresholds;
  sourceLabel: string;
};

type RawAnswers = Record<string, string | number | string[]>;

// Inputs do quiz fogem de propósito do padrão de formulário do OS: aqui a
// experiência imita o site (uma pergunta por tela, campo grande, sem borda).
const QUIZ_INPUT = cn(
  "w-full border-0 bg-transparent py-2 text-2xl text-slate-900",
  "outline-none placeholder:text-slate-300",
);

// Experiência de quiz fim a fim: intro → uma pergunta por tela → resultado.
// Mesmo validateAnswers/scoreSubmission da API pública; nada é gravado.
export function FunnelQuiz({ quiz }: { quiz: FunnelQuizData }) {
  // -1 = tela de abertura; 0..n-1 = perguntas; resultado vive em `result`.
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<RawAnswers>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);

  const total = quiz.questions.length;
  const question = step >= 0 ? quiz.questions[step] : null;
  const isLast = step === total - 1;
  const progress = result ? 1 : step < 0 ? 0 : step / Math.max(1, total);

  function setAnswer(questionId: string, value: string | number | string[]) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setError(null);
  }

  function goTo(next: number) {
    setError(null);
    setStep(Math.max(-1, Math.min(total - 1, next)));
  }

  // Seleção em escolha única/escala já é válida por construção — avança
  // sozinha (com um respiro para o clique registrar), como num typeform.
  function selectAndAdvance(questionId: string, value: string | number) {
    setAnswer(questionId, value);
    if (isLast) return;
    const from = step;
    window.setTimeout(() => {
      setStep((current) => (current === from ? current + 1 : current));
    }, 200);
  }

  function advance() {
    if (!question) return;
    const single = validateAnswers([question], answers);
    if (!single.ok) {
      setError(single.error);
      return;
    }
    if (!isLast) {
      goTo(step + 1);
      return;
    }

    // Validação completa antes de pontuar: se algo escapou numa pergunta
    // anterior, o quiz volta direto para ela em vez de falhar em silêncio.
    const validated = validateAnswers(quiz.questions, answers);
    if (!validated.ok) {
      const index = quiz.questions.findIndex((item) => item.id === validated.field);
      if (index >= 0) setStep(index);
      setError(validated.error);
      return;
    }
    setResult(
      scoreSubmission({
        questions: quiz.questions,
        answers: validated.answers,
        thresholds: quiz.thresholds,
      }),
    );
  }

  function restart() {
    setAnswers({});
    setResult(null);
    setError(null);
    setStep(-1);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white">
      <div aria-hidden className="fixed inset-x-0 top-0 z-10 h-1 bg-slate-100">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <header className="flex items-center justify-between gap-4 px-4 pt-5 sm:px-8">
        <span className="text-xs text-slate-400">
          Simulação com {quiz.sourceLabel} — nada é gravado, nenhum lead é criado
        </span>
        <Link
          href={`/marketing/funis/${quiz.funnelId}`}
          aria-label="Sair do teste"
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400",
            "transition-colors hover:bg-slate-50 hover:text-slate-600",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
          )}
        >
          <XMarkIcon className="h-5 w-5" aria-hidden />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-8">
        <div className="w-full max-w-2xl">
          {total === 0 ? (
            <EmptyQuiz funnelId={quiz.funnelId} />
          ) : result ? (
            <QuizResult quiz={quiz} result={result} onRestart={restart} />
          ) : question ? (
            <QuizQuestion
              key={question.id}
              question={question}
              index={step}
              total={total}
              value={answers[question.id]}
              error={error}
              submitLabel={isLast ? quiz.submitLabel || "Enviar" : "OK"}
              onChange={(value) => setAnswer(question.id, value)}
              onSelectAndAdvance={(value) => selectAndAdvance(question.id, value)}
              onAdvance={advance}
            />
          ) : (
            <QuizIntro quiz={quiz} onStart={() => goTo(0)} />
          )}
        </div>
      </main>

      {question && !result ? (
        <footer className="flex items-center justify-end gap-2 px-4 pb-5 sm:px-8">
          <QuizNavButton
            label="Pergunta anterior"
            icon={ChevronUpIcon}
            onClick={() => goTo(step - 1)}
          />
          <QuizNavButton
            label="Próxima pergunta"
            icon={ChevronDownIcon}
            onClick={advance}
          />
        </footer>
      ) : null}
    </div>
  );
}

function QuizNavButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof ChevronUpIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-slate-400",
        "transition-colors hover:bg-slate-50 hover:text-slate-600",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

function QuizIntro({
  quiz,
  onStart,
}: {
  quiz: FunnelQuizData;
  onStart: () => void;
}) {
  return (
    <div className="fade-in-up flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          {quiz.name || "Funil sem nome"}
        </h1>
        {quiz.description ? (
          <p className="text-lg text-slate-600">{quiz.description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Button
          autoFocus
          variant="primary"
          onClick={onStart}
          className="h-12 px-7 text-base"
        >
          Começar
        </Button>
        <span className="hidden text-xs text-slate-400 sm:inline">
          ou pressione Enter ↵
        </span>
      </div>
    </div>
  );
}

function EmptyQuiz({ funnelId }: { funnelId: string }) {
  return (
    <div className="fade-in-up flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Este funil ainda não tem perguntas
      </h1>
      <p className="text-sm text-slate-500">
        Adicione perguntas no editor para conseguir testá-lo como lead.
      </p>
      <Link
        href={`/marketing/funis/${funnelId}`}
        className="text-sm font-medium text-primary hover:text-primary-link-hover hover:underline"
      >
        Voltar ao editor do funil
      </Link>
    </div>
  );
}

function QuizQuestion({
  question,
  index,
  total,
  value,
  error,
  submitLabel,
  onChange,
  onSelectAndAdvance,
  onAdvance,
}: {
  question: FunnelQuestion;
  index: number;
  total: number;
  value: string | number | string[] | undefined;
  error: string | null;
  submitLabel: string;
  onChange: (value: string | number | string[]) => void;
  onSelectAndAdvance: (value: string | number) => void;
  onAdvance: () => void;
}) {
  const inputId = `quiz-${question.id}`;
  const headingId = `quiz-heading-${question.id}`;
  const isChoice =
    question.type === "escolha_unica" ||
    question.type === "escolha_multipla" ||
    question.type === "escala";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onAdvance();
      }}
      className="fade-in-up flex flex-col gap-8"
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tabular-nums text-primary">
          Pergunta {index + 1} de {total}
        </span>
        {isChoice ? (
          <h1 id={headingId} className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            {question.label || "Pergunta sem enunciado"}
            {question.required ? <RequiredMark /> : null}
          </h1>
        ) : (
          <label
            htmlFor={inputId}
            className="text-2xl font-semibold text-slate-900 sm:text-3xl"
          >
            {question.label || "Pergunta sem enunciado"}
            {question.required ? <RequiredMark /> : null}
          </label>
        )}
        {question.help ? (
          <p className="text-base text-slate-500">{question.help}</p>
        ) : null}
      </div>

      <QuizField
        question={question}
        inputId={inputId}
        headingId={headingId}
        value={value}
        onChange={onChange}
        onSelectAndAdvance={onSelectAndAdvance}
        onAdvance={onAdvance}
      />

      {error ? (
        <p role="alert" className="text-sm text-trend-negative">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          icon={CheckIcon}
          className="h-12 px-7 text-base"
        >
          {submitLabel}
        </Button>
        <span className="hidden text-xs text-slate-400 sm:inline">
          ou pressione Enter ↵
        </span>
      </div>
    </form>
  );
}

function RequiredMark() {
  return (
    <span aria-hidden className="text-primary">
      {" "}
      *
    </span>
  );
}

function QuizField({
  question,
  inputId,
  headingId,
  value,
  onChange,
  onSelectAndAdvance,
  onAdvance,
}: {
  question: FunnelQuestion;
  inputId: string;
  headingId: string;
  value: string | number | string[] | undefined;
  onChange: (value: string | number | string[]) => void;
  onSelectAndAdvance: (value: string | number) => void;
  onAdvance: () => void;
}) {
  switch (question.type) {
    case "texto_curto":
    case "email":
    case "telefone":
    case "numero": {
      const modes = {
        texto_curto: { type: "text", inputMode: undefined },
        email: { type: "email", inputMode: "email" },
        telefone: { type: "tel", inputMode: "tel" },
        numero: { type: "text", inputMode: "decimal" },
      } as const;
      const mode = modes[question.type];
      return (
        <input
          id={inputId}
          autoFocus
          type={mode.type}
          inputMode={mode.inputMode}
          value={typeof value === "string" ? value : ""}
          placeholder={question.placeholder ?? "Digite sua resposta aqui…"}
          onChange={(event) => onChange(event.target.value)}
          className={QUIZ_INPUT}
        />
      );
    }

    case "texto_longo":
      return (
        <div className="flex flex-col gap-2">
          <textarea
            id={inputId}
            autoFocus
            value={typeof value === "string" ? value : ""}
            placeholder={question.placeholder ?? "Digite sua resposta aqui…"}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              // Enter avança (padrão de quiz); Shift+Enter quebra linha.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onAdvance();
              }
            }}
            className={cn(QUIZ_INPUT, "min-h-48 resize-none")}
          />
          <span className="text-xs text-slate-400">
            Shift ⇧ + Enter para quebrar linha
          </span>
        </div>
      );

    case "escolha_unica":
      return (
        <div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-1">
          {question.options.map((option) => {
            const checked = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onSelectAndAdvance(option.id)}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-sm px-4 py-3 text-left text-lg",
                  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  checked
                    ? "bg-primary/5 font-medium text-slate-900"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                {option.label}
                {checked ? (
                  <CheckIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      );

    case "escolha_multipla": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div aria-labelledby={headingId} className="flex flex-col gap-1">
          {question.options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() =>
                  onChange(
                    checked
                      ? selected.filter((id) => id !== option.id)
                      : [...selected, option.id],
                  )
                }
                className={cn(
                  "flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-sm px-4 py-3 text-left text-lg",
                  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  checked
                    ? "bg-primary/5 font-medium text-slate-900"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                {option.label}
                {checked ? (
                  <CheckIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      );
    }

    case "escala": {
      const scale = question.scale ?? {
        min: 1,
        max: 5,
        minLabel: null,
        maxLabel: null,
      };
      const steps = Array.from(
        { length: Math.max(0, scale.max - scale.min + 1) },
        (_, position) => scale.min + position,
      );
      return (
        <div className="flex flex-col gap-3">
          <div
            role="radiogroup"
            aria-labelledby={headingId}
            className="flex flex-wrap gap-2"
          >
            {steps.map((point) => {
              const checked = value === point;
              return (
                <button
                  key={point}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => onSelectAndAdvance(point)}
                  className={cn(
                    "flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-base font-medium tabular-nums",
                    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                    checked
                      ? "bg-primary text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                  )}
                >
                  {point}
                </button>
              );
            })}
          </div>
          {scale.minLabel || scale.maxLabel ? (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>{scale.minLabel}</span>
              <span>{scale.maxLabel}</span>
            </div>
          ) : null}
        </div>
      );
    }
  }
}

function QuizResult({
  quiz,
  result,
  onRestart,
}: {
  quiz: FunnelQuizData;
  result: ScoreResult;
  onRestart: () => void;
}) {
  return (
    <div className="fade-in-up flex flex-col gap-10">
      {/* O que o visitante veria após enviar */}
      <div className="flex flex-col gap-3">
        <CheckCircleIcon className="h-10 w-10 text-trend-positive" aria-hidden />
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          {quiz.successMessage}
        </h1>
        {quiz.redirectUrl ? (
          <p className="text-sm text-slate-500">
            Em seguida, o site levaria o visitante para{" "}
            <span className="break-all text-slate-700">{quiz.redirectUrl}</span>.
          </p>
        ) : null}
      </div>

      {/* Visão interna: o visitante nunca vê pontuação nem qualificação */}
      <div className="flex flex-col gap-4 border-t border-slate-100 pt-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Resultado da simulação
          </h2>
          <p className="text-xs text-slate-500">
            Visível só para você — o visitante não recebe pontuação nem
            qualificação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <QualificacaoChip qualificacao={result.qualificacao} />
          <span className="text-sm tabular-nums text-slate-600">
            {result.score}/{result.max} pontos · {result.pct}%
          </span>
          <span className="text-xs tabular-nums text-slate-500">
            Morno ≥ {quiz.thresholds.morno}% · Quente ≥ {quiz.thresholds.quente}%
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {result.breakdown.map((item) => (
            <div
              key={item.questionId}
              className="flex items-start justify-between gap-4 border-slate-100 [&:not(:first-child)]:border-t [&:not(:first-child)]:pt-3"
            >
              <span className="text-sm text-slate-700">{item.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-500">
                {item.max > 0 ? `${item.points}/${item.max}` : "não pontua"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" icon={ArrowPathIcon} onClick={onRestart}>
          Testar novamente
        </Button>
        <Link
          href={`/marketing/funis/${quiz.funnelId}`}
          className="text-sm font-medium text-primary hover:text-primary-link-hover hover:underline"
        >
          Voltar ao funil
        </Link>
      </div>
    </div>
  );
}

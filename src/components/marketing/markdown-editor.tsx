"use client";

import { useRef, useState } from "react";
import {
  BoldIcon,
  CodeBracketIcon,
  H1Icon,
  H2Icon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import { readingMinutes } from "@/lib/marketing-post";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/form";
import type { HeroIcon } from "@/components/ui/types";
import { MarkdownPreview } from "./markdown-preview";

export type WrapResult = { text: string; selStart: number; selEnd: number };

// Pura e exportada para o teste: envolver/desenvolver a seleção do textarea.
export function applyWrap(
  text: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string = prefix,
): WrapResult {
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);

  // Já está envolvido? Então o clique desfaz.
  if (before.endsWith(prefix) && after.startsWith(suffix)) {
    const undone =
      before.slice(0, before.length - prefix.length) +
      selected +
      after.slice(suffix.length);
    return {
      text: undone,
      selStart: start - prefix.length,
      selEnd: end - prefix.length,
    };
  }

  return {
    text: `${before}${prefix}${selected}${suffix}${after}`,
    selStart: start + prefix.length,
    selEnd: end + prefix.length,
  };
}

// Pura e exportada para o teste: prefixar cada linha da seleção.
export function applyLinePrefix(
  text: string,
  start: number,
  end: number,
  prefix: string,
): WrapResult {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = text.indexOf("\n", end);
  const stop = lineEnd === -1 ? text.length : lineEnd;
  const block = text.slice(lineStart, stop);
  const lines = block.split("\n");
  const allPrefixed = lines.every((line) => line.startsWith(prefix));

  const next = lines
    .map((line) => (allPrefixed ? line.slice(prefix.length) : `${prefix}${line}`))
    .join("\n");

  const delta = next.length - block.length;
  return {
    text: text.slice(0, lineStart) + next + text.slice(stop),
    selStart: lineStart,
    selEnd: stop + delta,
  };
}

type ToolbarAction = {
  label: string;
  icon: HeroIcon;
  apply: (text: string, start: number, end: number) => WrapResult;
};

const ACTIONS: ToolbarAction[] = [
  {
    label: "Título 1",
    icon: H1Icon,
    apply: (t, s, e) => applyLinePrefix(t, s, e, "# "),
  },
  {
    label: "Título 2",
    icon: H2Icon,
    apply: (t, s, e) => applyLinePrefix(t, s, e, "## "),
  },
  { label: "Negrito", icon: BoldIcon, apply: (t, s, e) => applyWrap(t, s, e, "**") },
  { label: "Itálico", icon: ItalicIcon, apply: (t, s, e) => applyWrap(t, s, e, "*") },
  {
    label: "Lista",
    icon: ListBulletIcon,
    apply: (t, s, e) => applyLinePrefix(t, s, e, "- "),
  },
  { label: "Código", icon: CodeBracketIcon, apply: (t, s, e) => applyWrap(t, s, e, "`") },
  {
    label: "Link",
    icon: LinkIcon,
    apply: (t, s, e) => applyWrap(t, s, e, "[", "](https://)"),
  },
];

export function MarkdownEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"escrever" | "visualizar">("escrever");

  function run(action: ToolbarAction) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const result = action.apply(value, textarea.selectionStart, textarea.selectionEnd);
    onChange(result.text);
    // Devolve o foco com a seleção no lugar certo depois do re-render.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selStart, result.selEnd);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                title={action.label}
                aria-label={action.label}
                disabled={disabled || mode === "visualizar"}
                onClick={() => run(action)}
                className={cn(
                  "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-slate-500 sm:h-9 sm:w-9",
                  "transition-colors hover:bg-slate-100/75 hover:text-slate-700",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  "disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label="Modo do editor"
          className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1"
        >
          {(["escrever", "visualizar"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => setMode(option)}
              className={cn(
                "min-h-[44px] cursor-pointer rounded-full px-4 text-sm font-medium transition-colors sm:min-h-9",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                mode === option
                  ? "bg-slate-100/80 text-primary"
                  : "text-slate-500 hover:bg-slate-100/60 hover:text-slate-800",
              )}
            >
              {option === "escrever" ? "Escrever" : "Visualizar"}
            </button>
          ))}
        </div>
      </div>

      {mode === "escrever" ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          spellCheck
          placeholder="Escreva em Markdown. O site do blog é quem renderiza o conteúdo final."
          className="min-h-96 font-mono text-[13px] leading-relaxed"
        />
      ) : (
        <div className="min-h-96 rounded-sm border border-slate-200 bg-white p-4">
          <MarkdownPreview source={value} />
        </div>
      )}

      <p className="text-xs text-slate-500">
        <span className="tabular-nums">{value.trim() ? value.trim().split(/\s+/).length : 0}</span>{" "}
        palavras · <span className="tabular-nums">{readingMinutes(value)}</span> min de
        leitura. Suportado: títulos, negrito, itálico, código, listas, citações,
        links, imagens e linhas. HTML bruto não é aceito.
      </p>
    </div>
  );
}

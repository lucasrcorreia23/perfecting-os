"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  BoldIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
  H2Icon,
  H3Icon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { MAX_COVER_SIZE_BYTES } from "@/lib/constants";
import { altFromFileName } from "@/lib/marketing-media";
import { IMAGE_ACCEPT, uploadPostBodyImage } from "@/lib/marketing-media-upload";
import { hasTitleHeading, readingMinutes } from "@/lib/marketing-post";
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

// Pura e exportada para o teste: insere a imagem como bloco próprio — o parser
// só reconhece `![alt](url)` sozinho na linha, então a inserção garante as
// quebras em volta. A seleção volta sobre o alt, para o autor digitar por cima.
export function insertImage(
  text: string,
  start: number,
  end: number,
  alt: string,
  url: string,
): WrapResult {
  // Espaço colado na inserção viraria indentação solta na linha do bloco.
  const before = text.slice(0, start).replace(/[ \t]+$/, "");
  const after = text.slice(end).replace(/^[ \t]+/, "");
  const gapBefore = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const gapAfter = after === "" || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const altStart = before.length + gapBefore.length + 2; // depois de "!["

  return {
    text: `${before}${gapBefore}![${alt}](${url})${gapAfter}${after}`,
    selStart: altStart,
    selEnd: altStart + alt.length,
  };
}

// Pura e exportada para o teste: rebaixa `#` para `##` sem tocar no que está
// dentro de cerca de código — lá `# algo` é comentário de shell, não título.
export function demoteTitleHeadings(text: string): string {
  let dentroDaCerca = false;
  return text
    .split("\n")
    .map((line) => {
      if (/^```/.test(line)) {
        dentroDaCerca = !dentroDaCerca;
        return line;
      }
      if (dentroDaCerca) return line;
      return line.replace(/^#(\s+)/, "##$1");
    })
    .join("\n");
}

const BOTAO = cn(
  "inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-slate-500 sm:h-9 sm:w-9",
  "transition-colors hover:bg-slate-100/75 hover:text-slate-700",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
  "disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-transparent",
);

function firstImage(files: FileList | null | undefined): File | undefined {
  if (!files) return undefined;
  return Array.from(files).find((file) => file.type.startsWith("image/"));
}

type ToolbarAction = {
  label: string;
  icon: HeroIcon;
  apply: (text: string, start: number, end: number) => WrapResult;
};

// A barra começa em `##` de propósito: o `#` é do título do post, que o site
// renderiza como o h1 da página. Ver o aviso de duplicidade mais abaixo.
const ACTIONS: ToolbarAction[] = [
  {
    label: "Título",
    icon: H2Icon,
    apply: (t, s, e) => applyLinePrefix(t, s, e, "## "),
  },
  {
    label: "Subtítulo",
    icon: H3Icon,
    apply: (t, s, e) => applyLinePrefix(t, s, e, "### "),
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
  postId,
  value,
  onChange,
  disabled = false,
}: {
  postId: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"escrever" | "visualizar">("escrever");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [enviando, startUpload] = useTransition();
  const duplicaH1 = useMemo(() => hasTitleHeading(value), [value]);

  function applyResult(result: WrapResult) {
    onChange(result.text);
    // Devolve o foco com a seleção no lugar certo depois do re-render.
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(result.selStart, result.selEnd);
    });
  }

  function run(action: ToolbarAction) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    applyResult(action.apply(value, textarea.selectionStart, textarea.selectionEnd));
  }

  // A seleção é capturada antes do upload: o await solta o foco do textarea.
  function sendImage(file: File | undefined) {
    if (!file || disabled) return;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    setError(null);
    startUpload(async () => {
      const result = await uploadPostBodyImage(postId, file);
      if (result.ok) {
        applyResult(insertImage(value, start, end, altFromFileName(file.name), result.url));
      } else {
        setError(result.error);
      }
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
                disabled={disabled || enviando || mode === "visualizar"}
                onClick={() => run(action)}
                className={BOTAO}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </button>
            );
          })}
          <button
            type="button"
            title="Imagem"
            aria-label="Imagem"
            disabled={disabled || enviando || mode === "visualizar"}
            onClick={() => fileRef.current?.click()}
            className={BOTAO}
          >
            <PhotoIcon className="h-5 w-5" aria-hidden />
          </button>
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
          // Durante o upload o texto não pode mudar (a inserção usa o valor
          // capturado antes do await), mas `disabled` tiraria o foco e a
          // seleção não voltaria para o alt. readOnly trava sem perder o cursor.
          readOnly={enviando}
          spellCheck
          onPaste={(event) => {
            const file = firstImage(event.clipboardData?.files);
            if (!file) return;
            event.preventDefault();
            sendImage(file);
          }}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            const file = firstImage(event.dataTransfer.files);
            setDragging(false);
            if (!file) return;
            event.preventDefault();
            sendImage(file);
          }}
          placeholder="Escreva em Markdown. O site do blog é quem renderiza o conteúdo final."
          className={cn(
            "min-h-96 font-mono text-[13px] leading-relaxed",
            dragging && "border-primary/50 bg-primary/[0.04]",
          )}
        />
      ) : (
        <div className="min-h-96 rounded-sm border border-slate-200 bg-white p-4">
          <MarkdownPreview source={value} />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          sendImage(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      {duplicaH1 ? (
        <div
          className="flex flex-col gap-2 rounded-sm p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ backgroundColor: "#FFFBEB", color: "#973C00" }}
        >
          <p className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              O corpo tem título de nível 1 (<code>#</code>). O site já usa o título
              do post como h1 da página — comece os títulos do corpo em{" "}
              <code>##</code>.
            </span>
          </p>
          <button
            type="button"
            disabled={disabled || enviando}
            onClick={() => onChange(demoteTitleHeadings(value))}
            className={cn(
              "min-h-[44px] shrink-0 cursor-pointer rounded-full px-3 font-medium underline underline-offset-2 sm:min-h-9",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              "disabled:cursor-not-allowed disabled:opacity-70",
            )}
          >
            Rebaixar para ##
          </button>
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        <span className="tabular-nums">{value.trim() ? value.trim().split(/\s+/).length : 0}</span>{" "}
        palavras · <span className="tabular-nums">{readingMinutes(value)}</span> min de
        leitura. Suportado: títulos, negrito, itálico, código, listas, citações,
        links, imagens e linhas. HTML bruto não é aceito.
      </p>
      <p className="text-xs text-slate-500">
        {enviando
          ? "Enviando imagem…"
          : `Para inserir uma imagem, use o botão, cole do clipboard ou arraste o arquivo para o texto (até ${MAX_COVER_SIZE_BYTES / 1024 / 1024} MB).`}
      </p>
    </div>
  );
}

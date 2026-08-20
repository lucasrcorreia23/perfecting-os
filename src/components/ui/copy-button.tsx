"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// Botão-ícone de copiar (modelo de mensagem da atividade): clipboard → check
// "Copiado" transitório (~2s). Anúncio via aria-live para leitores de tela.
export function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponível (permissão/contexto): não quebra a UI.
    }
  }

  const Icon = copied ? CheckIcon : ClipboardDocumentIcon;

  return (
    <button
      type="button"
      aria-label={label}
      title={copied ? "Copiado" : label}
      onClick={copy}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full",
        copied
          ? "text-trend-positive"
          : "text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        className,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span aria-live="polite" className="sr-only">
        {copied ? "Copiado" : ""}
      </span>
    </button>
  );
}

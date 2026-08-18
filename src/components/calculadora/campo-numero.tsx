"use client";

import { useState } from "react";
import type { CampoFormato } from "@/lib/calculadora/campos";
import { cn } from "@/lib/utils";

// Input numérico pt-BR do visitante. Vazio é null — NUNCA zero (P4/P6).
// Enquanto digita, mostramos o texto cru; no blur, reformatamos.

const AFIXOS: Record<CampoFormato, { prefixo?: string; sufixo?: string }> = {
  moeda: { prefixo: "R$" },
  numero: {},
  percentual: { sufixo: "%" },
  horas: { sufixo: "h" },
  dias: { sufixo: "dias" },
  meses: { sufixo: "meses" },
};

function parseNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/\./g, "").replace(",", ".");
  if (limpo === "") return null;
  const valor = Number(limpo);
  if (!Number.isFinite(valor) || valor < 0) return null;
  return valor;
}

function formatarDisplay(valor: number | null, formato: CampoFormato): string {
  if (valor === null) return "";
  const decimais = formato === "moeda" ? 0 : 2;
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: decimais });
}

export function CampoNumero({
  id,
  valor,
  formato,
  inteiro = false,
  placeholder,
  onChange,
  autoFocus = false,
  invalido = false,
  descritoPor,
}: {
  id: string;
  valor: number | null;
  formato: CampoFormato;
  inteiro?: boolean;
  placeholder?: string;
  onChange: (valor: number | null) => void;
  autoFocus?: boolean;
  invalido?: boolean;
  // Ids da ajuda e do erro, para o leitor de tela ler a explicação junto do
  // campo em vez de a pessoa ter de caçá-la.
  descritoPor?: string;
}) {
  const [texto, setTexto] = useState(() => formatarDisplay(valor, formato));
  const [focado, setFocado] = useState(false);

  // Sincroniza quando o valor muda por fora (edição pela sidebar/wizard do
  // mesmo campo) sem atropelar quem está digitando — padrão "adjust state
  // during render" do React, sem effect.
  const [valorAnterior, setValorAnterior] = useState(valor);
  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    if (!focado) setTexto(formatarDisplay(valor, formato));
  }

  const { prefixo, sufixo } = AFIXOS[formato];

  return (
    <div
      className={cn(
        "flex h-12 items-center gap-2 rounded-full border bg-white px-4 transition-colors",
        invalido
          ? "border-trend-negative/50"
          : "border-slate-200 focus-within:border-[#2E63CD]/40",
        // O anel é o indicador; a borda só acompanha. O `outline-none` do
        // `input` mata o foco nativo, então sem isto o campo era o único
        // controle da tela sem foco visível — e são 16 deles na sidebar.
        "focus-within:ring-2 focus-within:ring-primary/35",
      )}
    >
      {prefixo ? (
        <span className="shrink-0 text-sm text-slate-600">{prefixo}</span>
      ) : null}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        aria-invalid={invalido || undefined}
        aria-describedby={descritoPor && descritoPor !== "" ? descritoPor : undefined}
        placeholder={placeholder}
        value={texto}
        onFocus={() => setFocado(true)}
        onBlur={() => {
          setFocado(false);
          setTexto(formatarDisplay(valor, formato));
        }}
        onChange={(event) => {
          const cru = event.target.value;
          // Só dígitos, separadores e espaço — o resto nem entra no campo.
          if (!/^[\d.,\s]*$/.test(cru)) return;
          setTexto(cru);
          const parsed = parseNumero(cru);
          onChange(parsed === null ? null : inteiro ? Math.trunc(parsed) : parsed);
        }}
        className="w-full min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
      />
      {sufixo ? (
        <span className="shrink-0 text-sm text-slate-600">{sufixo}</span>
      ) : null}
    </div>
  );
}

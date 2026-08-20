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
    // O campo amarelo com texto azul é a assinatura da pele (§13): é a legenda
    // de cor da planilha que originou o produto — "fonte azul sobre fundo
    // amarelo = seu input". Numa tela que é toda leitura, o amarelo diz sem
    // precisar de rótulo o que a pessoa tem de preencher.
    //
    // FALLBACK OBRIGATÓRIO em cada token: este componente é [AMBOS]. O caminho
    // é `link-detail → quanto-custa → campo-numero`, ou seja o consultor edita
    // assentos e prazo neste mesmo campo, FORA da pele. Sem o fallback o
    // `var()` fica inválido no computed value e o campo perde o fundo lá.
    <div
      className={cn(
        "flex h-12 items-center gap-2 rounded-full px-4 transition-colors",
        // Borda de 1,5px e sombra INTERNA (§5.1 do DESIGN_SYSTEM): é o que faz
        // a célula parecer afundada em vez de só pintada de amarelo. Com 1px e
        // sem inset, o campo lia como um chip colorido — decoração, não um
        // lugar onde se digita. O inset entra com fallback transparente: fora
        // da pele o campo é branco e uma sombra interna ali seria sujeira.
        "border-[1.5px] bg-[var(--pf-input,#ffffff)]",
        "shadow-[inset_0_2px_0_var(--pf-input-inset,transparent)]",
        invalido
          ? "border-trend-negative/50"
          : "border-[var(--pf-input-border,#e2e8f0)] focus-within:border-[var(--pf-input-text,#2e63cd)]",
        // O anel é o indicador; a borda só acompanha. O `outline-none` do
        // `input` mata o foco nativo, então sem isto o campo era o único
        // controle da tela sem foco visível.
        "focus-within:ring-2 focus-within:ring-[var(--pf-brand,#2e63cd)]/35",
      )}
    >
      {prefixo ? (
        <span className="shrink-0 text-sm text-[var(--pf-ink-soft,#475569)]">
          {prefixo}
        </span>
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
        // Mono 700 no valor (§3.1: "números em mono são regra absoluta"). É a
        // mono que alinha dígito com dígito quando os campos viram coluna, e é
        // o peso 700 que faz o valor digitado pesar mais que qualquer rótulo em
        // volta — o campo editável é o único lugar da tela onde a pessoa manda.
        //
        // 16px e não 14: o valor que ela acabou de digitar não pode ser o texto
        // menor da linha em que vive.
        //
        // O placeholder é `--pf-ink-soft`, não o azul esmaecido: sobre o
        // amarelo, azul a 55% dá 2,69:1 — abaixo do piso, e era exatamente o
        // defeito que a passagem de polish de 18/08 corrigiu. Trocar o MATIZ
        // (e não baixar o contraste) é o que impede o placeholder de ser lido
        // como valor preenchido, que é o defeito pior. `font-normal` no
        // placeholder pela mesma razão: em 700 ele viraria valor.
        className="pf-mono w-full min-w-0 bg-transparent text-base font-bold text-[var(--pf-input-text,#0f172a)] outline-none placeholder:font-sans placeholder:font-normal placeholder:text-[var(--pf-ink-soft,#64748b)]"
      />
      {sufixo ? (
        <span className="shrink-0 text-sm text-[var(--pf-ink-soft,#475569)]">
          {sufixo}
        </span>
      ) : null}
    </div>
  );
}

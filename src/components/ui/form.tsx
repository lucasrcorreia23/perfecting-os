import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HintTooltip } from "@/components/ui/tooltip";

// Formulários: rótulo → input → ajuda → erro, nessa ordem.
//
// A ordem foi INVERTIDA em 20/08/2026 por decisão do decisor. A §8.10 dizia
// "nunca a descrição depois do campo", e a razão original era boa: quem lê a
// explicação antes de digitar erra menos. O que mudou foi o peso relativo das
// duas coisas na jornada da calculadora — com o rótulo em caixa alta e o campo
// em amarelo, rótulo e input viraram um par visual forte, e uma frase de duas
// ou três linhas ENTRE eles separava justamente o que a pessoa opera junto. A
// explicação continua ligada ao input por `aria-describedby`, então o leitor de
// tela a anuncia no foco, antes de digitar, independentemente da ordem no DOM.
//
// O rótulo usa `.pf-label`: fora da pele é o `text-sm font-medium` de sempre e
// nada no app interno muda; dentro dela vira o "label de campo" do §3.2 —
// 12px, peso 700, caixa alta, tracking +10%. A regra do decisor (20/08/2026) é
// que TUDO o que a pessoa precisa ler para preencher fica em caixa alta: numa
// tela em que o campo editável é amarelo e grita, o rótulo tinha de ter voz
// para ser encontrado antes dele, e sentence case em 14px não tinha.
//
// Duas formas de dizer a mesma coisa, e a escolha não é de gosto: `help` põe a
// explicação como linha visível sob o rótulo (o que o §8.10 pede) e `hint` a
// guarda num ícone. O ícone existe para formulário longo de tela estreita —
// e cobra um tab stop por campo, entre o rótulo e o input.
export function Field({
  label,
  help,
  hint,
  error,
  htmlFor,
  escala = "app",
  alinhado = false,
  children,
}: {
  label: string;
  help?: string;
  // Mesma explicação do `help`, mas guardada num ícone de info ao lado do
  // label — para formulários longos, onde uma linha de texto por campo
  // empurra tudo para baixo.
  hint?: string;
  error?: string;
  htmlFor?: string;
  // `leitura` sobe ajuda e erro um degrau (§8.12b): a jornada da calculadora
  // roda em `text-sm` com o cinza parando em slate-600, porque quem lê tem
  // tipicamente 45+ anos e abre o link uma vez para decidir. Nela o `text-xs`
  // fica reservado a selo e chip — usar o padrão do app aqui esconderia em
  // 12px justamente a frase que explica o campo.
  escala?: "app" | "leitura";
  // Em grade de duas ou três colunas, os campos precisam dividir as MESMAS
  // faixas: rótulo com rótulo, input com input, ajuda com ajuda. Com cada campo
  // montando a própria pilha, um rótulo que quebra em duas linhas empurra só o
  // seu input, e a linha inteira sai torta. `grid-rows-subgrid` faz o campo
  // herdar as faixas do pai em vez de inventar as suas; o pai declara
  // `grid-rows-[auto_auto_auto_auto]`.
  //
  // Com a ajuda EMBAIXO (20/08/2026) o subgrid ficou mais barato, não menos
  // necessário: a ajuda longa deixou de empurrar o próprio input para baixo,
  // mas o alinhamento superior continua dependendo de o rótulo ocupar uma faixa
  // compartilhada.
  alinhado?: boolean;
  children: ReactNode;
}) {
  const leitura = escala === "leitura";
  const labelEl = (
    // Os tokens da pele da calculadora entram com FALLBACK: dentro de
    // `.pf-calc` o rótulo acompanha o creme, e em todo o resto do app o
    // fallback devolve o mesmo slate de sempre. Sem isto, todo rótulo de campo
    // da jornada pública ficaria em cinza frio sobre fundo quente.
    <label htmlFor={htmlFor} className="pf-label text-[var(--pf-ink,#334155)]">
      {label}
    </label>
  );

  // `pf-hint` é o nível "hint/microcopy" do §3.2 (12px). Dentro da pele a
  // hierarquia do campo não depende mais do tamanho: o rótulo é caixa alta de
  // 12px e a ajuda é sentence case de 12px — são a CAIXA e o peso que separam
  // os dois, não dois pixels.
  const ajudaEl = help ? (
    <p
      id={htmlFor ? `${htmlFor}-ajuda` : undefined}
      className={cn(
        leitura
          ? "pf-hint text-[var(--pf-ink-soft,#475569)]"
          : "text-xs text-[var(--pf-ink-faint,#64748b)]",
      )}
    >
      {help}
    </p>
  ) : null;

  const erroEl = error ? (
    <p
      id={htmlFor ? `${htmlFor}-erro` : undefined}
      className={cn(
        "text-trend-negative",
        leitura ? "text-sm leading-6" : "text-xs",
      )}
    >
      {error}
    </p>
  ) : null;

  // A linha só vira `relative flex` quando há hint — o balão se ancora nela, e
  // os formulários sem hint ficam com o DOM de sempre.
  const cabecalhoEl = hint ? (
    <div className="relative flex items-center gap-1">
      {labelEl}
      <HintTooltip text={hint} />
    </div>
  ) : (
    labelEl
  );

  if (alinhado) {
    return (
      // Quatro faixas de subgrid na ordem nova: rótulo → input → ajuda → erro.
      // Continuam sendo subgrid porque é ele que dá o alinhamento superior: a
      // faixa 1 tem a altura do rótulo mais alto da LINHA, então todos os
      // inputs começam na mesma altura mesmo quando um rótulo quebra em duas.
      // O que a ordem nova resolve é o caso oposto — com a ajuda acima, uma
      // explicação de três linhas empurrava o próprio input para baixo e fazia
      // a faixa crescer para todos por causa de um campo só. Embaixo, a ajuda
      // cresce para o rodapé, onde não há o que desalinhar.
      <div className="row-span-4 grid grid-rows-subgrid gap-y-2">
        {cabecalhoEl}
        <div className="self-start">{children}</div>
        {/* Faixas vazias continuam ocupando a linha: é o que mantém a ajuda do
            vizinho na mesma altura quando um campo não tem ajuda nenhuma. */}
        {ajudaEl ?? <span aria-hidden />}
        {erroEl ?? <span aria-hidden />}
      </div>
    );
  }

  return (
    // Rótulo e input colados, ajuda e erro pendurados embaixo: o par que a
    // pessoa OPERA fica junto, e o que explica sai do caminho entre os dois.
    <div className="flex flex-col gap-2">
      {cabecalhoEl}
      {children}
      {ajudaEl}
      {erroEl}
    </div>
  );
}

// Seção de formulário: título xs em caixa normal; seções separadas por border-t.
export function FormSection({
  title,
  description,
  first = false,
  children,
}: {
  title: string;
  description?: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        !first && "border-t border-slate-100 pt-6",
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold text-slate-500">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const INPUT_CLASSES = cn(
  "w-full border border-slate-200 bg-white px-4 text-sm text-slate-900",
  "outline-none transition-colors placeholder:text-slate-400",
  "focus:border-primary/40",
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
);

// ComponentProps (e não InputHTMLAttributes) para aceitar `ref` — no React 19
// ela é uma prop comum e o editor de markdown precisa dela para manipular a
// seleção do textarea.
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(INPUT_CLASSES, "h-12 rounded-full", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(INPUT_CLASSES, "min-h-28 rounded-sm py-3", className)}
      {...props}
    />
  );
}

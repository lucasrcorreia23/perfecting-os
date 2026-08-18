import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HintTooltip } from "@/components/ui/tooltip";

// Formulários (§8.10): label → ajuda → input, nessa ordem.
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
  // faixas: rótulo com rótulo, ajuda com ajuda, input com input. Com cada
  // campo montando a própria pilha, uma ajuda de três linhas empurra só o seu
  // input, e a linha inteira sai torta — foi o que apareceu quando a ajuda
  // deixou de ser ícone e virou texto. `grid-rows-subgrid` faz o campo herdar
  // as faixas do pai em vez de inventar as suas; o pai declara
  // `grid-rows-[auto_auto_auto_auto]`.
  alinhado?: boolean;
  children: ReactNode;
}) {
  const leitura = escala === "leitura";
  const labelEl = (
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
      {label}
    </label>
  );

  if (alinhado) {
    return (
      <div className="row-span-4 grid grid-rows-subgrid gap-y-1.5">
        {hint ? (
          <div className="relative flex items-center gap-1.5">
            {labelEl}
            <HintTooltip text={hint} />
          </div>
        ) : (
          labelEl
        )}
        {/* Faixas vazias continuam ocupando a linha: é o que mantém o input
            do vizinho na mesma altura quando um campo não tem ajuda. */}
        {help ? (
          <p
            id={htmlFor ? `${htmlFor}-ajuda` : undefined}
            className={cn(
              leitura ? "text-sm leading-6 text-slate-600" : "text-xs text-slate-500",
            )}
          >
            {help}
          </p>
        ) : (
          <span aria-hidden />
        )}
        <div className="self-end">{children}</div>
        {error ? (
          <p
            id={htmlFor ? `${htmlFor}-erro` : undefined}
            className={cn("text-trend-negative", leitura ? "text-sm leading-6" : "text-xs")}
          >
            {error}
          </p>
        ) : (
          <span aria-hidden />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        {/* A linha só vira `relative flex` quando há hint — o balão se ancora
            nela, e os formulários sem hint ficam com o DOM de sempre. */}
        {hint ? (
          <div className="relative flex items-center gap-1.5">
            {labelEl}
            <HintTooltip text={hint} />
          </div>
        ) : (
          labelEl
        )}
        {help ? (
          <p
            id={htmlFor ? `${htmlFor}-ajuda` : undefined}
            className={cn(
              leitura ? "text-sm leading-6 text-slate-600" : "text-xs text-slate-500",
            )}
          >
            {help}
          </p>
        ) : null}
      </div>
      {children}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-erro` : undefined}
          className={cn(
            "text-trend-negative",
            leitura ? "text-sm leading-6" : "text-xs",
          )}
        >
          {error}
        </p>
      ) : null}
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
  "focus:border-[#2E63CD]/40",
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

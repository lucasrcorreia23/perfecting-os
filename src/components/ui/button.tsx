import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { HeroIcon } from "./types";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  icon?: HeroIcon;
  // Ícone à esquerda por padrão (ele qualifica a ação: excluir, adicionar,
  // voltar). À direita quando aponta para onde o clique leva — seta de avanço
  // em "Continuar →", "Ver detalhe →": à esquerda ela apontaria para fora do
  // rótulo, contra a direção da leitura.
  iconPosition?: "left" | "right";
  size?: "md" | "sm";
};

// Mesma casca, elemento diferente: quando a ação é NAVEGAR (baixar um arquivo,
// abrir outra página), o elemento tem de ser `<a>` — abrir em nova aba, copiar
// endereço e o anúncio de "link" do leitor de tela vêm do elemento, não do
// estilo. Um `<button>` com `window.open` perde os três.
type ButtonLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  variant?: keyof typeof VARIANTS;
  icon?: HeroIcon;
  iconPosition?: "left" | "right";
  size?: "md" | "sm";
  // Bloqueado vira `<button aria-disabled>`, não `<a>` sem href nem `<button
  // disabled>`. Sem href não há para onde navegar nem endereço a copiar; com
  // `aria-disabled` (e não o atributo `disabled`) o controle CONTINUA
  // focável, que é o que permite descobrir pelo teclado por que ele não
  // responde — um botão desabilitado de verdade some da ordem de foco e leva
  // a explicação junto.
  disabled?: boolean;
};

// Botões do guideline (§8.1): primary com gradiente + brilho no hover,
// secondary branco, tertiary estilo link, danger sólido.
const VARIANTS = {
  // As duas paradas do gradiente são tokens com fallback: fora da pele, o par
  // é o mesmo azul de sempre e nada no app interno muda; dentro de `.pf-calc`
  // ele vira preto (§13). Preto é o que a ação principal da jornada pede — numa
  // página onde o azul já marca link, seleção, fundo e foco, um CTA azul empata
  // com tudo o que é só navegação, e o "Avançar" é a única coisa a fazer ali.
  primary: cn(
    "bg-[linear-gradient(145deg,var(--pf-cta-from,#3d75dd),var(--pf-cta-to,#2e63cd))] text-white",
    "border border-white/20 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.18)]",
    "hover:[filter:brightness(1.07)_saturate(1.04)]",
    "disabled:bg-none disabled:bg-slate-400 disabled:hover:[filter:none]",
  ),
  // O `secondary` é branco cheio com fio slate, a única peça que denunciava
  // outra paleta dentro da pele. Com fallback, nada muda fora de `.pf-calc`.
  secondary: cn(
    "bg-[var(--pf-surface-alt,#ffffff)] text-[var(--pf-ink,#0f172a)] border border-[var(--pf-line,#e2e8f0)]",
    "hover:bg-[var(--pf-bar,#f8fafc)] hover:border-[var(--pf-ink-faint,#cbd5e1)]/40",
    "disabled:opacity-70 disabled:hover:bg-[var(--pf-surface-alt,#ffffff)] disabled:hover:border-[var(--pf-line,#e2e8f0)]",
  ),
  tertiary: cn(
    "text-primary bg-transparent border border-transparent",
    "hover:text-primary-link-hover",
    "disabled:opacity-70 disabled:hover:text-primary",
  ),
  danger: cn(
    "bg-red-600 text-white border border-transparent",
    "hover:bg-red-700",
    "disabled:bg-slate-400 disabled:hover:bg-slate-400",
  ),
} as const;

const BASE = cn(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium",
  "transition-[filter,background-color,border-color,color,opacity] duration-200 ease-out",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
  "disabled:cursor-not-allowed",
);

export function ButtonLink({
  href,
  variant = "secondary",
  icon: Icon,
  iconPosition = "left",
  size = "md",
  className,
  disabled = false,
  children,
  ...props
}: ButtonLinkProps) {
  const classes = cn(
    BASE,
    size === "md" ? "h-11 px-5 sm:h-10" : "h-11 px-4 sm:h-9",
    VARIANTS[variant],
    disabled && "cursor-not-allowed opacity-60 hover:bg-white hover:border-slate-200",
    className,
  );
  const conteudo = (
    <>
      {Icon && iconPosition === "left" ? (
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
      ) : null}
      {children}
      {Icon && iconPosition === "right" ? (
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
      ) : null}
    </>
  );

  if (disabled) {
    return (
      <button
        type="button"
        aria-disabled
        // Sem `onClick`: não há ação a impedir, e é o que mantém o controle
        // silencioso em vez de "clicável que não faz nada".
        className={classes}
        aria-label={props["aria-label"]}
      >
        {conteudo}
      </button>
    );
  }

  return (
    <a href={href} className={classes} {...props}>
      {conteudo}
    </a>
  );
}

export function Button({
  variant = "secondary",
  icon: Icon,
  iconPosition = "left",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        BASE,
        // Tap target ≥ 44px no mobile (§11)
        size === "md" ? "h-11 px-5 sm:h-10" : "h-11 px-4 sm:h-9",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {Icon && iconPosition === "left" ? (
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
      ) : null}
      {children}
      {Icon && iconPosition === "right" ? (
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
      ) : null}
    </button>
  );
}

import type { ReactNode } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// Espinha da etapa de resultados. Sem isso a tela é uma pilha de cards de peso
// idêntico: o olho não encontra onde a resposta termina e a explicação começa.
// A hierarquia vem de espaço e do eyebrow — nenhum estilo novo, nenhum token
// novo (§2 e §3 das diretrizes: título de seção é xs uppercase slate-500).
//
// Ritmo: gap-10 ENTRE seções, gap-4 dentro. É o contraste que cria o desenho.
export function SecaoResultado({
  id,
  titulo,
  descricao,
  acao,
  children,
}: {
  id?: string;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    // scroll-mt: as âncoras do hero param abaixo da barra de progresso fixa.
    <section id={id} className="flex scroll-mt-8 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {titulo}
          </h2>
          {descricao ? (
            <p className="text-xs leading-relaxed text-slate-400">{descricao}</p>
          ) : null}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

// Divulgação progressiva: o detalhe existe, mas não custa tela até ser pedido.
// Usada no extrato do preço e no resumo imprimível.
export function BlocoRecolhivel({
  id,
  titulo,
  aberto,
  onToggle,
  acao,
  children,
}: {
  id: string;
  titulo: string;
  aberto: boolean;
  onToggle: () => void;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={aberto}
          aria-controls={id}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full text-xs font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:min-h-0 sm:py-1"
        >
          <ChevronRightIcon
            className={cn("h-4 w-4 transition-transform", aberto && "rotate-90")}
            aria-hidden
          />
          {titulo}
        </button>
        {acao}
      </div>
      {/* Sempre montado: conteúdo desmontado (ou em display:none) não sai na
          impressão. Colapsa por grid-template-rows, que anima e some do fluxo
          sem sumir do documento. */}
      <div
        id={id}
        className="grid transition-[grid-template-rows] duration-200 ease-out print:!grid-rows-[1fr]"
        style={{ gridTemplateRows: aberto ? "1fr" : "0fr" }}
      >
        {/* inert enquanto fechado: some do foco e do leitor de tela sem sair
            do documento — a impressão continua enxergando. */}
        <div className="overflow-hidden" inert={!aberto}>
          {children}
        </div>
      </div>
    </div>
  );
}

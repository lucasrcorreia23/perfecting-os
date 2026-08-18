import type { ReactNode } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// Espinha da etapa de resultados. Sem isso a tela é uma pilha de cards de peso
// idêntico: o olho não encontra onde a resposta termina e a explicação começa.
//
// O título de seção é `text-lg` (§2 das diretrizes, "título de seção de página
// de leitura") — o mesmo degrau que as telas de Marketing já usam. Não é o
// `text-xs slate-500` de título de seção de FORMULÁRIO: naquela escala a seção
// de primeiro nível empatava com o botão do BlocoRecolhivel aqui embaixo e com
// sub-rótulos dentro dos cards, e três papéis na mesma classe é o que achatava
// a página. A regra é seção > card > sub-rótulo, sem empate.
//
// Ritmo: cada seção é um bloco branco próprio, e a pilha inteira anda com
// `gap-2` (8px) — blocos que quase se tocam, separados por um fio do fundo da
// página. O container único que veio antes (uma superfície com `divide-y` e
// `py-12` por faixa) resolvia o excesso de molduras, mas comprava 96px de vazio
// entre dois títulos: o respiro virava buraco, e a página pedia scroll para
// dizer a mesma coisa. Com 8px quem separa é a quebra de superfície, não a
// distância — e o padding de cada bloco volta ao degrau normal de card.
//
// `moldura`:
// - "painel" (padrão) — bloco branco com borda e padding próprios.
// - "solta"          — sem superfície, para o hero, que já é o próprio card.
//
// `ritmo`: o intervalo ENTRE os sub-blocos do corpo. "normal" (24px) serve a
// uma seção de um assunto só. "amplo" (40px) existe para a seção longa, onde
// quatro sub-tópicos empilhados no mesmo 24px que separa o título do primeiro
// deles davam a todos o mesmo peso — sem cadência, o olho não encontra onde um
// assunto acaba e o próximo começa. O corpo é um filho só do `section`, e não
// os sub-blocos soltos: cabeçalho e corpo são duas coisas, e é o corpo que tem
// ritmo próprio (o intervalo do título para o conteúdo continua em 24px,
// menor que o ar acima do título — cabeçalho respira mais em cima que embaixo).
//
// `divisor`: fio sob o cabeçalho. Opt-in, não padrão — só ganha fio a seção
// cujo conteúdo tem estrutura interna que o cabeçalho precisa encimar (o par
// Eficiência/Performance, que é uma grade de duas colunas). Numa seção de bloco
// único o fio não separa nada: seria decoração, e o guia reserva fio para
// quando ele significa alguma coisa.
export function SecaoResultado({
  id,
  titulo,
  descricao,
  acao,
  children,
  moldura = "painel",
  divisor = false,
  ritmo = "normal",
}: {
  id?: string;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
  moldura?: "painel" | "solta";
  divisor?: boolean;
  ritmo?: "normal" | "amplo";
}) {
  return (
    // scroll-mt: as âncoras do hero param abaixo da barra de progresso fixa.
    <section
      id={id}
      className={cn(
        "flex scroll-mt-8 flex-col gap-6",
        moldura === "painel" &&
          "rounded-md border border-slate-200 bg-white p-6 sm:p-8",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1",
          divisor && "border-b border-slate-100 pb-6",
        )}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
          {descricao ? (
            <p className="text-base leading-7 text-slate-600">{descricao}</p>
          ) : null}
        </div>
        {acao}
      </div>
      <div
        className={cn(
          "flex flex-col",
          ritmo === "amplo" ? "gap-10" : "gap-6",
        )}
      >
        {children}
      </div>
    </section>
  );
}

// Divulgação progressiva: o detalhe existe, mas não custa tela até ser pedido.
// Usada no extrato do preço (`quanto-custa.tsx`) e no detalhe do resumo
// imprimível (`resumo-verificavel.tsx`). O gatilho fica em `text-xs slate-500`
// de propósito: é o degrau mais baixo da hierarquia, dois níveis abaixo do
// título da seção que o contém.
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
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:min-h-0 sm:py-1"
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

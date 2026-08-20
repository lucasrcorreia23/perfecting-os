import type { ReactNode } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// Espinha da etapa de resultados. Sem isso a tela é uma pilha de cards de peso
// idêntico: o olho não encontra onde a resposta termina e a explicação começa.
//
// O título de seção é `.pf-panel-title` — o "título de painel" do §3.2 do
// DESIGN_SYSTEM: 13px, peso 800, caixa alta, tracking +12%. Ele ENCOLHE em
// relação ao `text-lg` que veio antes, e fica menor que a descrição de 16px
// logo abaixo. É de propósito: a hierarquia que faltava não era de tamanho, era
// de PAPEL. Título em 18px contra descrição em 16px são dois parágrafos com 2px
// de diferença, e o olho não separa os dois; uma etiqueta em caixa alta
// espaçada não é lida como frase nenhuma — ela encima o parágrafo em vez de
// disputar a leitura com ele.
//
// A regra continua sendo seção > card > sub-rótulo, sem empate: o gatilho do
// `BlocoRecolhivel` aqui embaixo é sentence case em `text-sm`, e agora nem a
// caixa nem o tracking o deixam ser confundido com o cabeçalho da seção.
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
  // Opcional desde 20/08/2026: num `GrupoRelatorio` de card único o capítulo
  // logo acima já nomeia o assunto, e repetir o nome dentro da moldura daria
  // dois títulos para um conteúdo só. Sem título, o cabeçalho não nasce.
  titulo?: string;
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
        // Fallback em todo token: `BlocoRecolhivel` (mesmo arquivo) roda também
        // em `link-detail`, e a moldura daqui veste cinco blocos de uma vez.
        moldura === "painel" &&
          "rounded-md border border-[var(--pf-line,#e2e8f0)] bg-[var(--pf-surface,#ffffff)] p-6 sm:p-8",
      )}
    >
      {titulo || descricao || acao ? (
        <div
          className={cn(
            "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1",
            // Fio interno, o degrau que fecha conta — não o mesmo da moldura.
            divisor && "border-b border-[var(--pf-line-soft,#f1f5f9)] pb-6",
          )}
        >
          {/* gap-2 e não gap-1: a etiqueta em caixa alta precisa de mais ar sob
              ela do que um título em sentence case — o tracking de +12% empurra a
              palavra para a direita e a linha de baixo colava. */}
          <div className="flex flex-col gap-2">
            {/* Só renderiza aqui — `link-detail` monta o próprio cabeçalho e não
                usa `SecaoResultado`, só o `BlocoRecolhivel` abaixo. A classe tem
                regra base fora da pele mesmo assim: componente compartilhado não
                pode depender de estar dentro dela para ter tipografia. */}
            {titulo ? (
              <h2 className="pf-panel-title text-[var(--pf-ink,#0f172a)]">
                {titulo}
              </h2>
          ) : null}
          {descricao ? (
            <p className="pf-lead text-[var(--pf-ink-soft,#475569)]">
              {descricao}
            </p>
          ) : null}
        </div>
        {acao}
      </div>
      ) : null}
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
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full text-sm font-semibold text-[var(--pf-ink-soft,#475569)] transition-colors hover:text-[var(--pf-ink,#0f172a)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-brand,#2e63cd)]/35 sm:min-h-0 sm:py-1"
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

// ---------------------------------------------------------------------------
// O CAPÍTULO do relatório — o degrau que faltava acima do painel.
//
// Antes desta passagem (20/08/2026) a etapa 03 era uma pilha de dez blocos de
// peso idêntico: o `h2` da `SecaoResultado`, os `h3` de sub-bloco, o
// `CabecalhoParcela` e os títulos do COI eram TODOS `.pf-panel-title` — 13px,
// caixa alta, distinguidos só pela tinta. Sem degrau, uma rolagem de dez blocos
// não tem sumário: o olho não encontra onde um assunto acaba.
//
// O grupo não é uma superfície. Ele é um título sobre o canvas, e os cards
// abaixo dele é que têm moldura. É essa ausência que faz a hierarquia funcionar
// — uma moldura em volta de outras molduras daria aninhamento, não capítulo, e
// o §5 das diretrizes já diz que conteúdo não é dono da própria superfície.
//
// `titulo` é ReactNode e não string porque a ênfase de uma palavra mora no
// chamador: `<>De onde vem o <em className="not-italic
// text-(--pf-brand-ink)">número</em></>`. Uma prop `destaque: string` obrigaria
// a inventar uma regra de qual palavra pintar.
//
// Fallback em todo token, apesar de só a jornada renderizar grupos hoje: o
// teste da §13 avalia o ARQUIVO, e `BlocoRecolhivel` (mesmo arquivo) roda em
// `link-detail`. A regra é boa mesmo assim — se um dia a tela interna quiser
// capítulos, eles já nascem com a tipografia certa fora da pele.
export function GrupoRelatorio({
  id,
  titulo,
  descricao,
  acao,
  children,
}: {
  id?: string;
  titulo: ReactNode;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-8 flex-col gap-4">
      {/* px-1: o título mora fora da moldura, e sem esse fio de recuo ele
          encostaria na borda do viewport no mobile enquanto os cards abaixo
          têm p-6. Meio-passo é proibido em espaçamento (§3), mas isto é
          alinhamento óptico de texto contra caixa, não ritmo. */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-1 sm:px-2">
        <div className="flex flex-col gap-2">
          <h2 className="pf-display text-[var(--pf-ink,#0f172a)]">{titulo}</h2>
          {descricao ? (
            <p className="pf-lead text-[var(--pf-ink-soft,#475569)]">
              {descricao}
            </p>
          ) : null}
        </div>
        {acao}
      </div>
      {/* gap-2 (8px): a mesma cadência da pilha inteira — blocos que quase se
          tocam, separados pela quebra de superfície e não pela distância. */}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

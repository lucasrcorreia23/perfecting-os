"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { textoAcessivel, type ExplicacaoValor } from "@/lib/calculadora/explicacoes";
import { termo as termoDoGlossario } from "@/lib/calculadora/glossario";
import { cn } from "@/lib/utils";
import { usePremissas } from "./premissas-context";

// O gatilho de "de onde saiu este número", e o balão que ele abre.
//
// São DEZ na etapa inteira, e a lista de quais está em `explicacoes.ts` — não
// aqui. Este arquivo só sabe desenhar e posicionar.
//
// POR QUE NÃO É O `HintTooltip` DE `ui/tooltip.tsx`. Aquele carrega uma frase
// e se resolve em CSS puro (`peer-hover` / `peer-focus`), o que serve bem a
// uma linha de ajuda ao lado de um rótulo de campo. Aqui o conteúdo é uma
// conta de até quatro linhas mais uma nota, e duas coisas quebram nesse
// tamanho: um balão absoluto vive dentro do `overflow` do ancestral (e a etapa
// 03 tem `rolagem-esvanecida-x` em três gráficos, cards colados na borda do
// viewport e uma barra fixa no topo), e um painel que abre à passagem do mouse
// cobre a linha seguinte enquanto a pessoa lê. Daí o portal e o clique.
//
// O QUE A PRIMEIRA VERSÃO ERROU, e o que este arquivo faz por causa disso:
// ela media a posição e confiava que o balão caberia. Não cabia. Com conteúdo
// alto e o gatilho na metade de baixo da tela, `position: fixed` põe o rodapé
// do balão abaixo da dobra — e, sendo fixo, ele NÃO rola para dentro: o final
// da conta ficava inalcançável. Hoje há três travas, e as três precisam
// existir: o conteúdo encurtou (`explicacoes.ts`), `medir` PRENDE o topo à
// janela em vez de só escolher acima/abaixo, e o balão leva `max-height` com
// rolagem própria como último recurso.
//
// ACESSIBILIDADE — o contrato é o do `HintTooltip`, e de propósito: o balão é
// `aria-hidden` e o texto inteiro vai ao `aria-label` do gatilho, achatado por
// `textoAcessivel` a partir da mesma estrutura que a tela desenha. Expor o
// painel portado o deslocaria no fluxo de leitura (ele é irmão do `body`, não
// vizinho do número). `aria-expanded` conta o estado; Escape fecha e devolve o
// foco ao gatilho.
//
// FALLBACK EM TODO TOKEN: `link-detail` (tela interna) renderiza
// `resultado-time` fora da pele, e este componente entra no fecho transitivo
// dele — `design-tokens.test.ts` deriva isso sozinho e cobra.

const LARGURA = 300;
const MARGEM = 12;
const ESPACO = 8;

// A tinta do GATILHO, e só dele — o balão é sempre claro, porque é uma
// superfície nova sobre a página, não um pedaço do painel de onde saiu.
// Dois tons porque o relatório tem dois fundos: o claro de sempre e o
// `--pf-invert` do card de investimento na capa. Em `--pf-ink-faint` sobre o
// escuro o ícone desapareceria, e ícone que não se vê é o mesmo que não haver.
const TOM_GATILHO = {
  padrao: {
    repouso: "text-[var(--pf-ink-faint,#94a3b8)] hover:text-[var(--pf-ink-soft,#475569)]",
    aberto: "text-[var(--pf-brand,#2e63cd)]",
    foco: "focus-visible:ring-[var(--pf-brand,#2e63cd)]/35",
  },
  invertido: {
    repouso: "text-[var(--pf-invert-soft,#94a3b8)] hover:text-[var(--pf-invert-ink,#f8fafc)]",
    aberto: "text-[var(--pf-invert-ink,#f8fafc)]",
    foco: "focus-visible:ring-[var(--pf-invert-ink,#f8fafc)]/50",
  },
} as const;

export type Posicao = { top: number; left: number; maxAltura: number };

/**
 * Onde o balão assenta. Função PURA, e é por isso que ela recebe o retângulo do
 * gatilho e o tamanho da janela em vez de ir buscá-los — `explicacao-info.test.ts`
 * a exercita com viewports que não existem nesta máquina, inclusive os dois em
 * que a primeira versão falhou.
 *
 * O QUE ELA CONSERTA. A versão de 22/08/2026 escolhia entre "acima" e "abaixo"
 * e parava aí. Quando nenhum dos dois cabia — gatilho na metade de baixo, janela
 * curta —, o balão ficava abaixo e o rodapé dele saía pela dobra; sendo
 * `position: fixed`, ele não rola para dentro, então o fim da conta era
 * simplesmente inalcançável. As duas linhas que faltavam são o `clamp` do topo
 * e o `maxAltura` devolvido, que vira `max-height` com rolagem própria.
 */
export function posicionarBalao(args: {
  gatilho: { top: number; bottom: number; left: number; width: number };
  altura: number;
  janela: { largura: number; altura: number };
}): Posicao {
  const { gatilho: r, altura, janela } = args;

  const largura = Math.min(LARGURA, janela.largura - MARGEM * 2);
  const espacoAbaixo = janela.altura - r.bottom - ESPACO - MARGEM;
  const espacoAcima = r.top - ESPACO - MARGEM;
  // Abre para baixo por padrão; sobe só quando não cabe embaixo E cabe melhor
  // em cima. Nunca "sobe porque sobrou pouco": virar o balão para o lado errado
  // desloca a leitura sem ganhar nada.
  const acima = altura > espacoAbaixo && espacoAcima > espacoAbaixo;

  const topoBruto = acima ? r.top - ESPACO - altura : r.bottom + ESPACO;
  return {
    // PRENDE à janela — é esta linha que faltava.
    top: Math.max(MARGEM, Math.min(topoBruto, janela.altura - altura - MARGEM)),
    // Centrado no gatilho e preso ao viewport: alinhar pela esquerda jogaria o
    // balão para fora em todo ícone da metade direita da tela.
    left: Math.max(
      MARGEM,
      Math.min(r.left + r.width / 2 - largura / 2, janela.largura - largura - MARGEM),
    ),
    // O teto de altura é o maior dos dois espaços, com um piso: numa janela em
    // que nem 160px cabem, é melhor o balão rolar por dentro do que encolher a
    // ponto de não caber uma linha.
    maxAltura: Math.max(espacoAbaixo, espacoAcima, 160),
  };
}

function medir(gatilho: HTMLElement, altura: number): Posicao {
  const r = gatilho.getBoundingClientRect();
  return posicionarBalao({
    gatilho: { top: r.top, bottom: r.bottom, left: r.left, width: r.width },
    altura,
    // `clientWidth`/`clientHeight` do documento, não `innerWidth`/`innerHeight`:
    // estes contam a barra de rolagem, e o balão encostaria por baixo dela.
    janela: {
      largura: document.documentElement.clientWidth,
      altura: document.documentElement.clientHeight,
    },
  });
}

export function ExplicacaoInfo({
  explicacao,
  tom = "padrao",
  className,
}: {
  explicacao: ExplicacaoValor;
  /** O fundo sobre o qual o gatilho vive — ver `TOM_GATILHO`. */
  tom?: keyof typeof TOM_GATILHO;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const balaoRef = useRef<HTMLDivElement>(null);

  const reposicionar = useCallback(() => {
    const gatilho = gatilhoRef.current;
    if (!gatilho) return;
    setPosicao(medir(gatilho, balaoRef.current?.offsetHeight ?? 0));
  }, []);

  // Layout effect: a primeira medida acontece ANTES da pintura, com a altura
  // real do balão já montado. Num `useEffect` ele apareceria um quadro no
  // lugar errado e pularia para o certo.
  useLayoutEffect(() => {
    if (!aberto) return;
    reposicionar();
  }, [aberto, reposicionar]);

  useEffect(() => {
    if (!aberto) return;

    function onKeyDown(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      setAberto(false);
      gatilhoRef.current?.focus();
    }
    function onPointerDown(evento: PointerEvent) {
      const alvo = evento.target as Node;
      if (gatilhoRef.current?.contains(alvo) || balaoRef.current?.contains(alvo)) return;
      // Sem devolver o foco: quem clicou fora está indo para outro lugar, e
      // puxar o foco de volta ao ícone desfaria o movimento.
      setAberto(false);
    }
    // `capture` na rolagem: ela quase sempre acontece num ancestral com
    // overflow, e um listener no window sem captura não a veria.
    window.addEventListener("scroll", reposicionar, true);
    window.addEventListener("resize", reposicionar);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", reposicionar, true);
      window.removeEventListener("resize", reposicionar);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [aberto, reposicionar]);

  const p = usePremissas();
  const termo = explicacao.termo ? termoDoGlossario(explicacao.termo, p) : undefined;

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        aria-label={textoAcessivel(explicacao)}
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
        className={cn(
          // 24px de RASTRO — o mesmo do `HintTooltip`, para o ícone ocupar o
          // lugar que já ocupava onde substituiu um — e 44px de ALVO, pelo
          // pseudo-elemento. Os dois números são o §11 e o §3 das diretrizes
          // sem escolher entre eles. O `-inset-2.5` só cobre texto estático em
          // volta, nunca outro controle.
          "relative -my-1 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full align-middle",
          "before:absolute before:-inset-2.5 before:content-['']",
          "transition-colors focus-visible:outline-none focus-visible:ring-2",
          TOM_GATILHO[tom].foco,
          // UMA classe de cor, escolhida antes de entrar no `cn`: ele é clsx
          // puro, sem tailwind-merge, então duas `text-*` empilhadas não se
          // resolvem por ordem de argumento.
          aberto ? TOM_GATILHO[tom].aberto : TOM_GATILHO[tom].repouso,
          className,
        )}
      >
        <InformationCircleIcon className="h-4 w-4" aria-hidden />
      </button>

      {aberto && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={balaoRef}
              aria-hidden
              style={{
                top: posicao?.top ?? 0,
                left: posicao?.left ?? 0,
                width: LARGURA,
                maxWidth: `calc(100vw - ${MARGEM * 2}px)`,
                // Último recurso, e ele quase nunca é acionado: com a conta em
                // quatro linhas o balão cabe em qualquer janela real. Existe
                // para a janela curta de verdade (um laptop com a barra de
                // favoritos, o teclado aberto no celular), onde é melhor rolar
                // o balão do que perder o fim da conta.
                maxHeight: posicao?.maxAltura,
                // Invisível até a primeira medida: sem isto o balão pisca no
                // canto superior esquerdo antes de assentar.
                visibility: posicao ? "visible" : "hidden",
              }}
              className={cn(
                "rolagem-limpa fixed z-(--z-tooltip) flex flex-col gap-2.5 overflow-y-auto rounded-md border p-4",
                "border-[var(--pf-line,#e2e8f0)] bg-[var(--pf-surface-alt,#ffffff)]",
                "shadow-[var(--shadow-lg)]",
              )}
            >
              <p className="text-sm font-semibold leading-5 text-[var(--pf-ink,#0f172a)]">
                {explicacao.titulo}
              </p>

              {/* A conta. `tabular-nums` e NÃO a mono da pele: o balão é
                  portado para o `body`, então `.pf-calc .pf-num` não o alcança
                  (ele é irmão do wrapper, não descendente) e a classe não
                  faria nada nem na jornada. A última linha — a que começa com
                  "=" — é a resposta, e é a única em tinta cheia. */}
              <ol className="flex flex-col gap-1">
                {explicacao.conta.map((linha, index) => (
                  <li
                    key={index}
                    className={cn(
                      "text-[13px] leading-5 tabular-nums",
                      linha.startsWith("=")
                        ? "font-semibold text-[var(--pf-ink,#0f172a)]"
                        : "text-[var(--pf-ink-soft,#475569)]",
                    )}
                  >
                    {linha}
                  </li>
                ))}
              </ol>

              {explicacao.nota ? (
                <p className="border-t border-[var(--pf-line-soft,#f1f5f9)] pt-2.5 text-[13px] leading-5 text-[var(--pf-ink-soft,#475569)]">
                  {explicacao.nota}
                </p>
              ) : null}

              {termo ? (
                <p className="text-[13px] leading-5 text-[var(--pf-ink-faint,#64748b)]">
                  <span className="font-semibold text-[var(--pf-ink-soft,#475569)]">
                    {termo.termo}:
                  </span>{" "}
                  {termo.definicao}
                </p>
              ) : null}

              {explicacao.fonte ? (
                <p className="text-[11px] leading-4 text-[var(--pf-ink-faint,#64748b)]">
                  {explicacao.fonte}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

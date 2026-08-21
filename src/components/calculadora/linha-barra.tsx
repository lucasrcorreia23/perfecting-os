import type { ReactNode } from "react";
import type { ExplicacaoValor } from "@/lib/calculadora/explicacoes";
import { cn } from "@/lib/utils";
import { ExplicacaoInfo } from "./explicacao-info";

// A linha de barra INLINE — rótulo, barra e valor na mesma faixa.
//
// Substitui o desenho empilhado que estava copiado em três lugares
// (`InvestimentoVsRetorno`, `DecomposicaoValor` e as cinco dimensões do
// `CustoInacao`): rótulo e valor numa linha, legenda noutra, barra full-width
// numa terceira. Três linhas por item tinham dois defeitos — cinco parcelas
// viravam quinze linhas de altura, e os valores nunca formavam coluna, então
// comparar duas parcelas exigia procurar cada número no seu próprio parágrafo.
//
// Grade de TRÊS trilhas no desktop e empilhada no mobile: uma barra inline não
// cabe em 360px com um rótulo de três palavras, e espremê-la daria um traço de
// 40px que não mede nada. O breakpoint é `sm:` de viewport mesmo — ao contrário
// do par Eficiência/Performance, esta lista ocupa a largura do card inteiro em
// todos os chamadores, então não há container a consultar.
//
// O separador é TRACEJADO, e isso não fere o "fio = fecha conta" das
// diretrizes: o fio SÓLIDO continua exclusivo do subtotal, e o tracejado é
// régua de lista — a distinção que o §4 do DESIGN_SYSTEM já declara
// ("divisórias tracejadas dentro de listas de alavancas; sólidas e fortes para
// totais").
//
// Fallback em todo token: este arquivo entra no fecho transitivo de
// `link-detail` por `graficos-resultado`, e `design-tokens.test.ts` deriva a
// lista de compartilhados sozinho — hex fora da allowlist reprova.

const TRILHO: Record<Tom, string> = {
  positivo: "bg-trend-positive",
  negativo: "bg-trend-negative",
  // Custo e preço são slate: não são "ruins", são a outra metade da fração (§1).
  neutro: "bg-[var(--pf-ink-faint,#64748b)]",
};

const VALOR: Record<Tom, string> = {
  positivo: "text-trend-positive",
  negativo: "text-trend-negative",
  neutro: "text-[var(--pf-ink-soft,#475569)]",
};

export type Tom = "positivo" | "negativo" | "neutro";

export function LinhaBarra({
  rotulo,
  nota,
  valor,
  pct,
  explicacao,
  tom = "positivo",
}: {
  rotulo: string;
  nota?: string;
  valor: string;
  /** 0–100, proporcional à maior parcela da lista. */
  pct: number;
  /**
   * "De onde saiu este número", ao lado do RÓTULO — nunca do valor: a coluna
   * da direita existe para ser lida de cima a baixo, e um ícone no meio dela
   * desfaz a coluna. Quem passa a explicação decide QUANDO ela existe: no
   * custo da inação, só nas linhas que têm valor.
   */
  explicacao?: ExplicacaoValor;
  tom?: Tom;
}) {
  return (
    <li className="grid grid-cols-1 items-center gap-x-5 gap-y-2 border-t border-dashed border-[var(--pf-line,#e2e8f0)] py-3 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[minmax(9rem,1.1fr)_minmax(0,2fr)_auto]">
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--pf-ink,#0f172a)]">
          {rotulo}
          {explicacao ? <ExplicacaoInfo explicacao={explicacao} /> : null}
        </span>
        {nota ? (
          <span className="text-xs leading-5 text-[var(--pf-ink-faint,#64748b)]">
            {nota}
          </span>
        ) : null}
      </div>
      {/* A ordem do DOM já é a de leitura empilhada (rótulo → barra → valor),
          então `grid-cols-1` no mobile não precisa de `order` nenhum: o valor
          fecha o item, que é onde o olho o procura depois de ver o tamanho. */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--pf-bar,#f1f5f9)]">
        <div
          className={cn("h-full rounded-full", TRILHO[tom])}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums sm:text-right",
          VALOR[tom],
        )}
      >
        {valor}
      </span>
    </li>
  );
}

/** A lista que segura as `LinhaBarra` — existe para o `<ul>` não se repetir. */
export function ListaBarras({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col">{children}</ul>;
}

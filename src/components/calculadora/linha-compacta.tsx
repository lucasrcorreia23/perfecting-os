import type { ReactNode } from "react";
import type { ExplicacaoValor } from "@/lib/calculadora/explicacoes";
import { cn } from "@/lib/utils";
import { ExplicacaoInfo } from "./explicacao-info";

// Linha de leitura tabular: rótulo, quanto muda, quanto vale. Num arquivo
// próprio porque três blocos a usam (EficienciaCard/PerformanceCard, o Custo
// da Inação, a comparação de cenários) e dois deles — `resultado-time.tsx` e
// `graficos-resultado.tsx` — não podem se importar um ao outro sem ciclo.
//
// Grade de duas trilhas, não `flex-wrap` + `justify-between`. Com flex, um
// rótulo comprido empurrava o valor para uma segunda linha: metade das linhas
// da lista virava duas, o olho perdia a pauta e as colunas paravam de bater
// linha a linha. Na grade quem quebra é o RÓTULO, dentro da própria trilha, e
// o valor fica onde sempre esteve.
export function LinhaCompacta({
  rotulo,
  delta,
  controle,
  valor,
  nota,
  explicacao,
  tom = "neutro",
}: {
  rotulo: string;
  delta?: string;
  // Slot CRU ao lado do rótulo, sem invólucro de estilo: é por onde a
  // comparação de cenários põe o campo editável do delta na coluna ativa. O
  // `delta` continua sendo o texto — o que muda é quem desenha a caixa.
  controle?: ReactNode;
  valor: string;
  nota?: string;
  // Toda linha que declara reais carrega o "de onde saiu este número". O ícone
  // fica ao lado do RÓTULO e não do valor: é o rótulo que nomeia o que está
  // sendo explicado, e à direita ele disputaria a coluna de números, que
  // existe justamente para ser somada de cima a baixo.
  explicacao?: ExplicacaoValor;
  tom?: "neutro" | "positivo" | "negativo";
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1">
      <dt className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--pf-ink-soft,#475569)]">
        {rotulo}
        {explicacao ? <ExplicacaoInfo explicacao={explicacao} /> : null}
        {delta ? (
          <span className="tabular-nums font-medium text-[var(--pf-ink-faint,#64748b)]">{delta}</span>
        ) : null}
        {controle}
      </dt>
      <dd
        className={cn(
          "text-right text-sm font-semibold tabular-nums",
          tom === "positivo" && "text-trend-positive",
          tom === "negativo" && "text-trend-negative",
          tom === "neutro" && "text-[var(--pf-ink,#0f172a)]",
        )}
      >
        {valor}
        {nota ? (
          <span className="ml-2 font-normal text-[var(--pf-ink-faint,#64748b)]">{nota}</span>
        ) : null}
      </dd>
    </div>
  );
}

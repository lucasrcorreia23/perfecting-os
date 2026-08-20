import { cn } from "@/lib/utils";

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
  valor,
  nota,
  tom = "neutro",
}: {
  rotulo: string;
  delta?: string;
  valor: string;
  nota?: string;
  tom?: "neutro" | "positivo" | "negativo";
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1">
      <dt className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--pf-ink-soft,#475569)]">
        {rotulo}
        {delta ? (
          <span className="tabular-nums font-medium text-[var(--pf-ink-faint,#64748b)]">{delta}</span>
        ) : null}
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

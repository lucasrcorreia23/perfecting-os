import { cn } from "@/lib/utils";

// Selo de evidência (invariante 5): todo campo e toda saída declaram a
// própria origem. Vocabulário fixo — nunca inventar variação por tela.
export type Selo =
  | "dado_do_cliente"
  | "premissa"
  | "projecao"
  | "estimativa"
  | "personalizado"
  | "nao_somado";

// Rótulos em caixa de frase: nenhum texto de UI é caixa alta (§2 das
// diretrizes, inegociável — a regra nomeia chips e selos). O V5 escreve os
// selos em versal, mas ali é notação de documento, não interface; o que o selo
// diz é o mesmo, e quem o separa do texto ao lado é a pílula, não a caixa.
const SELOS: Record<Selo, { label: string; className: string }> = {
  dado_do_cliente: {
    // O V5 chama este selo de "dado do cliente" (§4.12). Na tela pública quem
    // lê é o próprio cliente, para quem "do cliente" soa como terceiro — daí
    // "Dados fornecidos". Divergência de redação a registrar no documento; a
    // chave permanece, é o vocabulário interno do racional.
    label: "Dados fornecidos",
    // Fallback em todo token: os selos aparecem nas duas telas. O `bg-blue-50`
    // é azul-frio e sobre creme denuncia outra paleta — dentro da pele vira o
    // tint da marca; fora, continua exatamente o azul-50 de hoje.
    className:
      "bg-[var(--pf-brand-tint,#eff6ff)] text-[var(--pf-brand-ink,#2E63CD)] border-[var(--pf-brand,#2e63cd)]/25",
  },
  premissa: {
    label: "Premissa declarada",
    className:
      "bg-[var(--pf-warn-surface,#fffbeb)] text-[var(--pf-warn-ink,#973C00)] border-[var(--pf-warn-ink,#973C00)]/25",
  },
  projecao: {
    label: "Projeção",
    className:
      "bg-[var(--pf-bar,#f8fafc)] text-[var(--pf-ink-soft,#475569)] border-[var(--pf-line,#e2e8f0)]",
  },
  estimativa: {
    label: "Estimativa",
    className:
      "bg-[var(--pf-bar,#f8fafc)] text-[var(--pf-ink-soft,#475569)] border-[var(--pf-line,#e2e8f0)]",
  },
  personalizado: {
    label: "Parâmetros personalizados",
    // O violeta FICA: é da paleta categórica da §1, não da pele.
    className: "bg-violet-50 text-[#7C3AED] border-[#7C3AED]/25",
  },
  nao_somado: {
    label: "Não somado ao ROI",
    className:
      "bg-[var(--pf-bar,#f8fafc)] text-[var(--pf-ink-faint,#64748b)] border-[var(--pf-line,#e2e8f0)]",
  },
};

// Paleta alternativa para os selos que aparecem sobre a superfície de destaque
// (o hero verde do resultado). É SUBSTITUIÇÃO, não acréscimo: `cn` é clsx puro,
// sem tailwind-merge — um `bg-white/70` empilhado sobre `bg-slate-50` não desfaz
// o primeiro, quem decide é a ordem no CSS gerado. Só os selos que de fato vão
// ao verde precisam de entrada aqui; o resto cai no claro.
const SELOS_DESTAQUE: Partial<Record<Selo, string>> = {
  estimativa:
    "bg-[var(--pf-surface-alt,#ffffff)]/70 text-[var(--pf-ink-soft,#475569)] border-trend-positive/20",
};

export function SeloEvidencia({
  selo,
  tom = "claro",
  className,
}: {
  selo: Selo;
  tom?: "claro" | "destaque";
  className?: string;
}) {
  const config = SELOS[selo];
  const cores = (tom === "destaque" ? SELOS_DESTAQUE[selo] : null) ?? config.className;
  return (
    <span
      className={cn(
        // whitespace-nowrap: em coluna estreita o selo quebrava em três
        // linhas dentro da própria pílula. Ele vai inteiro para a linha de
        // baixo, nunca se desmonta.
        //
        // Altura por padding, não fixa, e `leading-4` em vez de `leading-none`:
        // a combinação anterior (`h-5` + `leading-none` sobre 10px) cortava os
        // descendentes das próprias palavras do vocabulário — o "ç" e o "j" de
        // "Projeção" encostavam na borda de baixo da pílula. O corpo subiu para
        // 12px pela mesma razão que o resto da calculadora (§8.12b): o leitor
        // desta tela não enxerga 10px.
        "inline-flex w-fit items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold leading-4",
        cores,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

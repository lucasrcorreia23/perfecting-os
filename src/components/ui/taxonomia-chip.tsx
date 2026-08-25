import { PALETA_FALLBACK, withAlpha } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Único chip do produto cuja cor vem do DADO e não de um Record: a categoria e
// o fluxo são linhas de tabela, cadastradas pela pessoa. O padrão de acento do
// §1 (fundo .08, borda .35, texto na cor cheia) é idêntico ao dos demais.
export function TaxonomiaChip({
  nome,
  cor,
  compact = false,
}: {
  nome: string | null;
  cor?: string | null;
  compact?: boolean;
}) {
  // Sem classificação a linha não some do produto — ela vira o balde "Sem
  // categoria"/"Sem fluxo", que é o mesmo que o dashboard mostra.
  if (!nome) {
    return (
      <span className="text-sm text-slate-400" aria-label="Sem classificação">
        —
      </span>
    );
  }

  const color = /^#[0-9a-fA-F]{6}$/.test(cor ?? "") ? cor! : PALETA_FALLBACK;

  return (
    <span
      // `max-w-full` + `truncate` no texto: numa célula de tabela o nome longo
      // corta em vez de esticar a linha (é o que a listagem cobra). Fora de um
      // container estreito, nada muda — o chip continua do tamanho do texto.
      className={cn(
        "inline-flex max-w-full items-center rounded-full font-medium",
        compact ? "px-2 py-0.5 text-[11px] leading-4" : "px-2.5 py-1 text-xs",
      )}
      style={{
        backgroundColor: withAlpha(color, 0.08),
        border: `1px solid ${withAlpha(color, 0.35)}`,
        color,
      }}
      title={nome}
    >
      <span className="truncate">{nome}</span>
    </span>
  );
}

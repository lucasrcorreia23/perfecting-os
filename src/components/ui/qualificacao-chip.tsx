import { QUALIFICACOES, withAlpha, type LeadQualificacao } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Frio/morno/quente. Cor nunca é o único sinal (§12): o rótulo acompanha.
export function QualificacaoChip({
  qualificacao,
  compact = false,
}: {
  qualificacao: LeadQualificacao;
  compact?: boolean;
}) {
  const { label, color } = QUALIFICACOES[qualificacao];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full font-medium",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
      style={{
        backgroundColor: withAlpha(color, 0.08),
        border: `1px solid ${withAlpha(color, 0.35)}`,
        color,
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

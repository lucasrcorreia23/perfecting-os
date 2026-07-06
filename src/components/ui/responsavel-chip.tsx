import { RESPONSAVEIS, withAlpha, type Responsavel } from "@/lib/constants";

// Responsável (categoria Cliente/Perfecting/ambos) da planilha da POC.
// Chip pill no padrão de acento do §1, como StatusChip/StageBadge "tag".
export function ResponsavelChip({
  responsavel,
  compact = false,
}: {
  responsavel: Responsavel;
  compact?: boolean;
}) {
  const { label, color } = RESPONSAVEIS[responsavel];

  return (
    <span
      className="inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: withAlpha(color, 0.08),
        border: `1px solid ${withAlpha(color, 0.35)}`,
        color,
      }}
    >
      {compact && responsavel === "ambos" ? "Perf. & Cliente" : label}
    </span>
  );
}

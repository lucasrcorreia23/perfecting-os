import { CRITICIDADES, withAlpha, type Criticidade } from "@/lib/constants";

// Criticidade da atividade (planilha da POC). Chip pill no padrão de acento
// do §1, como ResponsavelChip/StatusChip. Nas linhas densas, renderizar só
// quando `alta` (o chamador decide) — aqui aceita qualquer valor.
export function CriticidadeChip({ criticidade }: { criticidade: Criticidade }) {
  const { label, color } = CRITICIDADES[criticidade];

  return (
    <span
      className="inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: withAlpha(color, 0.08),
        border: `1px solid ${withAlpha(color, 0.35)}`,
        color,
      }}
    >
      Criticidade {label.toLowerCase()}
    </span>
  );
}

import {
  DESAFIO_SEVERIDADES,
  withAlpha,
  type DesafioSeveridade,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

// Severidade tem quatro degraus e o topo usa o vermelho de tendência — aqui ele
// é alerta de verdade, no mesmo espírito de CRITICIDADES.alta.
export function DesafioSeveridadeChip({
  severidade,
  compact = false,
}: {
  severidade: DesafioSeveridade;
  compact?: boolean;
}) {
  const { label, color } = DESAFIO_SEVERIDADES[severidade];

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-2 whitespace-nowrap rounded-full font-medium",
        compact ? "px-2 py-0.5 text-[11px] leading-4" : "px-2.5 py-1 text-xs",
      )}
      style={{
        backgroundColor: withAlpha(color, 0.08),
        border: `1px solid ${withAlpha(color, 0.35)}`,
        color,
      }}
    >
      {/* Cor não é o único sinal (§12): o ponto repete o degrau para quem não
          separa os quatro tons. */}
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

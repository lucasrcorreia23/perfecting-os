import { POST_STATES, withAlpha, type PostState } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Estado derivado do post (rascunho/agendado/publicado/arquivado) — padrão de
// acento do §1: fundo alpha .08, borda alpha .35, texto na cor cheia.
export function PostStateChip({
  state,
  compact = false,
}: {
  state: PostState;
  compact?: boolean;
}) {
  const { label, color } = POST_STATES[state];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full font-medium",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
      )}
      style={{
        backgroundColor: withAlpha(color, 0.08),
        border: `1px solid ${withAlpha(color, 0.35)}`,
        color,
      }}
    >
      {label}
    </span>
  );
}

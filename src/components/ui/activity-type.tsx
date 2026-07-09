import {
  EnvelopeIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import { ATIVIDADE_TIPOS, type AtividadeTipo } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Tipo da atividade (planilha da POC): síncrono = reunião ao vivo (câmera),
// assíncrono = no seu tempo (envelope/e-mail) — sem relógio, que remeteria a
// prazo/data. Ícone com rótulo acessível; `withLabel` mostra o texto ao lado
// (drawer), sem ele só o ícone + title (card).
export function ActivityType({
  tipo,
  withLabel = false,
  className,
}: {
  tipo: AtividadeTipo;
  withLabel?: boolean;
  className?: string;
}) {
  const { label } = ATIVIDADE_TIPOS[tipo];
  const Icon = tipo === "sincrono" ? VideoCameraIcon : EnvelopeIcon;

  return (
    <span
      title={withLabel ? undefined : label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-xs text-slate-500",
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className={withLabel ? undefined : "sr-only"}>{label}</span>
    </span>
  );
}

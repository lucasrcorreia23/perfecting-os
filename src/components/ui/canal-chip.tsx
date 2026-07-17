import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  UserGroupIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import { CANAIS, type Canal } from "@/lib/constants";
import { cn } from "@/lib/utils";

const CANAL_ICONS: Record<Canal, typeof EnvelopeIcon> = {
  email: EnvelopeIcon,
  whatsapp: ChatBubbleLeftRightIcon,
  os: ClipboardDocumentListIcon,
  meet: VideoCameraIcon,
  presencial: UserGroupIcon,
};

// Canal de comunicação da atividade (planilha da POC). Rótulo visível por
// padrão: o ícone sozinho colidiria com o ActivityType (envelope = assíncrono
// E e-mail; câmera = síncrono E Meet), que costuma aparecer na mesma linha.
export function CanalChip({
  canal,
  withLabel = true,
  className,
}: {
  canal: Canal;
  withLabel?: boolean;
  className?: string;
}) {
  const { label } = CANAIS[canal];
  const Icon = CANAL_ICONS[canal];

  return (
    <span
      title={withLabel ? undefined : label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500",
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className={withLabel ? undefined : "sr-only"}>{label}</span>
    </span>
  );
}

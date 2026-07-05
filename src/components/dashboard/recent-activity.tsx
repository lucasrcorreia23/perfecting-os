import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { STAGE_ORDER, STAGES, type WorkflowStage } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import type { HeroIcon } from "@/components/ui/types";
import { EmptyState } from "@/components/ui/empty-state";

export type FeedEvent = Tables<"events"> & {
  clients: { name: string } | null;
};

const ICONS: Record<string, HeroIcon> = {
  cliente_criado: PlusIcon,
  etapa_alterada: ArrowRightIcon,
  atividade_criada: PlusIcon,
  atividade_concluida: CheckCircleIcon,
  arquivo_enviado: DocumentTextIcon,
  arquivo_excluido: TrashIcon,
};

type Payload = {
  from?: string;
  to?: string;
  title?: string;
  name?: string;
};

function stageLabel(stage: string | undefined): string {
  return stage && stage in STAGES
    ? STAGES[stage as WorkflowStage].label
    : (stage ?? "");
}

function eventText(event: FeedEvent): string {
  const clientName =
    event.clients?.name ?? (event.payload as Payload)?.name ?? "Cliente";
  const payload = (event.payload ?? {}) as Payload;

  switch (event.type) {
    case "cliente_criado":
      return `${clientName} foi adicionado como cliente`;
    case "etapa_alterada": {
      const fromIndex = STAGE_ORDER.indexOf(payload.from as WorkflowStage);
      const toIndex = STAGE_ORDER.indexOf(payload.to as WorkflowStage);
      const verb = toIndex >= fromIndex ? "avançou" : "voltou";
      return `${clientName} ${verb} de ${stageLabel(payload.from)} para ${stageLabel(payload.to)}`;
    }
    case "atividade_criada":
      return `${clientName}: atividade "${payload.title ?? ""}" criada`;
    case "atividade_concluida":
      return `${clientName}: atividade "${payload.title ?? ""}" concluída`;
    case "arquivo_enviado":
      return `${clientName}: arquivo "${payload.name ?? ""}" enviado`;
    case "arquivo_excluido":
      return `${clientName}: arquivo "${payload.name ?? ""}" excluído`;
    default:
      return clientName;
  }
}

export function RecentActivity({ events }: { events: FeedEvent[] }) {
  return (
    <div className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-800">
        Atividades Recentes
      </h2>

      {events.length === 0 ? (
        <EmptyState
          icon={ClockIcon}
          title="Nada por aqui ainda"
          description="As movimentações dos seus clientes aparecerão neste feed."
          discreet
        />
      ) : (
        <div className="flex flex-col">
          {events.map((event) => {
            const Icon = ICONS[event.type] ?? ClockIcon;
            const row = (
              <>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50">
                  <Icon className="h-4 w-4 text-slate-500" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {eventText(event)}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatRelativeTime(event.created_at)}
                </span>
              </>
            );

            if (!event.client_id) {
              return (
                <div
                  key={event.id}
                  className="flex min-h-[44px] items-center gap-3 rounded-sm px-2 py-2"
                >
                  {row}
                </div>
              );
            }

            return (
              <Link
                key={event.id}
                href={`/clientes/${event.client_id}`}
                className="flex min-h-[44px] items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              >
                {row}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

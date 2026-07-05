"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  PaperClipIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { updateActivityStatus } from "@/lib/actions/activities";
import { deleteClient } from "@/lib/actions/clients";
import { createDownloadUrl } from "@/lib/actions/files";
import { FILE_ACCEPT, uploadClientFile } from "@/lib/files-upload";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_ORDER,
  type ActivityStatus,
} from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DeleteNamedModal } from "@/components/ui/delete-named-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { StageBadge } from "@/components/ui/stage-badge";
import { ActivityModal } from "@/components/activities/activity-modal";
import { AssigneePicker } from "./assignee-picker";
import type { ActivityAssignee, BoardClient } from "./client-card";

const STATUS_OPTIONS = ACTIVITY_STATUS_ORDER.map((status) => ({
  value: status,
  label: ACTIVITY_STATUSES[status].label,
}));

type Tab = "atividades" | "arquivos";

const ICON_BTN = cn(
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400",
  "transition-colors hover:bg-slate-50 hover:text-slate-600",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:opacity-50",
);

// Drawer flutuante do Kanban (não-modal): abas Atividades/Arquivos, upload por
// tarefa e lista simples de arquivos do cliente (detalhe completo no perfil).
export function ClientSheet({
  client,
  members,
  onClose,
}: {
  client: BoardClient;
  members: ActivityAssignee[];
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("atividades");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [removing, startRemoving] = useTransition();

  useEffect(() => {
    // Drawer não-modal: não trava o scroll do body — o usuário continua usando o
    // canvas com o painel aberto. Fecha por Esc ou pelo botão X do cabeçalho.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const stageActivities = client.activities
    .filter((activity) => activity.stage === client.stage)
    .sort((a, b) => a.position - b.position);

  const files = [...client.client_files].sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  );

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);
    const result = await uploadClientFile(client.id, file);
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh(); // recarrega os client_files do workflow
    setTab("arquivos"); // mostra o arquivo recém-enviado
  }

  function download(fileId: string) {
    setError(null);
    startTransition(async () => {
      const result = await createDownloadUrl(fileId);
      if (result.ok) window.open(result.data.url, "_blank", "noopener");
      else setError(result.error);
    });
  }

  if (typeof document === "undefined") return null;

  // Portal para o body (escapa de containing blocks). Card flutuante à direita,
  // com gap do topo/laterais/base e cantos arredondados — sem overlay escuro.
  return createPortal(
    <div
      role="dialog"
      aria-label={`Detalhes de ${client.name}`}
      className="fade-in-up fixed inset-y-4 left-4 right-4 z-(--z-overlay) flex flex-col gap-5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-[var(--shadow-lg)] sm:left-auto sm:w-full sm:max-w-lg sm:p-6"
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={client.name} size={48} />
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-base font-semibold text-slate-900">
              {client.name}
            </span>
            <StageBadge stage={client.stage} variant="tag" />
          </div>
        </div>
        <button
          type="button"
          aria-label="Fechar painel"
          onClick={onClose}
          className={cn(ICON_BTN, "-m-2 h-11 w-11 shrink-0")}
        >
          <XMarkIcon className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-5 border-b border-slate-100">
        {(["atividades", "arquivos"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? "true" : undefined}
            className={cn(
              "-mb-px cursor-pointer border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {t === "atividades"
              ? "Atividades"
              : `Arquivos${files.length ? ` (${files.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* Input de arquivo compartilhado (anexar por tarefa e aba Arquivos) */}
      <input
        ref={inputRef}
        type="file"
        accept={FILE_ACCEPT}
        className="hidden"
        aria-label="Selecionar arquivo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUpload(file);
          event.target.value = "";
        }}
      />

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      {tab === "atividades" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Atividades da etapa atual
            </h3>
            <Button
              variant="tertiary"
              size="sm"
              icon={PlusIcon}
              onClick={() => setAdding(true)}
            >
              Adicionar
            </Button>
          </div>

          {stageActivities.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">
              Nenhuma atividade nesta etapa.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {stageActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 py-3">
                  <Select
                    size="sm"
                    className="w-44 shrink-0"
                    aria-label={`Status de ${activity.title}`}
                    options={STATUS_OPTIONS}
                    value={activity.status}
                    onChange={(event) =>
                      startTransition(async () => {
                        const result = await updateActivityStatus(
                          activity.id,
                          event.target.value as ActivityStatus,
                        );
                        if (!result.ok) setError(result.error);
                      })
                    }
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={cn(
                        "truncate text-sm font-medium text-slate-800",
                        activity.status === "concluida" &&
                          "text-slate-400 line-through",
                      )}
                    >
                      {activity.title}
                    </span>
                    {activity.description ? (
                      <span className="truncate text-xs text-slate-500">
                        {activity.description}
                      </span>
                    ) : null}
                  </div>
                  <AssigneePicker
                    activityId={activity.id}
                    assignee={activity.assignee}
                    members={members}
                    onError={setError}
                  />
                  <button
                    type="button"
                    aria-label={`Anexar arquivo em ${activity.title}`}
                    title="Anexar arquivo (vai para os arquivos do cliente)"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className={ICON_BTN}
                  >
                    <PaperClipIcon className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Arquivos do cliente
            </h3>
            <Button
              variant="tertiary"
              size="sm"
              icon={ArrowUpTrayIcon}
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Enviando…" : "Enviar"}
            </Button>
          </div>

          {files.length === 0 ? (
            <EmptyState
              icon={DocumentTextIcon}
              title="Nenhum arquivo ainda"
              description="Anexe PDFs, planilhas ou textos por aqui ou nas tarefas."
              discreet
            />
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 py-3">
                  <DocumentTextIcon
                    className="h-5 w-5 shrink-0 text-slate-400"
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-slate-800">
                      {file.name}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {formatBytes(file.size_bytes ?? 0)}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Baixar ${file.name}`}
                    onClick={() => download(file.id)}
                    className={ICON_BTN}
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Rodapé: remover (ícone, extremo esquerdo) e ir para o perfil completo. */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          aria-label={`Remover ${client.name}`}
          title="Remover cliente"
          onClick={() => setDeleting(true)}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-red-500",
            "transition-colors hover:bg-red-50 hover:text-red-600",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35",
          )}
        >
          <TrashIcon className="h-5 w-5" aria-hidden />
        </button>
        <Button
          variant="primary"
          onClick={() => router.push(`/clientes/${client.id}`)}
        >
          Ver perfil completo
        </Button>
      </div>

      <ActivityModal
        open={adding}
        onClose={() => setAdding(false)}
        clientId={client.id}
        defaultStage={client.stage}
        activity={null}
      />

      <DeleteNamedModal
        open={deleting}
        onClose={() => setDeleting(false)}
        itemName={client.name}
        title="Remover cliente"
        description={`O cliente ${client.name}, suas atividades e arquivos serão excluídos permanentemente.`}
        loading={removing}
        onConfirm={() => {
          setError(null);
          startRemoving(async () => {
            const result = await deleteClient(client.id);
            if (result.ok) {
              onClose();
              router.refresh();
            } else {
              setDeleting(false);
              setError(result.error);
            }
          });
        }}
      />
    </div>,
    document.body,
  );
}

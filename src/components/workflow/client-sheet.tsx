"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  PaperClipIcon,
  PencilSquareIcon,
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
import { ActivityType } from "@/components/ui/activity-type";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DeleteNamedModal } from "@/components/ui/delete-named-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ResponsavelChip } from "@/components/ui/responsavel-chip";
import { Select } from "@/components/ui/select";
import { StageBadge } from "@/components/ui/stage-badge";
import { InfoTooltip, TooltipRow } from "@/components/ui/tooltip";
import { ActivityModal } from "@/components/activities/activity-modal";
import { EditClientModal } from "@/components/clients/edit-client-modal";
import type { BoardActivity, BoardClient } from "./client-card";
import { ClientHistoryTab } from "./client-history-tab";

const STATUS_OPTIONS = ACTIVITY_STATUS_ORDER.map((status) => ({
  value: status,
  label: ACTIVITY_STATUSES[status].label,
}));

type Tab = "atividades" | "arquivos" | "historico";

const ICON_BTN = cn(
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400",
  "transition-colors hover:bg-slate-50 hover:text-slate-600",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:opacity-50",
);

// Drawer flutuante do Kanban (não-modal): abas Atividades/Arquivos, upload por
// tarefa e lista simples de arquivos do cliente (detalhe completo no perfil).
export function ClientSheet({
  client,
  onClose,
}: {
  client: BoardClient;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("atividades");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Atividade dona do próximo upload (clipe por tarefa); null = aba Arquivos.
  const [attachTo, setAttachTo] = useState<string | null>(null);
  // Atividade cujos anexos existentes estão abertos no modal de anexos.
  const [viewingAttachments, setViewingAttachments] =
    useState<BoardActivity | null>(null);
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
    const result = await uploadClientFile(client.id, file, attachTo);
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
      className="fade-in-up fixed inset-y-4 left-4 right-4 z-(--z-overlay) flex flex-col gap-5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 pb-0 shadow-[var(--shadow-lg)] sm:left-auto sm:w-full sm:max-w-2xl sm:p-6 sm:pb-0"
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
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`Editar dados de ${client.name}`}
            title="Editar dados"
            onClick={() => setEditing(true)}
            className={cn(ICON_BTN, "-m-2 h-11 w-11")}
          >
            <PencilSquareIcon className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Fechar painel"
            onClick={onClose}
            className={cn(ICON_BTN, "-m-2 h-11 w-11")}
          >
            <XMarkIcon className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-5 border-b border-slate-100">
        {(["atividades", "arquivos", "historico"] as const).map((t) => (
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
              : t === "arquivos"
                ? `Arquivos${files.length ? ` (${files.length})` : ""}`
                : "Histórico"}
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
          {stageActivities.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">
              Nenhuma atividade nesta etapa.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {stageActivities.map((activity) => {
                const hasDeadline =
                  activity.week !== null || activity.duration_days !== null;
                const attachmentCount = client.client_files.filter(
                  (file) => file.activity_id === activity.id,
                ).length;
                return (
                  <div key={activity.id} className="flex items-center gap-3 py-3">
                    {/* Tipo (síncrono/assíncrono) à esquerda do bloco
                        título+responsável; no extremo direito, anexo e por
                        fim o status. Prazo (semana/duração) fica num ícone
                        de info com tooltip, à direita do título — "Dia
                        X/50" só aparece no card do board. */}
                    {activity.tipo ? (
                      <ActivityType tipo={activity.tipo} />
                    ) : null}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex min-w-0 items-center gap-1">
                        <span
                          className={cn(
                            "truncate text-sm font-medium text-slate-800",
                            activity.status === "concluida" &&
                              "text-slate-400 line-through",
                          )}
                        >
                          {activity.title}
                        </span>
                        {hasDeadline ? (
                          <InfoTooltip>
                            {activity.week !== null ? (
                              <TooltipRow
                                label="Semana"
                                value={`Semana ${activity.week}`}
                              />
                            ) : null}
                            {activity.duration_days !== null ? (
                              <TooltipRow
                                label="Prazo"
                                value={
                                  activity.duration_days === 1
                                    ? "1 dia"
                                    : `${activity.duration_days} dias`
                                }
                              />
                            ) : null}
                          </InfoTooltip>
                        ) : null}
                      </div>
                      {activity.responsavel ? (
                        <ResponsavelChip
                          responsavel={activity.responsavel}
                          compact
                        />
                      ) : null}
                      {activity.description ? (
                        <span className="truncate text-xs text-slate-500">
                          {activity.description}
                        </span>
                      ) : null}
                    </div>
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        aria-label={`Anexar arquivo em ${activity.title}${
                          attachmentCount > 0
                            ? ` (${attachmentCount} anexos)`
                            : ""
                        }`}
                        title={
                          attachmentCount > 0
                            ? "Ver anexos"
                            : "Anexar arquivo (vai para os arquivos do cliente)"
                        }
                        onClick={() => {
                          if (attachmentCount > 0) {
                            setViewingAttachments(activity);
                            return;
                          }
                          setAttachTo(activity.id);
                          inputRef.current?.click();
                        }}
                        disabled={uploading}
                        className={ICON_BTN}
                      >
                        <PaperClipIcon className="h-5 w-5" aria-hidden />
                      </button>
                      {attachmentCount > 0 ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-500 px-1 text-[10px] font-semibold tabular-nums text-white"
                        >
                          {attachmentCount}
                        </span>
                      ) : null}
                    </div>
                    <Select
                      size="sm"
                      className="w-44 shrink-0"
                      color={ACTIVITY_STATUSES[activity.status].color}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : tab === "arquivos" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Arquivos do cliente
            </h3>
            <Button
              variant="tertiary"
              size="sm"
              icon={ArrowUpTrayIcon}
              onClick={() => {
                setAttachTo(null);
                inputRef.current?.click();
              }}
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
              {files.map((file) => {
                const linkedActivity = file.activity_id
                  ? client.activities.find(
                      (activity) => activity.id === file.activity_id,
                    )
                  : null;
                return (
                  <div key={file.id} className="flex items-center gap-3 py-3">
                    <DocumentTextIcon
                      className="h-5 w-5 shrink-0 text-slate-400"
                      aria-hidden
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-slate-800">
                        {file.name}
                      </span>
                      <span className="truncate text-xs text-slate-500">
                        {formatBytes(file.size_bytes ?? 0)}
                        {linkedActivity ? ` · ${linkedActivity.title}` : ""}
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
                );
              })}
            </div>
          )}

        </div>
      ) : (
        <ClientHistoryTab
          currentStage={client.stage}
          activities={client.activities}
          files={client.client_files}
          onDownload={download}
        />
      )}

      {/* Rodapé fixo (sticky no fim do scrollport): a lista corre por trás. O
          container zera o padding-bottom (pb-0) para o rodapé encostar no fundo
          sem furo; o respiro dos botões vem do py-4 daqui. */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:-mx-6 sm:px-6">
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
        <div className="flex items-center gap-3">
          {tab === "atividades" ? (
            <Button
              variant="secondary"
              icon={PlusIcon}
              onClick={() => setAdding(true)}
            >
              Adicionar atividade
            </Button>
          ) : null}
          <Button
            variant="primary"
            onClick={() => router.push(`/clientes/${client.id}`)}
          >
            Ver perfil completo
          </Button>
        </div>
      </div>

      <ActivityModal
        open={adding}
        onClose={() => setAdding(false)}
        clientId={client.id}
        defaultStage={client.stage}
        activity={null}
      />

      <EditClientModal
        client={client}
        open={editing}
        onClose={() => setEditing(false)}
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

      <Modal
        open={viewingAttachments !== null}
        onClose={() => setViewingAttachments(null)}
        title={
          viewingAttachments
            ? `Anexos de ${viewingAttachments.title}`
            : "Anexos"
        }
      >
        {viewingAttachments ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col divide-y divide-slate-100">
              {client.client_files
                .filter((file) => file.activity_id === viewingAttachments.id)
                .map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 py-3"
                  >
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
            <button
              type="button"
              onClick={() => {
                setAttachTo(viewingAttachments.id);
                setViewingAttachments(null);
                inputRef.current?.click();
              }}
              disabled={uploading}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-slate-300 bg-white px-4 py-6",
                "transition-colors hover:border-slate-400",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                "disabled:cursor-not-allowed disabled:opacity-70",
              )}
            >
              <PlusIcon className="h-5 w-5 text-slate-400" aria-hidden />
              <span className="text-sm font-medium text-slate-700">
                Adicionar outro arquivo
              </span>
            </button>
          </div>
        ) : null}
      </Modal>
    </div>,
    document.body,
  );
}

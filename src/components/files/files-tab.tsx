"use client";

import { useRef, useState, useTransition } from "react";
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  createDownloadUrl,
  deleteClientFile,
  registerClientFile,
} from "@/lib/actions/files";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { formatBytes, formatDate } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { ActionMenu } from "@/components/ui/action-menu";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";

type ClientFile = Tables<"client_files">;

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .toLowerCase();
}

export function FilesTab({
  clientId,
  files,
  uploaderNames,
  canDelete,
}: {
  clientId: string;
  files: ClientFile[];
  uploaderNames: Record<string, string>;
  canDelete: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ClientFile | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`"${file.name}" excede o limite de 20 MB.`);
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Supabase não configurado.");
      return;
    }

    setUploading(true);
    try {
      // Upload direto do browser para o Storage; a policy de storage valida.
      const supabase = createBrowserSupabase();
      const storagePath = `${clientId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("client-files")
        .upload(storagePath, file);
      if (uploadError) {
        setError("Falha no envio do arquivo. Tente novamente.");
        return;
      }

      const result = await registerClientFile({
        client_id: clientId,
        name: file.name,
        storage_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type || null,
      });
      if (!result.ok) {
        // Não deixa objeto órfão no bucket.
        await supabase.storage.from("client-files").remove([storagePath]);
        setError(result.error);
      }
    } finally {
      setUploading(false);
    }
  }

  function download(file: ClientFile) {
    startTransition(async () => {
      const result = await createDownloadUrl(file.id);
      if (result.ok) {
        window.open(result.data.url, "_blank", "noopener");
      } else {
        setError(result.error);
      }
    });
  }

  const columns: Column<ClientFile>[] = [
    {
      key: "nome",
      header: "Nome",
      render: (file) => (
        <span className="flex items-center gap-2">
          <DocumentTextIcon
            className="h-5 w-5 shrink-0 text-slate-400"
            aria-hidden
          />
          <span className="max-w-64 truncate">{file.name}</span>
        </span>
      ),
    },
    {
      key: "tamanho",
      header: "Tamanho",
      render: (file) => (
        <span className="tabular-nums text-slate-600">
          {formatBytes(file.size_bytes)}
        </span>
      ),
    },
    {
      key: "enviado-por",
      header: "Enviado por",
      render: (file) => (
        <span className="text-slate-600">
          {(file.uploaded_by && uploaderNames[file.uploaded_by]) || "—"}
        </span>
      ),
    },
    {
      key: "data",
      header: "Data",
      render: (file) => (
        <span className="text-slate-600">{formatDate(file.created_at)}</span>
      ),
    },
    {
      key: "acoes",
      header: <span className="sr-only">Ações</span>,
      className: "w-14 text-right",
      render: (file) => fileMenu(file),
    },
  ];

  function fileMenu(file: ClientFile) {
    return (
      <ActionMenu
        ariaLabel={`Ações de ${file.name}`}
        items={[
          {
            label: "Baixar",
            icon: ArrowDownTrayIcon,
            onSelect: () => download(file),
          },
          ...(canDelete
            ? [
                {
                  label: "Excluir",
                  icon: TrashIcon,
                  destructive: true,
                  onSelect: () => setDeleting(file),
                },
              ]
            : []),
        ]}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Zona de upload */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        disabled={uploading}
        className={cn(
          "flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-4 py-8",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
          dragOver
            ? "border-[#2E63CD]/50 bg-blue-50/50"
            : "border-slate-300 bg-white hover:border-slate-400",
          uploading && "cursor-not-allowed opacity-70",
        )}
      >
        <DocumentTextIcon className="h-6 w-6 text-slate-400" aria-hidden />
        <span className="text-sm font-medium text-slate-700">
          {uploading ? "Enviando…" : "Arraste ou clique para enviar"}
        </span>
        <span className="text-xs text-slate-500">Até 20 MB por arquivo.</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        aria-label="Selecionar arquivo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={files}
        rowKey={(file) => file.id}
        empty={
          <EmptyState
            icon={DocumentTextIcon}
            title="Nenhum arquivo ainda"
            description="Envie contratos, relatórios e outros documentos do cliente."
          />
        }
        mobileCard={(file) => (
          <div className="flex flex-col gap-3 rounded-sm border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <DocumentTextIcon
                  className="h-5 w-5 shrink-0 text-slate-400"
                  aria-hidden
                />
                <span className="truncate text-sm font-medium text-slate-800">
                  {file.name}
                </span>
              </span>
              {fileMenu(file)}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="tabular-nums">
                {formatBytes(file.size_bytes)}
              </span>
              <span>
                {(file.uploaded_by && uploaderNames[file.uploaded_by]) || "—"}
              </span>
              <span>{formatDate(file.created_at)}</span>
            </div>
          </div>
        )}
      />

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        tone="danger"
        title="Excluir arquivo"
        description={`O arquivo "${deleting?.name ?? ""}" será removido permanentemente do storage.`}
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          const file = deleting;
          setError(null);
          startTransition(async () => {
            const result = await deleteClientFile(file.id);
            if (result.ok) {
              setDeleting(null);
            } else {
              setError(result.error);
            }
          });
        }}
      />
    </div>
  );
}

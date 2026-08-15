"use client";

import { publicQuestions } from "@/lib/marketing-funnel";
import { CopyButton } from "@/components/ui/copy-button";
import { Modal } from "@/components/ui/modal";
import type { FunnelDraft } from "./funnel-builder";

// Contrato vivo para quem desenvolve o site: exatamente o JSON que o endpoint
// público devolve. Sem score, sem weight, sem maps_to.
export function FunnelSchemaModal({
  open,
  onClose,
  funnel,
  version,
  endpointUrl,
}: {
  open: boolean;
  onClose: () => void;
  funnel: FunnelDraft;
  version: number | null;
  endpointUrl: string;
}) {
  const payload = {
    data: {
      slug: funnel.slug,
      name: funnel.name,
      description: funnel.description || null,
      version: version ?? 1,
      submit_label: funnel.submitLabel,
      success_message: funnel.successMessage,
      redirect_url: funnel.redirectUrl || null,
      questions: publicQuestions(funnel.questions),
    },
  };
  const json = JSON.stringify(payload, null, 2);
  const url = `${endpointUrl}/api/publico/funis/${funnel.slug}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="JSON entregue ao site"
      width="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Endpoint
          </span>
          <div className="flex items-center justify-between gap-3 rounded-sm border border-slate-200 bg-slate-50 p-3">
            <code className="overflow-x-auto text-xs text-slate-700">
              GET {url}
            </code>
            <CopyButton text={url} label="Copiar URL" className="shrink-0" />
          </div>
          <p className="text-xs text-slate-500">
            Requer o cabeçalho{" "}
            <code className="rounded-full bg-slate-100 px-1.5 py-0.5">
              Authorization: Bearer &lt;MARKETING_API_TOKEN&gt;
            </code>
            .
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resposta
            </span>
            <CopyButton text={json} label="Copiar JSON" />
          </div>
          <pre className="max-h-96 overflow-auto rounded-sm border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
            {json}
          </pre>
          <p className="text-xs text-slate-500">
            Prévia do rascunho atual. O site recebe a última versão publicada —
            pesos e vínculos com o lead nunca são expostos.
          </p>
        </div>
      </div>
    </Modal>
  );
}

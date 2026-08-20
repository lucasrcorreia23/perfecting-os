"use client";

import { useState } from "react";
import { CheckCircleIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import type { AutosaveStatus } from "./use-autosave";

// Fecho do resultado: estado do autosave à esquerda, envio à direita.
// Envio só habilita com o gating completo em todos os times; depois do
// primeiro envio o link continua editável e o botão vira "Atualizar envio".
export function EnviarBar({
  autosaveStatus,
  salvoEm,
  submittedAt,
  completo,
  onEnviar,
}: {
  autosaveStatus: AutosaveStatus;
  salvoEm: string | null;
  submittedAt: string | null;
  completo: boolean;
  onEnviar: () => Promise<boolean>;
}) {
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  const statusTexto =
    autosaveStatus === "salvando"
      ? "Salvando…"
      : autosaveStatus === "erro"
        ? "Sem conexão, tentando de novo"
        : salvoEm
          ? `Salvo às ${formatDateTime(salvoEm).split(", ")[1] ?? ""}`
          : "Preenchimento salvo automaticamente";

  return (
    // Último bloco da página, não barra flutuante: rola junto com o conteúdo.
    // Sem sombra — ela existia para descolar a barra do que passava por baixo.
    <div className="rounded-md border border-(--pf-line) bg-(--pf-surface) px-4 py-4 sm:px-6">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <span
          role="status"
          className="flex items-center gap-2 text-sm text-(--pf-ink-soft)"
        >
          {autosaveStatus === "salvo" || (autosaveStatus === "idle" && salvoEm) ? (
            <CheckCircleIcon className="h-4 w-4 text-trend-positive" aria-hidden />
          ) : null}
          {statusTexto}
          {submittedAt ? (
            <span className="text-(--pf-ink-faint)">
              · enviado em {formatDateTime(submittedAt)}
            </span>
          ) : null}
        </span>

        <div className="flex items-center gap-3">
          {confirmado ? (
            <span className="text-sm font-medium text-trend-positive" role="status">
              {submittedAt ? "Envio atualizado." : "Enviado."}
            </span>
          ) : !completo ? (
            <span className="text-sm text-(--pf-ink-faint)">
              Complete todos os campos para enviar
            </span>
          ) : null}
          <Button
            variant="primary"
            icon={PaperAirplaneIcon}
            disabled={!completo || enviando}
            onClick={async () => {
              setEnviando(true);
              setConfirmado(false);
              const ok = await onEnviar();
              setEnviando(false);
              if (ok) {
                setConfirmado(true);
                setTimeout(() => setConfirmado(false), 4000);
              }
            }}
          >
            {enviando
              ? "Enviando…"
              : submittedAt
                ? "Atualizar envio"
                : "Enviar para o time Perfecting"}
          </Button>
        </div>
      </div>
    </div>
  );
}

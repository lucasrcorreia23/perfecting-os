"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ConfirmModal } from "./confirm-modal";

// Barra de ação de formulário (§8.10): "Salvar" à direita (vira "Sem
// alterações" quando limpo) e "Descartar alterações" à esquerda quando sujo.
// Salvar e descartar passam por modal de confirmação.
export function ActionBar({
  dirty,
  saving = false,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const [confirming, setConfirming] = useState<"save" | "discard" | null>(
    null,
  );

  return (
    <div className="flex items-center justify-end gap-6 pt-2">
      {dirty ? (
        <button
          type="button"
          onClick={() => setConfirming("discard")}
          className={cn(
            "cursor-pointer rounded-full text-[13px] font-medium text-[#1e293b] underline-offset-[3px]",
            "transition-opacity hover:underline hover:opacity-70",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
          )}
        >
          Descartar alterações
        </button>
      ) : null}
      <Button
        variant="primary"
        disabled={!dirty || saving}
        onClick={() => setConfirming("save")}
      >
        {saving ? "Salvando…" : dirty ? "Salvar" : "Sem alterações"}
      </Button>

      <ConfirmModal
        open={confirming === "save"}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          setConfirming(null);
          onSave();
        }}
        tone="primary"
        title="Salvar alterações?"
        description="As alterações serão aplicadas imediatamente."
        confirmLabel="Salvar"
      />
      <ConfirmModal
        open={confirming === "discard"}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          setConfirming(null);
          onDiscard();
        }}
        tone="warning"
        title="Descartar alterações?"
        description="Tudo que foi editado desde o último salvamento será perdido."
        confirmLabel="Descartar"
      />
    </div>
  );
}

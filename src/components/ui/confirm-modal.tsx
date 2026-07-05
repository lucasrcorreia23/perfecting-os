"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Modal } from "./modal";

type Tone = "danger" | "warning" | "primary";

const TONE_STYLES: Record<Tone, { icon: string; circle: string }> = {
  danger: { icon: "text-red-600", circle: "bg-red-50" },
  warning: { icon: "text-[#D97706]", circle: "bg-amber-50" },
  primary: { icon: "text-primary", circle: "bg-blue-50" },
};

// Modal de confirmação genérico (§8.11). Para excluir item nomeado,
// usar DeleteNamedModal.
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  tone = "primary",
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tone?: Tone;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
}) {
  const Icon = tone === "primary" ? CheckCircleIcon : ExclamationTriangleIcon;
  const styles = TONE_STYLES[tone];

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            styles.circle,
          )}
        >
          <Icon className={cn("h-6 w-6", styles.icon)} aria-hidden />
        </span>
        {description ? (
          <p className="text-sm text-slate-600">{description}</p>
        ) : null}
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === "primary" ? "primary" : "danger"}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Aguarde…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

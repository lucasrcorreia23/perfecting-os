"use client";

import { useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Button } from "./button";
import { Modal } from "./modal";

// Exclusão de item nomeado (§8.11): exige digitar o nome exato para liberar
// o botão destrutivo.
export function DeleteNamedModal({
  open,
  onClose,
  onConfirm,
  itemName,
  title,
  description,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  title: string;
  description?: string;
  loading?: boolean;
}) {
  const [typed, setTyped] = useState("");
  // Limpa o campo a cada reabertura (padrão "adjust state during render").
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setTyped("");
  }

  const matches = typed.trim() === itemName;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
          <ExclamationTriangleIcon
            className="h-6 w-6 text-red-600"
            aria-hidden
          />
        </span>
        <div className="flex flex-col gap-1">
          {description ? (
            <p className="text-sm text-slate-600">{description}</p>
          ) : null}
          <p className="text-sm text-slate-600">
            Esta ação não pode ser desfeita.
          </p>
        </div>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">
          Digite <span className="font-semibold">{itemName}</span> para
          confirmar
        </span>
        <input
          type="text"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          className="h-12 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-primary/40"
        />
      </label>
      <div className="flex items-center justify-end gap-3 pt-1">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          disabled={!matches || loading}
        >
          {loading ? "Excluindo…" : "Excluir"}
        </Button>
      </div>
    </Modal>
  );
}

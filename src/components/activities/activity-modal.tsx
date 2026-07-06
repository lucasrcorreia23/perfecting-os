"use client";

import { useState, useTransition } from "react";
import { createActivity, updateActivity } from "@/lib/actions/activities";
import {
  ATIVIDADE_TIPOS,
  RESPONSAVEIS,
  STAGE_ORDER,
  STAGES,
  type AtividadeTipo,
  type Responsavel,
  type WorkflowStage,
} from "@/lib/constants";
import type { Tables } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

const STAGE_OPTIONS = STAGE_ORDER.map((stage) => ({
  value: stage,
  label: STAGES[stage].label,
}));

// Campos da planilha da POC — opcionais ("—" = sem valor).
const RESPONSAVEL_OPTIONS = [
  { value: "", label: "—" },
  ...(Object.keys(RESPONSAVEIS) as Responsavel[]).map((value) => ({
    value,
    label: RESPONSAVEIS[value].label,
  })),
];

const TIPO_OPTIONS = [
  { value: "", label: "—" },
  ...(Object.keys(ATIVIDADE_TIPOS) as AtividadeTipo[]).map((value) => ({
    value,
    label: ATIVIDADE_TIPOS[value].label,
  })),
];

// Criação (activity = null) e edição usam o mesmo modal.
export function ActivityModal({
  open,
  onClose,
  clientId,
  defaultStage,
  activity,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  defaultStage: WorkflowStage;
  activity: Tables<"activities"> | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      stage: form.get("stage") as WorkflowStage,
      due_date: String(form.get("due_date") ?? ""),
      responsavel: form.get("responsavel") as Responsavel | "",
      tipo: form.get("tipo") as AtividadeTipo | "",
    };
    setError(null);

    startTransition(async () => {
      const result = activity
        ? await updateActivity(activity.id, input)
        : await createActivity(clientId, input);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={activity ? "Editar atividade" : "Adicionar atividade"}
      width="max-w-lg"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Título" htmlFor="activity-title">
          <Input
            id="activity-title"
            name="title"
            defaultValue={activity?.title ?? ""}
            required
            autoFocus
          />
        </Field>
        <Field label="Descrição" htmlFor="activity-description">
          <Textarea
            id="activity-description"
            name="description"
            defaultValue={activity?.description ?? ""}
            className="min-h-20"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Etapa" htmlFor="activity-stage">
            <Select
              id="activity-stage"
              name="stage"
              options={STAGE_OPTIONS}
              defaultValue={activity?.stage ?? defaultStage}
            />
          </Field>
          <Field label="Prazo" htmlFor="activity-due-date">
            <Input
              id="activity-due-date"
              name="due_date"
              type="date"
              defaultValue={activity?.due_date ?? ""}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Responsável" htmlFor="activity-responsavel">
            <Select
              id="activity-responsavel"
              name="responsavel"
              options={RESPONSAVEL_OPTIONS}
              defaultValue={activity?.responsavel ?? ""}
            />
          </Field>
          <Field label="Tipo" htmlFor="activity-tipo">
            <Select
              id="activity-tipo"
              name="tipo"
              options={TIPO_OPTIONS}
              defaultValue={activity?.tipo ?? ""}
            />
          </Field>
        </div>

        {error ? (
          <p role="alert" className="text-xs text-trend-negative">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending
              ? "Salvando…"
              : activity
                ? "Salvar"
                : "Adicionar atividade"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

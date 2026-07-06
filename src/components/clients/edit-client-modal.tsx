"use client";

import { useState, useTransition } from "react";
import { updateClient } from "@/lib/actions/clients";
import { STAGE_ORDER, STAGES, type WorkflowStage } from "@/lib/constants";
import { dateInputToISO, toDateInputValue } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

const STAGE_OPTIONS = STAGE_ORDER.map((stage) => ({
  value: stage,
  label: STAGES[stage].label,
}));

type FormValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: WorkflowStage;
  started_at: string;
  notes: string;
};

function toValues(client: Tables<"clients">): FormValues {
  return {
    name: client.name,
    company: client.company ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    stage: client.stage,
    started_at: toDateInputValue(client.created_at),
    notes: client.notes ?? "",
  };
}

// Edição rápida sem sair da drawer do board — mesmos campos do ClientForm de
// /clientes/[id], só que num modal (fecha ao salvar, não navega).
export function EditClientModal({
  client,
  open,
  onClose,
}: {
  client: Tables<"clients">;
  open: boolean;
  onClose: () => void;
}) {
  const [values, setValues] = useState(() => toValues(client));
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  // Reseta o formulário ao abrir (não em efeito — evita re-render em cascata,
  // v. "Adjusting state when a prop changes" no guia de hooks do React).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(toValues(client));
      setError(null);
    }
  }

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateClient(client.id, {
        name: values.name,
        company: values.company,
        email: values.email,
        phone: values.phone,
        stage: values.stage,
        created_at: dateInputToISO(values.started_at),
        notes: values.notes,
      });
      if (result.ok) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar cliente" width="max-w-lg">
      {/* Limita a altura do modal e rola só o miolo — o rodapé de ações fica
          sempre visível, mesmo com o formulário maior que a viewport. */}
      <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pb-1">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nome" htmlFor="edit-client-name">
              <Input
                id="edit-client-name"
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
                required
              />
            </Field>
            <Field label="Empresa" htmlFor="edit-client-company">
              <Input
                id="edit-client-company"
                value={values.company}
                onChange={(event) => set("company", event.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="E-mail" htmlFor="edit-client-email">
              <Input
                id="edit-client-email"
                type="email"
                value={values.email}
                onChange={(event) => set("email", event.target.value)}
              />
            </Field>
            <Field label="Telefone" htmlFor="edit-client-phone">
              <Input
                id="edit-client-phone"
                type="tel"
                value={values.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Etapa" htmlFor="edit-client-stage">
              <Select
                id="edit-client-stage"
                options={STAGE_OPTIONS}
                value={values.stage}
                onChange={(event) =>
                  set("stage", event.target.value as WorkflowStage)
                }
              />
            </Field>
            <Field label="Início da POC" htmlFor="edit-client-started-at">
              <Input
                id="edit-client-started-at"
                type="date"
                value={values.started_at}
                onChange={(event) => set("started_at", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Notas internas" htmlFor="edit-client-notes">
            <Textarea
              id="edit-client-notes"
              value={values.notes}
              onChange={(event) => set("notes", event.target.value)}
            />
          </Field>
        </div>

        {error ? (
          <p role="alert" className="mt-3 shrink-0 text-xs text-trend-negative">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

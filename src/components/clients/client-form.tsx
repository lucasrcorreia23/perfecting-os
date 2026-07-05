"use client";

import { useState, useTransition } from "react";
import { updateClient } from "@/lib/actions/clients";
import {
  STAGE_ORDER,
  STAGES,
  STATUSES,
  type ClientStatus,
  type WorkflowStage,
} from "@/lib/constants";
import type { Tables } from "@/lib/database.types";
import { ActionBar } from "@/components/ui/action-bar";
import { Field, FormSection, Input, Textarea } from "@/components/ui/form";
import { Select } from "@/components/ui/select";

const STAGE_OPTIONS = STAGE_ORDER.map((stage) => ({
  value: stage,
  label: STAGES[stage].label,
}));
const STATUS_OPTIONS = (
  Object.keys(STATUSES) as ClientStatus[]
).map((status) => ({ value: status, label: STATUSES[status].label }));

type FormValues = {
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: WorkflowStage;
  status: ClientStatus;
  stage_deadline_days: string;
  notes: string;
};

function toValues(client: Tables<"clients">): FormValues {
  return {
    name: client.name,
    company: client.company ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    stage: client.stage,
    status: client.status,
    stage_deadline_days: String(client.stage_deadline_days),
    notes: client.notes ?? "",
  };
}

export function ClientForm({
  client,
  readOnly,
}: {
  client: Tables<"clients">;
  readOnly: boolean;
}) {
  const [initial, setInitial] = useState(() => toValues(client));
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateClient(client.id, {
        name: values.name,
        company: values.company,
        email: values.email,
        phone: values.phone,
        stage: values.stage,
        status: values.status,
        stage_deadline_days: Number(values.stage_deadline_days),
        notes: values.notes,
      });
      if (result.ok) {
        setInitial(values);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <FormSection title="Identificação" first>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nome" htmlFor="client-name">
            <Input
              id="client-name"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              disabled={readOnly}
              required
            />
          </Field>
          <Field label="Empresa" htmlFor="client-company">
            <Input
              id="client-company"
              value={values.company}
              onChange={(event) => set("company", event.target.value)}
              disabled={readOnly}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Contato">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="E-mail" htmlFor="client-email">
            <Input
              id="client-email"
              type="email"
              value={values.email}
              onChange={(event) => set("email", event.target.value)}
              disabled={readOnly}
            />
          </Field>
          <Field
            label="Telefone"
            help="Com DDI — usado para WhatsApp"
            htmlFor="client-phone"
          >
            <Input
              id="client-phone"
              type="tel"
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
              disabled={readOnly}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Workflow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Etapa" htmlFor="client-stage">
            <Select
              id="client-stage"
              options={STAGE_OPTIONS}
              value={values.stage}
              onChange={(event) =>
                set("stage", event.target.value as WorkflowStage)
              }
              disabled={readOnly}
            />
          </Field>
          <Field label="Status" htmlFor="client-status">
            <Select
              id="client-status"
              options={STATUS_OPTIONS}
              value={values.status}
              onChange={(event) =>
                set("status", event.target.value as ClientStatus)
              }
              disabled={readOnly}
            />
          </Field>
        </div>
        <Field
          label="Prazo da etapa (dias)"
          help="SLA para o cliente avançar de etapa."
          htmlFor="client-deadline"
        >
          <Input
            id="client-deadline"
            type="number"
            min={1}
            className="md:w-1/2"
            value={values.stage_deadline_days}
            onChange={(event) => set("stage_deadline_days", event.target.value)}
            disabled={readOnly}
          />
        </Field>
      </FormSection>

      <FormSection title="Observações">
        <Field label="Notas internas" htmlFor="client-notes">
          <Textarea
            id="client-notes"
            value={values.notes}
            onChange={(event) => set("notes", event.target.value)}
            disabled={readOnly}
          />
        </Field>
      </FormSection>

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      {!readOnly ? (
        <ActionBar
          dirty={dirty}
          saving={saving}
          onSave={save}
          onDiscard={() => setValues(initial)}
        />
      ) : null}
    </div>
  );
}

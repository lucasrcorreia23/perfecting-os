"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { convertLeadToClient } from "@/lib/actions/marketing-leads";
import { STAGES, STAGE_ORDER, type WorkflowStage } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { LeadRow } from "./leads-view";

const STAGE_OPTIONS = STAGE_ORDER.map((stage) => ({
  value: stage,
  label: STAGES[stage].label,
}));

// Os campos vêm pré-preenchidos pelas perguntas marcadas com "Vincular ao lead".
export function ConvertLeadModal({
  lead,
  onClose,
}: {
  lead: LeadRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!lead) return null;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;
    const form = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await convertLeadToClient(lead.id, {
        name: String(form.get("name") ?? ""),
        company: String(form.get("company") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        stage: form.get("stage") as WorkflowStage,
      });
      if (result.ok) {
        onClose();
        router.push(`/clientes/${result.data.clientId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Modal open onClose={onClose} title="Converter lead em cliente" width="max-w-lg">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-xs text-slate-500">
          O cliente entra no workflow com o cronograma da etapa já criado, e o
          lead passa a constar como convertido.
        </p>

        <Field label="Nome" htmlFor="convert-name">
          <Input
            id="convert-name"
            name="name"
            defaultValue={lead.name ?? ""}
            required
            autoFocus
          />
        </Field>
        <Field label="Empresa" htmlFor="convert-company">
          <Input
            id="convert-company"
            name="company"
            defaultValue={lead.company ?? ""}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="E-mail" htmlFor="convert-email">
            <Input
              id="convert-email"
              name="email"
              type="email"
              defaultValue={lead.email ?? ""}
            />
          </Field>
          <Field label="Telefone" htmlFor="convert-phone">
            <Input
              id="convert-phone"
              name="phone"
              type="tel"
              defaultValue={lead.phone ?? ""}
            />
          </Field>
        </div>
        <Field label="Etapa inicial" htmlFor="convert-stage">
          <Select
            id="convert-stage"
            name="stage"
            options={STAGE_OPTIONS}
            defaultValue="diagnosticar"
          />
        </Field>

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
            {pending ? "Criando…" : "Criar cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

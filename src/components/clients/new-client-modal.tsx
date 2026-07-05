"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/actions/clients";
import {
  STAGE_ORDER,
  STAGES,
  STATUSES,
  type ClientStatus,
  type WorkflowStage,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

const STAGE_OPTIONS = STAGE_ORDER.map((stage) => ({
  value: stage,
  label: STAGES[stage].label,
}));

const STATUS_OPTIONS = (
  Object.keys(STATUSES) as ClientStatus[]
).map((status) => ({ value: status, label: STATUSES[status].label }));

export function NewClientButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await createClient({
        name: String(form.get("name") ?? ""),
        company: String(form.get("company") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        stage: form.get("stage") as WorkflowStage,
        status: form.get("status") as ClientStatus,
      });
      if (result.ok) {
        setOpen(false);
        router.push(`/clientes/${result.data.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button variant="primary" icon={PlusIcon} onClick={() => setOpen(true)}>
        Novo cliente
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo cliente"
        width="max-w-lg"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Nome" htmlFor="new-client-name">
            <Input id="new-client-name" name="name" required autoFocus />
          </Field>
          <Field label="Empresa" htmlFor="new-client-company">
            <Input id="new-client-company" name="company" />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="E-mail" htmlFor="new-client-email">
              <Input id="new-client-email" name="email" type="email" />
            </Field>
            <Field
              label="Telefone"
              help="Com DDI — usado para WhatsApp"
              htmlFor="new-client-phone"
            >
              <Input id="new-client-phone" name="phone" type="tel" />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Etapa inicial" htmlFor="new-client-stage">
              <Select
                id="new-client-stage"
                name="stage"
                options={STAGE_OPTIONS}
                defaultValue="diagnosticar"
              />
            </Field>
            <Field label="Status" htmlFor="new-client-status">
              <Select
                id="new-client-status"
                name="status"
                options={STATUS_OPTIONS}
                defaultValue="ativo"
              />
            </Field>
          </div>

          {error ? (
            <p role="alert" className="text-xs text-trend-negative">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Criando…" : "Criar cliente"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

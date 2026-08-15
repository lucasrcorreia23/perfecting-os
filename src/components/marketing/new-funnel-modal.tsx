"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { createFunnel } from "@/lib/actions/marketing-funnels";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";

export function NewFunnelButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await createFunnel(String(form.get("name") ?? ""));
      if (result.ok) {
        setOpen(false);
        router.push(`/marketing/funis/${result.data.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button variant="primary" icon={PlusIcon} onClick={() => setOpen(true)}>
        Novo funil
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo funil">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field
            label="Nome do funil"
            help="Uso interno. O slug gerado a partir dele é o que o site usa para buscar as perguntas."
            htmlFor="new-funnel-name"
          >
            <Input id="new-funnel-name" name="name" required autoFocus />
          </Field>

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
              {pending ? "Criando…" : "Criar rascunho"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

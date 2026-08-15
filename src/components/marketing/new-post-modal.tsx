"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { createPost } from "@/lib/actions/marketing-posts";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";

// Só o título: o post nasce rascunho e o resto é preenchido no editor.
export function NewPostButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await createPost(String(form.get("title") ?? ""));
      if (result.ok) {
        setOpen(false);
        router.push(`/marketing/blog/${result.data.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button variant="primary" icon={PlusIcon} onClick={() => setOpen(true)}>
        Novo post
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo post">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field
            label="Título"
            help="O slug é gerado a partir do título e pode ser ajustado depois."
            htmlFor="new-post-title"
          >
            <Input id="new-post-title" name="title" required autoFocus />
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

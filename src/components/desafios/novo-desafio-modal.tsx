"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@heroicons/react/24/outline";
import {
  DESAFIO_SEVERIDADES,
  DESAFIO_SEVERIDADE_ORDER,
  DESAFIO_TIPOS,
  DESAFIO_TIPO_ORDER,
  type DesafioSeveridade,
  type DesafioTipo,
} from "@/lib/constants";
import { createDesafio } from "@/lib/actions/desafios";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import type { TaxonomiaOption } from "./desafios-view";

const SEM = "";

// Cadastro rápido: título e classificação. O relato completo (passos, esperado,
// obtido, ambiente) e o contador de recorrência vivem no detalhe — pedir tudo
// aqui faria a pessoa desistir de registrar o bug que acabou de ver.
export function NovoDesafioModal({
  categorias,
  fluxos,
}: {
  categorias: TaxonomiaOption[];
  fluxos: TaxonomiaOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await createDesafio({
        titulo: String(form.get("titulo") ?? ""),
        tipo: form.get("tipo") as DesafioTipo,
        severidade: form.get("severidade") as DesafioSeveridade,
        categoria_id: String(form.get("categoria_id") ?? "") || null,
        fluxo_id: String(form.get("fluxo_id") ?? "") || null,
      });
      if (result.ok) {
        setOpen(false);
        router.push(`/desafios/${result.data.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  // Taxonomia arquivada some daqui e continua no histórico: arquivar tira a
  // opção de cadastros novos, não reescreve o que já foi classificado.
  const opcoes = (linhas: TaxonomiaOption[], vazio: string) => [
    { value: SEM, label: vazio },
    ...linhas
      .filter((linha) => !linha.arquivada)
      .map((linha) => ({ value: linha.id, label: linha.nome })),
  ];

  return (
    <>
      <Button variant="primary" icon={PlusIcon} onClick={() => setOpen(true)}>
        Novo desafio
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo desafio"
        width="max-w-lg"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field
            label="Título"
            help="Uma frase que diga o que acontece, não o que deveria acontecer."
            htmlFor="novo-desafio-titulo"
          >
            <Input
              id="novo-desafio-titulo"
              name="titulo"
              required
              autoFocus
              maxLength={200}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipo" htmlFor="novo-desafio-tipo">
              <Select
                id="novo-desafio-tipo"
                name="tipo"
                defaultValue="bug"
                options={DESAFIO_TIPO_ORDER.map((tipo) => ({
                  value: tipo,
                  label: DESAFIO_TIPOS[tipo].label,
                }))}
              />
            </Field>
            <Field label="Severidade" htmlFor="novo-desafio-severidade">
              <Select
                id="novo-desafio-severidade"
                name="severidade"
                defaultValue="media"
                options={DESAFIO_SEVERIDADE_ORDER.map((severidade) => ({
                  value: severidade,
                  label: DESAFIO_SEVERIDADES[severidade].label,
                }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Categoria"
              help="Dá para classificar depois."
              htmlFor="novo-desafio-categoria"
            >
              <Select
                id="novo-desafio-categoria"
                name="categoria_id"
                options={opcoes(categorias, "Sem categoria")}
              />
            </Field>
            <Field label="Fluxo" htmlFor="novo-desafio-fluxo">
              <Select
                id="novo-desafio-fluxo"
                name="fluxo_id"
                options={opcoes(fluxos, "Sem fluxo")}
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
              {pending ? "Criando…" : "Criar desafio"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

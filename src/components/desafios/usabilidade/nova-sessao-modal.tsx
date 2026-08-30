"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { TESTE_FLUXO_ORDER, TESTE_FLUXOS } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { createSessao } from "@/lib/actions/usabilidade";

/*
 * Pede o MÍNIMO e navega para o detalhe — molde do `novo-desafio-modal`. As 70
 * perguntas do roteiro não cabem num modal, e pedi-las aqui faria a pessoa
 * desistir de registrar a sessão que acabou de moderar. O que este formulário
 * coleta é exatamente o que decide o roteiro (perfil, varejo) e o que indexa a
 * sessão (fluxo, data); o resto se preenche no detalhe, com a sessão já salva.
 */
export function NovaSessaoModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await createSessao({
        // O formulário escreve no MAPA DE RESPOSTAS, não em campos paralelos:
        // perfil, fluxo, varejo e data são perguntas do Bloco 0, e é
        // `prepararSessao` que as promove a coluna.
        respostas: {
          b0_perfil: String(form.get("b0_perfil") ?? ""),
          b0_fluxo: String(form.get("b0_fluxo") ?? ""),
          b0_varejo: String(form.get("b0_varejo") ?? "nao"),
          b0_data: String(form.get("b0_data") ?? ""),
        },
        observacoes: "",
        origem: "manual",
        transcricao: "",
      });

      if (result.ok) {
        setOpen(false);
        router.push(`/desafios/usabilidade/${result.data.id}`);
        return;
      }
      setError(result.error);
    });
  }

  return (
    <>
      <Button icon={PlusIcon} onClick={() => setOpen(true)}>
        Nova sessão
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova sessão de teste">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Perfil" htmlFor="nova-perfil">
            <Select
              id="nova-perfil"
              name="b0_perfil"
              defaultValue="gestor"
              options={[
                { value: "gestor", label: "Gestor" },
                { value: "vendedor", label: "Vendedor" },
              ]}
            />
          </Field>

          <Field label="Fluxo testado" htmlFor="nova-fluxo">
            <Select
              id="nova-fluxo"
              name="b0_fluxo"
              defaultValue={TESTE_FLUXO_ORDER[0]}
              options={TESTE_FLUXO_ORDER.map((id) => ({
                value: id,
                label: TESTE_FLUXOS[id].label,
              }))}
            />
          </Field>

          <Field
            label="Participante de loja física"
            help="Libera o Bloco 4 — contexto de varejo."
            htmlFor="nova-varejo"
          >
            <Select
              id="nova-varejo"
              name="b0_varejo"
              defaultValue="nao"
              options={[
                { value: "nao", label: "Não" },
                { value: "sim", label: "Sim" },
              ]}
            />
          </Field>

          <Field label="Data da sessão" htmlFor="nova-data">
            <Input id="nova-data" name="b0_data" type="date" defaultValue={todayISO()} />
          </Field>

          {error ? (
            <p role="alert" className="text-xs text-trend-negative">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-6 pt-2">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Criando…" : "Criar sessão"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

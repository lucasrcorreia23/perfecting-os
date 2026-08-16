"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkCalculatorToClient } from "@/lib/actions/calculator-links";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

export type ClienteOption = { id: string; name: string; company: string | null };

// Importa uma calculadora (avulsa ou de outro cliente) para o perfil do
// cliente escolhido — o preenchimento e o rastreio vão juntos.
export function VincularClienteModal({
  open,
  onClose,
  linkId,
  linkNome,
  clientes,
  clienteAtualId = null,
  irParaClienteAoConcluir = false,
}: {
  open: boolean;
  onClose: () => void;
  linkId: string | null;
  linkNome: string;
  clientes: ClienteOption[];
  clienteAtualId?: string | null;
  irParaClienteAoConcluir?: boolean;
}) {
  const router = useRouter();
  const [clienteId, setClienteId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const opcoes = clientes
    .filter((cliente) => cliente.id !== clienteAtualId)
    .map((cliente) => ({
      value: cliente.id,
      label: cliente.company ? `${cliente.name} · ${cliente.company}` : cliente.name,
    }));

  function fechar() {
    onClose();
    setClienteId("");
    setError(null);
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={clienteAtualId ? "Mover para outro cliente" : "Vincular a um cliente"}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!linkId || !clienteId) return;
          setError(null);
          startTransition(async () => {
            const result = await linkCalculatorToClient(linkId, clienteId);
            if (result.ok) {
              fechar();
              if (irParaClienteAoConcluir) {
                router.push(`/clientes/${clienteId}?tab=calculadora`);
              } else {
                router.refresh();
              }
            } else {
              setError(result.error);
            }
          });
        }}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">{linkNome}</span> passa a
          aparecer na aba Calculadora do cliente escolhido, com o preenchimento e o
          rastreio completos.
        </p>

        <Field label="Cliente" htmlFor="vincular-cliente">
          <Select
            id="vincular-cliente"
            options={[{ value: "", label: "Escolha um cliente…" }, ...opcoes]}
            value={clienteId}
            onChange={(event) => setClienteId(event.target.value)}
            required
          />
        </Field>

        {error ? (
          <p role="alert" className="text-xs text-trend-negative">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={pending || !clienteId}>
            {pending ? "Vinculando…" : "Vincular"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

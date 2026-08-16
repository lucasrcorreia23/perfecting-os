"use client";

import { useState, useTransition } from "react";
import { createCalculatorLink } from "@/lib/actions/calculator-links";
import { dateInputToISO, toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";

function defaultExpiracao(): string {
  return toDateInputValue(new Date(Date.now() + 30 * 86_400_000).toISOString());
}

// O interno só define validade e identificação: a PROPOSTA inteira (times,
// plano, assentos, prazo) é montada pelo próprio visitante na página.
// clientId null = calculadora avulsa ("Gerar calculadora"), importável depois
// para qualquer cliente.
export function EncaminharCalculadoraModal({
  clientId,
  clientName,
  open,
  onClose,
}: {
  clientId: string | null;
  clientName: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [expiraEm, setExpiraEm] = useState(defaultExpiracao);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [urlGerada, setUrlGerada] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const avulso = clientId === null;

  function fechar() {
    onClose();
    // Limpa o resultado ao fechar; o formulário fica para reabrir rápido.
    setUrlGerada(null);
    setError(null);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCalculatorLink(clientId, {
        label: label || null,
        expiresAt: dateInputToISO(expiraEm),
      });
      if (result.ok) {
        setUrlGerada(result.data.url);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={avulso ? "Gerar calculadora" : "Encaminhar calculadora"}
    >
      {urlGerada ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            {avulso ? (
              <>
                Link gerado. Quem abrir preenche os próprios números, monta a
                proposta (plano, assentos, prazo) e envia. Depois você importa o
                resultado para o perfil do cliente que quiser.
              </>
            ) : (
              <>
                Link gerado para{" "}
                <span className="font-medium text-slate-900">{clientName}</span>. Quem
                abrir preenche os próprios números, monta a proposta e envia; tudo
                aparece na aba Calculadora deste cliente.
              </>
            )}
          </p>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5">
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
              {urlGerada}
            </span>
            <CopyButton text={urlGerada} label="Copiar link" />
          </div>
          <p className="text-xs text-slate-500">
            O link expira em {expiraEm.split("-").reverse().join("/")} e pode ser
            revogado ou prorrogado a qualquer momento.
          </p>
          <div className="flex items-center justify-end pt-1">
            <Button variant="primary" onClick={fechar}>
              Concluir
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Link expira em" htmlFor="calc-expira">
            <Input
              id="calc-expira"
              type="date"
              value={expiraEm}
              onChange={(event) => setExpiraEm(event.target.value)}
              required
              autoFocus
            />
          </Field>

          <Field
            label="Identificação interna (opcional)"
            help=""
            htmlFor="calc-label"
          >
            <Input
              id="calc-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={120}
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
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Gerando…" : "Gerar link"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

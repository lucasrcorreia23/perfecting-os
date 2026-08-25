"use client";

import { useState, useTransition } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  dateTimeInputToISO,
  formatDateTime,
  toDateTimeInputValue,
} from "@/lib/format";
import { addOcorrencia, deleteOcorrencia } from "@/lib/actions/desafios";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import type { OcorrenciaRow } from "./desafios-view";

/*
 * O log. Uma linha é uma SESSÃO DE MEDIÇÃO, não uma tentativa: "de 10, 7
 * bugaram" é UMA linha, e é por isso que não existe um par falhou/passou aqui —
 * ele cobraria dez cliques para registrar a frase que originou o módulo.
 *
 * Ocorrência é medição imutável: não se edita, registra-se de novo. Corrigir um
 * número errado é excluir a linha e lançar a certa.
 */
export function OcorrenciasCard({
  desafioId,
  ocorrencias,
}: {
  desafioId: string;
  ocorrencias: OcorrenciaRow[];
}) {
  const [registrando, setRegistrando] = useState(false);
  const [excluindo, setExcluindo] = useState<OcorrenciaRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xs font-semibold text-slate-500">Ocorrências</h2>
          <p className="max-w-lg text-xs text-slate-500">
            Cada linha é uma sessão de teste. Registrar a primeira faz a
            recorrência passar a vir daqui.
          </p>
        </div>
        <Button
          icon={PlusIcon}
          size="sm"
          onClick={() => {
            setError(null);
            setRegistrando(true);
          }}
        >
          Registrar ocorrência
        </Button>
      </div>

      {ocorrencias.length === 0 ? (
        <EmptyState
          icon={ClipboardDocumentCheckIcon}
          title="Nenhuma ocorrência registrada"
          description="Enquanto não houver nenhuma, a recorrência vem do contador manual ao lado."
          discreet
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {ocorrencias.map((ocorrencia) => (
            <li
              key={ocorrencia.id}
              className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium tabular-nums text-slate-800">
                    {ocorrencia.falhas} de {ocorrencia.tentativas} falharam
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(ocorrencia.ocorrido_em)}
                  </span>
                </div>
                {ocorrencia.nota ? (
                  <p className="whitespace-pre-wrap break-words text-xs text-slate-600">
                    {ocorrencia.nota}
                  </p>
                ) : null}
                {ocorrencia.ambiente ? (
                  <p className="text-xs text-slate-500">{ocorrencia.ambiente}</p>
                ) : null}
              </div>
              <Button
                variant="tertiary"
                size="sm"
                icon={TrashIcon}
                aria-label="Excluir ocorrência"
                onClick={() => {
                  setError(null);
                  setExcluindo(ocorrencia);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      {registrando ? (
        <NovaOcorrenciaModal
          desafioId={desafioId}
          onClose={() => setRegistrando(false)}
        />
      ) : null}

      <ConfirmModal
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        tone="danger"
        title="Excluir esta ocorrência?"
        description="A recorrência é recalculada sem ela. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={() => {
          const alvo = excluindo;
          if (!alvo) return;
          startTransition(async () => {
            const result = await deleteOcorrencia(alvo.id, desafioId);
            if (result.ok) setExcluindo(null);
            else setError(result.error);
          });
        }}
      />
    </section>
  );
}

function NovaOcorrenciaModal({
  desafioId,
  onClose,
}: {
  desafioId: string;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const agora = toDateTimeInputValue(new Date().toISOString());

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await addOcorrencia(desafioId, {
        ocorrido_em: dateTimeInputToISO(String(form.get("ocorrido_em") ?? "")),
        tentativas: Number(form.get("tentativas") ?? 1),
        falhas: Number(form.get("falhas") ?? 0),
        nota: String(form.get("nota") ?? ""),
        ambiente: String(form.get("ambiente") ?? ""),
      });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Modal open onClose={onClose} title="Registrar ocorrência" width="max-w-lg">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Tentativas"
            help="Quantas vezes você tentou."
            htmlFor="ocorrencia-tentativas"
          >
            <Input
              id="ocorrencia-tentativas"
              name="tentativas"
              type="number"
              min={1}
              step={1}
              defaultValue={1}
              required
              autoFocus
            />
          </Field>
          <Field
            label="Falhas"
            help="Quantas delas quebraram."
            htmlFor="ocorrencia-falhas"
          >
            <Input
              id="ocorrencia-falhas"
              name="falhas"
              type="number"
              min={0}
              step={1}
              defaultValue={1}
              required
            />
          </Field>
        </div>
        <Field label="Quando" htmlFor="ocorrencia-quando">
          <Input
            id="ocorrencia-quando"
            name="ocorrido_em"
            type="datetime-local"
            defaultValue={agora}
            required
          />
        </Field>
        <Field label="Ambiente" htmlFor="ocorrencia-ambiente">
          <Input
            id="ocorrencia-ambiente"
            name="ambiente"
            placeholder="iPhone 15 · iOS 18 · Safari"
          />
        </Field>
        <Field label="Nota" htmlFor="ocorrencia-nota">
          <Textarea id="ocorrencia-nota" name="nota" className="min-h-20" />
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
            {pending ? "Registrando…" : "Registrar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

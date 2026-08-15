"use client";

import { useState, useTransition } from "react";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { setLeadNotes, setLeadStatus } from "@/lib/actions/marketing-leads";
import {
  LEAD_STATUSES,
  LEAD_STATUS_ORDER,
  type LeadStatus,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { scoreSubmission, type AnswerValue } from "@/lib/marketing-answers";
import type { FunnelQuestion } from "@/lib/marketing-funnel";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { QualificacaoChip } from "@/components/ui/qualificacao-chip";
import { Select } from "@/components/ui/select";
import { TextLink } from "@/components/ui/text-link";
import type { LeadRow } from "./leads-view";

// Só os status manuais: "convertido" vem da conversão em cliente.
const STATUS_OPTIONS = LEAD_STATUS_ORDER.filter(
  (status) => status !== "convertido",
).map((status) => ({ value: status, label: LEAD_STATUSES[status].label }));

function answerLabel(question: FunnelQuestion, value: AnswerValue | undefined) {
  if (value === undefined) return "—";
  if (Array.isArray(value)) {
    const labels = value.map(
      (id) => question.options.find((option) => option.id === id)?.label ?? id,
    );
    return labels.join(", ") || "—";
  }
  if (question.options.length > 0 && typeof value === "string") {
    return question.options.find((option) => option.id === value)?.label ?? value;
  }
  return String(value);
}

// A key por lead remonta o conteúdo ao trocar de lead — sem isso o estado
// local precisaria ser sincronizado num efeito.
export function LeadDetailModal({
  lead,
  onClose,
  onConvert,
}: {
  lead: LeadRow | null;
  onClose: () => void;
  onConvert: (lead: LeadRow) => void;
}) {
  if (!lead) return null;
  return (
    <LeadDetail key={lead.id} lead={lead} onClose={onClose} onConvert={onConvert} />
  );
}

function LeadDetail({
  lead,
  onClose,
  onConvert,
}: {
  lead: LeadRow;
  onClose: () => void;
  onConvert: (lead: LeadRow) => void;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Recalculado contra a versão congelada: o detalhamento por pergunta segue
  // fiel ao que o visitante viu, mesmo depois de publicar uma versão nova.
  const scored = scoreSubmission({
    questions: lead.questions,
    answers: lead.answers,
    thresholds: { morno: 40, quente: 70 },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={lead.name || lead.email || "Lead sem nome"}
      width="max-w-2xl"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <QualificacaoChip qualificacao={lead.qualificacao} />
          <span className="text-sm tabular-nums text-slate-600">
            {lead.score}/{lead.scoreMax} pontos · {lead.scorePct}%
          </span>
          <span className="text-xs text-slate-500">
            {lead.funnelName}
            {lead.version ? ` · v${lead.version}` : ""} ·{" "}
            {formatDateTime(lead.created_at)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { label: "E-mail", value: lead.email },
            { label: "Telefone", value: lead.phone },
            { label: "Empresa", value: lead.company },
            { label: "Cargo", value: lead.roleTitle },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500">{item.label}</span>
              <span className="text-sm text-slate-800">{item.value || "—"}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Respostas
          </span>
          {lead.questions.length === 0 ? (
            <p className="text-sm text-slate-500">
              A versão do funil usada neste envio não está mais disponível.
            </p>
          ) : (
            <div className="flex flex-col gap-3 rounded-sm border border-slate-200 bg-white p-4">
              {lead.questions.map((question, index) => {
                const points = scored.breakdown[index];
                return (
                  <div
                    key={question.id}
                    className="flex flex-col gap-1 border-slate-100 [&:not(:first-child)]:border-t [&:not(:first-child)]:pt-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs text-slate-500">{question.label}</span>
                      {points && points.max > 0 ? (
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">
                          {points.points}/{points.max}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-sm text-slate-800">
                      {answerLabel(question, lead.answers[question.id])}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {lead.sourceUrl ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500">Página de origem</span>
            <span className="break-all text-sm text-slate-800">{lead.sourceUrl}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="lead-status">
            <Select
              id="lead-status"
              options={STATUS_OPTIONS}
              value={status}
              disabled={lead.status === "convertido"}
              onChange={(event) => {
                const next = event.target.value as LeadStatus;
                setStatus(next);
                setError(null);
                startTransition(async () => {
                  const result = await setLeadStatus(lead.id, next);
                  if (!result.ok) setError(result.error);
                });
              }}
            />
          </Field>
          {lead.clientId ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Cliente</span>
              <TextLink href={`/clientes/${lead.clientId}`}>
                Ver cliente criado a partir deste lead
              </TextLink>
            </div>
          ) : null}
        </div>

        <Field label="Notas internas" htmlFor="lead-notes">
          <Textarea
            id="lead-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => {
              if (notes === (lead.notes ?? "")) return;
              startTransition(async () => {
                const result = await setLeadNotes(lead.id, notes);
                if (!result.ok) setError(result.error);
              });
            }}
            className="min-h-20"
          />
        </Field>

        {error ? (
          <p role="alert" className="text-xs text-trend-negative">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          {!lead.clientId ? (
            <Button
              variant="primary"
              icon={UserPlusIcon}
              disabled={pending}
              onClick={() => onConvert(lead)}
            >
              Converter em cliente
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

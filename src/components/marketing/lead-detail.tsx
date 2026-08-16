"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  TrashIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { deleteLead, setLeadNotes, setLeadStatus } from "@/lib/actions/marketing-leads";
import {
  LEAD_STATUSES,
  LEAD_STATUS_ORDER,
  QUALIFICACOES,
  type LeadStatus,
} from "@/lib/constants";
import { downloadText } from "@/lib/download";
import { formatDateTime } from "@/lib/format";
import { scoreSubmission } from "@/lib/marketing-answers";
import {
  csvFilename,
  formatAnswer,
  leadsToCsv,
} from "@/lib/marketing-lead-export";
import { cn } from "@/lib/utils";
import { ActionMenu, DropdownMenu } from "@/components/ui/action-menu";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { CopyButton } from "@/components/ui/copy-button";
import { Field, Textarea } from "@/components/ui/form";
import { LeadStatusChip } from "@/components/ui/lead-status-chip";
import { QualificacaoChip } from "@/components/ui/qualificacao-chip";
import { Select } from "@/components/ui/select";
import { ConvertLeadModal } from "./convert-lead-modal";
import type { LeadRow } from "./leads-view";

// "convertido" nunca é escolhido à mão: vem da conversão em cliente.
const STATUS_OPTIONS = LEAD_STATUS_ORDER.filter(
  (status) => status !== "convertido",
).map((status) => ({ value: status, label: LEAD_STATUSES[status].label }));

const UTM_LABELS: Record<string, string> = {
  source: "Origem (source)",
  medium: "Mídia (medium)",
  campaign: "Campanha (campaign)",
  term: "Termo (term)",
  content: "Conteúdo (content)",
};

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold text-slate-500">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function DataRow({
  label,
  value,
  copyText,
  href,
}: {
  label: string;
  value: string | null;
  copyText?: string;
  href?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-slate-500">{label}</span>
        {value ? (
          href ? (
            <a
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="break-all text-sm text-primary hover:text-primary-link-hover hover:underline"
            >
              {value}
            </a>
          ) : (
            <span className="break-all text-sm text-slate-800">{value}</span>
          )
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </div>
      {value && copyText ? (
        <CopyButton text={copyText} label={`Copiar ${label.toLowerCase()}`} />
      ) : null}
    </div>
  );
}

export function LeadDetail({ lead }: { lead: LeadRow }) {
  const router = useRouter();
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  // Recalculado contra a versão congelada do funil: o detalhamento por
  // pergunta segue fiel ao que o visitante viu. Só o breakdown é usado — o
  // total e a faixa exibidos são os que o banco guardou no envio.
  const scored = scoreSubmission({
    questions: lead.questions,
    answers: lead.answers,
    thresholds: { morno: 40, quente: 70 },
  });
  const pointsById = new Map(scored.breakdown.map((item) => [item.questionId, item]));

  const title = lead.name || lead.email || "Lead sem nome";
  const whatsappDigits = (lead.phone ?? "").replace(/\D/g, "");

  function exportCsv() {
    downloadText(
      csvFilename(`lead-${title}`, lead.created_at),
      leadsToCsv([lead]),
    );
  }

  function answersAsText(): string {
    const header = [
      title,
      lead.email,
      lead.phone,
      `${lead.funnelName}${lead.version ? ` v${lead.version}` : ""}`,
      `${lead.score}/${lead.scoreMax} pontos (${lead.scorePct}%) · ${QUALIFICACOES[lead.qualificacao].label}`,
    ]
      .filter(Boolean)
      .join("\n");
    const body = lead.questions
      .map(
        (question) =>
          `${question.label}\n${formatAnswer(question, lead.answers[question.id]) || "—"}`,
      )
      .join("\n\n");
    return `${header}\n\n${body}`;
  }

  function saveNotes(value: string) {
    if (value === (lead.notes ?? "")) return;
    setError(null);
    startTransition(async () => {
      const result = await setLeadNotes(lead.id, value);
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <BackButton href="/marketing/leads" />
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            <QualificacaoChip qualificacao={lead.qualificacao} />
            <LeadStatusChip status={status} />
            <span className="text-xs text-slate-500">
              {lead.funnelName}
              {lead.version ? ` · v${lead.version}` : ""} ·{" "}
              {formatDateTime(lead.created_at)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu
            ariaLabel="Exportar lead"
            align="right"
            triggerClassName={cn(
              "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-medium sm:h-10",
              "border border-slate-200 bg-white text-slate-900",
              "transition-colors hover:border-slate-300 hover:bg-[#f8fafc]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
            trigger={
              <>
                <ArrowDownTrayIcon className="h-5 w-5" aria-hidden />
                <span className="hidden sm:inline">Exportar</span>
                <ChevronDownIcon className="h-4 w-4 text-slate-400" aria-hidden />
              </>
            }
            items={[
              {
                label: "Baixar planilha (CSV)",
                icon: ArrowDownTrayIcon,
                onSelect: exportCsv,
              },
              {
                label: "Copiar respostas",
                icon: ClipboardDocumentIcon,
                onSelect: () => {
                  void navigator.clipboard?.writeText(answersAsText());
                },
              },
            ]}
          />

          {lead.clientId ? (
            <Button
              variant="primary"
              icon={UserGroupIcon}
              onClick={() => router.push(`/clientes/${lead.clientId}`)}
            >
              Ver cliente
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={UserPlusIcon}
              onClick={() => setConverting(true)}
            >
              Converter em cliente
            </Button>
          )}

          <ActionMenu
            ariaLabel={`Ações do lead ${title}`}
            items={[
              {
                label: "Ver funil",
                icon: ArrowTopRightOnSquareIcon,
                href: `/marketing/funis/${lead.funnelId}`,
              },
              {
                label: "Excluir lead",
                icon: TrashIcon,
                destructive: true,
                onSelect: () => setDeleting(true),
              },
            ]}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card
            title="Respostas"
            action={
              <span className="text-xs tabular-nums text-slate-500">
                {lead.questions.length} perguntas
              </span>
            }
          >
            {lead.questions.length === 0 ? (
              <p className="text-sm text-slate-500">
                A versão do funil usada neste envio não está mais disponível, então
                as perguntas não podem ser remontadas.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {lead.questions.map((question) => {
                  const points = pointsById.get(question.id);
                  const answer = formatAnswer(question, lead.answers[question.id]);
                  return (
                    <div
                      key={question.id}
                      className="flex flex-col gap-1.5 border-slate-100 [&:not(:first-child)]:border-t [&:not(:first-child)]:pt-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-xs text-slate-500">
                          {question.label}
                        </span>
                        {points && points.max > 0 ? (
                          <span className="shrink-0 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] tabular-nums text-slate-500">
                            {points.points}/{points.max} pts
                          </span>
                        ) : null}
                      </div>
                      {answer ? (
                        // pre-wrap: resposta de texto longo mantém as quebras
                        // que o visitante digitou em vez de virar um parágrafo.
                        <p className="whitespace-pre-wrap break-words text-sm text-slate-800">
                          {answer}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400">Não respondida</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Pontuação">
            <div className="flex flex-col gap-3">
              <div className="flex items-end justify-between gap-3">
                <span className="text-(length:--text-score-md) font-semibold leading-none tabular-nums text-slate-900">
                  {lead.scorePct}%
                </span>
                <span className="pb-1 text-sm tabular-nums text-slate-500">
                  {lead.score} de {lead.scoreMax} pontos
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-slate-100"
                role="img"
                aria-label={`${lead.scorePct}% da pontuação máxima`}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, lead.scorePct))}%`,
                    backgroundColor: QUALIFICACOES[lead.qualificacao].color,
                  }}
                />
              </div>
              <span className="text-xs text-slate-500">
                Faixa congelada no envio, contra a versão do funil que o visitante
                respondeu.
              </span>
            </div>
          </Card>

          <Card title="Contato">
            <div className="flex flex-col gap-4">
              <DataRow
                label="E-mail"
                value={lead.email}
                copyText={lead.email ?? undefined}
                href={lead.email ? `mailto:${lead.email}` : undefined}
              />
              <DataRow
                label="Telefone"
                value={lead.phone}
                copyText={lead.phone ?? undefined}
                href={whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined}
              />
              <DataRow label="Empresa" value={lead.company} />
              <DataRow label="Cargo" value={lead.roleTitle} />
            </div>
            {lead.email || whatsappDigits ? (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {lead.email ? (
                  <Button
                    size="sm"
                    icon={EnvelopeIcon}
                    onClick={() => window.open(`mailto:${lead.email}`, "_self")}
                  >
                    E-mail
                  </Button>
                ) : null}
                {whatsappDigits ? (
                  <Button
                    size="sm"
                    icon={ChatBubbleLeftRightIcon}
                    onClick={() =>
                      window.open(
                        `https://wa.me/${whatsappDigits}`,
                        "_blank",
                        "noopener",
                      )
                    }
                  >
                    WhatsApp
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Card>

          <Card title="Origem">
            <div className="flex flex-col gap-4">
              <DataRow label="Recebido em" value={formatDateTime(lead.created_at)} />
              <DataRow
                label="Página de origem"
                value={lead.sourceUrl}
                href={lead.sourceUrl ?? undefined}
              />
              {Object.keys(lead.utm).length > 0 ? (
                Object.entries(lead.utm).map(([key, value]) => (
                  <DataRow key={key} label={UTM_LABELS[key] ?? key} value={value} />
                ))
              ) : (
                <DataRow label="UTM" value={null} />
              )}
            </div>
          </Card>

          <Card
            title="Gestão"
            action={
              saved ? (
                <span aria-live="polite" className="text-xs text-trend-positive">
                  Salvo
                </span>
              ) : null
            }
          >
            <div className="flex flex-col gap-4">
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
                      if (result.ok) {
                        setSaved(true);
                        setTimeout(() => setSaved(false), 2000);
                      } else {
                        setError(result.error);
                      }
                    });
                  }}
                />
              </Field>

              <Field
                label="Notas internas"
                help="Salvas ao sair do campo."
                htmlFor="lead-notes"
              >
                <Textarea
                  id="lead-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  onBlur={(event) => saveNotes(event.target.value)}
                  className="min-h-28"
                />
              </Field>

              {lead.clientId ? (
                <Link
                  href={`/clientes/${lead.clientId}`}
                  className="text-sm font-medium text-primary hover:text-primary-link-hover hover:underline"
                >
                  Ver o cliente criado a partir deste lead
                </Link>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      {converting ? (
        <ConvertLeadModal lead={lead} onClose={() => setConverting(false)} />
      ) : null}

      <ConfirmModal
        open={deleting}
        onClose={() => setDeleting(false)}
        tone="danger"
        title="Excluir lead?"
        description="As respostas enviadas serão apagadas permanentemente. O cliente já criado a partir deste lead, se houver, não é afetado."
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={() => {
          setError(null);
          startTransition(async () => {
            const result = await deleteLead(lead.id);
            if (result.ok) {
              router.push("/marketing/leads");
            } else {
              setDeleting(false);
              setError(result.error);
            }
          });
        }}
      />
    </div>
  );
}

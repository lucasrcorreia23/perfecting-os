"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  LinkIcon,
  NoSymbolIcon,
  TrashIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import {
  deleteCalculatorLink,
  extendCalculatorLink,
  getCalculatorLinkUrl,
  revokeCalculatorLink,
  rotateCalculatorLink,
} from "@/lib/actions/calculator-links";
import { formatX } from "@/lib/calculadora/format";
import { linkStatus } from "@/lib/calculadora/link-status";
import { parseResumo } from "@/lib/calculadora/modelo";
import type { LinkStatus } from "@/lib/calculadora/types";
import type { Tables } from "@/lib/database.types";
import {
  dateInputToISO,
  formatDate,
  formatRelativeTime,
  toDateInputValue,
} from "@/lib/format";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { CalculatorStatusChip } from "@/components/ui/calculator-status-chip";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteNamedModal } from "@/components/ui/delete-named-modal";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { VincularClienteModal, type ClienteOption } from "./vincular-modal";

export type LinkRow = Tables<"calculator_links">;

export function nomeDoLink(link: LinkRow): string {
  return link.label ?? `Calculadora de ${formatDate(link.created_at)}`;
}

export function statusDoLink(link: LinkRow): LinkStatus {
  return linkStatus({
    revokedAt: link.revoked_at,
    expiresAt: link.expires_at,
    submittedAt: link.submitted_at,
  });
}

// Tabela compartilhada de links da calculadora: usada na aba do cliente e na
// seção "Calculadoras avulsas" da listagem. As ações (copiar, prorrogar,
// revogar, rotacionar, vincular, excluir) vivem aqui.
export function LinksTable({
  links,
  detailHrefFor,
  clientes = [],
  clienteAtualId = null,
  empty,
}: {
  links: LinkRow[];
  detailHrefFor: (link: LinkRow) => string;
  clientes?: ClienteOption[];
  clienteAtualId?: string | null;
  empty: ReactNode;
}) {
  const router = useRouter();
  const [revogando, setRevogando] = useState<LinkRow | null>(null);
  const [rotacionando, setRotacionando] = useState<LinkRow | null>(null);
  const [prorrogando, setProrrogando] = useState<LinkRow | null>(null);
  const [excluindo, setExcluindo] = useState<LinkRow | null>(null);
  const [vinculando, setVinculando] = useState<LinkRow | null>(null);
  const [novaExpiracao, setNovaExpiracao] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function copiarLink(link: LinkRow) {
    setFeedback(null);
    startTransition(async () => {
      const result = await getCalculatorLinkUrl(link.id);
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      try {
        await navigator.clipboard.writeText(result.data.url);
        setFeedback("Link copiado.");
      } catch {
        setFeedback(result.data.url);
      }
    });
  }

  function menuFor(link: LinkRow) {
    const status = statusDoLink(link);
    return (
      <ActionMenu
        ariaLabel={`Ações de ${nomeDoLink(link)}`}
        items={[
          {
            label: "Ver detalhe",
            icon: ArrowRightIcon,
            href: detailHrefFor(link),
          },
          {
            label: "Copiar link",
            icon: LinkIcon,
            onSelect: () => copiarLink(link),
            disabled: status === "revogado" || status === "expirado",
          },
          ...(clientes.length > 0
            ? [
                {
                  label: link.client_id ? "Mover para outro cliente" : "Vincular a cliente",
                  icon: UserPlusIcon,
                  onSelect: () => setVinculando(link),
                },
              ]
            : []),
          {
            label: "Prorrogar validade",
            icon: CalendarDaysIcon,
            onSelect: () => {
              setNovaExpiracao(
                toDateInputValue(new Date(Date.now() + 30 * 86_400_000).toISOString()),
              );
              setProrrogando(link);
            },
          },
          {
            label: "Gerar nova URL",
            icon: ArrowPathIcon,
            onSelect: () => setRotacionando(link),
          },
          {
            label: "Revogar link",
            icon: NoSymbolIcon,
            onSelect: () => setRevogando(link),
            disabled: status === "revogado",
          },
          {
            label: "Excluir",
            icon: TrashIcon,
            destructive: true,
            onSelect: () => setExcluindo(link),
          },
        ]}
      />
    );
  }

  function roiDe(link: LinkRow): string {
    const resumo = parseResumo(link.result_summary);
    return formatX(resumo?.consolidado?.roi ?? null);
  }

  function progressoDe(link: LinkRow): string {
    const resumo = parseResumo(link.result_summary);
    if (!resumo) return "—";
    return `${resumo.progresso.preenchidos}/${resumo.progresso.total}`;
  }

  const columns: Column<LinkRow>[] = [
    {
      key: "link",
      header: "Link",
      render: (link) => (
        <span className="flex flex-col gap-0.5">
          <span className="text-slate-900">{nomeDoLink(link)}</span>
          <span className="text-xs font-normal text-slate-500">
            Expira {formatDate(link.expires_at)}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (link) => <CalculatorStatusChip status={statusDoLink(link)} />,
    },
    {
      key: "acessos",
      header: "Acessos",
      render: (link) => (
        <span className="flex flex-col gap-0.5 tabular-nums">
          <span>{link.access_count}</span>
          {link.last_access_at ? (
            <span className="text-xs font-normal text-slate-500">
              {formatRelativeTime(link.last_access_at)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "progresso",
      header: "Progresso",
      render: (link) => <span className="tabular-nums">{progressoDe(link)}</span>,
    },
    {
      key: "roi",
      header: "ROI projetado",
      render: (link) => <span className="tabular-nums">{roiDe(link)}</span>,
    },
    {
      key: "acoes",
      header: <span className="sr-only">Ações</span>,
      className: "w-14 text-right",
      render: (link) => menuFor(link),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {feedback ? (
        <p role="status" className="break-all text-xs text-slate-500">
          {feedback}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={links}
        rowKey={(link) => link.id}
        rowHref={detailHrefFor}
        empty={empty}
        mobileCard={(link) => (
          <div className="flex flex-col gap-3 rounded-sm border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-slate-900">
                  {nomeDoLink(link)}
                </span>
                <span className="text-xs text-slate-500">
                  Expira {formatDate(link.expires_at)}
                </span>
              </span>
              {menuFor(link)}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <CalculatorStatusChip status={statusDoLink(link)} compact />
              <span className="tabular-nums">{link.access_count} acessos</span>
              <span className="tabular-nums">Progresso {progressoDe(link)}</span>
              <span className="tabular-nums">ROI {roiDe(link)}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={ArrowRightIcon}
              onClick={() => router.push(detailHrefFor(link))}
            >
              Ver detalhe
            </Button>
          </div>
        )}
      />

      <ConfirmModal
        open={revogando !== null}
        onClose={() => setRevogando(null)}
        tone="warning"
        title="Revogar link"
        description="Quem tiver a URL deixa de acessar imediatamente. Os dados já preenchidos continuam visíveis aqui. Dá para reativar depois prorrogando a validade."
        confirmLabel="Revogar"
        loading={pending}
        onConfirm={() => {
          if (!revogando) return;
          startTransition(async () => {
            const result = await revokeCalculatorLink(revogando.id);
            setRevogando(null);
            setFeedback(result.ok ? "Link revogado." : result.error);
          });
        }}
      />

      <ConfirmModal
        open={rotacionando !== null}
        onClose={() => setRotacionando(null)}
        tone="warning"
        title="Gerar nova URL"
        description="A URL antiga morre na hora: quem só tem a antiga perde o acesso. A nova é copiada para a área de transferência."
        confirmLabel="Gerar nova URL"
        loading={pending}
        onConfirm={() => {
          if (!rotacionando) return;
          startTransition(async () => {
            const result = await rotateCalculatorLink(rotacionando.id);
            setRotacionando(null);
            if (result.ok) {
              try {
                await navigator.clipboard.writeText(result.data.url);
                setFeedback("Nova URL copiada.");
              } catch {
                setFeedback(result.data.url);
              }
            } else {
              setFeedback(result.error);
            }
          });
        }}
      />

      <Modal
        open={prorrogando !== null}
        onClose={() => setProrrogando(null)}
        title="Prorrogar validade"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!prorrogando) return;
            startTransition(async () => {
              const result = await extendCalculatorLink(
                prorrogando.id,
                dateInputToISO(novaExpiracao),
              );
              setProrrogando(null);
              setFeedback(result.ok ? "Validade prorrogada." : result.error);
            });
          }}
          className="flex flex-col gap-4"
        >
          <Field
            label="Nova data de expiração"
            help="Prorrogar também reativa um link revogado."
            htmlFor="prorrogar-data"
          >
            <Input
              id="prorrogar-data"
              type="date"
              value={novaExpiracao}
              onChange={(event) => setNovaExpiracao(event.target.value)}
              required
            />
          </Field>
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setProrrogando(null)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Salvando…" : "Prorrogar"}
            </Button>
          </div>
        </form>
      </Modal>

      <VincularClienteModal
        open={vinculando !== null}
        onClose={() => setVinculando(null)}
        linkId={vinculando?.id ?? null}
        linkNome={vinculando ? nomeDoLink(vinculando) : ""}
        clientes={clientes}
        clienteAtualId={clienteAtualId}
      />

      <DeleteNamedModal
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        itemName={excluindo ? nomeDoLink(excluindo) : ""}
        title="Excluir calculadora"
        description="O link, o preenchimento e todo o rastreio serão excluídos permanentemente."
        loading={pending}
        onConfirm={() => {
          if (!excluindo) return;
          startTransition(async () => {
            const result = await deleteCalculatorLink(excluindo.id);
            setExcluindo(null);
            setFeedback(result.ok ? "Calculadora excluída." : result.error);
          });
        }}
      />
    </div>
  );
}

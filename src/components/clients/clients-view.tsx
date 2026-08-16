"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowRightIcon,
  CalculatorIcon,
  PencilSquareIcon,
  TrashIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { deleteClient } from "@/lib/actions/clients";
import { daysSince } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { EncaminharCalculadoraModal } from "@/components/calculadora/encaminhar-modal";
import { LinksTable, type LinkRow } from "@/components/calculadora/links-table";
import type { ClienteOption } from "@/components/calculadora/vincular-modal";
import { ActionMenu } from "@/components/ui/action-menu";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { DeleteNamedModal } from "@/components/ui/delete-named-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { StageBadge } from "@/components/ui/stage-badge";
import { StatusChip } from "@/components/ui/status-chip";
import { NewClientButton } from "./new-client-modal";

export type ClientRow = Tables<"clients"> & {
  activities: Pick<Tables<"activities">, "id" | "status">[];
};

function activityCounts(client: ClientRow) {
  const total = client.activities.length;
  const done = client.activities.filter(
    (activity) => activity.status === "concluida",
  ).length;
  return { done, total };
}

function DaysInStage({
  client,
  stageDeadlineDays,
}: {
  client: ClientRow;
  stageDeadlineDays: number;
}) {
  const days = daysSince(client.stage_entered_at);
  const over = days > stageDeadlineDays;
  return (
    <span
      className={cn(
        "tabular-nums",
        over ? "font-semibold text-trend-negative" : "text-slate-600",
      )}
    >
      {days}/{stageDeadlineDays}
    </span>
  );
}

export function ClientsView({
  clients,
  stageDeadlineDays,
  avulsas = [],
  clienteOptions = [],
}: {
  clients: ClientRow[];
  stageDeadlineDays: number;
  avulsas?: LinkRow[];
  clienteOptions?: ClienteOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<ClientRow | null>(null);
  const [encaminhando, setEncaminhando] = useState<ClientRow | null>(null);
  const [gerandoAvulsa, setGerandoAvulsa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(term) ||
        (client.company ?? "").toLowerCase().includes(term),
    );
  }, [clients, query]);

  function menuFor(client: ClientRow) {
    return (
      <ActionMenu
        ariaLabel={`Ações de ${client.name}`}
        items={[
          {
            label: "Ver perfil",
            icon: ArrowRightIcon,
            href: `/clientes/${client.id}`,
          },
          {
            label: "Editar",
            icon: PencilSquareIcon,
            href: `/clientes/${client.id}?tab=dados`,
          },
          {
            label: "Encaminhar calculadora",
            icon: CalculatorIcon,
            onSelect: () => setEncaminhando(client),
          },
          {
            label: "Excluir",
            icon: TrashIcon,
            destructive: true,
            onSelect: () => setDeleting(client),
          },
        ]}
      />
    );
  }

  const columns: Column<ClientRow>[] = [
    {
      key: "cliente",
      header: "Cliente",
      render: (client) => (
        <span className="flex items-center gap-3">
          <Avatar name={client.name} size={32} />
          <span className="flex flex-col">
            <span className="text-sm font-medium text-slate-800">
              {client.name}
            </span>
            {client.company ? (
              <span className="text-xs font-normal text-slate-500">
                {client.company}
              </span>
            ) : null}
          </span>
        </span>
      ),
    },
    {
      key: "etapa",
      header: "Etapa",
      render: (client) => <StageBadge stage={client.stage} />,
    },
    {
      key: "status",
      header: "Status",
      render: (client) => <StatusChip status={client.status} />,
    },
    {
      key: "atividades",
      header: "Atividades",
      render: (client) => {
        const { done, total } = activityCounts(client);
        return (
          <span className="tabular-nums text-slate-600">
            {done}/{total}
          </span>
        );
      },
    },
    {
      key: "dias",
      header: "Dias na etapa",
      render: (client) => (
        <DaysInStage client={client} stageDeadlineDays={stageDeadlineDays} />
      ),
    },
    {
      key: "acoes",
      header: <span className="sr-only">Ações</span>,
      className: "w-14 text-right",
      render: (client) => menuFor(client),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nome ou empresa"
            size="lg"
            className="sm:w-72"
          />
          <div className="flex items-center gap-2">
            {/* Link genérico: quem preencher monta a própria proposta e a
                calculadora é importada depois para o cliente escolhido. */}
            <Button
              variant="secondary"
              icon={CalculatorIcon}
              onClick={() => setGerandoAvulsa(true)}
            >
              Gerar calculadora
            </Button>
            <NewClientButton />
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(client) => client.id}
        rowHref={(client) => `/clientes/${client.id}`}
        empty={
          <EmptyState
            icon={UserGroupIcon}
            title={
              query ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"
            }
            description={
              query
                ? "Ajuste a busca e tente novamente."
                : "Crie o primeiro cliente para começar."
            }
            action={query ? undefined : <NewClientButton />}
          />
        }
        mobileCard={(client) => {
          const { done, total } = activityCounts(client);
          return (
            <div
              role="link"
              tabIndex={0}
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("a,button,select,input,label")) return;
                router.push(`/clientes/${client.id}`);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  router.push(`/clientes/${client.id}`);
                }
              }}
              className={cn(
                "flex cursor-pointer flex-col gap-3 rounded-sm border border-slate-200 bg-white p-4",
                "transition-colors hover:border-slate-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={client.name} size={32} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-800">
                      {client.name}
                    </span>
                    {client.company ? (
                      <span className="text-xs text-slate-500">
                        {client.company}
                      </span>
                    ) : null}
                  </div>
                </div>
                {menuFor(client)}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StageBadge stage={client.stage} />
                <StatusChip status={client.status} compact />
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="tabular-nums">
                  {done}/{total} atividades
                </span>
                <DaysInStage
                  client={client}
                  stageDeadlineDays={stageDeadlineDays}
                />
              </div>
            </div>
          );
        }}
      />

      {avulsas.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-slate-900">
              Calculadoras avulsas
            </h2>
            <p className="text-xs text-slate-500">
              Links gerados sem cliente. Vincule ao perfil de um cliente quando a
              conversa avançar — o preenchimento e o rastreio vão junto.
            </p>
          </div>
          <LinksTable
            links={avulsas}
            detailHrefFor={(link) => `/calculadoras/${link.id}`}
            clientes={clienteOptions}
            empty={null}
          />
        </section>
      ) : null}

      <EncaminharCalculadoraModal
        clientId={encaminhando?.id ?? ""}
        clientName={encaminhando?.name ?? ""}
        open={encaminhando !== null}
        onClose={() => setEncaminhando(null)}
      />

      <EncaminharCalculadoraModal
        clientId={null}
        clientName={null}
        open={gerandoAvulsa}
        onClose={() => {
          setGerandoAvulsa(false);
          router.refresh();
        }}
      />

      <DeleteNamedModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        itemName={deleting?.name ?? ""}
        title="Excluir cliente"
        description={`O cliente ${deleting?.name ?? ""}, suas atividades e arquivos serão excluídos permanentemente.`}
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          const client = deleting;
          setError(null);
          startTransition(async () => {
            const result = await deleteClient(client.id);
            if (result.ok) {
              setDeleting(null);
            } else {
              setError(result.error);
            }
          });
        }}
      />
    </div>
  );
}

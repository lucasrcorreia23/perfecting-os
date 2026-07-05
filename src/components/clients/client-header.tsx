"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { deleteClient } from "@/lib/actions/clients";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { ActionMenu, DropdownMenu } from "@/components/ui/action-menu";
import { Avatar } from "@/components/ui/avatar";
import { BackButton } from "@/components/ui/back-button";
import { DeleteNamedModal } from "@/components/ui/delete-named-modal";
import { StageBadge } from "@/components/ui/stage-badge";
import { StatusChip } from "@/components/ui/status-chip";

export function ClientHeader({
  client,
  readOnly,
}: {
  client: Tables<"clients">;
  readOnly: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const whatsappDigits = (client.phone ?? "").replace(/\D/g, "");

  function goToDadosTab() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "dados");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {!readOnly ? <BackButton href="/clientes" /> : null}
          <Avatar name={client.name} size={48} />
          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold text-slate-900">
                {client.name}
              </h1>
              {client.company ? (
                <p className="text-sm text-slate-500">{client.company}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip status={client.status} />
              <StageBadge stage={client.stage} />
            </div>
          </div>
        </div>

        {!readOnly ? (
          <div className="flex items-center gap-2">
            <DropdownMenu
              ariaLabel="Entrar em contato"
              align="right"
              triggerClassName={cn(
                "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-medium sm:h-10",
                "border border-slate-200 bg-white text-slate-900",
                "transition-colors hover:border-slate-300 hover:bg-[#f8fafc]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              )}
              trigger={
                <>
                  <ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden />
                  <span className="hidden sm:inline">Entrar em contato</span>
                  <ChevronDownIcon
                    className="h-4 w-4 text-slate-400"
                    aria-hidden
                  />
                </>
              }
              items={[
                {
                  label: "E-mail",
                  icon: EnvelopeIcon,
                  href: client.email ? `mailto:${client.email}` : undefined,
                  disabled: !client.email,
                },
                {
                  label: "WhatsApp",
                  icon: ChatBubbleLeftRightIcon,
                  href: whatsappDigits
                    ? `https://wa.me/${whatsappDigits}`
                    : undefined,
                  disabled: !whatsappDigits,
                },
              ]}
            />
            <ActionMenu
              ariaLabel={`Ações de ${client.name}`}
              items={[
                {
                  label: "Editar dados",
                  icon: PencilSquareIcon,
                  onSelect: goToDadosTab,
                },
                {
                  label: "Excluir cliente",
                  icon: TrashIcon,
                  destructive: true,
                  onSelect: () => setDeleting(true),
                },
              ]}
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      <DeleteNamedModal
        open={deleting}
        onClose={() => setDeleting(false)}
        itemName={client.name}
        title="Excluir cliente"
        description={`O cliente ${client.name}, suas atividades e arquivos serão excluídos permanentemente.`}
        loading={pending}
        onConfirm={() => {
          setError(null);
          startTransition(async () => {
            const result = await deleteClient(client.id);
            if (result.ok) {
              router.push("/clientes");
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

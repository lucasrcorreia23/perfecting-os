"use client";

import { useState, useTransition } from "react";
import {
  ArrowDownTrayIcon,
  CalculatorIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { linkCalculatorToClient } from "@/lib/actions/calculator-links";
import { formatX } from "@/lib/calculadora/format";
import { parseResumo } from "@/lib/calculadora/modelo";
import { formatRelativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { CalculatorStatusChip } from "@/components/ui/calculator-status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { EncaminharCalculadoraModal } from "./encaminhar-modal";
import { LinksTable, nomeDoLink, statusDoLink, type LinkRow } from "./links-table";
import type { ClienteOption } from "./vincular-modal";

// Aba Calculadora do cliente: links deste cliente + encaminhar novo +
// importar uma calculadora avulsa (gerada sem cliente) para este perfil.
export function CalculadoraTab({
  clientId,
  clientName,
  links,
  avulsas,
  clientes,
}: {
  clientId: string;
  clientName: string;
  links: LinkRow[];
  avulsas: LinkRow[];
  clientes: ClienteOption[];
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [importAberto, setImportAberto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function importar(link: LinkRow) {
    setError(null);
    startTransition(async () => {
      const result = await linkCalculatorToClient(link.id, clientId);
      if (result.ok) {
        setImportAberto(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Links da calculadora de ROI de {clientName}. Quem abre monta a própria
          proposta; acesso e resultado aparecem aqui.
        </p>
        <div className="flex items-center gap-2">
          {avulsas.length > 0 ? (
            <Button
              variant="secondary"
              icon={ArrowDownTrayIcon}
              onClick={() => setImportAberto(true)}
            >
              Importar
            </Button>
          ) : null}
          <Button variant="primary" icon={CalculatorIcon} onClick={() => setModalAberto(true)}>
            Encaminhar calculadora
          </Button>
        </div>
      </div>

      <LinksTable
        links={links}
        detailHrefFor={(link) => `/clientes/${clientId}/calculadora/${link.id}`}
        clientes={clientes}
        clienteAtualId={clientId}
        empty={
          <EmptyState
            icon={CalculatorIcon}
            title="Nenhuma calculadora encaminhada"
            description="Gere um link para o cliente montar a própria simulação, ou importe uma calculadora avulsa."
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={PaperAirplaneIcon}
                onClick={() => setModalAberto(true)}
              >
                Encaminhar calculadora
              </Button>
            }
          />
        }
      />

      <EncaminharCalculadoraModal
        clientId={clientId}
        clientName={clientName}
        open={modalAberto}
        onClose={() => setModalAberto(false)}
      />

      <Modal
        open={importAberto}
        onClose={() => setImportAberto(false)}
        title="Importar calculadora avulsa"
        width="max-w-lg"
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            Calculadoras geradas sem cliente. Importar traz o preenchimento e o
            rastreio para o perfil de {clientName}.
          </p>
          <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
            {avulsas.map((link) => {
              const resumo = parseResumo(link.result_summary);
              return (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-slate-200 bg-white px-4 py-3"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {nomeDoLink(link)}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <CalculatorStatusChip status={statusDoLink(link)} compact />
                      <span className="tabular-nums">
                        {resumo
                          ? `${resumo.progresso.preenchidos}/${resumo.progresso.total} campos`
                          : "sem preenchimento"}
                      </span>
                      <span className="tabular-nums">
                        ROI {formatX(resumo?.consolidado?.roi ?? null)}
                      </span>
                      {link.last_access_at ? (
                        <span>acesso {formatRelativeTime(link.last_access_at)}</span>
                      ) : null}
                    </span>
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => importar(link)}
                  >
                    Importar
                  </Button>
                </li>
              );
            })}
          </ul>
          {error ? (
            <p role="alert" className="text-xs text-trend-negative">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

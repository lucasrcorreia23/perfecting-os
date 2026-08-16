"use client";

import type { Tables } from "@/lib/database.types";
import { Tabs } from "@/components/ui/tabs";
import { ActivitiesTab } from "@/components/activities/activities-tab";
import { CalculadoraTab } from "@/components/calculadora/calculadora-tab";
import type { ClienteOption } from "@/components/calculadora/vincular-modal";
import { FilesTab } from "@/components/files/files-tab";
import { ClientForm } from "./client-form";
import { PocOverview } from "./poc-overview";

const TABS = [
  { id: "visao", label: "Visão geral" },
  { id: "dados", label: "Dados básicos" },
  { id: "atividades", label: "Atividades" },
  { id: "arquivos", label: "Arquivos" },
];

// A aba Calculadora é comercial/interna (proposta, preço, rastreio) — nunca
// aparece para o role cliente; o gate que vale é o server-side da página.
const TAB_CALCULADORA = { id: "calculadora", label: "Calculadora" };

export function ClientTabs({
  client,
  activities,
  files,
  uploaderNames,
  readOnly,
  calculatorLinks = [],
  calculatorAvulsas = [],
  clienteOptions = [],
}: {
  client: Tables<"clients">;
  activities: Tables<"activities">[];
  files: Tables<"client_files">[];
  uploaderNames: Record<string, string>;
  readOnly: boolean;
  calculatorLinks?: Tables<"calculator_links">[];
  calculatorAvulsas?: Tables<"calculator_links">[];
  clienteOptions?: ClienteOption[];
}) {
  const tabs = readOnly ? TABS : [...TABS, TAB_CALCULADORA];

  return (
    <Tabs tabs={tabs} panelClassName="p-4 sm:p-8">
      {(active) => {
        if (active === "visao") {
          return (
            <PocOverview
              activities={activities}
              createdAt={client.created_at}
            />
          );
        }
        if (active === "atividades") {
          return (
            <ActivitiesTab
              clientId={client.id}
              currentStage={client.stage}
              activities={activities}
              readOnly={readOnly}
            />
          );
        }
        if (active === "arquivos") {
          return (
            <FilesTab
              clientId={client.id}
              files={files}
              uploaderNames={uploaderNames}
              canDelete={!readOnly}
            />
          );
        }
        if (active === "calculadora" && !readOnly) {
          return (
            <CalculadoraTab
              clientId={client.id}
              clientName={client.name}
              links={calculatorLinks}
              avulsas={calculatorAvulsas}
              clientes={clienteOptions}
            />
          );
        }
        return <ClientForm client={client} readOnly={readOnly} />;
      }}
    </Tabs>
  );
}

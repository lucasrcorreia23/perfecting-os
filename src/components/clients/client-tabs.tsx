"use client";

import type { Tables } from "@/lib/database.types";
import { Tabs } from "@/components/ui/tabs";
import { ActivitiesTab } from "@/components/activities/activities-tab";
import { FilesTab } from "@/components/files/files-tab";
import { ClientForm } from "./client-form";

const TABS = [
  { id: "dados", label: "Dados básicos" },
  { id: "atividades", label: "Atividades" },
  { id: "arquivos", label: "Arquivos" },
];

export function ClientTabs({
  client,
  activities,
  files,
  uploaderNames,
  readOnly,
}: {
  client: Tables<"clients">;
  activities: Tables<"activities">[];
  files: Tables<"client_files">[];
  uploaderNames: Record<string, string>;
  readOnly: boolean;
}) {
  return (
    <Tabs tabs={TABS} panelClassName="p-4 sm:p-8">
      {(active) => {
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
        return <ClientForm client={client} readOnly={readOnly} />;
      }}
    </Tabs>
  );
}

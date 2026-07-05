"use client";

import type { Tables } from "@/lib/database.types";
import type { Preferences } from "@/lib/actions/profile";
import { Tabs } from "@/components/ui/tabs";
import { PreferencesForm } from "./preferences-form";
import { ProfileForm } from "./profile-form";
import { StorageSummary, type StorageByClient } from "./storage-summary";

const TABS = [
  { id: "dados", label: "Dados básicos" },
  { id: "preferencias", label: "Preferências" },
  { id: "storage", label: "Storage" },
];

export function ProfileTabs({
  profile,
  userId,
  email,
  storage,
}: {
  profile: Tables<"profiles"> | null;
  userId: string;
  email: string | null;
  storage: {
    totalFiles: number;
    totalBytes: number;
    byClient: StorageByClient[];
    showByClient: boolean;
  };
}) {
  return (
    <Tabs tabs={TABS} panelClassName="p-4 sm:p-8">
      {(active) => {
        if (active === "preferencias") {
          return (
            <PreferencesForm
              preferences={(profile?.preferences as Preferences | null) ?? null}
            />
          );
        }
        if (active === "storage") {
          return <StorageSummary {...storage} />;
        }
        return <ProfileForm profile={profile} userId={userId} email={email} />;
      }}
    </Tabs>
  );
}

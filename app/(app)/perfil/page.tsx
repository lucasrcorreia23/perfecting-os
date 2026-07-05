import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import type { StorageByClient } from "@/components/profile/storage-summary";

export const metadata: Metadata = { title: "Meu Perfil" };

export default async function PerfilPage() {
  const session = await requireSession();
  const role = session.profile?.role ?? "interno";

  const supabase = await createServerSupabase();
  // RLS já restringe o role cliente aos próprios arquivos.
  const { data: files } = await supabase
    .from("client_files")
    .select("client_id, size_bytes, clients(name)");

  const byClientMap = new Map<string, StorageByClient>();
  let totalFiles = 0;
  let totalBytes = 0;
  for (const file of files ?? []) {
    totalFiles += 1;
    totalBytes += file.size_bytes ?? 0;
    const entry = byClientMap.get(file.client_id) ?? {
      clientId: file.client_id,
      clientName: file.clients?.name ?? "Cliente",
      files: 0,
      bytes: 0,
    };
    entry.files += 1;
    entry.bytes += file.size_bytes ?? 0;
    byClientMap.set(file.client_id, entry);
  }
  const byClient = Array.from(byClientMap.values()).sort(
    (a, b) => b.bytes - a.bytes,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Meu Perfil</h1>
      <ProfileTabs
        profile={session.profile}
        userId={session.userId}
        email={session.email}
        storage={{
          totalFiles,
          totalBytes,
          byClient,
          showByClient: role === "interno",
        }}
      />
    </div>
  );
}

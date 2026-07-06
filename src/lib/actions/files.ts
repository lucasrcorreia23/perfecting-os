"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import type { ActionResult } from "./clients";

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";

// Upload é permitido para interno e para o cliente do próprio client_id.
async function requireUploader(clientId: string) {
  if (!isSupabaseConfigured()) return null;
  const session = await getSessionProfile();
  if (!session) return null;
  const role = session.profile?.role;
  if (role === "interno") return session;
  if (role === "cliente" && session.profile?.client_id === clientId) {
    return session;
  }
  return null;
}

function revalidateFilePaths(clientId: string) {
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/perfil");
  // Drawer do Kanban lê os arquivos do cliente — atualiza após upload/exclusão.
  revalidatePath("/workflow");
}

// O binário sobe do browser direto para o Storage (RLS de storage protege);
// esta action só registra os metadados.
export async function registerClientFile(input: {
  client_id: string;
  activity_id?: string | null;
  name: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string | null;
}): Promise<ActionResult> {
  const session = await requireUploader(input.client_id);
  if (!session) return { ok: false, error: "Sem permissão." };

  if (!input.name.trim()) return { ok: false, error: "Arquivo sem nome." };
  if (input.size_bytes > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "O arquivo excede o limite de 20 MB." };
  }
  if (!input.storage_path.startsWith(`${input.client_id}/`)) {
    return { ok: false, error: "Caminho de arquivo inválido." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("client_files").insert({
    client_id: input.client_id,
    activity_id: input.activity_id ?? null,
    name: input.name.trim(),
    storage_path: input.storage_path,
    size_bytes: input.size_bytes,
    mime_type: input.mime_type,
    uploaded_by: session.userId,
  });
  if (error) return { ok: false, error: GENERIC_ERROR };

  // Matriz RLS: role cliente não tem insert em events — evento só p/ interno.
  if (session.profile?.role === "interno") {
    await supabase.from("events").insert({
      client_id: input.client_id,
      actor_id: session.userId,
      type: "arquivo_enviado",
      payload: { name: input.name.trim() },
    });
  }

  revalidateFilePaths(input.client_id);
  return { ok: true, data: undefined };
}

// Download sempre via signed URL de 60 s (bucket privado).
export async function createDownloadUrl(
  fileId: string,
): Promise<ActionResult<{ url: string }>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase não configurado." };
  }
  const session = await getSessionProfile();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  // RLS decide o que o usuário enxerga.
  const { data: file } = await supabase
    .from("client_files")
    .select("storage_path")
    .eq("id", fileId)
    .single();
  if (!file) return { ok: false, error: "Arquivo não encontrado." };

  const { data, error } = await supabase.storage
    .from("client-files")
    .createSignedUrl(file.storage_path, 60);
  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  return { ok: true, data: { url: data.signedUrl } };
}

export async function deleteClientFile(fileId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase não configurado." };
  }
  const session = await getSessionProfile();
  if (!session || session.profile?.role !== "interno") {
    return { ok: false, error: "Sem permissão." };
  }

  const supabase = await createServerSupabase();
  const { data: file } = await supabase
    .from("client_files")
    .select("client_id, name, storage_path")
    .eq("id", fileId)
    .single();
  if (!file) return { ok: false, error: "Arquivo não encontrado." };

  await supabase.storage.from("client-files").remove([file.storage_path]);

  const { error } = await supabase
    .from("client_files")
    .delete()
    .eq("id", fileId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  await supabase.from("events").insert({
    client_id: file.client_id,
    actor_id: session.userId,
    type: "arquivo_excluido",
    payload: { name: file.name },
  });

  revalidateFilePaths(file.client_id);
  return { ok: true, data: undefined };
}

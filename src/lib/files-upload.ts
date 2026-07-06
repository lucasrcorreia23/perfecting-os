import { registerClientFile } from "@/lib/actions/files";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";

// Tipos aceitos no seletor (pdf, texto, planilhas). O binário sobe do browser
// direto para o Storage; a server action só registra os metadados.
export const FILE_ACCEPT =
  ".pdf,.txt,.csv,.xls,.xlsx,.doc,.docx,application/pdf,text/plain,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .toLowerCase();
}

// Faz o upload do arquivo para o cliente (Storage + metadados). Client-side.
// activityId opcional vincula o anexo à atividade (clipe por tarefa do drawer).
export async function uploadClientFile(
  clientId: string,
  file: File,
  activityId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `"${file.name}" excede o limite de 20 MB.` };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase não configurado." };
  }

  const supabase = createBrowserSupabase();
  const storagePath = `${clientId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("client-files")
    .upload(storagePath, file);
  if (uploadError) {
    return { ok: false, error: "Falha no envio do arquivo. Tente novamente." };
  }

  const result = await registerClientFile({
    client_id: clientId,
    activity_id: activityId ?? null,
    name: file.name,
    storage_path: storagePath,
    size_bytes: file.size,
    mime_type: file.type || null,
  });
  if (!result.ok) {
    // Não deixa objeto órfão no bucket.
    await supabase.storage.from("client-files").remove([storagePath]);
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

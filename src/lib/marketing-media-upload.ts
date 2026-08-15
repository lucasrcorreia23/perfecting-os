import { setPostCover } from "@/lib/actions/marketing-posts";
import { MARKETING_MEDIA_BUCKET, MAX_COVER_SIZE_BYTES } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { coverPath, isAllowedImage } from "@/lib/marketing-media";
import { createBrowserSupabase } from "@/lib/supabase/client";

export const COVER_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

// Mesmo desenho do upload de client-files: o binário vai do browser direto ao
// Storage (as policies protegem) e a action só grava o caminho no post.
export async function uploadPostCover(
  postId: string,
  file: File,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!isAllowedImage(file.type, file.size)) {
    return {
      ok: false,
      error: `Envie uma imagem (JPG, PNG, WebP, AVIF ou GIF) de até ${MAX_COVER_SIZE_BYTES / 1024 / 1024} MB.`,
    };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase não configurado." };
  }

  const supabase = createBrowserSupabase();
  const path = coverPath(postId, file.name);
  const { error: uploadError } = await supabase.storage
    .from(MARKETING_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    return { ok: false, error: "Falha no envio da imagem. Tente novamente." };
  }

  const result = await setPostCover(postId, path);
  if (!result.ok) {
    // Não deixa objeto órfão no bucket.
    await supabase.storage.from(MARKETING_MEDIA_BUCKET).remove([path]);
    return { ok: false, error: result.error };
  }
  return { ok: true, path };
}

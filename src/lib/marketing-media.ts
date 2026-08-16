import {
  COVER_MIME_TYPES,
  MARKETING_MEDIA_BUCKET,
  MAX_COVER_SIZE_BYTES,
} from "@/lib/constants";

// Bucket público: a URL é previsível e não precisa de signed URL, ao contrário
// de client-files. Ela vai direto para o site externo pela API.
export function publicMediaUrl(
  path: string | null,
  supabaseUrl?: string,
): string | null {
  if (!path) return null;
  const base = (supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/$/,
    "",
  );
  if (!base) return null;
  return `${base}/storage/v1/object/public/${MARKETING_MEDIA_BUCKET}/${path}`;
}

export function sanitizeMediaName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|-+$/g, "")
    .toLowerCase();
  return cleaned || "imagem";
}

// posts/{postId}/{uuid}-{nome}. O uuid evita colisão ao trocar a capa.
export function coverPath(
  postId: string,
  fileName: string,
  uuid = crypto.randomUUID(),
): string {
  return `posts/${postId}/${uuid}-${sanitizeMediaName(fileName)}`;
}

// Imagens do corpo ficam em posts/{postId}/corpo/ — mesmo prefixo do post (o
// delete limpa a pasta inteira), mas fora do caminho aceito por setPostCover.
export function bodyImagePath(
  postId: string,
  fileName: string,
  uuid = crypto.randomUUID(),
): string {
  return `posts/${postId}/corpo/${uuid}-${sanitizeMediaName(fileName)}`;
}

// Alt inicial legível a partir do nome do arquivo: sem extensão, sem separador
// técnico e com os acentos preservados (é texto para leitor de tela, não path).
export function altFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAllowedImage(mime: string, sizeBytes: number): boolean {
  return (
    COVER_MIME_TYPES.includes(mime) &&
    sizeBytes > 0 &&
    sizeBytes <= MAX_COVER_SIZE_BYTES
  );
}

import { NextResponse } from "next/server";

// Envelope único da API pública: sucesso { data, meta? }, erro { error }.
// As mensagens vão em pt-BR porque podem chegar ao visitante do site.

export type ApiErrorCode =
  | "unauthorized"
  | "origin_not_allowed"
  | "not_found"
  | "invalid_query"
  | "invalid_body"
  | "version_mismatch"
  | "validation_failed"
  | "rate_limited"
  | "service_unavailable"
  | "internal_error";

const STATUS: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  origin_not_allowed: 403,
  not_found: 404,
  invalid_query: 400,
  invalid_body: 400,
  version_mismatch: 409,
  validation_failed: 400,
  rate_limited: 429,
  service_unavailable: 503,
  internal_error: 500,
};

const DEFAULT_MESSAGE: Record<ApiErrorCode, string> = {
  unauthorized: "Credencial ausente ou inválida.",
  origin_not_allowed: "Origem não autorizada.",
  not_found: "Não encontrado.",
  invalid_query: "Parâmetros de consulta inválidos.",
  invalid_body: "Corpo da requisição inválido.",
  version_mismatch: "Versão do formulário desconhecida. Recarregue a página.",
  validation_failed: "Alguma resposta está inválida.",
  rate_limited: "Muitos envios em pouco tempo. Tente novamente em instantes.",
  service_unavailable: "Serviço indisponível no momento.",
  internal_error: "Algo deu errado. Tente novamente.",
};

// Quem cacheia é o site (next: { revalidate }). Empilhar cache aqui tornaria o
// atraso de publicação imprevisível.
function baseHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "no-store");
  return headers;
}

export function apiOk<T>(
  data: T,
  options: { meta?: unknown; status?: number; headers?: HeadersInit } = {},
): NextResponse {
  const body = options.meta === undefined ? { data } : { data, meta: options.meta };
  return NextResponse.json(body, {
    status: options.status ?? 200,
    headers: baseHeaders(options.headers),
  });
}

export function apiError(
  code: ApiErrorCode,
  options: { message?: string; field?: string; headers?: HeadersInit } = {},
): NextResponse {
  const error: { code: ApiErrorCode; message: string; field?: string } = {
    code,
    message: options.message ?? DEFAULT_MESSAGE[code],
  };
  if (options.field) error.field = options.field;
  return NextResponse.json(
    { error },
    { status: STATUS[code], headers: baseHeaders(options.headers) },
  );
}

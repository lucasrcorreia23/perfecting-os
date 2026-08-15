import type { NextRequest } from "next/server";
import { authorizeRead } from "@/lib/api/auth";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { fetchPublishedPosts } from "@/lib/api/marketing-queries";
import { apiError, apiOk } from "@/lib/api/responses";
import { isMarketingApiConfigured } from "@/lib/env";
import { isValidSlug } from "@/lib/marketing-slug";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 50;

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  try {
    if (!isMarketingApiConfigured()) {
      return apiError("service_unavailable", { headers });
    }
    if (!authorizeRead(request)) {
      return apiError("unauthorized", { headers });
    }

    const params = request.nextUrl.searchParams;
    const limit = Number(params.get("limit") ?? 20);
    const offset = Number(params.get("offset") ?? 0);
    const tag = params.get("tag") ?? undefined;

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return apiError("invalid_query", {
        message: `O parâmetro "limit" deve ser um inteiro entre 1 e ${MAX_LIMIT}.`,
        field: "limit",
        headers,
      });
    }
    if (!Number.isInteger(offset) || offset < 0) {
      return apiError("invalid_query", {
        message: 'O parâmetro "offset" deve ser um inteiro maior ou igual a zero.',
        field: "offset",
        headers,
      });
    }
    if (tag && !isValidSlug(tag)) {
      return apiError("invalid_query", {
        message: 'O parâmetro "tag" deve ser um slug.',
        field: "tag",
        headers,
      });
    }

    const result = await fetchPublishedPosts({ limit, offset, tag });
    if (!result) return apiError("service_unavailable", { headers });

    return apiOk(result.posts, {
      meta: { total: result.total, limit, offset },
      headers,
    });
  } catch {
    // Erro não tratado não carregaria os headers de CORS.
    return apiError("internal_error", { headers });
  }
}

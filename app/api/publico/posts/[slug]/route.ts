import type { NextRequest } from "next/server";
import { authorizeRead } from "@/lib/api/auth";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { fetchPublishedPostBySlug } from "@/lib/api/marketing-queries";
import { apiError, apiOk } from "@/lib/api/responses";
import { isMarketingApiConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

// params é assíncrono no Next 16. Tipado à mão para não depender do
// RouteContext gerado só por next dev/build/typegen.
type Context = { params: Promise<{ slug: string }> };

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function GET(request: NextRequest, context: Context) {
  const headers = corsHeaders(request.headers.get("origin"));

  try {
    if (!isMarketingApiConfigured()) {
      return apiError("service_unavailable", { headers });
    }
    if (!authorizeRead(request)) {
      return apiError("unauthorized", { headers });
    }

    const { slug } = await context.params;
    const post = await fetchPublishedPostBySlug(slug);
    if (post === undefined) return apiError("service_unavailable", { headers });
    // Resposta idêntica para inexistente, rascunho, arquivado e agendado —
    // não revelar a existência do post.
    if (post === null) return apiError("not_found", { headers });

    return apiOk(post, { headers });
  } catch {
    return apiError("internal_error", { headers });
  }
}

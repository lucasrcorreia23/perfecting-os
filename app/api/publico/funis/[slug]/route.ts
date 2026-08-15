import type { NextRequest } from "next/server";
import { authorizeRead } from "@/lib/api/auth";
import { corsHeaders, preflight } from "@/lib/api/cors";
import { fetchPublishedFunnel } from "@/lib/api/marketing-queries";
import { apiError, apiOk } from "@/lib/api/responses";
import { isMarketingApiConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

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
    const funnel = await fetchPublishedFunnel(slug);
    if (funnel === undefined) return apiError("service_unavailable", { headers });
    if (funnel === null) return apiError("not_found", { headers });

    return apiOk(funnel, { headers });
  } catch {
    return apiError("internal_error", { headers });
  }
}

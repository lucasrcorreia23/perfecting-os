import { NextResponse } from "next/server";
import { getMarketingEnv } from "@/lib/env";

const ALLOW_HEADERS = "authorization, content-type, x-perfecting-token";
const ALLOW_METHODS = "GET, POST, OPTIONS";

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const { allowedOrigins } = getMarketingEnv();
  return allowedOrigins.includes(origin.replace(/\/$/, ""));
}

// Vary: Origin é obrigatório porque ecoamos a origem — sem ele um cache
// intermediário serviria o Allow-Origin de outra origem.
export function corsHeaders(origin: string | null): HeadersInit {
  if (!isAllowedOrigin(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin as string,
    "Access-Control-Allow-Methods": ALLOW_METHODS,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    Vary: "Origin",
  };
}

// O OPTIONS automático do Next devolve Allow, mas nenhum header de CORS — por
// isso cada route.ts exporta o seu.
export function preflight(request: Request): NextResponse {
  const origin = request.headers.get("origin");
  const headers = new Headers(corsHeaders(origin));
  if (isAllowedOrigin(origin)) {
    headers.set("Access-Control-Max-Age", "86400");
  }
  return new NextResponse(null, { status: 204, headers });
}

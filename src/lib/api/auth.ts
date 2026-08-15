import { createHmac, timingSafeEqual } from "node:crypto";
import { getMarketingEnv } from "@/lib/env";
import { isAllowedOrigin } from "./cors";

// Comparação em tempo constante que tolera comprimentos diferentes
// (timingSafeEqual lança quando os buffers têm tamanhos distintos).
function secureEquals(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (!header) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}

// Leitura (posts e schema do funil) é server-to-server: só o token secreto.
export function authorizeRead(request: Request): boolean {
  const { apiToken } = getMarketingEnv();
  return secureEquals(bearerToken(request), apiToken);
}

export type SubmitAuth =
  | { ok: true }
  | { ok: false; reason: "unauthorized" | "origin_not_allowed" };

// Envio vem do browser do visitante, onde nenhum segredo sobrevive. Aceita o
// token secreto (site postando pelo próprio servidor) ou o token publicável,
// este último só com a origem na allowlist.
export function authorizeSubmit(request: Request): SubmitAuth {
  const { apiToken, publicToken } = getMarketingEnv();

  if (secureEquals(bearerToken(request), apiToken)) return { ok: true };

  const provided = request.headers.get("x-perfecting-token") ?? undefined;
  if (publicToken && secureEquals(provided, publicToken)) {
    return isAllowedOrigin(request.headers.get("origin"))
      ? { ok: true }
      : { ok: false, reason: "origin_not_allowed" };
  }

  return { ok: false, reason: "unauthorized" };
}

// LGPD: o IP cru nunca é gravado nem exibido — só o HMAC, que serve para
// throttle e detecção de abuso.
export function hashIp(ip: string | null): string | null {
  const { ipSalt } = getMarketingEnv();
  if (!ip || !ipSalt) return null;
  return createHmac("sha256", ipSalt).update(ip).digest("hex");
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

import { createHash, createHmac } from "node:crypto";
import { getCalculatorEnv } from "@/lib/env";

// Token dos links da calculadora, derivado por HMAC — nunca persistido.
//
// token      = base64url(HMAC-SHA256(CALCULATOR_LINK_SECRET, "calc-link:{id}:{versão}"))
// token_hash = sha256(token) em hex (única coisa que o banco guarda)
//
// Assim "copiar link" funciona a qualquer momento (o servidor rederiva) e um
// vazamento do banco não expõe nenhuma URL válida. Rotação = versão + 1.
if (typeof window !== "undefined") {
  throw new Error("calculator-token só pode ser usado no servidor.");
}

export function deriveToken(linkId: string, tokenVersion: number): string | null {
  const { linkSecret } = getCalculatorEnv();
  if (!linkSecret) return null;
  return createHmac("sha256", linkSecret)
    .update(`calc-link:${linkId}:${tokenVersion}`)
    .digest("base64url");
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Formato esperado na URL: 43 chars de base64url (32 bytes). Rejeitar cedo
// evita hash de lixo arbitrário no caminho quente.
export function isTokenShaped(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

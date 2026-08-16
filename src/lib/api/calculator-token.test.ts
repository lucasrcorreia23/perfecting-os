import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deriveToken, isTokenShaped, tokenHash } from "@/lib/api/calculator-token";

const LINK_ID = "0b81f9a2-6c15-4b70-9a55-3f4f5d0b1234";

describe("token derivado por HMAC", () => {
  beforeEach(() => {
    vi.stubEnv("CALCULATOR_LINK_SECRET", "segredo-de-teste-com-32-bytes-ok!!");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("é determinístico: mesmo id + versão → mesmo token (permite copiar depois)", () => {
    expect(deriveToken(LINK_ID, 1)).toBe(deriveToken(LINK_ID, 1));
  });

  it("rotação muda o token: versão + 1 mata a URL antiga", () => {
    expect(deriveToken(LINK_ID, 1)).not.toBe(deriveToken(LINK_ID, 2));
  });

  it("links diferentes nunca compartilham token", () => {
    expect(deriveToken(LINK_ID, 1)).not.toBe(
      deriveToken("11111111-2222-3333-4444-555555555555", 1),
    );
  });

  it("tem o formato de URL esperado (43 chars base64url)", () => {
    const token = deriveToken(LINK_ID, 1)!;
    expect(isTokenShaped(token)).toBe(true);
  });

  it("o hash guardado no banco é sha256 hex do token, não o token", () => {
    const token = deriveToken(LINK_ID, 1)!;
    const hash = tokenHash(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
  });

  it("sem o segredo configurado, não deriva nada", () => {
    vi.stubEnv("CALCULATOR_LINK_SECRET", "");
    expect(deriveToken(LINK_ID, 1)).toBeNull();
  });
});

describe("isTokenShaped", () => {
  it("rejeita lixo antes de tocar no banco", () => {
    expect(isTokenShaped("abc")).toBe(false);
    expect(isTokenShaped("a".repeat(44))).toBe(false);
    expect(isTokenShaped("a".repeat(42) + "!")).toBe(false);
    expect(isTokenShaped("A-_z".repeat(10) + "abc")).toBe(true); // 43 chars válidos
  });
});

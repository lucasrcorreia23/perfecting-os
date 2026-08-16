import { describe, expect, it } from "vitest";
import { linkAceitaAcesso, linkStatus } from "@/lib/calculadora/link-status";

const AGORA = new Date("2026-08-15T12:00:00Z");
const FUTURO = "2026-09-15T12:00:00Z";
const PASSADO = "2026-08-01T12:00:00Z";

describe("linkStatus — derivado, com precedência revogado > expirado > concluído > ativo", () => {
  it("ativo: não revogado, não expirado, não enviado", () => {
    expect(
      linkStatus({ revokedAt: null, expiresAt: FUTURO, submittedAt: null }, AGORA),
    ).toBe("ativo");
  });

  it("concluído: enviado e ainda dentro da validade", () => {
    expect(
      linkStatus({ revokedAt: null, expiresAt: FUTURO, submittedAt: PASSADO }, AGORA),
    ).toBe("concluido");
  });

  it("expirado vence concluído", () => {
    expect(
      linkStatus({ revokedAt: null, expiresAt: PASSADO, submittedAt: PASSADO }, AGORA),
    ).toBe("expirado");
  });

  it("revogado vence tudo", () => {
    expect(
      linkStatus({ revokedAt: PASSADO, expiresAt: PASSADO, submittedAt: PASSADO }, AGORA),
    ).toBe("revogado");
  });

  it("expiração exatamente agora já é expirado", () => {
    expect(
      linkStatus(
        { revokedAt: null, expiresAt: AGORA.toISOString(), submittedAt: null },
        AGORA,
      ),
    ).toBe("expirado");
  });
});

describe("linkAceitaAcesso", () => {
  it("só ativo e concluído seguem acessíveis (concluído continua editável)", () => {
    expect(linkAceitaAcesso("ativo")).toBe(true);
    expect(linkAceitaAcesso("concluido")).toBe(true);
    expect(linkAceitaAcesso("expirado")).toBe(false);
    expect(linkAceitaAcesso("revogado")).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionProfile: vi.fn(),
  isCalculatorConfigured: vi.fn(() => true),
  fetchLinkByTokenHash: vi.fn(),
  savePremissas: vi.fn(),
  insertEvents: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionProfile: mocks.getSessionProfile,
}));

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    isCalculatorConfigured: mocks.isCalculatorConfigured,
  };
});

vi.mock("@/lib/api/calculator-queries", () => ({
  fetchLinkByTokenHash: mocks.fetchLinkByTokenHash,
  savePremissas: mocks.savePremissas,
  insertEvents: mocks.insertEvents,
}));

import { POST } from "../../../app/api/publico/calculadora/[token]/premissas/route";
import { sessaoPodeEditarPremissas } from "./premissas";

const RAIZ = join(import.meta.dirname, "..", "..", "..");
const TOKEN = "a".repeat(43);

function pedido(body: unknown) {
  return new NextRequest(`http://localhost/api/publico/calculadora/${TOKEN}/premissas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /premissas — gate de sessão", () => {
  beforeEach(() => {
    mocks.isCalculatorConfigured.mockReturnValue(true);
    mocks.getSessionProfile.mockReset();
    mocks.fetchLinkByTokenHash.mockReset();
    mocks.savePremissas.mockReset();
    mocks.insertEvents.mockReset();
  });

  it("visitante sem sessão recebe 401 e nada grava", async () => {
    mocks.getSessionProfile.mockResolvedValue(null);
    const res = await POST(pedido({ premissas: { haircut: 0.5 } }), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(401);
    expect(mocks.savePremissas).not.toHaveBeenCalled();
    expect(mocks.fetchLinkByTokenHash).not.toHaveBeenCalled();
  });

  it("cliente logado também recebe 401", async () => {
    mocks.getSessionProfile.mockResolvedValue({
      userId: "u1",
      email: "c@x.com",
      profile: { role: "cliente" },
    });
    const res = await POST(pedido({ premissas: { haircut: 0.5 } }), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(401);
    expect(sessaoPodeEditarPremissas("cliente")).toBe(false);
    expect(mocks.savePremissas).not.toHaveBeenCalled();
  });

  it("interno persiste o override neste link", async () => {
    mocks.getSessionProfile.mockResolvedValue({
      userId: "interno-1",
      email: "i@x.com",
      profile: { role: "interno" },
    });
    mocks.fetchLinkByTokenHash.mockResolvedValue({
      id: "link-1",
      state: { v: 2, prazoMeses: 3, times: [{ id: "t1" }] },
    });
    mocks.savePremissas.mockResolvedValue(true);
    mocks.insertEvents.mockResolvedValue(true);

    const res = await POST(pedido({ premissas: { haircut: 0.5 } }), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(res.status).toBe(200);
    expect(mocks.savePremissas).toHaveBeenCalledTimes(1);
    const args = mocks.savePremissas.mock.calls[0][0] as {
      linkId: string;
      premissas: { haircut: number } | null;
    };
    expect(args.linkId).toBe("link-1");
    expect(args.premissas?.haircut).toBe(0.5);
    expect(mocks.insertEvents).toHaveBeenCalledTimes(1);
    const eventos = mocks.insertEvents.mock.calls[0][0] as {
      type: string;
      actorId: string;
    }[];
    expect(eventos[0].type).toBe("premissas_alteradas");
    expect(eventos[0].actorId).toBe("interno-1");
  });
});

describe("POST de estado não grava premissas", () => {
  it("o handler de estado lê as premissas do link e nunca as aceita do body", () => {
    const fonte = readFileSync(
      join(RAIZ, "app", "api", "publico", "calculadora", "[token]", "estado", "route.ts"),
      "utf8",
    );
    expect(fonte).toContain("resumo(estadoNovo, link.premissas)");
    expect(fonte).not.toContain("payload.premissas");
    expect(fonte).not.toContain("savePremissas");
  });

  it("saveEstado não toca a coluna premissas", () => {
    const fonte = readFileSync(join(RAIZ, "src", "lib", "api", "calculator-queries.ts"), "utf8");
    const saveEstado = fonte.slice(
      fonte.indexOf("export async function saveEstado"),
      fonte.indexOf("export async function savePremissas"),
    );
    expect(saveEstado).not.toMatch(/premissas:/);
  });
});

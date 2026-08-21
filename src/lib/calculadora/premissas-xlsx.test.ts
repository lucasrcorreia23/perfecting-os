import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PREMISSAS_PADRAO } from "./premissas";
import { lerXlsxPremissas } from "./premissas-xlsx";

const RAIZ = join(import.meta.dirname, "..", "..", "..");
const TEMPLATE = join(RAIZ, "docs", "referencia", "Perfecting_ROI_Calculator_Template.xlsx");
const AUDITADA = join(
  RAIZ,
  "docs",
  "Calculadora_ROI_Perfecting_Portugues_Auditada (1).xlsx",
);

describe("lerXlsxPremissas", () => {
  it("lê o Template com Tier 2 em 656 h", async () => {
    const { premissas, avisos } = await lerXlsxPremissas(await readFile(TEMPLATE));
    expect(premissas.encargos).toBe(1.75);
    expect(premissas.jornadaMensalH).toBe(200);
    expect(premissas.haircut).toBe(0.7);
    expect(premissas.taxaMinima).toBe(13_000);
    expect(premissas.tabelaTiers[1].ateHoras).toBe(656);
    expect(premissas.tabelaTiers[1].taxaHora).toBe(82);
    expect(premissas.horasPlanos.pratica).toBe(4);
    expect(premissas.cenarios.conservador.ticketPct).toBe(0.05);
    expect(premissas.fineTuneTicketMax).toBe(0.3);
    expect(avisos.some((a) => a.codigo === "tier2_573")).toBe(false);
    expect(avisos.some((a) => a.codigo === "motor_ignorado")).toBe(true);
  });

  it("lê a Auditada com Tier 2 em 573 h só neste arquivo", async () => {
    const { premissas, avisos } = await lerXlsxPremissas(await readFile(AUDITADA));
    expect(premissas.tabelaTiers[1].ateHoras).toBe(573);
    expect(premissas.coi.deltaAttainment).toBe(0.29);
    expect(premissas.coi.haircut).toBe(0.5);
    expect(premissas.coi.retencaoCom).toBe(0.74);
    expect(avisos.some((a) => a.codigo === "tier2_573")).toBe(true);
    expect(PREMISSAS_PADRAO.tabelaTiers[1].ateHoras).toBe(656);
  });

  it("não executa Motor: um buffer sem Premissas não inventa número", async () => {
    await expect(lerXlsxPremissas(Buffer.from("nao-e-xlsx"))).rejects.toThrow();
  });
});

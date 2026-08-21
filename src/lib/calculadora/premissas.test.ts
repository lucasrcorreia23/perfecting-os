import { describe, expect, it } from "vitest";
import { computarModelo } from "./modelo";
import {
  fundirPremissas,
  hidratarPremissas,
  PREMISSAS_PADRAO,
  premissasSaoPadrao,
  serializarPremissas,
  sessaoPodeEditarPremissas,
} from "./premissas";
import { estadoInicial } from "./estado";
import type { EstadoCalculadora } from "./types";

function estadoGolden(): EstadoCalculadora {
  const base = estadoInicial();
  return {
    ...base,
    prazoMeses: 12,
    times: [
      {
        ...base.times[0],
        proposta: { plano: "pratica", assentos: 30 },
        entradas: {
          ...base.times[0].entradas,
          numVendedores: 30,
          numGestoresTreino: 3,
          horasTreinoGestorMes: 20,
          vendedoresPorGestorMes: 6,
          horasPraticaPorRepHoje: 1.5,
          receitaMensal: 900_000,
          ticketMedio: 15_000,
          conversaoPct: 25,
          margemPct: 30,
          salarioGestor: 12_000,
          rampaMeses: 4,
          contratacoesAno: 8,
          caminho: "gestores",
        },
      },
    ],
  };
}

describe("fundirPremissas", () => {
  it("null e undefined devolvem o padrão", () => {
    expect(fundirPremissas(null)).toEqual(PREMISSAS_PADRAO);
    expect(fundirPremissas(undefined)).toEqual(PREMISSAS_PADRAO);
    expect(premissasSaoPadrao(fundirPremissas(null))).toBe(true);
  });

  it("ignora NaN, negativo e tipo errado", () => {
    const p = fundirPremissas({
      haircut: -1,
      encargos: Number.NaN,
      taxaMinima: "13000",
      supervisao: 1.5,
    });
    expect(p.haircut).toBe(PREMISSAS_PADRAO.haircut);
    expect(p.encargos).toBe(PREMISSAS_PADRAO.encargos);
    expect(p.taxaMinima).toBe(PREMISSAS_PADRAO.taxaMinima);
    expect(p.supervisao).toBe(PREMISSAS_PADRAO.supervisao);
  });

  it("aceita um haircut parcial e preserva o resto", () => {
    const p = fundirPremissas({ haircut: 0.5 });
    expect(p.haircut).toBe(0.5);
    expect(p.encargos).toBe(PREMISSAS_PADRAO.encargos);
    expect(p.tabelaTiers[1].ateHoras).toBe(656);
  });

  it("hidrata o último tier com ateHoras null como Infinity", () => {
    const json = serializarPremissas(PREMISSAS_PADRAO);
    const ultimo = (json.tabelaTiers as { ateHoras: number | null }[]).at(-1);
    expect(ultimo?.ateHoras).toBeNull();
    const hidratado = hidratarPremissas(json);
    expect(hidratado.tabelaTiers.at(-1)?.ateHoras).toBe(Infinity);
    expect(premissasSaoPadrao(hidratado)).toBe(true);
  });

  it("rejeita tabela de tiers com fronteiras invertidas", () => {
    const p = fundirPremissas({
      tabelaTiers: [
        { tier: 1, ateHoras: 656, taxaHora: 98 },
        { tier: 2, ateHoras: 262, taxaHora: 82 },
        { tier: 3, ateHoras: 1243, taxaHora: 70 },
        { tier: 4, ateHoras: null, taxaHora: 60 },
      ],
    });
    expect(p.tabelaTiers[1].ateHoras).toBe(656);
  });
});

describe("sessaoPodeEditarPremissas", () => {
  it("só interno", () => {
    expect(sessaoPodeEditarPremissas("interno")).toBe(true);
    expect(sessaoPodeEditarPremissas("cliente")).toBe(false);
    expect(sessaoPodeEditarPremissas(null)).toBe(false);
  });
});

describe("override no motor", () => {
  it("o golden §14 não muda com o padrão", () => {
    const padrao = computarModelo(estadoGolden());
    const r = padrao.times[0].resultado;
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.roi).toBeCloseTo(1.951, 3);
  });

  it("haircut menor neste link sobe o ROI sem alterar o golden global", () => {
    const padrao = computarModelo(estadoGolden());
    const override = computarModelo(estadoGolden(), fundirPremissas({ haircut: 1 }));
    const rPadrao = padrao.times[0].resultado;
    const rOverride = override.times[0].resultado;
    expect(rPadrao.status).toBe("ok");
    expect(rOverride.status).toBe("ok");
    if (rPadrao.status !== "ok" || rOverride.status !== "ok") return;
    expect(rOverride.roi).toBeGreaterThan(rPadrao.roi);
    expect(rPadrao.roi).toBeCloseTo(1.951, 3);
  });

  it("tier 2 em 573 h neste link muda o preço FIESC-like sem tocar o padrão", () => {
    const p = fundirPremissas({
      tabelaTiers: [
        { tier: 1, ateHoras: 262, taxaHora: 98 },
        { tier: 2, ateHoras: 573, taxaHora: 82 },
        { tier: 3, ateHoras: 1243, taxaHora: 70 },
        { tier: 4, ateHoras: null, taxaHora: 60 },
      ],
    });
    expect(p.tabelaTiers[1].ateHoras).toBe(573);
    expect(PREMISSAS_PADRAO.tabelaTiers[1].ateHoras).toBe(656);
  });
});

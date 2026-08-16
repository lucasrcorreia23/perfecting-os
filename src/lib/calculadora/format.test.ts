import { describe, expect, it } from "vitest";
import {
  formatBRL,
  formatBRLCompacto,
  formatDias,
  formatMeses,
  formatNumero,
  formatPct,
  formatPp,
  formatX,
} from "@/lib/calculadora/format";

// Intl usa espaço não separável entre "R$" e o número.
const NBSP = " ";

describe("campo vazio produz travessão — nunca NaN, Infinity ou zero (P6)", () => {
  it("todas as saídas devolvem — para null e não finito", () => {
    for (const valor of [null, NaN, Infinity, -Infinity]) {
      expect(formatBRL(valor)).toBe("—");
      expect(formatBRLCompacto(valor)).toBe("—");
      expect(formatX(valor)).toBe("—");
      expect(formatPct(valor)).toBe("—");
      expect(formatMeses(valor)).toBe("—");
      expect(formatNumero(valor)).toBe("—");
      expect(formatDias(valor)).toBe("—");
      expect(formatPp(valor)).toBe("—");
    }
  });
});

describe("formatação pt-BR", () => {
  it("moeda inteira e com decimais", () => {
    expect(formatBRL(13_000)).toBe(`R$${NBSP}13.000`);
    expect(formatBRL(19.7, 2)).toBe(`R$${NBSP}19,70`);
  });

  it("compacto para manchetes", () => {
    expect(formatBRLCompacto(545_100)).toBe("R$ 545 mil");
    expect(formatBRLCompacto(1_200_000)).toBe("R$ 1,2 mi");
    expect(formatBRLCompacto(980)).toBe(`R$${NBSP}980`);
  });

  it("roi sempre exibido com duas casas, sem arredondar para cima", () => {
    expect(formatX(304_380 / 156_000)).toBe("1,95×");
    expect(formatX(0.4)).toBe("0,40×"); // abaixo de 1× continua exibido (P7 revogado)
  });

  it("percentual, meses, dias e pontos percentuais", () => {
    expect(formatPct(7.644, 1)).toBe("7,6%");
    expect(formatMeses(6.1502)).toBe("6,2 meses");
    expect(formatMeses(1)).toBe("1 mês");
    expect(formatDias(45)).toBe("45 dias");
    expect(formatDias(1)).toBe("1 dia");
    expect(formatPp(0.5)).toBe("+0,5 p.p.");
  });
});

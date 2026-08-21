import { describe, expect, it } from "vitest";
import { praticaDiariaSemanal } from "./opcao-cards";

// Traduz "Nh/mês" (o que os três planos declaram) em algo que cabe numa
// agenda. 22 dias úteis/mês, 5 dias úteis/semana — a mesma leitura de "dia
// útil" que `DIAS_UTEIS_MES` já assume em calc.ts. Por dia fica em minutos
// (números pequenos demais para horas fazerem sentido); por semana já soma o
// bastante para virar horas.

describe("praticaDiariaSemanal", () => {
  it("Leve (2h/mês) — ~5 min/dia, ~0,45h/semana", () => {
    const { minutosDia, horasSemana } = praticaDiariaSemanal(2);
    expect(minutosDia).toBe(5);
    expect(horasSemana).toBeCloseTo(0.4545, 4);
  });

  it("Padrão (4h/mês) — ~11 min/dia, ~0,91h/semana", () => {
    const { minutosDia, horasSemana } = praticaDiariaSemanal(4);
    expect(minutosDia).toBe(11);
    expect(horasSemana).toBeCloseTo(0.9091, 4);
  });

  it("Intensivo (8h/mês) — ~22 min/dia, ~1,82h/semana", () => {
    const { minutosDia, horasSemana } = praticaDiariaSemanal(8);
    expect(minutosDia).toBe(22);
    expect(horasSemana).toBeCloseTo(1.8182, 4);
  });

  it("zero horas não vira NaN nem negativo", () => {
    expect(praticaDiariaSemanal(0)).toEqual({ minutosDia: 0, horasSemana: 0 });
  });
});

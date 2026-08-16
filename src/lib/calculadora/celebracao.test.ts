import { describe, expect, it } from "vitest";
import { timesJaCompletos, timesParaCelebrar } from "@/lib/calculadora/celebracao";
import type { Progresso } from "@/lib/calculadora/estado";

function prog(...times: { timeId: string; completo: boolean }[]): Progresso {
  const porTime = times.map((time) => ({
    timeId: time.timeId,
    preenchidos: time.completo ? 13 : 7,
    total: 13,
    completo: time.completo,
  }));
  return {
    preenchidos: porTime.reduce((soma, time) => soma + time.preenchidos, 0),
    total: porTime.reduce((soma, time) => soma + time.total, 0),
    porTime,
  };
}

describe("timesJaCompletos — a semente de 'já sabia'", () => {
  it("lista os times completos no primeiro render", () => {
    expect(timesJaCompletos(prog({ timeId: "a", completo: true }))).toEqual(["a"]);
  });

  it("time incompleto não entra na semente", () => {
    expect(
      timesJaCompletos(prog({ timeId: "a", completo: true }, { timeId: "b", completo: false })),
    ).toEqual(["a"]);
  });
});

describe("timesParaCelebrar", () => {
  it("quem completa durante a sessão comemora", () => {
    const vistos = timesJaCompletos(prog({ timeId: "a", completo: false }));
    expect(timesParaCelebrar(vistos, prog({ timeId: "a", completo: true }))).toEqual(["a"]);
  });

  it("quem volta com o link já preenchido não comemora", () => {
    const inicial = prog({ timeId: "a", completo: true });
    expect(timesParaCelebrar(timesJaCompletos(inicial), inicial)).toEqual([]);
  });

  it("segundo time completado comemora de novo, sozinho", () => {
    const vistos = ["a"];
    expect(
      timesParaCelebrar(
        vistos,
        prog({ timeId: "a", completo: true }, { timeId: "b", completo: true }),
      ),
    ).toEqual(["b"]);
  });

  it("incompletar e recompletar o mesmo time não reabre a comemoração", () => {
    // A lista de vistos só cresce: uma vez comemorado, o time não volta.
    const vistos = ["a"];
    expect(timesParaCelebrar(vistos, prog({ timeId: "a", completo: false }))).toEqual([]);
    expect(timesParaCelebrar(vistos, prog({ timeId: "a", completo: true }))).toEqual([]);
  });

  it("time incompleto nunca entra", () => {
    expect(timesParaCelebrar([], prog({ timeId: "a", completo: false }))).toEqual([]);
  });
});

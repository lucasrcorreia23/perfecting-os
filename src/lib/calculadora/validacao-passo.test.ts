import { describe, expect, it } from "vitest";
import { entradasVazias } from "./estado";
import type { EntradasTime } from "./types";
import {
  errosPorCampo,
  mensagemDe,
  resumoDoErro,
  rotuloDe,
  validarPasso,
} from "./validacao-passo";

// Time completo, nos números do §14.
function completo(): EntradasTime {
  return {
    ...entradasVazias(),
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
  };
}

describe("validarPasso", () => {
  it("não acusa nada num passo completo", () => {
    for (const passo of [1, 2, 3, 4, 5] as const) {
      expect(validarPasso(completo(), passo), `passo ${passo}`).toEqual([]);
    }
  });

  it("acusa todos os campos vazios do passo, e só os do passo", () => {
    const erros = validarPasso(entradasVazias(), 1);
    expect(erros.map((e) => e.campo)).toEqual([
      "numVendedores",
      "numGestoresTreino",
      "horasTreinoGestorMes",
      "vendedoresPorGestorMes",
      "horasPraticaPorRepHoje",
    ]);
    // Nada do passo 2 vaza para o passo 1.
    expect(erros.some((e) => e.campo === "receitaMensal")).toBe(false);
  });

  it("nomeia o campo na mensagem", () => {
    const erros = validarPasso({ ...completo(), ticketMedio: null }, 2);
    expect(erros).toEqual([
      {
        campo: "ticketMedio",
        mensagem: "Preencha “Ticket médio” para continuar.",
        curta: "Preencha para continuar.",
      },
    ]);
  });

  it("salarioVendedor é opcional e não bloqueia o passo 3", () => {
    const entradas = { ...completo(), salarioVendedor: null };
    expect(validarPasso(entradas, 3)).toEqual([]);
  });

  it("valor fora do domínio bloqueia como se estivesse vazio", () => {
    expect(validarPasso({ ...completo(), conversaoPct: 120 }, 2).map((e) => e.campo)).toEqual(
      ["conversaoPct"],
    );
    expect(validarPasso({ ...completo(), margemPct: 150 }, 2).map((e) => e.campo)).toEqual([
      "margemPct",
    ]);
  });
});

describe("validarPasso — passo 4 e os custos condicionais", () => {
  it("sem caminho escolhido, pede a escolha", () => {
    const erros = validarPasso({ ...completo(), caminho: null }, 4);
    expect(erros).toEqual([
      {
        campo: "caminho",
        mensagem: "Escolha uma opção para continuar.",
        curta: "Escolha uma opção para continuar.",
      },
    ]);
  });

  it("caminho externo sem custo bloqueia", () => {
    const erros = validarPasso({ ...completo(), caminho: "externo" }, 4);
    expect(erros.map((e) => e.campo)).toEqual(["custoExternoAno"]);
  });

  it("caminho evento sem custo bloqueia", () => {
    const erros = validarPasso({ ...completo(), caminho: "evento" }, 4);
    expect(erros.map((e) => e.campo)).toEqual(["custoEventoAno"]);
  });

  it("o custo do outro caminho não é cobrado", () => {
    const entradas = { ...completo(), caminho: "externo" as const, custoExternoAno: 150_000 };
    expect(validarPasso(entradas, 4)).toEqual([]);
  });

  it("caminho nenhum não pede custo", () => {
    expect(validarPasso({ ...completo(), caminho: "nenhum" }, 4)).toEqual([]);
  });
});

describe("validarPasso — passo 5 é opcional, dois ou nenhum", () => {
  it("vazio passa", () => {
    expect(validarPasso(completo(), 5)).toEqual([]);
  });

  it("os dois preenchidos passam", () => {
    expect(validarPasso({ ...completo(), cicloDias: 45, leadsMes: 300 }, 5)).toEqual([]);
  });

  it("pela metade acusa nos DOIS campos — apagar também resolve", () => {
    const soCiclo = validarPasso({ ...completo(), cicloDias: 45 }, 5);
    expect(soCiclo.map((e) => e.campo)).toEqual(["cicloDias", "leadsMes"]);
    expect(soCiclo[0].mensagem).toBe("Preencha os dois campos do ciclo — ou pule a etapa.");

    const soLeads = validarPasso({ ...completo(), leadsMes: 300 }, 5);
    expect(soLeads.map((e) => e.campo)).toEqual(["cicloDias", "leadsMes"]);
  });
});

describe("rótulos e mensagens", () => {
  it("o caminho tem rótulo próprio, não o id", () => {
    expect(rotuloDe("caminho")).toBe("Sem a Perfecting, o que sua operação faria?");
    expect(mensagemDe("caminho")).toBe("Escolha uma opção para continuar.");
  });

  it("todo campo do wizard tem rótulo legível", () => {
    for (const campo of [
      "numVendedores",
      "receitaMensal",
      "cicloDias",
      "custoEventoAno",
    ] as const) {
      expect(rotuloDe(campo).length).toBeGreaterThan(2);
      expect(mensagemDe(campo)).toContain(rotuloDe(campo));
    }
  });
});

describe("errosPorCampo e resumoDoErro", () => {
  it("indexa por campo", () => {
    // Indexa pela CURTA: é ela que vai sob o campo.
    const mapa = errosPorCampo(validarPasso(entradasVazias(), 2));
    expect(mapa.receitaMensal).toBe("Preencha para continuar.");
    expect(mapa.numVendedores).toBeUndefined();
  });

  it("anuncia uma frase só, com a contagem quando há mais de um", () => {
    expect(resumoDoErro([])).toBeNull();
    expect(resumoDoErro(validarPasso({ ...completo(), ticketMedio: null }, 2))).toBe(
      "Preencha “Ticket médio” para continuar.",
    );
    const varios = resumoDoErro(validarPasso(entradasVazias(), 1));
    expect(varios).toContain("Preencha “Vendedores” para continuar.");
    expect(varios).toContain("Faltam 5 campos");
  });

  it("no funil pela metade anuncia a frase do funil, sem contagem", () => {
    const resumo = resumoDoErro(validarPasso({ ...completo(), cicloDias: 45 }, 5));
    expect(resumo).toBe("Preencha os dois campos do ciclo — ou pule a etapa.");
  });
});

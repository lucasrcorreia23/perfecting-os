import { describe, expect, it } from "vitest";
import { entradasVazias, estadoInicial, progresso } from "./estado";
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
    for (const passo of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
      expect(validarPasso(completo(), passo), `pergunta ${passo}`).toEqual([]);
    }
  });

  it("acusa todos os campos vazios da pergunta, e só os dela", () => {
    const erros = validarPasso(entradasVazias(), 1);
    expect(erros.map((e) => e.campo)).toEqual([
      "numVendedores",
      "numGestoresTreino",
      "horasTreinoGestorMes",
    ]);
    // A prática é a pergunta 2; a receita, a 4. Nenhuma vaza para a 1.
    expect(erros.some((e) => e.campo === "horasPraticaPorRepHoje")).toBe(false);
    expect(erros.some((e) => e.campo === "receitaMensal")).toBe(false);

    expect(validarPasso(entradasVazias(), 2).map((e) => e.campo)).toEqual([
      "vendedoresPorGestorMes",
      "horasPraticaPorRepHoje",
    ]);
  });

  it("nomeia o campo na mensagem", () => {
    const erros = validarPasso({ ...completo(), ticketMedio: null }, 4);
    expect(erros).toEqual([
      {
        campo: "ticketMedio",
        mensagem: "Preencha “Ticket médio” para continuar.",
        curta: "Preencha para continuar.",
      },
    ]);
  });

  it("salarioVendedor é opcional e não bloqueia a pergunta 3", () => {
    const entradas = { ...completo(), salarioVendedor: null };
    expect(validarPasso(entradas, 3)).toEqual([]);
  });

  it("valor fora do domínio bloqueia como se estivesse vazio", () => {
    expect(validarPasso({ ...completo(), conversaoPct: 120 }, 5).map((e) => e.campo)).toEqual(
      ["conversaoPct"],
    );
    expect(validarPasso({ ...completo(), margemPct: 150 }, 5).map((e) => e.campo)).toEqual([
      "margemPct",
    ]);
  });
});

describe("validarPasso — pergunta 3 e os custos condicionais", () => {
  it("sem caminho escolhido, pede a escolha", () => {
    const erros = validarPasso({ ...completo(), caminho: null }, 3);
    expect(erros).toEqual([
      {
        campo: "caminho",
        mensagem: "Escolha uma opção para continuar.",
        curta: "Escolha uma opção para continuar.",
      },
    ]);
  });

  it("caminho externo sem custo bloqueia", () => {
    const erros = validarPasso({ ...completo(), caminho: "externo" }, 3);
    expect(erros.map((e) => e.campo)).toEqual(["custoExternoAno"]);
  });

  it("caminho evento sem custo bloqueia", () => {
    const erros = validarPasso({ ...completo(), caminho: "evento" }, 3);
    expect(erros.map((e) => e.campo)).toEqual(["custoEventoAno"]);
  });

  it("o custo do outro caminho não é cobrado", () => {
    const entradas = { ...completo(), caminho: "externo" as const, custoExternoAno: 150_000 };
    expect(validarPasso(entradas, 3)).toEqual([]);
  });

  it("caminho nenhum não pede custo", () => {
    expect(validarPasso({ ...completo(), caminho: "nenhum" }, 3)).toEqual([]);
  });
});

describe("validarPasso — a pergunta 7 é opcional, dois ou nenhum", () => {
  it("vazio passa", () => {
    expect(validarPasso(completo(), 7)).toEqual([]);
  });

  it("os dois preenchidos passam", () => {
    expect(validarPasso({ ...completo(), cicloDias: 45, leadsMes: 300 }, 7)).toEqual([]);
  });

  it("pela metade acusa nos DOIS campos — apagar também resolve", () => {
    const soCiclo = validarPasso({ ...completo(), cicloDias: 45 }, 7);
    expect(soCiclo.map((e) => e.campo)).toEqual(["cicloDias", "leadsMes"]);
    expect(soCiclo[0].mensagem).toBe("Preencha os dois campos do ciclo — ou pule a etapa.");

    const soLeads = validarPasso({ ...completo(), leadsMes: 300 }, 7);
    expect(soLeads.map((e) => e.campo)).toEqual(["cicloDias", "leadsMes"]);
  });
});

describe("rótulos e mensagens", () => {
  it("o caminho tem rótulo próprio, não o id", () => {
    expect(rotuloDe("caminho")).toBe("Como vocês treinam hoje, principalmente?");
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
    const mapa = errosPorCampo(validarPasso(entradasVazias(), 4));
    expect(mapa.receitaMensal).toBe("Preencha para continuar.");
    expect(mapa.numVendedores).toBeUndefined();
  });

  it("anuncia uma frase só, com a contagem quando há mais de um", () => {
    expect(resumoDoErro([])).toBeNull();
    expect(resumoDoErro(validarPasso({ ...completo(), ticketMedio: null }, 4))).toBe(
      "Preencha “Ticket médio” para continuar.",
    );
    const varios = resumoDoErro(validarPasso(entradasVazias(), 1));
    expect(varios).toContain("Preencha “Número de vendedores” para continuar.");
    expect(varios).toContain("Faltam 3 campos");
  });

  it("no funil pela metade anuncia a frase do funil, sem contagem", () => {
    const resumo = resumoDoErro(validarPasso({ ...completo(), cicloDias: 45 }, 7));
    expect(resumo).toBe("Preencha os dois campos do ciclo — ou pule a etapa.");
  });
});

// A referência de fórmulas (botão no header e rota
// `/api/publico/calculadora/[token]/formulas`) abre pela MESMA condição: existe
// pelo menos um time completo. As duas pontas leem esta predicada, então ela
// fica pinada aqui — se o gating mudar, a trava do documento muda junto e sem
// silêncio.
describe("condição de liberação da referência de fórmulas", () => {
  it("estado novo não tem time completo", () => {
    const prog = progresso(estadoInicial());
    expect(prog.porTime.some((time) => time.completo)).toBe(false);
  });

  it("um time completo libera, mesmo com um irmão pela metade", () => {
    const base = estadoInicial();
    const cheio = { ...base.times[0], entradas: completo() };
    const estado = {
      ...base,
      times: [cheio, { ...base.times[0], id: "t2", nome: "Time 2" }],
    };
    const prog = progresso(estado);
    expect(prog.porTime.some((time) => time.completo)).toBe(true);
    expect(prog.porTime.every((time) => time.completo)).toBe(false);
  });
});

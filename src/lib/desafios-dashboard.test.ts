import { describe, expect, it } from "vitest";
import {
  computeDesafiosDashboard,
  type DesafioDashboardRow,
  type TaxonomiaLinha,
} from "./desafios-dashboard";

function taxonomia(
  id: string,
  nome: string,
  overrides: Partial<TaxonomiaLinha> = {},
): TaxonomiaLinha {
  return { id, nome, cor: "#2E63CD", ordem: 0, arquivada: false, ...overrides };
}

function desafio(
  overrides: Partial<DesafioDashboardRow> & { id: string },
): DesafioDashboardRow {
  return {
    codigo: 1,
    titulo: "Um desafio",
    tipo: "bug",
    status: "aberto",
    severidade: "media",
    categoria: { id: "cat-1" },
    fluxo: { id: "flu-1" },
    tentativas: 0,
    falhas: 0,
    ocorrencias: [],
    ...overrides,
  };
}

const CATEGORIAS = [
  taxonomia("cat-1", "Erro ou quebra", { ordem: 1 }),
  taxonomia("cat-2", "Visual e layout", { ordem: 2 }),
];
const FLUXOS = [
  taxonomia("flu-1", "Workflow", { ordem: 1 }),
  taxonomia("flu-2", "Calculadora", { ordem: 2 }),
];

function dashboard(desafios: DesafioDashboardRow[]) {
  return computeDesafiosDashboard({ desafios, categorias: CATEGORIAS, fluxos: FLUXOS });
}

describe("eixos da matriz", () => {
  it("segue a ordem da taxonomia, não o volume", () => {
    // cat-2 tem mais desafios, e ainda assim vem depois: a ordem descreve uma
    // estrutura, e reordená-la a cada bug novo embaralharia a leitura.
    const d = dashboard([
      desafio({ id: "1", categoria: { id: "cat-1" } }),
      desafio({ id: "2", categoria: { id: "cat-2" } }),
      desafio({ id: "3", categoria: { id: "cat-2" } }),
    ]);
    expect(d.matriz.linhas.map((linha) => linha.nome)).toEqual([
      "Erro ou quebra",
      "Visual e layout",
    ]);
  });

  it("o ranking, ao contrário, ordena por volume", () => {
    const d = dashboard([
      desafio({ id: "1", categoria: { id: "cat-1" } }),
      desafio({ id: "2", categoria: { id: "cat-2" } }),
      desafio({ id: "3", categoria: { id: "cat-2" } }),
    ]);
    expect(d.porCategoria.map((linha) => linha.nome)).toEqual([
      "Visual e layout",
      "Erro ou quebra",
    ]);
  });

  it("cria os baldes Sem categoria e Sem fluxo, ao fim, só quando há o que pôr neles", () => {
    const semNada = dashboard([desafio({ id: "1" })]);
    expect(semNada.matriz.linhas.map((l) => l.id)).toEqual(["cat-1", "cat-2"]);

    const comOrfao = dashboard([
      desafio({ id: "1" }),
      desafio({ id: "2", categoria: null, fluxo: null }),
    ]);
    expect(comOrfao.matriz.linhas.at(-1)).toMatchObject({ id: null, nome: "Sem categoria" });
    expect(comOrfao.matriz.colunas.at(-1)).toMatchObject({ id: null, nome: "Sem fluxo" });
  });

  it("mantém no eixo a taxonomia arquivada que ainda tem desafios", () => {
    const categorias = [
      taxonomia("cat-1", "Erro ou quebra", { ordem: 1 }),
      taxonomia("cat-2", "Visual e layout", { ordem: 2, arquivada: true }),
      taxonomia("cat-3", "Desempenho", { ordem: 3, arquivada: true }),
    ];
    const d = computeDesafiosDashboard({
      desafios: [desafio({ id: "1", categoria: { id: "cat-2" } })],
      categorias,
      fluxos: FLUXOS,
    });
    // cat-2 fica (tem histórico); cat-3 sai (arquivada e vazia).
    expect(d.matriz.linhas.map((l) => l.id)).toEqual(["cat-1", "cat-2"]);
  });
});

describe("a matriz reconcilia", () => {
  it("a soma das células é igual ao total de desafios", () => {
    const desafios = [
      desafio({ id: "1", categoria: { id: "cat-1" }, fluxo: { id: "flu-1" } }),
      desafio({ id: "2", categoria: { id: "cat-2" }, fluxo: { id: "flu-2" } }),
      desafio({ id: "3", categoria: null, fluxo: { id: "flu-1" } }),
      desafio({ id: "4", categoria: { id: "cat-1" }, fluxo: null }),
    ];
    const d = dashboard(desafios);
    const soma = d.matriz.celulas.flat().reduce((total, c) => total + c.total, 0);

    // O teste que impede um balde escondido: se "Sem categoria" ou "Sem fluxo"
    // sumir do eixo, esta soma para de bater.
    expect(soma).toBe(d.total);
    expect(soma).toBe(4);
    expect(d.matriz.total.total).toBe(4);
  });

  it("conta e mede separadamente: três desafios, um medido", () => {
    const d = dashboard([
      desafio({ id: "1", tentativas: 10, falhas: 7 }),
      desafio({ id: "2" }),
      desafio({ id: "3" }),
    ]);
    const celula = d.matriz.celulas[0][0];
    expect(celula.total).toBe(3);
    expect(celula.recorrencia).toMatchObject({ status: "medido", tentativas: 10, falhas: 7 });
  });
});

describe("recorrência agregada nas leituras", () => {
  it("a categoria soma as medições, não a média das porcentagens", () => {
    const d = dashboard([
      desafio({ id: "1", tentativas: 2, falhas: 2 }),
      desafio({ id: "2", tentativas: 200, falhas: 20 }),
    ]);
    const categoria = d.porCategoria[0];
    if (categoria.recorrencia.status !== "medido") throw new Error("esperava medição");
    expect(categoria.recorrencia.pct).toBeCloseTo(22 / 202, 6);
    expect(categoria.recorrencia.pct).not.toBeCloseTo(0.55, 2);
  });

  it("a recorrência geral ignora o que não é bug", () => {
    const d = dashboard([
      desafio({ id: "1", tipo: "bug", tentativas: 10, falhas: 7 }),
      desafio({ id: "2", tipo: "lacuna", tentativas: 100, falhas: 0 }),
    ]);
    if (d.recorrenciaGeral.status !== "medido") throw new Error("esperava medição");
    // Com a lacuna dentro, a taxa cairia para 7/110 — a lacuna não "quebra".
    expect(d.recorrenciaGeral.tentativas).toBe(10);
    expect(d.recorrenciaGeral.pct).toBeCloseTo(0.7);
    expect(d.bugs).toBe(1);
    expect(d.bugsMedidos).toBe(1);
  });

  it("conta os bugs que ficaram de fora da medição", () => {
    const d = dashboard([
      desafio({ id: "1", tentativas: 10, falhas: 7 }),
      desafio({ id: "2" }),
      desafio({ id: "3" }),
    ]);
    expect(d.bugs).toBe(3);
    expect(d.bugsMedidos).toBe(1);
    expect(d.bugsSemMedicao).toBe(2);
  });

  it("sem nenhum bug medido, a recorrência geral é sem_dados — nunca 0%", () => {
    const d = dashboard([desafio({ id: "1" })]);
    expect(d.recorrenciaGeral).toEqual({ status: "sem_dados" });
  });
});

describe("níveis de intensidade", () => {
  it("célula vazia é nível 0 e a mais cheia é nível 3", () => {
    const desafios = [
      ...Array.from({ length: 9 }, (_, i) =>
        desafio({ id: `a${i}`, categoria: { id: "cat-1" }, fluxo: { id: "flu-1" } }),
      ),
      desafio({ id: "b", categoria: { id: "cat-2" }, fluxo: { id: "flu-2" } }),
    ];
    const d = dashboard(desafios);
    expect(d.matriz.celulas[0][0].nivel).toBe(3); // 9 de 9
    expect(d.matriz.celulas[0][1].nivel).toBe(0); // vazia
    expect(d.matriz.celulas[1][1].nivel).toBe(1); // 1 de 9
    expect(d.matriz.faixas[2]).toBe(9);
  });
});

describe("reincidentes", () => {
  it("ignora amostra abaixo do mínimo — 1 de 1 não é 100% de nada", () => {
    const d = dashboard([
      desafio({ id: "1", codigo: 1, tentativas: 1, falhas: 1 }),
      desafio({ id: "2", codigo: 2, tentativas: 10, falhas: 3 }),
    ]);
    expect(d.reincidentes.map((r) => r.codigo)).toEqual([2]);
  });

  it("ordena por proporção e desempata pela amostra maior", () => {
    const d = dashboard([
      desafio({ id: "1", codigo: 1, tentativas: 10, falhas: 3 }),
      desafio({ id: "2", codigo: 2, tentativas: 10, falhas: 9 }),
      desafio({ id: "3", codigo: 3, tentativas: 100, falhas: 90 }),
    ]);
    expect(d.reincidentes.map((r) => r.codigo)).toEqual([3, 2, 1]);
  });

  it("desafio medido que nunca falhou fica fora do ranking", () => {
    const d = dashboard([desafio({ id: "1", codigo: 1, tentativas: 20, falhas: 0 })]);
    expect(d.reincidentes).toEqual([]);
  });
});

describe("contagens de topo", () => {
  it("aberto é o que ainda pede ação — nao_reproduz não pede", () => {
    const d = dashboard([
      desafio({ id: "1", status: "aberto" }),
      desafio({ id: "2", status: "em_analise" }),
      desafio({ id: "3", status: "nao_reproduz" }),
      desafio({ id: "4", status: "resolvido" }),
    ]);
    expect(d.abertos).toBe(2);
    expect(d.porStatus.nao_reproduz).toBe(1);
  });

  it("conta os críticos que continuam abertos", () => {
    const d = dashboard([
      desafio({ id: "1", severidade: "critica", status: "aberto" }),
      desafio({ id: "2", severidade: "critica", status: "resolvido" }),
    ]);
    expect(d.criticosAbertos).toBe(1);
  });
});

describe("cruzamentosNaoVazios", () => {
  it("descarta as células vazias e ordena por volume", async () => {
    const { cruzamentosNaoVazios } = await import("./desafios-dashboard");
    const d = dashboard([
      desafio({ id: "1", categoria: { id: "cat-1" }, fluxo: { id: "flu-1" } }),
      desafio({ id: "2", categoria: { id: "cat-2" }, fluxo: { id: "flu-2" } }),
      desafio({ id: "3", categoria: { id: "cat-2" }, fluxo: { id: "flu-2" } }),
    ]);
    const cruzamentos = cruzamentosNaoVazios(d.matriz);

    // Quatro células possíveis, duas preenchidas.
    expect(cruzamentos).toHaveLength(2);
    expect(cruzamentos[0].celula.total).toBe(2);
    expect(cruzamentos[0].categoria.nome).toBe("Visual e layout");
    expect(cruzamentos[0].fluxo.nome).toBe("Calculadora");
  });
});

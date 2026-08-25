import { describe, expect, it } from "vitest";
import {
  SEM_CLASSIFICACAO,
  filterDesafios,
  type DesafioFilters,
  type DesafioRow,
} from "./desafios-view";

function desafio(overrides: Partial<DesafioRow> & { id: string }): DesafioRow {
  return {
    codigo: 1,
    titulo: "Kanban perde o cliente ao arrastar",
    descricao: "Ao soltar o card em outra etapa, ele volta para a origem.",
    tipo: "bug",
    severidade: "alta",
    status: "aberto",
    categoria: { id: "cat-1", nome: "Erro ou quebra", cor: "#E11D48" },
    fluxo: { id: "flu-1", nome: "Workflow", cor: "#7C3AED" },
    tentativas: 10,
    falhas: 7,
    ocorrencias: [],
    passos: null,
    esperado: null,
    obtido: null,
    ambiente: null,
    rota: "/workflow",
    evidencia_url: null,
    resolucao: null,
    resolvido_em: null,
    observacoes: null,
    created_at: "2026-08-01T12:00:00.000Z",
    updated_at: "2026-08-01T12:00:00.000Z",
    ...overrides,
  };
}

const DESAFIOS: DesafioRow[] = [
  desafio({ id: "1", codigo: 14 }),
  desafio({
    id: "2",
    codigo: 15,
    titulo: "Total do contrato some no mobile",
    descricao: null,
    rota: null,
    tipo: "atrito",
    severidade: "media",
    status: "em_analise",
    categoria: { id: "cat-2", nome: "Visual e layout", cor: "#7C3AED" },
    fluxo: { id: "flu-2", nome: "Calculadora", cor: "#D97706" },
  }),
  desafio({
    id: "3",
    codigo: 16,
    titulo: "Falta exportar leads em PDF",
    tipo: "lacuna",
    severidade: "baixa",
    status: "descartado",
    categoria: null,
    fluxo: null,
    rota: null,
    descricao: null,
  }),
];

const SEM_FILTRO: DesafioFilters = {
  query: "",
  categoria: "todas",
  fluxo: "todos",
  status: "todos",
  tipo: "todos",
  severidade: "todas",
};

const ids = (linhas: DesafioRow[]) => linhas.map((linha) => linha.id);

describe("filterDesafios", () => {
  it("sem filtros devolve tudo, na ordem recebida", () => {
    expect(ids(filterDesafios(DESAFIOS, SEM_FILTRO))).toEqual(["1", "2", "3"]);
  });

  it("busca por título, descrição e rota, ignorando caixa e espaços", () => {
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, query: "  KANBAN " }))).toEqual(["1"]);
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, query: "outra etapa" }))).toEqual(["1"]);
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, query: "/workflow" }))).toEqual(["1"]);
  });

  it("acha pelo código formatado e pelo número cru", () => {
    // "DES-015" é o rótulo que circula em conversa; "15" é o que a pessoa digita.
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, query: "des-015" }))).toEqual(["2"]);
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, query: "15" }))).toEqual(["2"]);
  });

  it("desafio sem descrição e sem rota não quebra a busca", () => {
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, query: "pdf" }))).toEqual(["3"]);
  });

  it("filtra por categoria e por fluxo", () => {
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, categoria: "cat-2" }))).toEqual(["2"]);
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, fluxo: "flu-1" }))).toEqual(["1"]);
  });

  it("a sentinela de sem classificação alcança os não classificados", () => {
    expect(
      ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, categoria: SEM_CLASSIFICACAO })),
    ).toEqual(["3"]);
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, fluxo: SEM_CLASSIFICACAO }))).toEqual([
      "3",
    ]);
  });

  it("filtra por status, tipo e severidade", () => {
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, status: "em_analise" }))).toEqual(["2"]);
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, tipo: "lacuna" }))).toEqual(["3"]);
    expect(ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, severidade: "alta" }))).toEqual(["1"]);
  });

  it("combina todos os filtros", () => {
    expect(
      ids(
        filterDesafios(DESAFIOS, {
          ...SEM_FILTRO,
          query: "total",
          categoria: "cat-2",
          fluxo: "flu-2",
          status: "em_analise",
          tipo: "atrito",
          severidade: "media",
        }),
      ),
    ).toEqual(["2"]);

    // Um filtro que não casa esvazia o recorte inteiro.
    expect(
      ids(filterDesafios(DESAFIOS, { ...SEM_FILTRO, query: "total", tipo: "bug" })),
    ).toEqual([]);
  });
});

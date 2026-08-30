import { describe, expect, it } from "vitest";
import { filterSessoes, type SessaoFilters } from "./sessoes-view";
import type { SessaoRow } from "./mapear-sessao";

function sessao(overrides: Partial<SessaoRow> & { id: string }): SessaoRow {
  return {
    codigo: 1,
    perfil: "vendedor",
    fluxo: "chamada",
    varejo: false,
    realizado_em: "2026-08-28",
    roteiro_versao: 1,
    respostas: {},
    origem: "manual",
    observacoes: null,
    created_at: "2026-08-28T12:00:00.000Z",
    achados: 0,
    ...overrides,
  };
}

const TODOS: SessaoFilters = {
  query: "",
  perfil: "todos",
  fluxo: "todos",
  origem: "todas",
};

const BASE = [
  sessao({
    id: "a",
    codigo: 15,
    perfil: "gestor",
    fluxo: "configuracao",
    origem: "ficha",
    observacoes: "Gestor da loja centro",
    respostas: { b3b_irritou: "O botão de publicar some no celular" },
  }),
  sessao({
    id: "b",
    codigo: 16,
    perfil: "vendedor",
    fluxo: "feedback",
    origem: "transcricao",
    respostas: { b3a_irritou: "Demorou pra carregar" },
  }),
];

describe("filterSessoes", () => {
  it("sem filtro devolve tudo", () => {
    expect(filterSessoes(BASE, TODOS)).toHaveLength(2);
  });

  it("acha pelo código nas duas formas", () => {
    expect(filterSessoes(BASE, { ...TODOS, query: "TU-015" })).toHaveLength(1);
    expect(filterSessoes(BASE, { ...TODOS, query: "tu-015" })).toHaveLength(1);
    expect(filterSessoes(BASE, { ...TODOS, query: "15" })).toHaveLength(1);
  });

  // A busca alcança o TEXTO DAS RESPOSTAS: é ali que mora o que a pessoa
  // lembra da sessão, não no código nem na observação.
  it("acha pelo conteúdo de uma resposta aberta", () => {
    const r = filterSessoes(BASE, { ...TODOS, query: "botão de publicar" });
    expect(r.map((s) => s.id)).toEqual(["a"]);
  });

  it("acha pela observação, sem depender de caixa", () => {
    expect(
      filterSessoes(BASE, { ...TODOS, query: "LOJA CENTRO" }).map((s) => s.id),
    ).toEqual(["a"]);
  });

  it("filtra por perfil, fluxo e origem", () => {
    expect(filterSessoes(BASE, { ...TODOS, perfil: "gestor" })).toHaveLength(1);
    expect(filterSessoes(BASE, { ...TODOS, fluxo: "feedback" })).toHaveLength(1);
    expect(filterSessoes(BASE, { ...TODOS, origem: "ficha" })).toHaveLength(1);
  });

  it("combina filtros até esvaziar", () => {
    expect(
      filterSessoes(BASE, { ...TODOS, perfil: "gestor", fluxo: "feedback" }),
    ).toHaveLength(0);
  });

  it("não quebra com observação nula nem respostas vazias", () => {
    expect(filterSessoes([sessao({ id: "c" })], { ...TODOS, query: "x" })).toHaveLength(
      0,
    );
  });
});

import { describe, expect, it } from "vitest";
import { filterLeads, type LeadRow } from "./leads-view";

function lead(overrides: Partial<LeadRow> & { id: string }): LeadRow {
  return {
    funnelId: "f1",
    funnelName: "Diagnóstico comercial",
    version: 1,
    questions: [],
    answers: {},
    name: "Ana Souza",
    email: "ana@empresa.com",
    phone: null,
    company: "Empresa X",
    roleTitle: null,
    score: 10,
    scoreMax: 20,
    scorePct: 50,
    qualificacao: "morno",
    status: "novo",
    clientId: null,
    notes: null,
    sourceUrl: null,
    created_at: "2026-08-01T12:00:00.000Z",
    ...overrides,
  };
}

const LEADS = [
  lead({ id: "1" }),
  lead({
    id: "2",
    name: "Bruno Lima",
    email: "bruno@outra.com",
    company: "Outra Co",
    funnelId: "f2",
    funnelName: "Newsletter",
    status: "qualificado",
    qualificacao: "quente",
  }),
  lead({
    id: "3",
    name: null,
    email: null,
    company: null,
    status: "descartado",
    qualificacao: "frio",
  }),
];

const SEM_FILTRO = {
  query: "",
  funnel: "todos",
  status: "todos",
  qualificacao: "todas",
};

describe("filterLeads", () => {
  it("sem filtros devolve tudo", () => {
    expect(filterLeads(LEADS, SEM_FILTRO)).toHaveLength(3);
  });

  it("filtra por funil", () => {
    expect(
      filterLeads(LEADS, { ...SEM_FILTRO, funnel: "f2" }).map((l) => l.id),
    ).toEqual(["2"]);
  });

  it("filtra por status e por qualificação", () => {
    expect(
      filterLeads(LEADS, { ...SEM_FILTRO, status: "descartado" }).map((l) => l.id),
    ).toEqual(["3"]);
    expect(
      filterLeads(LEADS, { ...SEM_FILTRO, qualificacao: "quente" }).map((l) => l.id),
    ).toEqual(["2"]);
  });

  it("busca por nome, e-mail e empresa, ignorando caixa e espaços", () => {
    expect(
      filterLeads(LEADS, { ...SEM_FILTRO, query: "  ANA " }).map((l) => l.id),
    ).toEqual(["1"]);
    expect(
      filterLeads(LEADS, { ...SEM_FILTRO, query: "bruno@outra" }).map((l) => l.id),
    ).toEqual(["2"]);
    expect(
      filterLeads(LEADS, { ...SEM_FILTRO, query: "outra co" }).map((l) => l.id),
    ).toEqual(["2"]);
  });

  it("lead sem nome, e-mail e empresa não quebra a busca", () => {
    expect(filterLeads(LEADS, { ...SEM_FILTRO, query: "ana" }).map((l) => l.id)).toEqual(
      ["1"],
    );
  });

  it("combina todos os filtros", () => {
    expect(
      filterLeads(LEADS, {
        query: "bruno",
        funnel: "f2",
        status: "qualificado",
        qualificacao: "quente",
      }).map((l) => l.id),
    ).toEqual(["2"]);
    expect(
      filterLeads(LEADS, {
        query: "bruno",
        funnel: "f1",
        status: "todos",
        qualificacao: "todas",
      }),
    ).toEqual([]);
  });
});

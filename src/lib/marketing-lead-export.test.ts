import { describe, expect, it } from "vitest";
import {
  answerColumns,
  csvDateTime,
  csvFilename,
  formatAnswer,
  leadsToCsv,
  type ExportableLead,
} from "./marketing-lead-export";
import type { FunnelQuestion } from "./marketing-funnel";

function question(partial: Partial<FunnelQuestion> & Pick<FunnelQuestion, "id">): FunnelQuestion {
  return {
    type: "texto_curto",
    label: "Pergunta",
    help: null,
    required: false,
    placeholder: null,
    options: [],
    weight: 1,
    scale: null,
    maps_to: null,
    ...partial,
  };
}

function lead(partial: Partial<ExportableLead> = {}): ExportableLead {
  return {
    name: "Lucas",
    email: "lucas@perfecting.com.br",
    phone: "48999247580",
    company: "Perfecting",
    roleTitle: null,
    funnelName: "Diagnóstico",
    version: 1,
    score: 30,
    scoreMax: 60,
    scorePct: 50,
    qualificacao: "morno",
    status: "novo",
    sourceUrl: "http://localhost:3001/funil/diagnostico",
    utm: {},
    questions: [],
    answers: {},
    created_at: "2026-08-15T17:32:00.000Z",
    ...partial,
  };
}

describe("formatAnswer", () => {
  it("traduz o id da opção escolhida para o rótulo", () => {
    const q = question({
      id: "q1",
      type: "escolha_unica",
      options: [
        { id: "o1", label: "Fundador(a)", score: 3 },
        { id: "o2", label: "Vendedor(a)", score: 1 },
      ],
    });
    expect(formatAnswer(q, "o2")).toBe("Vendedor(a)");
  });

  it("junta as opções de escolha múltipla por vírgula", () => {
    const q = question({
      id: "q1",
      type: "escolha_multipla",
      options: [
        { id: "o1", label: "Playbook", score: 2 },
        { id: "o2", label: "Objeções", score: 2 },
      ],
    });
    expect(formatAnswer(q, ["o2", "o1"])).toBe("Objeções, Playbook");
  });

  it("mantém o id quando a opção não existe mais no schema", () => {
    const q = question({ id: "q1", type: "escolha_unica", options: [] });
    expect(formatAnswer(q, "o_removida")).toBe("o_removida");
  });

  it("devolve string vazia quando não há resposta", () => {
    expect(formatAnswer(question({ id: "q1" }), undefined)).toBe("");
  });

  it("converte número de escala em texto", () => {
    const q = question({
      id: "q1",
      type: "escala",
      scale: { min: 0, max: 10, minLabel: null, maxLabel: null },
    });
    expect(formatAnswer(q, 8)).toBe("8");
  });
});

describe("csvDateTime", () => {
  it("usa dd/mm/aaaa hh:mm no fuso de São Paulo", () => {
    expect(csvDateTime("2026-08-15T17:32:00.000Z")).toBe("15/08/2026 14:32");
  });

  it("devolve vazio para data inválida", () => {
    expect(csvDateTime("não é data")).toBe("");
  });
});

describe("answerColumns", () => {
  it("deduplica por id e preserva a ordem de primeira aparição", () => {
    const a = lead({ questions: [question({ id: "q1", label: "Um" }), question({ id: "q2", label: "Dois" })] });
    const b = lead({ questions: [question({ id: "q2", label: "Dois" }), question({ id: "q3", label: "Três" })] });
    expect(answerColumns([a, b])).toEqual([
      { id: "q1", label: "Um" },
      { id: "q2", label: "Dois" },
      { id: "q3", label: "Três" },
    ]);
  });

  it("cai para o id quando a pergunta está sem enunciado", () => {
    const a = lead({ questions: [question({ id: "q1", label: "" })] });
    expect(answerColumns([a])).toEqual([{ id: "q1", label: "q1" }]);
  });
});

describe("leadsToCsv", () => {
  it("começa com BOM e usa ponto e vírgula como separador", () => {
    const csv = leadsToCsv([lead()]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.split("\r\n")[0]).toContain("Nome;E-mail;Telefone");
  });

  it("escapa aspas, separador e quebra de linha", () => {
    const q = question({ id: "q1", type: "texto_longo", label: "Comentário" });
    const csv = leadsToCsv([
      lead({
        questions: [q],
        answers: { q1: 'Ele disse "sim"; depois\nmudou de ideia' },
      }),
    ]);
    expect(csv).toContain('"Ele disse ""sim""; depois\nmudou de ideia"');
  });

  it("preenche vazio quando o lead não tem a pergunta da coluna", () => {
    const a = lead({
      funnelName: "Funil A",
      questions: [question({ id: "q1", label: "Um" })],
      answers: { q1: "resposta A" },
    });
    const b = lead({
      funnelName: "Funil B",
      questions: [question({ id: "q2", label: "Dois" })],
      answers: { q2: "resposta B" },
    });
    const [, rowA, rowB] = leadsToCsv([a, b]).split("\r\n");
    expect(rowA.endsWith("resposta A;")).toBe(true);
    expect(rowB.endsWith(";resposta B")).toBe(true);
  });

  it("traz rótulos em pt-BR de qualificação e status e a versão prefixada", () => {
    const csv = leadsToCsv([lead({ qualificacao: "quente", status: "novo", version: 3 })]);
    expect(csv).toContain("Quente");
    expect(csv).toContain("v3");
  });

  it("exporta as colunas de utm", () => {
    const csv = leadsToCsv([lead({ utm: { source: "google", medium: "cpc" } })]);
    expect(csv.split("\r\n")[0]).toContain("utm_source;utm_medium");
    expect(csv.split("\r\n")[1]).toContain("google;cpc");
  });

  it("gera só o cabeçalho quando não há leads", () => {
    expect(leadsToCsv([]).split("\r\n")).toHaveLength(1);
  });
});

describe("csvFilename", () => {
  it("remove acento e espaço e carimba a data", () => {
    expect(csvFilename("Diagnóstico da Operação", "2026-08-15T17:32:00.000Z")).toBe(
      "diagnostico-da-operacao-2026-08-15.csv",
    );
  });

  it("cai para 'leads' quando o prefixo não tem nada aproveitável", () => {
    expect(csvFilename("!!!", "2026-08-15T17:32:00.000Z")).toBe("leads-2026-08-15.csv");
  });

  it("omite o carimbo quando a data é inválida", () => {
    expect(csvFilename("Leads", "sem data")).toBe("leads.csv");
  });
});

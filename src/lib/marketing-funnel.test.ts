import { describe, expect, it } from "vitest";
import {
  defaultQuestion,
  funnelMaxScore,
  maxScoreFor,
  parseQuestions,
  parseThresholds,
  publicQuestions,
  validateFunnelSchema,
  type FunnelQuestion,
} from "@/lib/marketing-funnel";

function question(overrides: Partial<FunnelQuestion> & { id: string }): FunnelQuestion {
  return { ...defaultQuestion(overrides.id), label: "Pergunta", ...overrides };
}

function escolhaUnica(id: string, scores: number[]): FunnelQuestion {
  return question({
    id,
    type: "escolha_unica",
    options: scores.map((score, index) => ({
      id: `${id}-o${index}`,
      label: `Opção ${index}`,
      score,
    })),
  });
}

describe("parseQuestions", () => {
  it("descarta entradas sem id ou malformadas", () => {
    expect(parseQuestions([{ label: "sem id" }, null, "texto", 3])).toEqual([]);
    expect(parseQuestions("não é array")).toEqual([]);
    expect(parseQuestions(null)).toEqual([]);
  });

  it("aplica padrões para campos ausentes", () => {
    const [parsed] = parseQuestions([{ id: "q1" }]);
    expect(parsed).toMatchObject({
      id: "q1",
      type: "texto_curto",
      label: "",
      required: false,
      weight: 1,
      options: [],
      scale: null,
      maps_to: null,
    });
  });

  it("preserva escala apenas em perguntas do tipo escala", () => {
    const [escala] = parseQuestions([
      { id: "q1", type: "escala", scale: { min: 1, max: 10, minLabel: "Baixo" } },
    ]);
    expect(escala.scale).toEqual({
      min: 1,
      max: 10,
      minLabel: "Baixo",
      maxLabel: null,
    });

    const [texto] = parseQuestions([
      { id: "q2", type: "texto_curto", scale: { min: 1, max: 5 } },
    ]);
    expect(texto.scale).toBeNull();
  });

  it("ignora opções sem id", () => {
    const [parsed] = parseQuestions([
      {
        id: "q1",
        type: "escolha_unica",
        options: [{ id: "a", label: "A", score: 5 }, { label: "sem id" }],
      },
    ]);
    expect(parsed.options).toHaveLength(1);
  });
});

describe("parseThresholds", () => {
  it("usa 40/70 como padrão e limita ao intervalo 0..100", () => {
    expect(parseThresholds(null)).toEqual({ morno: 40, quente: 70 });
    expect(parseThresholds({ morno: -5, quente: 240 })).toEqual({
      morno: 0,
      quente: 100,
    });
  });
});

describe("validateFunnelSchema", () => {
  it("aceita um funil válido", () => {
    expect(validateFunnelSchema([escolhaUnica("q1", [0, 10])])).toBeNull();
  });

  it("exige ao menos uma pergunta", () => {
    expect(validateFunnelSchema([])).toContain("ao menos uma pergunta");
  });

  it("recusa ids repetidos e enunciado vazio", () => {
    expect(
      validateFunnelSchema([escolhaUnica("q1", [1]), escolhaUnica("q1", [1])]),
    ).toContain("identificador repetido");
    expect(validateFunnelSchema([question({ id: "q1", label: "  " })])).toContain(
      "enunciado",
    );
  });

  it("exige opções nos tipos de escolha, com id único e texto", () => {
    expect(
      validateFunnelSchema([question({ id: "q1", type: "escolha_multipla" })]),
    ).toContain("ao menos uma opção");
    expect(
      validateFunnelSchema([
        question({
          id: "q1",
          type: "escolha_unica",
          options: [
            { id: "a", label: "A", score: 1 },
            { id: "a", label: "B", score: 2 },
          ],
        }),
      ]),
    ).toContain("identificador repetido");
    expect(
      validateFunnelSchema([
        question({
          id: "q1",
          type: "escolha_unica",
          options: [{ id: "a", label: " ", score: 1 }],
        }),
      ]),
    ).toContain("sem texto");
  });

  it("recusa peso negativo ou não numérico", () => {
    expect(
      validateFunnelSchema([{ ...escolhaUnica("q1", [1]), weight: -1 }]),
    ).toContain("peso");
  });

  it("valida os limites da escala", () => {
    const escala = (min: number, max: number) =>
      question({ id: "q1", type: "escala", scale: { min, max, minLabel: null, maxLabel: null } });
    expect(validateFunnelSchema([escala(5, 5)])).toContain("menor que o máximo");
    expect(validateFunnelSchema([escala(1, 20)])).toContain("no máximo 11 pontos");
    expect(validateFunnelSchema([escala(0, 10)])).toBeNull();
  });

  it("permite cada maps_to uma única vez", () => {
    const email = (id: string) => question({ id, type: "email", maps_to: "email" as const });
    expect(validateFunnelSchema([email("q1"), email("q2")])).toContain(
      "já existe outra pergunta",
    );
  });

  it("só vincula E-mail a uma pergunta do tipo e-mail", () => {
    expect(
      validateFunnelSchema([question({ id: "q1", type: "texto_curto", maps_to: "email" })]),
    ).toContain("tipo E-mail");
    expect(
      validateFunnelSchema([question({ id: "q1", type: "email", maps_to: "email" })]),
    ).toBeNull();
  });
});

describe("maxScoreFor / funnelMaxScore", () => {
  it("escolha única usa a melhor opção", () => {
    expect(maxScoreFor(escolhaUnica("q1", [0, 5, 12, 3]))).toBe(12);
  });

  it("escolha múltipla soma as opções positivas", () => {
    const q = { ...escolhaUnica("q1", [5, -3, 7]), type: "escolha_multipla" as const };
    expect(maxScoreFor(q)).toBe(12);
  });

  it("escala usa o valor máximo e campos livres não pontuam", () => {
    expect(
      maxScoreFor(
        question({ id: "q1", type: "escala", scale: { min: 1, max: 10, minLabel: null, maxLabel: null } }),
      ),
    ).toBe(10);
    expect(maxScoreFor(question({ id: "q1", type: "texto_longo" }))).toBe(0);
    expect(maxScoreFor(question({ id: "q1", type: "email" }))).toBe(0);
  });

  it("o peso multiplica o teto da pergunta", () => {
    expect(maxScoreFor({ ...escolhaUnica("q1", [10]), weight: 3 })).toBe(30);
    expect(maxScoreFor({ ...escolhaUnica("q1", [10]), weight: 0 })).toBe(0);
  });

  it("funnelMaxScore soma todas as perguntas", () => {
    expect(funnelMaxScore([escolhaUnica("q1", [10]), escolhaUnica("q2", [5])])).toBe(15);
    expect(funnelMaxScore([])).toBe(0);
  });
});

describe("publicQuestions", () => {
  it("não expõe score, weight nem maps_to", () => {
    const schema = publicQuestions([
      { ...escolhaUnica("q1", [0, 99]), weight: 5, maps_to: "empresa" },
      question({
        id: "q2",
        type: "escala",
        scale: { min: 1, max: 10, minLabel: "Baixo", maxLabel: "Alto" },
      }),
    ]);
    const json = JSON.stringify(schema);
    expect(json).not.toContain("score");
    expect(json).not.toContain("weight");
    expect(json).not.toContain("maps_to");
    expect(json).not.toContain("99");
  });

  it("mantém id, rótulo e opções que o site precisa renderizar", () => {
    const [pergunta] = publicQuestions([escolhaUnica("q1", [0, 10])]);
    expect(pergunta.id).toBe("q1");
    expect(pergunta.options).toEqual([
      { id: "q1-o0", label: "Opção 0" },
      { id: "q1-o1", label: "Opção 1" },
    ]);
  });

  it("converte a escala para snake_case do contrato público", () => {
    const [pergunta] = publicQuestions([
      question({
        id: "q1",
        type: "escala",
        scale: { min: 1, max: 5, minLabel: "Ruim", maxLabel: "Ótimo" },
      }),
    ]);
    expect(pergunta.scale).toEqual({
      min: 1,
      max: 5,
      min_label: "Ruim",
      max_label: "Ótimo",
    });
  });
});

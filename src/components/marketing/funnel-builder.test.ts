import { describe, expect, it } from "vitest";
import {
  duplicateQuestion,
  moveQuestion,
  removeQuestion,
} from "./funnel-builder";
import { defaultQuestion, type FunnelQuestion } from "@/lib/marketing-funnel";

function question(id: string, overrides: Partial<FunnelQuestion> = {}): FunnelQuestion {
  return { ...defaultQuestion(id), label: `Pergunta ${id}`, ...overrides };
}

// Gerador determinístico: crypto.randomUUID não é reproduzível em teste.
function fakeIds() {
  let counter = 0;
  return (prefix: string) => `${prefix}_${++counter}`;
}

const LISTA = [question("a"), question("b"), question("c")];

describe("moveQuestion", () => {
  it("troca a pergunta com a vizinha", () => {
    expect(moveQuestion(LISTA, 0, 1).map((q) => q.id)).toEqual(["b", "a", "c"]);
    expect(moveQuestion(LISTA, 2, -1).map((q) => q.id)).toEqual(["a", "c", "b"]);
  });

  it("não faz nada nas bordas", () => {
    expect(moveQuestion(LISTA, 0, -1)).toBe(LISTA);
    expect(moveQuestion(LISTA, 2, 1)).toBe(LISTA);
  });

  it("não muta a lista original", () => {
    moveQuestion(LISTA, 0, 1);
    expect(LISTA.map((q) => q.id)).toEqual(["a", "b", "c"]);
  });
});

describe("duplicateQuestion", () => {
  it("insere a cópia logo depois da original", () => {
    const result = duplicateQuestion(LISTA, 0, fakeIds());
    expect(result).toHaveLength(4);
    expect(result[1].label).toBe("Pergunta a (cópia)");
    expect(result.map((q) => q.id)).toEqual(["a", "q_1", "b", "c"]);
  });

  it("dá ids novos à cópia e a todas as opções", () => {
    const original = question("a", {
      type: "escolha_unica",
      options: [
        { id: "o1", label: "Um", score: 1 },
        { id: "o2", label: "Dois", score: 2 },
      ],
    });
    const [, copy] = duplicateQuestion([original], 0, fakeIds());
    expect(copy.id).not.toBe("a");
    expect(copy.options.map((o) => o.id)).toEqual(["o_2", "o_3"]);
    expect(copy.options.map((o) => o.score)).toEqual([1, 2]);
  });

  it("a cópia não herda o vínculo com o lead (maps_to é único no funil)", () => {
    const original = question("a", { type: "email", maps_to: "email" });
    const [, copy] = duplicateQuestion([original], 0, fakeIds());
    expect(copy.maps_to).toBeNull();
  });

  it("clona a escala em vez de compartilhar a referência", () => {
    const original = question("a", {
      type: "escala",
      scale: { min: 1, max: 10, minLabel: "Baixo", maxLabel: "Alto" },
    });
    const [, copy] = duplicateQuestion([original], 0, fakeIds());
    expect(copy.scale).toEqual(original.scale);
    expect(copy.scale).not.toBe(original.scale);
  });

  it("índice inexistente devolve a lista intacta", () => {
    expect(duplicateQuestion(LISTA, 9, fakeIds())).toBe(LISTA);
  });
});

describe("removeQuestion", () => {
  it("remove pelo índice", () => {
    expect(removeQuestion(LISTA, 1).map((q) => q.id)).toEqual(["a", "c"]);
  });

  it("índice inexistente não remove nada", () => {
    expect(removeQuestion(LISTA, 9)).toHaveLength(3);
  });
});

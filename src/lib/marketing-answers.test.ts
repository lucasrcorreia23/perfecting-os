import { describe, expect, it } from "vitest";
import {
  leadFieldsFrom,
  qualificacaoFor,
  scoreSubmission,
  validateAnswers,
  type AnswerMap,
} from "@/lib/marketing-answers";
import { defaultQuestion, type FunnelQuestion } from "@/lib/marketing-funnel";

function question(overrides: Partial<FunnelQuestion> & { id: string }): FunnelQuestion {
  return { ...defaultQuestion(overrides.id), label: "Pergunta", ...overrides };
}

const escolha = question({
  id: "q_escolha",
  label: "Tamanho do time",
  type: "escolha_unica",
  required: true,
  options: [
    { id: "o1", label: "1 a 10", score: 0 },
    { id: "o2", label: "11 a 50", score: 10 },
  ],
});

const multipla = question({
  id: "q_multipla",
  label: "Canais usados",
  type: "escolha_multipla",
  options: [
    { id: "m1", label: "E-mail", score: 3 },
    { id: "m2", label: "WhatsApp", score: 5 },
    { id: "m3", label: "Telefone", score: -2 },
  ],
});

const escala = question({
  id: "q_escala",
  label: "Maturidade",
  type: "escala",
  scale: { min: 1, max: 10, minLabel: null, maxLabel: null },
});

const email = question({
  id: "q_email",
  label: "Seu e-mail",
  type: "email",
  required: true,
  maps_to: "email",
});

const THRESHOLDS = { morno: 40, quente: 70 };

describe("validateAnswers", () => {
  it("aceita respostas válidas e normaliza o e-mail", () => {
    const result = validateAnswers([escolha, email], {
      q_escolha: "o2",
      q_email: "  Ana@Empresa.com ",
    });
    expect(result).toEqual({
      ok: true,
      answers: { q_escolha: "o2", q_email: "ana@empresa.com" },
    });
  });

  it("recusa corpo que não é objeto", () => {
    expect(validateAnswers([escolha], "texto")).toMatchObject({ ok: false });
    expect(validateAnswers([escolha], null)).toMatchObject({ ok: false });
    expect(validateAnswers([escolha], ["a"])).toMatchObject({ ok: false });
  });

  it("cobra pergunta obrigatória e aponta o campo", () => {
    const result = validateAnswers([escolha], {});
    expect(result).toMatchObject({ ok: false, field: "q_escolha" });
    if (!result.ok) expect(result.error).toContain("Tamanho do time");
  });

  it("deixa passar pergunta opcional em branco", () => {
    const result = validateAnswers([multipla], {});
    expect(result).toEqual({ ok: true, answers: {} });
  });

  it("recusa opção inexistente e duplicada", () => {
    expect(validateAnswers([escolha], { q_escolha: "inexistente" })).toMatchObject({
      ok: false,
      field: "q_escolha",
    });
    expect(validateAnswers([multipla], { q_multipla: ["m1", "m1"] })).toMatchObject({
      ok: false,
    });
    expect(validateAnswers([multipla], { q_multipla: ["m1", "m9"] })).toMatchObject({
      ok: false,
    });
  });

  it("valida o intervalo e a integralidade da escala", () => {
    expect(validateAnswers([escala], { q_escala: 7 })).toEqual({
      ok: true,
      answers: { q_escala: 7 },
    });
    expect(validateAnswers([escala], { q_escala: 11 })).toMatchObject({ ok: false });
    expect(validateAnswers([escala], { q_escala: 0 })).toMatchObject({ ok: false });
    expect(validateAnswers([escala], { q_escala: 4.5 })).toMatchObject({ ok: false });
  });

  it("recusa e-mail e telefone fora de formato", () => {
    expect(validateAnswers([email], { q_email: "sem-arroba" })).toMatchObject({
      ok: false,
    });
    const telefone = question({ id: "q_tel", type: "telefone" });
    expect(validateAnswers([telefone], { q_tel: "+55 11 99999-0000" })).toMatchObject({
      ok: true,
    });
    expect(validateAnswers([telefone], { q_tel: "abc" })).toMatchObject({ ok: false });
  });

  it("recusa texto acima de 2000 caracteres", () => {
    const texto = question({ id: "q_txt", type: "texto_longo" });
    expect(validateAnswers([texto], { q_txt: "a".repeat(2000) })).toMatchObject({
      ok: true,
    });
    expect(validateAnswers([texto], { q_txt: "a".repeat(2001) })).toMatchObject({
      ok: false,
    });
  });

  it("descarta chaves desconhecidas em silêncio", () => {
    const result = validateAnswers([escolha], { q_escolha: "o1", lixo: "x" });
    expect(result).toEqual({ ok: true, answers: { q_escolha: "o1" } });
  });
});

describe("leadFieldsFrom", () => {
  it("promove as respostas marcadas com maps_to", () => {
    const nome = question({ id: "q_nome", maps_to: "nome" });
    const empresa = question({ id: "q_emp", maps_to: "empresa" });
    const answers: AnswerMap = {
      q_nome: " Ana ",
      q_emp: "Empresa X",
      q_email: "ana@empresa.com",
    };
    expect(leadFieldsFrom([nome, empresa, email], answers)).toEqual({
      name: "Ana",
      email: "ana@empresa.com",
      phone: null,
      company: "Empresa X",
      role_title: null,
    });
  });

  it("devolve tudo nulo quando nenhuma pergunta mapeia", () => {
    expect(leadFieldsFrom([escolha], { q_escolha: "o1" })).toEqual({
      name: null,
      email: null,
      phone: null,
      company: null,
      role_title: null,
    });
  });
});

describe("scoreSubmission", () => {
  it("pontua escolha única e devolve o percentual", () => {
    const result = scoreSubmission({
      questions: [escolha],
      answers: { q_escolha: "o2" },
      thresholds: THRESHOLDS,
    });
    expect(result).toMatchObject({ score: 10, max: 10, pct: 100, qualificacao: "quente" });
  });

  it("escolha múltipla soma as opções escolhidas, inclusive negativas", () => {
    const result = scoreSubmission({
      questions: [multipla],
      answers: { q_multipla: ["m1", "m2", "m3"] },
      thresholds: THRESHOLDS,
    });
    expect(result.score).toBe(6); // 3 + 5 - 2
    expect(result.max).toBe(8); // só as positivas
  });

  it("o peso multiplica os pontos", () => {
    const result = scoreSubmission({
      questions: [{ ...escolha, weight: 3 }],
      answers: { q_escolha: "o2" },
      thresholds: THRESHOLDS,
    });
    expect(result.score).toBe(30);
    expect(result.max).toBe(30);
  });

  it("escala pontua pelo valor respondido", () => {
    const result = scoreSubmission({
      questions: [escala],
      answers: { q_escala: 7 },
      thresholds: THRESHOLDS,
    });
    expect(result).toMatchObject({ score: 7, max: 10, pct: 70, qualificacao: "quente" });
  });

  it("pergunta sem resposta vale zero mas continua no teto", () => {
    const result = scoreSubmission({
      questions: [escolha, escala],
      answers: { q_escolha: "o2" },
      thresholds: THRESHOLDS,
    });
    expect(result.score).toBe(10);
    expect(result.max).toBe(20);
    expect(result.pct).toBe(50);
  });

  it("funil sem pontuação devolve 0% e frio, sem dividir por zero", () => {
    const result = scoreSubmission({
      questions: [email],
      answers: { q_email: "ana@empresa.com" },
      thresholds: THRESHOLDS,
    });
    expect(result).toMatchObject({ score: 0, max: 0, pct: 0, qualificacao: "frio" });
  });

  it("detalha a pontuação por pergunta", () => {
    const result = scoreSubmission({
      questions: [escolha, escala],
      answers: { q_escolha: "o1", q_escala: 5 },
      thresholds: THRESHOLDS,
    });
    expect(result.breakdown).toEqual([
      { questionId: "q_escolha", label: "Tamanho do time", points: 0, max: 10 },
      { questionId: "q_escala", label: "Maturidade", points: 5, max: 10 },
    ]);
  });
});

describe("qualificacaoFor", () => {
  it("o limiar é inclusivo: em cima do valor cai na faixa de cima", () => {
    expect(qualificacaoFor(70, THRESHOLDS)).toBe("quente");
    expect(qualificacaoFor(69, THRESHOLDS)).toBe("morno");
    expect(qualificacaoFor(40, THRESHOLDS)).toBe("morno");
    expect(qualificacaoFor(39, THRESHOLDS)).toBe("frio");
    expect(qualificacaoFor(0, THRESHOLDS)).toBe("frio");
  });

  it("limiares invertidos não quebram a classificação", () => {
    expect(qualificacaoFor(80, { morno: 70, quente: 40 })).toBe("quente");
    expect(qualificacaoFor(50, { morno: 70, quente: 40 })).toBe("morno");
    expect(qualificacaoFor(30, { morno: 70, quente: 40 })).toBe("frio");
  });
});

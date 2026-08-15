import type { LeadQualificacao } from "@/lib/constants";
import {
  maxScoreFor,
  type FunnelQuestion,
  type FunnelThresholds,
  type MapsTo,
} from "@/lib/marketing-funnel";

export type AnswerValue = string | number | string[];
export type AnswerMap = Record<string, AnswerValue>;

const MAX_TEXT_LENGTH = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidateAnswersResult =
  | { ok: true; answers: AnswerMap }
  | { ok: false; error: string; field?: string };

// Valida o que chegou do site externo contra o schema da versão que o visitante
// realmente viu. Chaves desconhecidas são descartadas em silêncio: o site pode
// mandar campo a mais sem derrubar o lead.
export function validateAnswers(
  questions: FunnelQuestion[],
  raw: unknown,
): ValidateAnswersResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Respostas em formato inválido." };
  }
  const source = raw as Record<string, unknown>;
  const answers: AnswerMap = {};

  for (const question of questions) {
    const value = source[question.id];
    const missing =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    if (missing) {
      if (question.required) {
        return {
          ok: false,
          error: `Responda "${question.label}".`,
          field: question.id,
        };
      }
      continue;
    }

    const parsed = coerce(question, value);
    if (parsed === null) {
      return {
        ok: false,
        error: `Resposta inválida em "${question.label}".`,
        field: question.id,
      };
    }
    answers[question.id] = parsed;
  }

  return { ok: true, answers };
}

function coerce(question: FunnelQuestion, value: unknown): AnswerValue | null {
  switch (question.type) {
    case "texto_curto":
    case "texto_longo": {
      if (typeof value !== "string") return null;
      const text = value.trim();
      return text.length > MAX_TEXT_LENGTH ? null : text;
    }
    case "email": {
      if (typeof value !== "string") return null;
      const email = value.trim().toLowerCase();
      return EMAIL_REGEX.test(email) ? email : null;
    }
    case "telefone": {
      if (typeof value !== "string") return null;
      const phone = value.trim();
      if (!/^\+?[\d\s().-]{8,20}$/.test(phone)) return null;
      return phone;
    }
    case "numero": {
      const numero = typeof value === "number" ? value : Number(value);
      return Number.isFinite(numero) ? numero : null;
    }
    case "escolha_unica": {
      if (typeof value !== "string") return null;
      return question.options.some((option) => option.id === value) ? value : null;
    }
    case "escolha_multipla": {
      if (!Array.isArray(value)) return null;
      const ids = value.filter((item): item is string => typeof item === "string");
      if (ids.length !== value.length) return null;
      if (new Set(ids).size !== ids.length) return null;
      const valid = ids.every((id) =>
        question.options.some((option) => option.id === id),
      );
      return valid ? ids : null;
    }
    case "escala": {
      const numero = typeof value === "number" ? value : Number(value);
      if (!Number.isInteger(numero) || !question.scale) return null;
      const { min, max } = question.scale;
      return numero >= min && numero <= max ? numero : null;
    }
  }
}

export type LeadFields = {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role_title: string | null;
};

const MAPS_TO_FIELD: Record<MapsTo, keyof LeadFields> = {
  nome: "name",
  email: "email",
  telefone: "phone",
  empresa: "company",
  cargo: "role_title",
};

// Promove as respostas marcadas com maps_to para as colunas do lead — é o que
// alimenta o formulário de conversão em cliente.
export function leadFieldsFrom(
  questions: FunnelQuestion[],
  answers: AnswerMap,
): LeadFields {
  const fields: LeadFields = {
    name: null,
    email: null,
    phone: null,
    company: null,
    role_title: null,
  };
  for (const question of questions) {
    if (!question.maps_to) continue;
    const value = answers[question.id];
    if (typeof value !== "string" || !value.trim()) continue;
    fields[MAPS_TO_FIELD[question.maps_to]] = value.trim();
  }
  return fields;
}

export type ScoreBreakdown = {
  questionId: string;
  label: string;
  points: number;
  max: number;
};

export type ScoreResult = {
  score: number;
  max: number;
  pct: number;
  qualificacao: LeadQualificacao;
  breakdown: ScoreBreakdown[];
};

export function scoreSubmission(params: {
  questions: FunnelQuestion[];
  answers: AnswerMap;
  thresholds: FunnelThresholds;
}): ScoreResult {
  const { questions, answers, thresholds } = params;
  const breakdown: ScoreBreakdown[] = [];
  let score = 0;
  let max = 0;

  for (const question of questions) {
    const points = pointsFor(question, answers[question.id]);
    const questionMax = maxScoreFor(question);
    score += points;
    max += questionMax;
    breakdown.push({
      questionId: question.id,
      label: question.label,
      points: Math.round(points),
      max: Math.round(questionMax),
    });
  }

  const roundedScore = Math.round(score);
  const roundedMax = Math.round(max);
  const pct =
    roundedMax > 0
      ? Math.min(100, Math.max(0, Math.round((roundedScore / roundedMax) * 100)))
      : 0;

  return {
    score: roundedScore,
    max: roundedMax,
    pct,
    qualificacao: qualificacaoFor(pct, thresholds),
    breakdown,
  };
}

// O limiar é inclusivo: bater exatamente no valor já cai na faixa de cima.
// Limiares invertidos não quebram — "quente" só vence se for de fato maior.
export function qualificacaoFor(
  pct: number,
  thresholds: FunnelThresholds,
): LeadQualificacao {
  const morno = Number.isFinite(thresholds?.morno) ? thresholds.morno : 40;
  const quente = Number.isFinite(thresholds?.quente) ? thresholds.quente : 70;
  if (pct >= Math.max(morno, quente)) return "quente";
  if (pct >= Math.min(morno, quente)) return "morno";
  return "frio";
}

function pointsFor(question: FunnelQuestion, value: AnswerValue | undefined): number {
  if (value === undefined) return 0;
  const weight = Number.isFinite(question.weight) ? question.weight : 0;
  switch (question.type) {
    case "escolha_unica": {
      const option = question.options.find((item) => item.id === value);
      return (option?.score ?? 0) * weight;
    }
    case "escolha_multipla": {
      if (!Array.isArray(value)) return 0;
      const sum = value.reduce((total, id) => {
        const option = question.options.find((item) => item.id === id);
        return total + (option?.score ?? 0);
      }, 0);
      return sum * weight;
    }
    case "escala": {
      return typeof value === "number" ? value * weight : 0;
    }
    default:
      return 0;
  }
}

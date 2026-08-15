import type { Json } from "@/lib/database.types";

// As perguntas vivem num jsonb (marketing_funnels.questions), não em tabelas
// normalizadas: são sempre lidas e escritas como conjunto inteiro, reordenar é
// um splice em vez de um `position` em N linhas, e o snapshot publicado é só
// copiar o array. Mesmo padrão de activities.subatividades.

export type FunnelFieldType =
  | "texto_curto"
  | "texto_longo"
  | "email"
  | "telefone"
  | "numero"
  | "escolha_unica"
  | "escolha_multipla"
  | "escala";

export const FUNNEL_FIELD_TYPES: Record<
  FunnelFieldType,
  { label: string; hasOptions: boolean }
> = {
  texto_curto: { label: "Texto curto", hasOptions: false },
  texto_longo: { label: "Texto longo", hasOptions: false },
  email: { label: "E-mail", hasOptions: false },
  telefone: { label: "Telefone", hasOptions: false },
  numero: { label: "Número", hasOptions: false },
  escolha_unica: { label: "Escolha única", hasOptions: true },
  escolha_multipla: { label: "Escolha múltipla", hasOptions: true },
  escala: { label: "Escala", hasOptions: false },
};

export const FUNNEL_FIELD_TYPE_ORDER: FunnelFieldType[] = [
  "texto_curto",
  "texto_longo",
  "email",
  "telefone",
  "numero",
  "escolha_unica",
  "escolha_multipla",
  "escala",
];

// Liga a resposta a uma coluna do lead — é o que faz a conversão em cliente
// funcionar sem heurística de "qual pergunta era o e-mail?".
export type MapsTo = "nome" | "email" | "telefone" | "empresa" | "cargo";

export const MAPS_TO_LABELS: Record<MapsTo, string> = {
  nome: "Nome",
  email: "E-mail",
  telefone: "Telefone",
  empresa: "Empresa",
  cargo: "Cargo",
};

export const MAPS_TO_ORDER: MapsTo[] = [
  "nome",
  "email",
  "telefone",
  "empresa",
  "cargo",
];

export type FunnelOption = { id: string; label: string; score: number };

export type FunnelScale = {
  min: number;
  max: number;
  minLabel: string | null;
  maxLabel: string | null;
};

export type FunnelQuestion = {
  id: string;
  type: FunnelFieldType;
  label: string;
  help: string | null;
  required: boolean;
  placeholder: string | null;
  options: FunnelOption[];
  weight: number;
  scale: FunnelScale | null;
  maps_to: MapsTo | null;
};

export type FunnelThresholds = { morno: number; quente: number };

// O que o site externo recebe: sem score, sem weight, sem maps_to. Vazar os
// pesos ensinaria o visitante a se auto-qualificar como "quente".
export type PublicFunnelQuestion = {
  id: string;
  type: FunnelFieldType;
  label: string;
  help: string | null;
  required: boolean;
  placeholder: string | null;
  options: { id: string; label: string }[];
  scale: {
    min: number;
    max: number;
    min_label: string | null;
    max_label: string | null;
  } | null;
};

export const MAX_SCALE_SPAN = 10;

export function defaultQuestion(
  id: string,
  type: FunnelFieldType = "texto_curto",
): FunnelQuestion {
  return {
    id,
    type,
    label: "",
    help: null,
    required: false,
    placeholder: null,
    options: [],
    weight: 1,
    scale: type === "escala" ? { min: 1, max: 5, minLabel: null, maxLabel: null } : null,
    maps_to: null,
  };
}

// Tolerante na leitura (espelha parseSubatividades): o jsonb pode vir de uma
// versão antiga do editor, e uma pergunta malformada não pode derrubar a tela.
export function parseQuestions(value: unknown): FunnelQuestion[] {
  if (!Array.isArray(value)) return [];
  const questions: FunnelQuestion[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : "";
    if (!id) continue;
    const type = isFieldType(item.type) ? item.type : "texto_curto";
    questions.push({
      id,
      type,
      label: typeof item.label === "string" ? item.label : "",
      help: nullableString(item.help),
      required: item.required === true,
      placeholder: nullableString(item.placeholder),
      options: parseOptions(item.options),
      weight: finiteNumber(item.weight, 1),
      scale: parseScale(item.scale, type),
      maps_to: isMapsTo(item.maps_to) ? item.maps_to : null,
    });
  }
  return questions;
}

export function questionsToJson(questions: FunnelQuestion[]): Json {
  return JSON.parse(JSON.stringify(questions)) as Json;
}

export function parseThresholds(value: unknown): FunnelThresholds {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const morno = clampPercent(finiteNumber(raw.morno, 40));
  const quente = clampPercent(finiteNumber(raw.quente, 70));
  return { morno, quente };
}

export function validateFunnelSchema(questions: FunnelQuestion[]): string | null {
  if (questions.length === 0) return "Adicione ao menos uma pergunta ao funil.";

  const seenIds = new Set<string>();
  const seenMapsTo = new Set<MapsTo>();

  for (const [index, question] of questions.entries()) {
    const posicao = `Pergunta ${index + 1}`;
    if (!question.id.trim()) return `${posicao}: identificador vazio.`;
    if (seenIds.has(question.id)) return `${posicao}: identificador repetido.`;
    seenIds.add(question.id);

    if (!question.label.trim()) return `${posicao}: informe o enunciado.`;
    if (!Number.isFinite(question.weight) || question.weight < 0)
      return `${posicao}: o peso deve ser um número maior ou igual a zero.`;

    if (FUNNEL_FIELD_TYPES[question.type].hasOptions) {
      if (question.options.length === 0)
        return `${posicao}: adicione ao menos uma opção de resposta.`;
      const seenOptions = new Set<string>();
      for (const option of question.options) {
        if (!option.id.trim()) return `${posicao}: opção com identificador vazio.`;
        if (seenOptions.has(option.id))
          return `${posicao}: opções com identificador repetido.`;
        seenOptions.add(option.id);
        if (!option.label.trim()) return `${posicao}: opção sem texto.`;
        if (!Number.isFinite(option.score))
          return `${posicao}: pontuação de opção inválida.`;
      }
    }

    if (question.type === "escala") {
      if (!question.scale) return `${posicao}: defina o intervalo da escala.`;
      const { min, max } = question.scale;
      if (!Number.isInteger(min) || !Number.isInteger(max))
        return `${posicao}: os limites da escala devem ser números inteiros.`;
      if (min >= max) return `${posicao}: o mínimo da escala deve ser menor que o máximo.`;
      if (max - min > MAX_SCALE_SPAN)
        return `${posicao}: a escala pode ter no máximo ${MAX_SCALE_SPAN + 1} pontos.`;
    }

    if (question.maps_to) {
      if (seenMapsTo.has(question.maps_to))
        return `${posicao}: já existe outra pergunta vinculada a "${MAPS_TO_LABELS[question.maps_to]}".`;
      if (question.maps_to === "email" && question.type !== "email")
        return `${posicao}: só uma pergunta do tipo E-mail pode ser vinculada a E-mail.`;
      seenMapsTo.add(question.maps_to);
    }
  }

  return null;
}

// Teto de pontos da pergunta: escolha única = melhor opção; múltipla = soma das
// positivas; escala = valor máximo; campos livres não pontuam.
export function maxScoreFor(question: FunnelQuestion): number {
  const weight = Number.isFinite(question.weight) ? question.weight : 0;
  switch (question.type) {
    case "escolha_unica":
      return Math.max(0, ...question.options.map((o) => o.score)) * weight;
    case "escolha_multipla":
      return (
        question.options.reduce((sum, o) => sum + Math.max(0, o.score), 0) * weight
      );
    case "escala":
      return (question.scale?.max ?? 0) * weight;
    default:
      return 0;
  }
}

export function funnelMaxScore(questions: FunnelQuestion[]): number {
  return Math.round(
    questions.reduce((total, question) => total + maxScoreFor(question), 0),
  );
}

export function publicQuestions(
  questions: FunnelQuestion[],
): PublicFunnelQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    type: question.type,
    label: question.label,
    help: question.help,
    required: question.required,
    placeholder: question.placeholder,
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label,
    })),
    scale: question.scale
      ? {
          min: question.scale.min,
          max: question.scale.max,
          min_label: question.scale.minLabel,
          max_label: question.scale.maxLabel,
        }
      : null,
  }));
}

function isFieldType(value: unknown): value is FunnelFieldType {
  return typeof value === "string" && value in FUNNEL_FIELD_TYPES;
}

function isMapsTo(value: unknown): value is MapsTo {
  return typeof value === "string" && value in MAPS_TO_LABELS;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseOptions(value: unknown): FunnelOption[] {
  if (!Array.isArray(value)) return [];
  const options: FunnelOption[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : "";
    if (!id) continue;
    options.push({
      id,
      label: typeof item.label === "string" ? item.label : "",
      score: finiteNumber(item.score, 0),
    });
  }
  return options;
}

function parseScale(value: unknown, type: FunnelFieldType): FunnelScale | null {
  if (type !== "escala") return null;
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    min: Math.round(finiteNumber(raw.min, 1)),
    max: Math.round(finiteNumber(raw.max, 5)),
    minLabel: nullableString(raw.minLabel),
    maxLabel: nullableString(raw.maxLabel),
  };
}

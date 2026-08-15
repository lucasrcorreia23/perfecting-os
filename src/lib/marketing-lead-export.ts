import { LEAD_STATUSES, QUALIFICACOES } from "@/lib/constants";
import type { LeadQualificacao, LeadStatus } from "@/lib/constants";
import type { AnswerMap, AnswerValue } from "@/lib/marketing-answers";
import type { FunnelQuestion } from "@/lib/marketing-funnel";

// Planilha pt-BR: Excel só separa colunas por ";" quando o locale é o
// brasileiro, e sem o BOM os acentos viram mojibake.
const SEPARATOR = ";";
const BOM = "\uFEFF";

const csvDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;

export type ExportableLead = {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  roleTitle: string | null;
  funnelName: string;
  version: number | null;
  score: number;
  scoreMax: number;
  scorePct: number;
  qualificacao: LeadQualificacao;
  status: LeadStatus;
  sourceUrl: string | null;
  utm: Record<string, string>;
  questions: FunnelQuestion[];
  answers: AnswerMap;
  created_at: string;
};

// Valor legível de uma resposta: ids de opção viram os rótulos que o visitante
// viu. Usada tanto na tela do lead quanto no CSV — uma fonte só.
export function formatAnswer(
  question: FunnelQuestion,
  value: AnswerValue | undefined,
): string {
  if (value === undefined || value === null || value === "") return "";
  if (Array.isArray(value)) {
    return value
      .map((id) => question.options.find((option) => option.id === id)?.label ?? id)
      .join(", ");
  }
  if (typeof value === "string" && question.options.length > 0) {
    return question.options.find((option) => option.id === value)?.label ?? value;
  }
  return String(value);
}

// "15/08/2026 14:32" — ordenável e reconhecido como data pelo Excel pt-BR,
// diferente do "15 ago 2026" que usamos na UI.
export function csvDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return csvDateTimeFormatter.format(date).replace(", ", " ");
}

// Uma coluna por pergunta, deduplicada por id e na ordem de primeira
// aparição: exportar leads de funis diferentes gera uma matriz esparsa, mas
// nenhuma resposta se perde nem troca de coluna.
export function answerColumns(
  leads: ExportableLead[],
): { id: string; label: string }[] {
  const columns: { id: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const lead of leads) {
    for (const question of lead.questions) {
      if (seen.has(question.id)) continue;
      seen.add(question.id);
      columns.push({ id: question.id, label: question.label || question.id });
    }
  }
  return columns;
}

const FIXED_HEADERS = [
  "Nome",
  "E-mail",
  "Telefone",
  "Empresa",
  "Cargo",
  "Funil",
  "Versão",
  "Pontuação",
  "Pontuação máxima",
  "Percentual",
  "Qualificação",
  "Status",
  "Recebido em",
  "Página de origem",
  ...UTM_KEYS.map((key) => `utm_${key}`),
];

export function leadsToCsv(leads: ExportableLead[]): string {
  const columns = answerColumns(leads);
  const header = [...FIXED_HEADERS, ...columns.map((column) => column.label)];

  const rows = leads.map((lead) => {
    const byId = new Map(lead.questions.map((question) => [question.id, question]));
    return [
      lead.name ?? "",
      lead.email ?? "",
      lead.phone ?? "",
      lead.company ?? "",
      lead.roleTitle ?? "",
      lead.funnelName,
      lead.version === null ? "" : `v${lead.version}`,
      String(lead.score),
      String(lead.scoreMax),
      `${lead.scorePct}%`,
      QUALIFICACOES[lead.qualificacao]?.label ?? lead.qualificacao,
      LEAD_STATUSES[lead.status]?.label ?? lead.status,
      csvDateTime(lead.created_at),
      lead.sourceUrl ?? "",
      ...UTM_KEYS.map((key) => lead.utm?.[key] ?? ""),
      ...columns.map((column) => {
        const question = byId.get(column.id);
        return question ? formatAnswer(question, lead.answers[column.id]) : "";
      }),
    ];
  });

  return BOM + [header, ...rows].map(toCsvLine).join("\r\n");
}

function toCsvLine(cells: string[]): string {
  return cells.map(escapeCell).join(SEPARATOR);
}

// Aspas duplicadas + envelope quando a célula tem separador, aspas ou quebra
// de linha (texto longo de resposta cai nesse caso o tempo todo).
function escapeCell(value: string): string {
  const text = value ?? "";
  if (!/[";\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

// Nome de arquivo previsível e sem acento/espaço, com a data para não
// sobrescrever exportações anteriores na pasta de downloads.
export function csvFilename(prefix: string, isoDate: string): string {
  const slug = prefix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = new Date(isoDate);
  const stamp = Number.isNaN(date.getTime())
    ? ""
    : `-${date.toISOString().slice(0, 10)}`;
  return `${slug || "leads"}${stamp}.csv`;
}

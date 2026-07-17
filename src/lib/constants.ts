import type { Enums } from "@/lib/database.types";

export type WorkflowStage = Enums<"workflow_stage">;
export type ClientStatus = Enums<"client_status">;
export type ActivityStatus = Enums<"activity_status">;
export type UserRole = Enums<"user_role">;
export type Responsavel = Enums<"responsavel_categoria">;
export type AtividadeTipo = Enums<"atividade_tipo">;
export type Canal = Enums<"canal_comunicacao">;
export type Criticidade = Enums<"criticidade">;

// Paleta categórica do guideline (§1) aplicada às etapas do workflow.
export const STAGE_ORDER: WorkflowStage[] = [
  "diagnosticar",
  "priorizar",
  "construir",
  "calibrar",
  "executar",
  "medir",
];

export const STAGES: Record<WorkflowStage, { label: string; color: string }> = {
  diagnosticar: { label: "Diagnosticar", color: "#2E63CD" },
  priorizar: { label: "Priorizar", color: "#7C3AED" },
  construir: { label: "Construir", color: "#D97706" },
  calibrar: { label: "Calibrar", color: "#0891B2" },
  executar: { label: "Executar", color: "#0F9F2E" },
  medir: { label: "Medir", color: "#DB2777" },
};

export const STATUSES: Record<ClientStatus, { label: string; color: string }> =
  {
    ativo: { label: "Ativo", color: "#0F9F2E" },
    em_risco: { label: "Em risco", color: "#D97706" },
    pausado: { label: "Pausado", color: "#475569" },
    encerrado: { label: "Encerrado", color: "#94A3B8" },
  };

export const ACTIVITY_STATUSES: Record<
  ActivityStatus,
  { label: string; color: string }
> = {
  pendente: { label: "Pendente", color: "#475569" },
  em_andamento: { label: "Em andamento", color: "#2E63CD" },
  // Âmbar, não vermelho: bloqueada é aviso; vermelho já significa "atrasado".
  bloqueada: { label: "Bloqueada", color: "#D97706" },
  concluida: { label: "Concluída", color: "#0F9F2E" },
};

export const ACTIVITY_STATUS_ORDER: ActivityStatus[] = [
  "pendente",
  "em_andamento",
  "bloqueada",
  "concluida",
];

// Responsável (categoria) da planilha da POC — cores da paleta categórica §1.
export const RESPONSAVEIS: Record<
  Responsavel,
  { label: string; color: string }
> = {
  cliente: { label: "Cliente", color: "#0891B2" },
  perfecting: { label: "Perfecting", color: "#2E63CD" },
  ambos: { label: "Perfecting & Cliente", color: "#7C3AED" },
};

export const ATIVIDADE_TIPOS: Record<AtividadeTipo, { label: string }> = {
  sincrono: { label: "Síncrono" },
  assincrono: { label: "Assíncrono" },
};

// Canal de comunicação da atividade (planilha da POC) — rótulos pt-BR.
export const CANAIS: Record<Canal, { label: string }> = {
  email: { label: "E-mail" },
  whatsapp: { label: "WhatsApp" },
  os: { label: "OS" },
  meet: { label: "Meet" },
  presencial: { label: "Presencial" },
};

// Criticidade da atividade — alta usa o vermelho de tendência negativa (§1),
// média âmbar, baixa neutra.
export const CRITICIDADES: Record<
  Criticidade,
  { label: string; color: string }
> = {
  baixa: { label: "Baixa", color: "#94A3B8" },
  media: { label: "Média", color: "#D97706" },
  alta: { label: "Alta", color: "#9F0F0F" },
};

export type EventType =
  | "cliente_criado"
  | "etapa_alterada"
  | "atividade_criada"
  | "atividade_concluida"
  | "arquivo_enviado"
  | "arquivo_excluido";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// SLA por etapa (Preferências > Fluxo de trabalho) — fixo para todos os clientes.
export const DEFAULT_PRAZO_ETAPA_DIAS = 25;

// Padrão de acento do guideline (§1): fundo alpha .08, borda alpha .35,
// texto/dot na cor cheia.
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

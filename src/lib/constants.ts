import type { Enums } from "@/lib/database.types";

export type WorkflowStage = Enums<"workflow_stage">;
export type ClientStatus = Enums<"client_status">;
export type ActivityStatus = Enums<"activity_status">;
export type UserRole = Enums<"user_role">;
export type Responsavel = Enums<"responsavel_categoria">;
export type AtividadeTipo = Enums<"atividade_tipo">;
export type Canal = Enums<"canal_comunicacao">;
export type Criticidade = Enums<"criticidade">;
export type PostStatus = Enums<"post_status">;
export type FunnelStatus = Enums<"funnel_status">;
export type LeadStatus = Enums<"lead_status">;
export type LeadQualificacao = Enums<"lead_qualificacao">;
export type DesafioTipo = Enums<"desafio_tipo">;
export type DesafioSeveridade = Enums<"desafio_severidade">;
export type DesafioStatus = Enums<"desafio_status">;

// Contato público da Perfecting: rodapé da calculadora encaminhada, onde
// quem preenche não tem login nem canal aberto com o time.
export const PERFECTING_WHATSAPP_LABEL = "(48) 99918-6496";
export const PERFECTING_WHATSAPP_URL = "https://wa.me/5548999186496";

/*
 * Paleta categórica do guideline (§1), nomeada num lugar só. Antes cada etapa,
 * status e chip repetia o hex à mão: 39 literais para oito swatches, e trocar
 * um swatch queria dizer caçar todos. `PALETA.grafite` é a cor categórica;
 * `PALETA_FALLBACK` é o cinza de quando não há swatch — o §1 distingue os dois.
 */
export const PALETA = {
  azul: "#2E63CD",
  violeta: "#7C3AED",
  verde: "#0F9F2E",
  ambar: "#D97706",
  rosa: "#E11D48",
  ciano: "#0891B2",
  magenta: "#DB2777",
  grafite: "#475569",
} as const;

/* Fallback de swatch ausente (§1) — o mesmo cinza de `--color-trend-neutral`. */
export const PALETA_FALLBACK = "#94A3B8";

/* Tendência (§1). Fora de className, onde a utilitária do token não alcança. */
export const TREND = {
  positivo: "#0F9F2E",
  negativo: "#9F0F0F",
  neutro: PALETA_FALLBACK,
} as const;

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
  diagnosticar: { label: "Diagnosticar", color: PALETA.azul },
  priorizar: { label: "Priorizar", color: PALETA.violeta },
  construir: { label: "Construir", color: PALETA.ambar },
  calibrar: { label: "Calibrar", color: PALETA.ciano },
  executar: { label: "Executar", color: PALETA.verde },
  medir: { label: "Medir", color: PALETA.magenta },
};

export const STATUSES: Record<ClientStatus, { label: string; color: string }> =
  {
    ativo: { label: "Ativo", color: PALETA.verde },
    em_risco: { label: "Em risco", color: PALETA.ambar },
    pausado: { label: "Pausado", color: PALETA.grafite },
    encerrado: { label: "Encerrado", color: PALETA_FALLBACK },
  };

export const ACTIVITY_STATUSES: Record<
  ActivityStatus,
  { label: string; color: string }
> = {
  pendente: { label: "Pendente", color: PALETA.grafite },
  em_andamento: { label: "Em andamento", color: PALETA.azul },
  // Âmbar, não vermelho: bloqueada é aviso; vermelho já significa "atrasado".
  bloqueada: { label: "Bloqueada", color: PALETA.ambar },
  concluida: { label: "Concluída", color: PALETA.verde },
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
  cliente: { label: "Cliente", color: PALETA.ciano },
  perfecting: { label: "Perfecting", color: PALETA.azul },
  ambos: { label: "Perfecting & Cliente", color: PALETA.violeta },
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
  baixa: { label: "Baixa", color: PALETA_FALLBACK },
  media: { label: "Média", color: PALETA.ambar },
  alta: { label: "Alta", color: TREND.negativo },
};

export type EventType =
  | "cliente_criado"
  | "etapa_alterada"
  | "atividade_criada"
  | "atividade_concluida"
  | "arquivo_enviado"
  | "arquivo_excluido";

// =============================================================================
// Marketing
// =============================================================================

// "agendado" não é status no banco: é derivado de publicado + data futura
// (postState em src/lib/marketing-post.ts). Cores da paleta categórica §1.
export type PostState = "rascunho" | "agendado" | "publicado" | "arquivado";

export const POST_STATES: Record<PostState, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: PALETA.grafite },
  agendado: { label: "Agendado", color: PALETA.ambar },
  publicado: { label: "Publicado", color: PALETA.verde },
  arquivado: { label: "Arquivado", color: PALETA_FALLBACK },
};

export const POST_STATE_ORDER: PostState[] = [
  "rascunho",
  "agendado",
  "publicado",
  "arquivado",
];

export const FUNNEL_STATUSES: Record<
  FunnelStatus,
  { label: string; color: string }
> = {
  rascunho: { label: "Rascunho", color: PALETA.grafite },
  publicado: { label: "Publicado", color: PALETA.verde },
  arquivado: { label: "Arquivado", color: PALETA_FALLBACK },
};

export const LEAD_STATUSES: Record<
  LeadStatus,
  { label: string; color: string }
> = {
  novo: { label: "Novo", color: PALETA.azul },
  em_contato: { label: "Em contato", color: PALETA.ciano },
  qualificado: { label: "Qualificado", color: PALETA.violeta },
  descartado: { label: "Descartado", color: PALETA_FALLBACK },
  convertido: { label: "Convertido", color: PALETA.verde },
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "novo",
  "em_contato",
  "qualificado",
  "convertido",
  "descartado",
];

export const QUALIFICACOES: Record<
  LeadQualificacao,
  { label: string; color: string }
> = {
  frio: { label: "Frio", color: PALETA.ciano },
  morno: { label: "Morno", color: PALETA.ambar },
  quente: { label: "Quente", color: PALETA.rosa },
};

export const QUALIFICACAO_ORDER: LeadQualificacao[] = [
  "quente",
  "morno",
  "frio",
];

// Limiares de qualificação em % da pontuação máxima do funil.
export const DEFAULT_SCORE_THRESHOLDS = { morno: 40, quente: 70 };

// =============================================================================
// Calculadora ROI
// =============================================================================

// Status do link é derivado (linkStatus em src/lib/calculadora/link-status.ts),
// nunca coluna. Cores da paleta categórica §1.
export const CALCULATOR_LINK_STATUSES: Record<
  "ativo" | "concluido" | "expirado" | "revogado",
  { label: string; color: string }
> = {
  ativo: { label: "Ativo", color: PALETA.verde },
  concluido: { label: "Concluído", color: PALETA.azul },
  expirado: { label: "Expirado", color: PALETA_FALLBACK },
  revogado: { label: "Revogado", color: PALETA.grafite },
};

// Capa de post — espelha o file_size_limit do bucket marketing-media.
export const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const COVER_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export const MARKETING_MEDIA_BUCKET = "marketing-media";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// SLA por etapa (Preferências > Fluxo de trabalho) — fixo para todos os clientes.
export const DEFAULT_PRAZO_ETAPA_DIAS = 25;

// =============================================================================
// Desafios
// =============================================================================

// `tipo` mantém o eixo CATEGORIA limpo: sem ele, "bug" viraria categoria e o
// cruzamento categoria × fluxo passaria a misturar dois eixos. Rosa/âmbar/
// violeta e NUNCA o vermelho de tendência — o §1 reserva o vermelho para
// atraso e queda, e pintá-lo num tipo desfaria essa semântica.
export const DESAFIO_TIPOS: Record<
  DesafioTipo,
  { label: string; color: string }
> = {
  bug: { label: "Bug", color: PALETA.rosa },
  atrito: { label: "Atrito", color: PALETA.ambar },
  lacuna: { label: "Lacuna", color: PALETA.violeta },
};

export const DESAFIO_TIPO_ORDER: DesafioTipo[] = ["bug", "atrito", "lacuna"];

// Escala própria (não o `criticidade` das atividades): bug precisa de `critica`,
// e "trava todo mundo" não é o mesmo que "alta". A tinta segue o degrau de
// CRITICIDADES — o topo usa o vermelho de tendência, que aqui é alerta de
// verdade.
export const DESAFIO_SEVERIDADES: Record<
  DesafioSeveridade,
  { label: string; color: string }
> = {
  critica: { label: "Crítica", color: TREND.negativo },
  alta: { label: "Alta", color: PALETA.rosa },
  media: { label: "Média", color: PALETA.ambar },
  baixa: { label: "Baixa", color: PALETA_FALLBACK },
};

export const DESAFIO_SEVERIDADE_ORDER: DesafioSeveridade[] = [
  "critica",
  "alta",
  "media",
  "baixa",
];

// `nao_reproduz` é desfecho, não descarte. Âmbar fica de fora: em
// ACTIVITY_STATUSES ele já significa "bloqueada", e repetir a cor com outro
// sentido é o que a semântica do §1 existe para impedir.
export const DESAFIO_STATUSES: Record<
  DesafioStatus,
  { label: string; color: string }
> = {
  aberto: { label: "Aberto", color: PALETA.azul },
  em_analise: { label: "Em análise", color: PALETA.ciano },
  resolvido: { label: "Resolvido", color: PALETA.verde },
  nao_reproduz: { label: "Não reproduz", color: PALETA.grafite },
  descartado: { label: "Descartado", color: PALETA_FALLBACK },
};

export const DESAFIO_STATUS_ORDER: DesafioStatus[] = [
  "aberto",
  "em_analise",
  "resolvido",
  "nao_reproduz",
  "descartado",
];

// Os oito swatches do §1 como opções de <Select>, para o seletor de cor da
// taxonomia. O CHECK da migration valida só a FORMA do hex; o conjunto vive
// aqui, e é este seletor que o impõe.
export const CORES_TAXONOMIA: { value: string; label: string }[] = [
  { value: PALETA.azul, label: "Azul" },
  { value: PALETA.violeta, label: "Violeta" },
  { value: PALETA.verde, label: "Verde" },
  { value: PALETA.ambar, label: "Âmbar" },
  { value: PALETA.rosa, label: "Rosa" },
  { value: PALETA.ciano, label: "Ciano" },
  { value: PALETA.magenta, label: "Magenta" },
  { value: PALETA.grafite, label: "Grafite" },
];

// Amostra mínima para um desafio entrar no ranking de mais recorrentes. Um
// 1 de 1 (100%) no topo da lista é a mentira clássica do n pequeno.
export const MIN_TENTATIVAS_PARA_RANQUEAR = 3;

// Padrão de acento do guideline (§1): fundo alpha .08, borda alpha .35,
// texto/dot na cor cheia.
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

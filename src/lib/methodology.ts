import type {
  AtividadeTipo,
  Responsavel,
  WorkflowStage,
} from "@/lib/constants";

// Cronograma canônico da POC (planilha "Atividades da POC - V1"): 21 passos,
// 8 semanas, 50 dias. supabase/seed.sql espelha esta lista — alterar os dois
// juntos. `subatividades` é o campo que ainda não existe na planilha: nasce
// vazio, pronto para preencher.

export type MethodologyStep = {
  order: number; // 1..21 (ordem no programa)
  stage: WorkflowStage; // Etapa
  week: number; // Semana (1..8)
  durationDays: number; // Prazo, em dias
  cumulativeDays: number; // Dias totais (acumulado no programa)
  activity: string; // Atividade
  responsavel: Responsavel; // Responsável (categoria)
  tipo: AtividadeTipo; // Tipo síncrono/assíncrono
  subatividades: string[];
};

export const METHODOLOGY: MethodologyStep[] = [
  {
    order: 1,
    stage: "diagnosticar",
    week: 1,
    durationDays: 1,
    cumulativeDays: 1,
    activity: "Aceite Formal",
    responsavel: "ambos",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 2,
    stage: "diagnosticar",
    week: 1,
    durationDays: 1,
    cumulativeDays: 2,
    activity: "Canal de comunicação (WPP) aberto",
    responsavel: "perfecting",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 3,
    stage: "diagnosticar",
    week: 1,
    durationDays: 2,
    cumulativeDays: 4,
    activity: "Diagnóstico de dores e anamnese realizadas",
    responsavel: "cliente",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 4,
    stage: "diagnosticar",
    week: 1,
    durationDays: 2,
    cumulativeDays: 6,
    activity: "Criação das trilhas e apresentação",
    responsavel: "perfecting",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 5,
    stage: "diagnosticar",
    week: 2,
    durationDays: 1,
    cumulativeDays: 7,
    activity: "Reunião de apresentação das trilhas e validação",
    responsavel: "ambos",
    tipo: "sincrono",
    subatividades: [],
  },
  {
    order: 6,
    stage: "priorizar",
    week: 2,
    durationDays: 0,
    cumulativeDays: 7,
    activity: "Criação da conta e liberação dos acessos",
    responsavel: "perfecting",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 7,
    stage: "priorizar",
    week: 2,
    durationDays: 6,
    cumulativeDays: 13,
    activity: "Testes de roleplay e feedbacks",
    responsavel: "cliente",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 8,
    stage: "construir",
    week: 3,
    durationDays: 1,
    cumulativeDays: 14,
    activity:
      "Reunião de alinhamentos, definição de cadência de treinamentos e foco do piloto",
    responsavel: "ambos",
    tipo: "sincrono",
    subatividades: [],
  },
  {
    order: 9,
    stage: "calibrar",
    week: 3,
    durationDays: 1,
    cumulativeDays: 15,
    activity:
      "Calibração de roleplays com base nos feedbacks trazidos e no foco definido",
    responsavel: "perfecting",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 10,
    stage: "calibrar",
    week: 3,
    durationDays: 3,
    cumulativeDays: 18,
    activity: "Validação das melhorias",
    responsavel: "cliente",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 11,
    stage: "executar",
    week: 4,
    durationDays: 3,
    cumulativeDays: 21,
    activity: "Go-Live (Apresentação ao operacional)",
    responsavel: "ambos",
    tipo: "sincrono",
    subatividades: [],
  },
  {
    order: 12,
    stage: "executar",
    week: 4,
    durationDays: 4,
    cumulativeDays: 25,
    activity:
      "Reunião de alinhamentos com a gestão: boas práticas, KPIs desejados, cadência mínima e ideal",
    responsavel: "ambos",
    tipo: "sincrono",
    subatividades: [],
  },
  {
    order: 13,
    stage: "executar",
    week: 4,
    durationDays: 2,
    cumulativeDays: 27,
    activity: "Confecção do relatório de resultados (semana 1)",
    responsavel: "perfecting",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 14,
    stage: "executar",
    week: 5,
    durationDays: 1,
    cumulativeDays: 28,
    activity:
      "Reunião semanal 1: apresentação de relatório, prática semanal e encaminhamentos",
    responsavel: "ambos",
    tipo: "sincrono",
    subatividades: [],
  },
  {
    order: 15,
    stage: "executar",
    week: 5,
    durationDays: 6,
    cumulativeDays: 34,
    activity: "Confecção do relatório de resultados (semana 2)",
    responsavel: "perfecting",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 16,
    stage: "executar",
    week: 6,
    durationDays: 1,
    cumulativeDays: 35,
    activity:
      "Reunião semanal 2: apresentação de relatório, prática semanal e encaminhamentos",
    responsavel: "ambos",
    tipo: "sincrono",
    subatividades: [],
  },
  {
    order: 17,
    stage: "executar",
    week: 6,
    durationDays: 6,
    cumulativeDays: 41,
    activity: "Confecção do relatório de resultados (semana 3)",
    responsavel: "perfecting",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 18,
    stage: "executar",
    week: 7,
    durationDays: 1,
    cumulativeDays: 42,
    activity:
      "Reunião semanal 3: apresentação de relatório, prática semanal e encaminhamentos",
    responsavel: "ambos",
    tipo: "sincrono",
    subatividades: [],
  },
  {
    order: 19,
    stage: "medir",
    week: 7,
    durationDays: 6,
    cumulativeDays: 48,
    activity: "Relatório final de impacto",
    responsavel: "perfecting",
    tipo: "assincrono",
    subatividades: [],
  },
  {
    order: 20,
    stage: "medir",
    week: 8,
    durationDays: 1,
    cumulativeDays: 49,
    activity: "Reunião semanal 4: apresentação do relatório final de impacto",
    responsavel: "ambos",
    tipo: "sincrono",
    subatividades: [],
  },
  {
    order: 21,
    stage: "medir",
    week: 8,
    durationDays: 1,
    cumulativeDays: 50,
    activity:
      "O cliente pretende avançar com a solução e realizar negociação para fechar contrato?",
    responsavel: "ambos",
    tipo: "assincrono",
    subatividades: [],
  },
];

// Dias totais do programa (= acumulado do último passo).
export const PROGRAM_TOTAL_DAYS =
  METHODOLOGY[METHODOLOGY.length - 1].cumulativeDays;

export type StageSchedule = {
  weekFrom: number;
  weekTo: number;
  count: number;
};

// Janela planejada da etapa (semanas e nº de atividades) para os headers do
// board e do drawer. Derivada uma vez do cronograma canônico.
const STAGE_SCHEDULES = new Map<WorkflowStage, StageSchedule>();
for (const step of METHODOLOGY) {
  const current = STAGE_SCHEDULES.get(step.stage);
  if (!current) {
    STAGE_SCHEDULES.set(step.stage, {
      weekFrom: step.week,
      weekTo: step.week,
      count: 1,
    });
  } else {
    current.weekFrom = Math.min(current.weekFrom, step.week);
    current.weekTo = Math.max(current.weekTo, step.week);
    current.count += 1;
  }
}

export function stageSchedule(stage: WorkflowStage): StageSchedule | null {
  return STAGE_SCHEDULES.get(stage) ?? null;
}

// Passos canônicos de uma etapa, na ordem do programa. Base para gerar as
// atividades padrão de um cliente ao entrar na etapa (createClient / mudança de
// etapa). METHODOLOGY já está em ordem 1..21, e o filtro preserva essa ordem.
export function stageSteps(stage: WorkflowStage): MethodologyStep[] {
  return METHODOLOGY.filter((step) => step.stage === stage);
}

// Rótulo "Semana X" ou "Semanas X–Y" (travessão sem espaços, pt-BR).
export function weekRangeLabel(from: number, to: number): string {
  return from === to ? `Semana ${from}` : `Semanas ${from}–${to}`;
}

// Rótulo curto "S1" ou "S1-2", para espaços compactos (cabeçalho da coluna).
export function weekRangeShortLabel(from: number, to: number): string {
  return from === to ? `S${from}` : `S${from}-${to}`;
}

// activities.subatividades é jsonb (Json no TS) — normaliza para string[]
// descartando qualquer conteúdo fora do formato esperado.
export function parseSubatividades(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

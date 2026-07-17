import {
  ATIVIDADE_TIPOS,
  CANAIS,
  RESPONSAVEIS,
  type AtividadeTipo,
  type Canal,
  type Responsavel,
  type WorkflowStage,
} from "@/lib/constants";
import type { Json } from "@/lib/database.types";

// Cronograma canônico da POC (planilha "Atividades da POC"): 21 passos,
// 8 semanas, 50 dias, com código hierárquico (Cat.), canal de comunicação e
// as 53 subatividades — cada uma com responsável, tipo e canal próprios (que
// podem diferir do pai). supabase/seed.sql e a migration de backfill espelham
// esta lista — alterar juntos.

// Subatividade canônica da planilha (template, sem estado): vira o formato
// persistido com `done: false` ao semear a etapa.
export type SubatividadeTemplate = {
  code: string; // "1.3.1"
  title: string;
  responsavel: Responsavel; // pode diferir do pai
  tipo: AtividadeTipo;
  canal: Canal;
};

// Formato persistido em activities.subatividades (jsonb). Campos de metadado
// são null no formato legado (string[]) e em conteúdo criado manualmente.
export type Subatividade = {
  code: string; // "" no formato legado
  title: string;
  responsavel: Responsavel | null;
  tipo: AtividadeTipo | null;
  canal: Canal | null;
  done: boolean;
};

export type MethodologyStep = {
  order: number; // 1..21 (ordem no programa)
  cat: string; // Cat. — código hierárquico ("1.1")
  stage: WorkflowStage; // Etapa
  week: number; // Semana (1..8)
  durationDays: number; // Prazo, em dias
  cumulativeDays: number; // Dias totais (acumulado no programa)
  activity: string; // Atividade
  responsavel: Responsavel; // Responsável (categoria)
  tipo: AtividadeTipo; // Tipo síncrono/assíncrono
  canal: Canal; // Canal de comunicação
  subatividades: SubatividadeTemplate[];
};

// A planilha repete estes dois blocos de subatividades a cada semana do
// piloto (relatório 5.3/5.5/5.7 e reunião semanal 5.4/5.6/5.8).
function subsRelatorioSemanal(cat: string): SubatividadeTemplate[] {
  return [
    {
      code: `${cat}.1`,
      title: "Criar relatório semanal de resultados",
      responsavel: "perfecting",
      tipo: "assincrono",
      canal: "os",
    },
  ];
}

function subsReuniaoSemanal(cat: string): SubatividadeTemplate[] {
  return [
    {
      code: `${cat}.1`,
      title: "Apresentar relatório de resultados semanais",
      responsavel: "ambos",
      tipo: "sincrono",
      canal: "meet",
    },
    {
      code: `${cat}.2`,
      title: "Coletar feedbacks e sugestão de melhorias",
      responsavel: "ambos",
      tipo: "sincrono",
      canal: "meet",
    },
    {
      code: `${cat}.3`,
      title: "Levar feedback e sugestão de melhorias ao time responsável",
      responsavel: "perfecting",
      tipo: "sincrono",
      canal: "meet",
    },
    {
      code: `${cat}.4`,
      title: "Devolver as melhorias trazidas",
      responsavel: "ambos",
      tipo: "assincrono",
      canal: "whatsapp",
    },
  ];
}

export const METHODOLOGY: MethodologyStep[] = [
  {
    order: 1,
    cat: "1.1",
    stage: "diagnosticar",
    week: 1,
    durationDays: 1,
    cumulativeDays: 1,
    activity: "Aceite Formal",
    responsavel: "ambos",
    tipo: "assincrono",
    canal: "email",
    subatividades: [
      {
        code: "1.1.1",
        title: "Envio do e-mail de aceite",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "email",
      },
      {
        code: "1.1.2",
        title: "Conferência do aceite",
        responsavel: "ambos",
        tipo: "assincrono",
        canal: "email",
      },
    ],
  },
  {
    order: 2,
    cat: "1.2",
    stage: "diagnosticar",
    week: 1,
    durationDays: 1,
    cumulativeDays: 2,
    activity: "Canal de comunicação (WPP) aberto",
    responsavel: "perfecting",
    tipo: "assincrono",
    canal: "whatsapp",
    subatividades: [
      {
        code: "1.2.1",
        title: "Criar canal de wpp e adicionar todos os gestores da operação",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "whatsapp",
      },
    ],
  },
  {
    order: 3,
    cat: "1.3",
    stage: "diagnosticar",
    week: 1,
    durationDays: 2,
    cumulativeDays: 4,
    activity: "Diagnóstico de dores e anamnese realizadas",
    responsavel: "cliente",
    tipo: "assincrono",
    canal: "os",
    subatividades: [
      {
        code: "1.3.1",
        title: "Envio dos formulários de configuração de roleplay e anamnese",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "whatsapp",
      },
      {
        code: "1.3.2",
        title:
          "Conferência do preenchimento satisfatório das informações necessárias",
        responsavel: "ambos",
        tipo: "assincrono",
        canal: "os",
      },
    ],
  },
  {
    order: 4,
    cat: "1.4",
    stage: "diagnosticar",
    week: 1,
    durationDays: 2,
    cumulativeDays: 6,
    activity: "Criação das trilhas e apresentação",
    responsavel: "perfecting",
    tipo: "assincrono",
    canal: "os",
    subatividades: [
      {
        code: "1.4.1",
        title:
          "Definir a(s) trilha(s) necessárias com base nas informações levantadas",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "os",
      },
      {
        code: "1.4.2",
        title: "Criar a apresentação das trilhas sugeridas",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "os",
      },
    ],
  },
  {
    order: 5,
    cat: "1.5",
    stage: "diagnosticar",
    week: 2,
    durationDays: 1,
    cumulativeDays: 7,
    activity: "Reunião de apresentação das trilhas e validação",
    responsavel: "ambos",
    tipo: "sincrono",
    canal: "meet",
    subatividades: [
      {
        code: "1.5.1",
        title:
          "Apresentar a trilha e pegar validação ou sugestão de ajustes com o cliente",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
    ],
  },
  {
    order: 6,
    cat: "2.1",
    stage: "priorizar",
    week: 2,
    durationDays: 0,
    cumulativeDays: 7,
    activity: "Criação da conta e liberação dos acessos",
    responsavel: "perfecting",
    tipo: "assincrono",
    canal: "os",
    subatividades: [
      {
        code: "2.1.1",
        title: "Criar a conta dentro da plataforma",
        responsavel: "cliente",
        tipo: "assincrono",
        canal: "os",
      },
      {
        code: "2.1.2",
        title: "Incluir time dentro da plataforma",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "os",
      },
      {
        code: "2.1.3",
        title:
          "Criação das trilhas e seus respectivos roleplays dentro da plataforma",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "presencial",
      },
      {
        code: "2.1.4",
        title: "Conferência da ativação de todos os acessos",
        responsavel: "ambos",
        tipo: "assincrono",
        canal: "whatsapp",
      },
    ],
  },
  {
    order: 7,
    cat: "2.2",
    stage: "priorizar",
    week: 2,
    durationDays: 6,
    cumulativeDays: 13,
    activity: "Testes de roleplay e feedbacks",
    responsavel: "cliente",
    tipo: "assincrono",
    canal: "os",
    subatividades: [
      {
        code: "2.2.1",
        title: "Avisar sobre a liberação dos roleplays para testes",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "whatsapp",
      },
      {
        code: "2.2.2",
        title: "Conferência da validação dos roleplays",
        responsavel: "ambos",
        tipo: "assincrono",
        canal: "whatsapp",
      },
    ],
  },
  {
    order: 8,
    cat: "3.1",
    stage: "construir",
    week: 3,
    durationDays: 1,
    cumulativeDays: 14,
    activity:
      "Reunião de alinhamentos, definição de cadência de treinamentos e foco do piloto",
    responsavel: "ambos",
    tipo: "sincrono",
    canal: "meet",
    subatividades: [
      {
        code: "3.1.1",
        title: "Coletar feedbacks e sugestão de melhorias dos roleplays",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
      {
        code: "3.1.2",
        title: "Definir cadência de treinamentos",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
      {
        code: "3.1.3",
        title: "Definir KPI's e OKR's pretendidos",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
      {
        code: "3.1.4",
        title: "Definir focos da POC",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
      {
        code: "3.1.5",
        title: "Definir datas e horários das reuniões semanais",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
    ],
  },
  {
    order: 9,
    cat: "4.1",
    stage: "calibrar",
    week: 3,
    durationDays: 1,
    cumulativeDays: 15,
    activity:
      "Calibração de roleplays com base nos feedbacks trazidos e no foco definido",
    responsavel: "perfecting",
    tipo: "assincrono",
    canal: "os",
    subatividades: [
      {
        code: "4.1.1",
        title: "Realizar calibração de roleplays",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "os",
      },
      {
        code: "4.1.2",
        title: "Avisar sobre liberação dos roleplays calibrados",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "whatsapp",
      },
    ],
  },
  {
    order: 10,
    cat: "4.2",
    stage: "calibrar",
    week: 3,
    durationDays: 3,
    cumulativeDays: 18,
    activity: "Validação das melhorias",
    responsavel: "cliente",
    tipo: "assincrono",
    canal: "os",
    subatividades: [
      {
        code: "4.2.1",
        title: "Conferência da validação dos roleplays calibrados",
        responsavel: "ambos",
        tipo: "assincrono",
        canal: "whatsapp",
      },
      {
        code: "4.2.2",
        title:
          "Agendar dia/horário da go-live e definição dos integrantes da reunião",
        responsavel: "ambos",
        tipo: "assincrono",
        canal: "whatsapp",
      },
    ],
  },
  {
    order: 11,
    cat: "5.1",
    stage: "executar",
    week: 4,
    durationDays: 3,
    cumulativeDays: 21,
    activity: "Go-Live (Apresentação ao operacional)",
    responsavel: "ambos",
    tipo: "sincrono",
    canal: "meet",
    subatividades: [
      {
        code: "5.1.1",
        title:
          "Criar apresentação com as rotinas de treinamento e engajamento do operacional",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "os",
      },
      {
        code: "5.1.2",
        title:
          "Coletar percepções, feedbacks, e demais pontos pertinentes da reunião",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
    ],
  },
  {
    order: 12,
    cat: "5.2",
    stage: "executar",
    week: 4,
    durationDays: 4,
    cumulativeDays: 25,
    activity:
      "Reunião de alinhamentos com a gestão: boas práticas, KPIs desejados, cadência mínima e ideal",
    responsavel: "ambos",
    tipo: "sincrono",
    canal: "meet",
    subatividades: [
      {
        code: "5.2.1",
        title: "Definir data/horário da reunião com a gestão",
        responsavel: "ambos",
        tipo: "assincrono",
        canal: "whatsapp",
      },
      {
        code: "5.2.2",
        title: "Alinhar e validar pontos extraídos da reunião de go-live",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
      {
        code: "5.2.3",
        title: "Alinhar e validar modelo de relatório semanal",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
    ],
  },
  {
    order: 13,
    cat: "5.3",
    stage: "executar",
    week: 4,
    durationDays: 2,
    cumulativeDays: 27,
    activity: "Confecção do relatório de resultados (semana 1)",
    responsavel: "perfecting",
    tipo: "assincrono",
    canal: "os",
    subatividades: subsRelatorioSemanal("5.3"),
  },
  {
    order: 14,
    cat: "5.4",
    stage: "executar",
    week: 5,
    durationDays: 1,
    cumulativeDays: 28,
    activity:
      "Reunião semanal 1: apresentação de relatório, prática semanal e encaminhamentos",
    responsavel: "ambos",
    tipo: "sincrono",
    canal: "meet",
    subatividades: subsReuniaoSemanal("5.4"),
  },
  {
    order: 15,
    cat: "5.5",
    stage: "executar",
    week: 5,
    durationDays: 6,
    cumulativeDays: 34,
    activity: "Confecção do relatório de resultados (semana 2)",
    responsavel: "perfecting",
    tipo: "assincrono",
    canal: "os",
    subatividades: subsRelatorioSemanal("5.5"),
  },
  {
    order: 16,
    cat: "5.6",
    stage: "executar",
    week: 6,
    durationDays: 1,
    cumulativeDays: 35,
    activity:
      "Reunião semanal 2: apresentação de relatório, prática semanal e encaminhamentos",
    responsavel: "ambos",
    tipo: "sincrono",
    canal: "meet",
    subatividades: subsReuniaoSemanal("5.6"),
  },
  {
    order: 17,
    cat: "5.7",
    stage: "executar",
    week: 6,
    durationDays: 6,
    cumulativeDays: 41,
    activity: "Confecção do relatório de resultados (semana 3)",
    responsavel: "perfecting",
    tipo: "assincrono",
    canal: "os",
    subatividades: subsRelatorioSemanal("5.7"),
  },
  {
    order: 18,
    cat: "5.8",
    stage: "executar",
    week: 7,
    durationDays: 1,
    cumulativeDays: 42,
    activity:
      "Reunião semanal 3: apresentação de relatório, prática semanal e encaminhamentos",
    responsavel: "ambos",
    tipo: "sincrono",
    canal: "meet",
    subatividades: subsReuniaoSemanal("5.8"),
  },
  {
    order: 19,
    cat: "6.1",
    stage: "medir",
    week: 7,
    durationDays: 6,
    cumulativeDays: 48,
    activity: "Relatório final de impacto",
    responsavel: "perfecting",
    tipo: "assincrono",
    canal: "os",
    subatividades: [
      {
        code: "6.1.1",
        title: "Criar relatório final de resultados",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "os",
      },
    ],
  },
  {
    order: 20,
    cat: "6.2",
    stage: "medir",
    week: 8,
    durationDays: 1,
    cumulativeDays: 49,
    activity: "Reunião semanal 4: apresentação do relatório final de impacto",
    responsavel: "ambos",
    tipo: "sincrono",
    canal: "meet",
    subatividades: [
      {
        code: "6.2.1",
        title: "Apresentar relatório final de impacto",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
      {
        code: "6.2.2",
        title: "Coletar feedbacks finais",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
      {
        code: "6.2.3",
        title: "Levar feedback e sugestão de melhorias ao time responsável",
        responsavel: "perfecting",
        tipo: "sincrono",
        canal: "meet",
      },
      {
        code: "6.2.4",
        title: "Devolver as melhorias trazidas",
        responsavel: "ambos",
        tipo: "assincrono",
        canal: "whatsapp",
      },
    ],
  },
  {
    order: 21,
    cat: "6.3",
    stage: "medir",
    week: 8,
    durationDays: 1,
    cumulativeDays: 50,
    activity:
      "O cliente pretende avançar com a solução e realizar negociação para fechar contrato?",
    responsavel: "ambos",
    tipo: "assincrono",
    canal: "whatsapp",
    subatividades: [
      {
        code: "6.3.1",
        title: "Agendar reunião final de gestão",
        responsavel: "ambos",
        tipo: "assincrono",
        canal: "whatsapp",
      },
      {
        code: "6.3.2",
        title: "Criar apresentação de vendas",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "os",
      },
      {
        code: "6.3.3",
        title:
          "Reunião para ressaltar os impactos, alinhar gargalos, e definir próximos passos apresentando a proposta de venda",
        responsavel: "ambos",
        tipo: "sincrono",
        canal: "meet",
      },
      {
        code: "6.3.4",
        title: "Envio de proposta",
        responsavel: "perfecting",
        tipo: "assincrono",
        canal: "email",
      },
      {
        code: "6.3.5",
        title: "Conferência sobre retorno da proposta",
        responsavel: "ambos",
        tipo: "assincrono",
        canal: "email",
      },
    ],
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

function isResponsavel(value: unknown): value is Responsavel {
  return typeof value === "string" && value in RESPONSAVEIS;
}

function isAtividadeTipo(value: unknown): value is AtividadeTipo {
  return typeof value === "string" && value in ATIVIDADE_TIPOS;
}

function isCanal(value: unknown): value is Canal {
  return typeof value === "string" && value in CANAIS;
}

// activities.subatividades é jsonb (Json no TS) — normaliza para
// Subatividade[] descartando conteúdo fora do formato. Retrocompatível com o
// formato legado string[] (vira sub sem metadados, não feita). UI e server
// action devem usar ESTE parse para que os índices do checklist casem com o
// array persistido.
export function parseSubatividades(value: unknown): Subatividade[] {
  if (!Array.isArray(value)) return [];
  const subs: Subatividade[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      subs.push({
        code: "",
        title: item,
        responsavel: null,
        tipo: null,
        canal: null,
        done: false,
      });
      continue;
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const record = item as Record<string, unknown>;
      if (typeof record.title !== "string") continue;
      subs.push({
        code: typeof record.code === "string" ? record.code : "",
        title: record.title,
        responsavel: isResponsavel(record.responsavel)
          ? record.responsavel
          : null,
        tipo: isAtividadeTipo(record.tipo) ? record.tipo : null,
        canal: isCanal(record.canal) ? record.canal : null,
        done: record.done === true,
      });
    }
  }
  return subs;
}

// Subatividade[] não satisfaz Json (falta index signature) — converte para o
// formato gravável no jsonb sem casts espalhados.
export function subatividadesToJson(subs: Subatividade[]): Json {
  return subs.map((sub) => ({
    code: sub.code,
    title: sub.title,
    responsavel: sub.responsavel,
    tipo: sub.tipo,
    canal: sub.canal,
    done: sub.done,
  }));
}

// Template canônico → formato persistido (nasce não feita).
export function seedSubatividades(templates: SubatividadeTemplate[]): Json {
  return subatividadesToJson(
    templates.map((template) => ({ ...template, done: false })),
  );
}

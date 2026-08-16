// Constantes do racional (V5). Aqui vive SOMENTE preço de venda e premissa
// declarada — nenhuma constante de custo interno entra no código (§9,
// invariante 13).

import type { Caminho, Cenario, FaixaMargemId, PlanoId } from "./types";

// Planos definem consumo, não preço (§4.9).
export const PLANOS: Record<PlanoId, { label: string; horasMes: number }> = {
  essencial: { label: "Essencial", horasMes: 2 },
  pratica: { label: "Prática", horasMes: 4 },
  intensivo: { label: "Intensivo", horasMes: 8 },
};

// Escada progressiva sobre o total de horas da conta, marginal por faixa
// (§4.9). As faixas espelham as capacidades dos tiers de voz.
export const ESCADA_PRECO: { ateHoras: number; taxaHora: number }[] = [
  { ateHoras: 262, taxaHora: 98 },
  { ateHoras: 573, taxaHora: 82 },
  { ateHoras: 1243, taxaHora: 70 },
  { ateHoras: Infinity, taxaHora: 60 },
];

// Piso aplicado DEPOIS do desconto — piso não se desconta (§4.9).
export const TAXA_MINIMA = 13_000;

// Prazo não altera preço (§4.9): desconto zero em todos os contratos.
export const DESCONTO_PRAZO = 0;

// Prazo a partir do qual o contrato compra um degrau adicional de nível de
// serviço (§4.9). Continua sem efeito sobre preço.
export const PRAZO_DEGRAU_SERVICO = 24;

// Nível de serviço por assentos, sem efeito sobre preço (§4.9).
export const NIVEIS_SERVICO = [
  { ateAssentos: 30, nivel: "essencial" as const, label: "Essencial" },
  { ateAssentos: 100, nivel: "avancado" as const, label: "Avançado" },
  { ateAssentos: Infinity, nivel: "enterprise" as const, label: "Enterprise" },
];

// Premissas declaradas, verificáveis pela aritmética do caso de referência
// (§14): custo-hora 12.000 × 1,75 ÷ 200 = 105; eficiência × 0,75.
export const ENCARGOS = 1.75;
export const JORNADA_MENSAL_H = 200;
export const SUPERVISAO = 0.25;

// Haircut anti-otimismo de rampa, ciclo e conversão (§4.4).
export const HAIRCUT = 0.7;

// Quanto do custo de um evento é substituível por prática contínua.
// [H] hipótese declarada — o V5 usa a constante sem definir o valor;
// 0,5 decidido em 15/08/2026, pendente de ratificação do decisor.
export const PCT_EVENTO_SUBSTITUIVEL = 0.5;

// Fator de escopo (§4.2): faixa de validade e premissa de fallback [H].
export const FATOR_ESCOPO_PREMISSA = 2.1;
export const FATOR_ESCOPO_MIN = 0.25;
export const FATOR_ESCOPO_MAX = 6;

// Redução máxima do ciclo: 30% dos dias (§4.4).
export const REDUCAO_CICLO_MAX = 0.3;

// Checagem de realidade alerta acima de 25% da margem anual (§4.7).
export const CHECAGEM_ALERTA = 0.25;

export const DIAS_UTEIS_MES = 22;
export const DIAS_UTEIS_ANO = 264;

// Avisos de coerência (§4.7): receita mensal por vendedor fora da faixa.
export const RECEITA_POR_VENDEDOR_MIN = 5_000;
export const RECEITA_POR_VENDEDOR_MAX = 1_000_000;

// Cenários (§4.8). Todos os deltas são [H] — declarados, sem lastro de campo.
export const CENARIOS: Record<
  Cenario,
  { label: string; descricao: string; ticketPct: number; rampaPct: number; cicloPct: number; convPp: number }
> = {
  conservador: {
    label: "Conservador",
    descricao: "piso da projeção, use para decidir",
    ticketPct: 0.05,
    rampaPct: 0.2,
    cicloPct: 0.05,
    convPp: 0.5,
  },
  realista: {
    label: "Realista",
    descricao: "time praticando com consistência",
    ticketPct: 0.15,
    rampaPct: 0.5,
    cicloPct: 0.15,
    convPp: 2.5,
  },
  otimista: {
    label: "Otimista",
    descricao: "teto, com adoção alta do time: discutir potencial, não decidir",
    ticketPct: 0.2,
    rampaPct: 0.65,
    cicloPct: 0.2,
    convPp: 3.5,
  },
};

export const CENARIO_DEFAULT: Cenario = "conservador";

// Faixas dos sliders de parâmetros personalizados. Ticket e rampa não têm teto
// próprio no §5, então herdam o preset Otimista — derivado, nunca literal, para
// não divergir do §4.8 (invariante 15: teto não se cria nem se relaxa sem
// decisão registrada). Δconv e ciclo têm tetos próprios, aplicados em
// deltasEfetivos().
export const SLIDER_TICKET_MAX = CENARIOS.otimista.ticketPct;
export const SLIDER_RAMPA_MAX = CENARIOS.otimista.rampaPct;

// Faixas de margem de contribuição (§4.1: "faixas; 30% quando 'não sei'").
// Enumeração decidida em 15/08/2026: valor central da faixa entra no cálculo.
export const FAIXAS_MARGEM: Record<FaixaMargemId, { label: string; pct: number }> = {
  ate15: { label: "Até 15%", pct: 10 },
  "15a25": { label: "15% a 25%", pct: 20 },
  "25a35": { label: "25% a 35%", pct: 30 },
  "35a45": { label: "35% a 45%", pct: 40 },
  "45a60": { label: "45% a 60%", pct: 50 },
  acima60: { label: "Acima de 60%", pct: 60 },
  nao_sei: { label: "Não sei", pct: 30 },
};

export const CAMINHOS: Record<Caminho, { label: string; descricao: string }> = {
  nenhum: {
    label: "Nenhum treino estruturado",
    descricao: "Hoje o time não teria um programa de prática no lugar.",
  },
  gestores: {
    label: "Gestores conduzem o treino",
    descricao: "Os próprios gestores dedicariam horas de treino ao time.",
  },
  externo: {
    label: "Consultoria ou treinamento externo",
    descricao: "Contratação de um programa externo recorrente.",
  },
  evento: {
    label: "Eventos e imersões pontuais",
    descricao: "Workshops ou convenções de vendas ao longo do ano.",
  },
};

// Reconciliação da trajetória interativa (§4.12).
export const TRAJETORIA_MESES = 12;
export const RECONCILIACAO_MAX_PASSOS = 50;
export const RECONCILIACAO_TOLERANCIA = 0.01;

// Proposta montada pelo visitante: prazos ofertados e limites dos times.
export const PRAZOS_MESES = [3, 6, 12, 24] as const;
export const PRAZO_DEFAULT = 3;
export const PLANO_DEFAULT: PlanoId = "pratica";
export const MAX_TIMES = 10;
export const MAX_ASSENTOS = 10_000;

export const PRAZO_COPY: Record<number, string> = {
  3: "Sem compromisso de prazo. Preço sujeito à tabela vigente na renovação.",
  6: "Meio ano de previsibilidade. Preço sujeito à tabela vigente na renovação.",
  12: "Preço por hora travado por 12 meses, sem reajuste no meio do contrato.",
  24: "Preço travado por 24 meses e nível de serviço um degrau acima do que os assentos dariam.",
};

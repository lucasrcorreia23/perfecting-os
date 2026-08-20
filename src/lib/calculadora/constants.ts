// Constantes do racional. Fonte: Excel FIESC (motor v4.1, aba Assumptions)
// onde diverge do V5; V5 onde o Excel é omisso. Aqui vive SOMENTE preço de
// venda e premissa declarada — nenhuma constante de custo interno entra no
// código (§9, invariante 13).

import type { Caminho, Cenario, FaixaMargemId, PlanoId } from "./types";

// Planos definem consumo, não preço (§4.9).
//
// Nomes da aba "Tabela de Preços por Tier" do Template (18/08/2026). As CHAVES
// não acompanham o rename: `proposta.plano` é persistido no estado do link, e
// trocá-las descartaria a proposta de todo link já salvo — o mesmo motivo pelo
// qual `v: 2` não é bumpado.
//
// O rename também desfaz uma colisão: "Essencial" nomeava um plano E um nível
// de serviço (NIVEIS_SERVICO, abaixo), e o resumo chegava a dizer "O que está
// incluído (Essencial)" com o plano Intensivo selecionado.
export const PLANOS: Record<PlanoId, { label: string; horasMes: number }> = {
  essencial: { label: "Leve", horasMes: 2 },
  pratica: { label: "Padrão", horasMes: 4 },
  intensivo: { label: "Intensivo", horasMes: 8 },
};

// Escada progressiva sobre o total de horas da conta, marginal por faixa
// (§4.9). As faixas espelham as capacidades dos tiers de voz.
//
// A fronteira do Tier 2 é 656 h — valor da aba "Tabela de Preços por Tier" do
// Template (18/08/2026), que é a tabela que vai ao cliente. A aba Premissas do
// MESMO arquivo traz 573 em C31, e é ela que o staircase da aba Conta lê:
// dentro da planilha as duas se contradizem. Decisão do decisor em 18/08: vale
// a tabela comercial. Consequência a não esquecer — enquanto Premissas!C31 não
// virar 656, NENHUMA planilha reproduz a nossa escada, e o golden FIESC deixa
// de ser "o que o Excel devolve" para ser "o que o nosso motor devolve".
export const ESCADA_PRECO: { ateHoras: number; taxaHora: number }[] = [
  { ateHoras: 262, taxaHora: 98 },
  { ateHoras: 656, taxaHora: 82 },
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

// Tetos dos sliders de parâmetros personalizados: literais da aba Assumptions
// do Excel FIESC (fine-tuning limits), que registra tetos ACIMA do preset
// Otimista. O invariante 15 segue de pé — o teto tem fonte documental, só
// mudou a fonte. Δconv e ciclo têm tetos próprios, aplicados em
// deltasEfetivos().
export const FINE_TUNE_TICKET_MAX = 0.3;
export const FINE_TUNE_RAMPA_MAX = 0.8;

// Margem de contribuição é % LIVRE (o Excel usa fração livre; decisão de
// 17/08/2026, superando as faixas de 15/08). O atalho "não sei" usa 30%.
export const MARGEM_NAO_SEI = 30;

// Valor central das faixas usadas até 17/08/2026 — vive SÓ para o parse de
// estados salvos com `margemFaixa` (retrocompat em v: 2, sem migração).
export const MARGEM_LEGADO: Record<FaixaMargemId, number> = {
  ate15: 10,
  "15a25": 20,
  "25a35": 30,
  "35a45": 40,
  "45a60": 50,
  acima60: 60,
  nao_sei: 30,
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

// O que cada nível de serviço entrega. Vive aqui, e não no componente de
// preço, porque o resumo imprimível declara a mesma coisa — duas cópias da
// oferta em arquivos diferentes divergiriam na primeira edição.
export const NIVEL_COPY = {
  essencial: {
    nome: "Essencial",
    incluso: "Trilhas padrão · Relatório mensal · Onboarding assíncrono",
  },
  avancado: {
    nome: "Avançado",
    incluso: "Trilhas padrão · Relatórios quinzenais · Onboarding conduzido",
  },
  enterprise: {
    nome: "Enterprise",
    incluso: "Atendimento dedicado · Relatórios sob medida",
  },
} as const;

export const PRAZO_COPY: Record<number, string> = {
  3: "Sem compromisso de prazo. Preço sujeito à tabela vigente na renovação.",
  6: "Meio ano de previsibilidade. Preço sujeito à tabela vigente na renovação.",
  12: "Preço por hora travado por 12 meses, sem reajuste no meio do contrato.",
  24: "Preço travado por 24 meses e nível de serviço um degrau acima do que os assentos dariam.",
};

// ── Custo da Inação (COI) ────────────────────────────────────────────────────
// Aba "Custo da Inação" de `ROI_Perfecting_Corrigido.xlsx` (19/08/2026) e o
// bloco `Premissas!B68–E73` que nasceu com ela. Aquele arquivo é INSUMO, não
// fonte: o Template (SHA `1f17a03a…`) e o PDF seguem mandando no motor — ver a
// auditoria E-30…E-36 em `docs/calculadora-erratas-v5.md`.
//
// São benchmarks de mercado, não custo interno: o §9 e o invariante 13 seguem
// de pé. Todas [H] — as fontes citadas na planilha (MySalesCoach 2026, Ebsta
// 2024, Gartner 2024, Dixon/McKenna, Deloitte 2023, CareerTrainer.ai 2026)
// aparecem só na referência interna, pendentes de ratificação do decisor.
//
// O terceiro ramo de `Custo da Inação!C9` (cobertura de 28% como fallback) NÃO
// entra: o gating já garante os campos reais, e um fallback silencioso viraria
// número inventado na tela de quem decide.
export const COI_DELTA_ATTAINMENT = 0.29; // C15 — p.p. de quota attainment
export const COI_HAIRCUT = 0.5; // C16 e C27 — anti-otimismo do COI
export const COI_HORAS_COACHING_MIN = 2; // Premissas!C73 — h/vendedor/mês
export const COI_RAMPA_EXTENSAO_MESES = 1.4; // C26 — rampa sem coaching
export const COI_RAMPA_PRODUTIVIDADE = 0.5; // C30 — vendedor em rampa rende
export const COI_RETENCAO_COM = 0.74; // C35
export const COI_RETENCAO_SEM = 0.34; // C36
export const COI_CUSTO_SUBSTITUICAO = 1; // C40 — × salário anual carregado
export const COI_NO_DECISION = 0.5; // C46 — deals perdidos para o status quo
export const COI_FRACAO_COACHAVEL = 0.2; // C47 — é o haircut da dimensão
export const COI_SEMANAS_ESPERA = 2; // C55
export const COI_HORAS_PERDIDAS_SEMANA = 0.5; // C56

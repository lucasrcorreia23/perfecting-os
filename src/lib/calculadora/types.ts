// Tipos do motor da Calculadora ROI Clarity.
// Fonte da verdade do racional: CALCULADORA_ROI_RACIONAL_CONSOLIDADO_V5.md.
// Campo do cliente começa vazio (P4) e vazio é null — nunca 0 (P6).

export type PlanoId = "essencial" | "pratica" | "intensivo";

export type Cenario = "conservador" | "realista" | "otimista";

// Caminhos excludentes do contrafactual (§4.3). A palavra "contrafactual"
// não aparece na interface (§4.1) — na UI é "a alternativa sem a Perfecting".
export type Caminho = "nenhum" | "gestores" | "externo" | "evento";

export type FaixaMargemId =
  | "ate15"
  | "15a25"
  | "25a35"
  | "35a45"
  | "45a60"
  | "acima60"
  | "nao_sei";

// Proposta montada pelo PRÓPRIO visitante na página (cards de plano, campo
// de assentos, prazo) — o interno não pré-configura nada além da expiração.
// assentos null = default: os vendedores do time (cobertura 1, caso §14).
export type PropostaTime = {
  plano: PlanoId;
  assentos: number | null;
};

// Entradas da operação, digitadas pelo visitante (§4.1). 13 obrigatórios
// + custo condicional do caminho; passo 5 é opcional ("os dois juntos ou nenhum").
export type EntradasTime = {
  // Passo 1 — quem vende e quem treina
  numVendedores: number | null;
  numGestoresTreino: number | null;
  horasTreinoGestorMes: number | null;
  vendedoresPorGestorMes: number | null;
  horasPraticaPorRepHoje: number | null;
  // Passo 2 — como o time performa
  receitaMensal: number | null;
  ticketMedio: number | null;
  conversaoPct: number | null; // sobre oportunidades trabalhadas, em %
  margemFaixa: FaixaMargemId | null; // faixas; valor central entra no cálculo
  // Passo 3 — contratação e rampa
  salarioGestor: number | null;
  salarioVendedor: number | null; // OPCIONAL: alimenta só linhas não somadas
  rampaMeses: number | null;
  contratacoesAno: number | null;
  // Passo 4 — alternativa sem a Perfecting
  caminho: Caminho | null;
  custoExternoAno: number | null; // condicional (caminho = externo)
  custoEventoAno: number | null; // condicional (caminho = evento)
  // Passo 5 — funil (opcional)
  cicloDias: number | null;
  leadsMes: number | null;
};

export type CampoId = keyof EntradasTime;

// Deltas das quatro alavancas. Ciclo opera em DIAS como fonte da verdade
// (§4.4); o percentual é derivado dos dias, nunca o inverso.
export type Deltas = {
  ticketPct: number; // fração: 0.05 = +5%
  rampaPct: number; // fração: 0.20 = rampa 20% mais curta
  cicloDiasMenos: number; // dias a menos (inteiro ≥ 0)
  convPp: number; // pontos percentuais
};

// Cenário preset (§4.8) ou modelagem do gestor via sliders (protótipo),
// sempre clampada pelos tetos do V5 em deltasEfetivos().
export type CenarioSelecionado =
  | { modo: "preset"; cenario: Cenario }
  | { modo: "personalizado"; base: Cenario; deltas: Deltas };

export type OrigemFatorEscopo = "declarado" | "premissa";

export type ResultadoFatorEscopo = {
  valor: number;
  origem: OrigemFatorEscopo;
  declarado: number | null; // aritmética do §4.2, mesmo quando fora da faixa
  foraDaFaixa: boolean; // declarado fora de 0,25–6 (caiu na premissa)
  treinoEmGrupo: boolean; // declarado < 1: ressalva de prática coletiva
};

export type AvisoCoerencia =
  | { tipo: "receita_por_vendedor"; valor: number }
  | { tipo: "funil_fecha_mais"; oportunidadesMes: number; leadsMes: number }
  | { tipo: "fator_fora_faixa"; declarado: number }
  | { tipo: "fator_treino_grupo"; declarado: number }
  | { tipo: "funil_incompleto" };

// Linhas exibidas e não somadas (§7): selo "não somado ao ROI" + racional.
export type LinhaNaoSomada = {
  id:
    | "custo_rampa_evitado"
    | "custo_time_em_rampa"
    | "economia_headcount"
    | "ancoragem_hora_roleplay"
    | "teto_eficiencia";
  valorAno: number | null; // null = depende de campo opcional vazio (travessão)
  detalhe?: { gestores?: number; custoHoraGestor?: number; custoHoraPerfecting?: number };
};

export type ParcelasPerformance = {
  margemTicketAno: number;
  margemRampaAno: number;
  ganhoConversaoAno: number;
  ganhoCicloAno: number | null; // null = funil não preenchido
};

export type Granularidade = {
  precoPorAssento: number;
  custoDiaPorVendedor: number;
  custoHoraRoleplayPerfecting: number;
  retornoDiaPorAssento: number;
};

// Gating por tipo (§4.6): sem todas as parcelas obrigatórias não existem
// números — só a lista do que falta. Nunca resultado parcial.
export type ResultadoTime =
  | { status: "incompleto"; faltando: CampoId[] }
  | {
      status: "ok";
      fatorEscopo: ResultadoFatorEscopo;
      deltas: Deltas;
      cobertura: number;
      eficienciaAno: number;
      tetoEficienciaAno: number;
      parcelas: ParcelasPerformance;
      valorAno: number;
      G: number; // soma das parcelas de performance (gap do mês 12 no Painel A)
      precoMes: number;
      precoAno: number;
      roi: number;
      paybackMeses: number;
      checagemRealidadePct: number; // §4.7 — exclui a eficiência
      checagemAlerta: boolean;
      margemMensalAtual: number;
      avisos: AvisoCoerencia[];
      linhasNaoSomadas: LinhaNaoSomada[];
      granularidade: Granularidade;
    };

export type NivelServico = "essencial" | "avancado" | "enterprise";

export type FaixaExtrato = {
  ateHoras: number; // limite superior da faixa (Infinity na última)
  horasNaFaixa: number;
  taxaHora: number;
  subtotal: number;
};

export type PrecoConta = {
  horasMes: number;
  bruto: number;
  mensal: number; // max(bruto × (1 − desconto), TAXA_MINIMA); desconto = 0
  anual: number;
  pisoAplicado: boolean;
  extrato: FaixaExtrato[];
  taxaCombinada: number;
  nivelServico: NivelServico;
  nivelPorPrazo: boolean; // true quando o degrau veio do prazo de 24 meses
};

export type MixCenario = { timeId: string; nome: string; sel: CenarioSelecionado };

// Consolidação multi-time (§4.11): sempre ponderada, jamais média dos ROIs.
export type ResultadoConsolidado =
  | { status: "incompleto"; faltandoPorTime: { timeId: string; faltando: CampoId[] }[] }
  | {
      status: "ok";
      valorAno: number;
      precoAno: number;
      roi: number;
      paybackMeses: number;
      G: number;
      mixCenarios: MixCenario[];
      // Métricas que não se somam, recalculadas a partir dos totais.
      totalVendedores: number;
      totalAssentos: number;
      cobertura: number;
      receitaPorVendedor: number;
      conversaoMediaPct: number;
      cicloMedioDias: number | null;
    };

export type PontoMes = { mes: number; valor: number };

export type LinkStatus = "ativo" | "expirado" | "revogado" | "concluido";

// Estado persistido do visitante (jsonb `state`, versionado). O visitante é
// dono dos times: cria, nomeia, remove e escolhe a proposta de cada um.
export type EstadoTime = {
  id: string;
  nome: string;
  proposta: PropostaTime;
  entradas: EntradasTime;
  cenarioSel: CenarioSelecionado;
  trajetoria?: { editada: number[] }; // 12 deltas mensais g_m (R$)
};

// Estrutura de capacitação compartilhada entre times (§4.11): declarada uma
// vez para a conta quando os mesmos gestores atendem mais de um time. O rateio
// vive em `estrutura.ts` e roda ANTES do cálculo. Campo opcional de propósito —
// estados salvos sem ele seguem válidos em `v: 2`, sem migração.
export type EstruturaCompartilhada = {
  ativa: boolean;
  // Rateados por peso de vendedores.
  numGestoresTreino: number | null;
  custoExternoAno: number | null;
  custoEventoAno: number | null;
  // Características do gestor, não do time: passam inalteradas.
  horasTreinoGestorMes: number | null;
  vendedoresPorGestorMes: number | null;
  salarioGestor: number | null;
  // Escolha única da conta.
  caminho: Caminho | null;
};

export type EstadoCalculadora = {
  v: 2;
  prazoMeses: number; // prazo não altera preço (§4.9); escolha do visitante
  estrutura?: EstruturaCompartilhada;
  times: EstadoTime[]; // ordenado; mín. 1, máx. 10
};

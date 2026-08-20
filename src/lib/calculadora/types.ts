// Tipos do motor da Calculadora ROI Clarity.
// Fonte da verdade do racional: Perfecting_ROI_Calculator_FIESC.xlsx (motor
// v4.1) onde diverge; CALCULADORA_ROI_RACIONAL_CONSOLIDADO_V5.md onde o Excel
// é omisso (trajetória, nível de serviço, linhas não somadas).
// Campo do cliente começa vazio (P4) e vazio é null — nunca 0 (P6).

export type PlanoId = "essencial" | "pratica" | "intensivo";

export type Cenario = "conservador" | "realista" | "otimista";

// Caminhos excludentes do contrafactual (§4.3). A palavra "contrafactual"
// não aparece na interface (§4.1) — na UI é "a alternativa sem a Perfecting".
export type Caminho = "nenhum" | "gestores" | "externo" | "evento";

// Ids das faixas de margem usadas até 17/08/2026. Sobrevivem SÓ para o parse
// de estados salvos antes da margem virar % livre (valor central da faixa).
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
  margemPct: number | null; // % livre 0–100 (Excel); "não sei" é atalho p/ 30
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

// Deltas das quatro alavancas. Com ciclo ≥ 7 dias, o ciclo opera em DIAS
// inteiros como fonte da verdade e o percentual é derivado deles; abaixo de
// 7 dias o Excel usa o percentual contínuo do cenário (Engine!C53) e
// cicloDiasMenos fica 0 — a fração efetiva vive em DeltasEfetivos.cicloPct.
export type Deltas = {
  ticketPct: number; // fração: 0.05 = +5%
  rampaPct: number; // fração: 0.20 = rampa 20% mais curta
  cicloDiasMenos: number; // dias a menos (inteiro ≥ 0)
  convPp: number; // pontos percentuais
};

// Deltas resolvidos e clampados por deltasEfetivos(): o shape persistido
// (Deltas) mais a fração efetiva do ciclo — dias/ciclo quando ciclo ≥ 7,
// percentual do cenário quando 0 < ciclo < 7, zero sem funil.
export type DeltasEfetivos = Deltas & { cicloPct: number };

// Cenário preset (§4.8) ou modelagem do gestor via sliders (protótipo),
// sempre clampada pelos tetos do modelo em deltasEfetivos().
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
  | { tipo: "funil_incompleto" }
  // Excel Engine!C83: o contrato termina antes de a conta se pagar.
  | { tipo: "payback_excede_contrato"; paybackMeses: number; prazoMeses: number };

// Linhas exibidas e não somadas (§7): selo "não somado ao ROI" + racional.
export type LinhaNaoSomada = {
  id:
    | "custo_rampa_evitado"
    | "custo_time_em_rampa"
    | "economia_headcount"
    | "ancoragem_hora_roleplay"
    | "teto_eficiencia";
  valorAno: number | null; // null = depende de campo opcional vazio (travessão)
  detalhe?: {
    gestores?: number;
    gestoresHoje?: number;
    gestoresComPerfecting?: number;
    custoHoraGestor?: number;
    custoHoraPerfecting?: number;
  };
};

// Custo da Inação (COI). É uma leitura CONTRAFACTUAL — quanto vaza hoje — e
// por isso não entra em `ResultadoTime`: o invariante 1 do V5 é contrafactual
// ⊻ atribuição, e o ROI já é a atribuição. `calcCoi` põe o total CONTRA o
// `valorAno`, nunca ao lado dele.
export type DimensaoCoiId =
  | "subperformance"
  | "rampa_estendida"
  | "turnover"
  | "no_decision"
  | "fila";

export type DimensaoCoi = {
  id: DimensaoCoiId;
  // null = depende de `salarioVendedor`, que é opcional (travessão, igual a
  // LinhaNaoSomada). Nunca zero indevido.
  valorAno: number | null;
};

export type ResultadoCoi = {
  // Quanto da prática mínima CHEGA ao vendedor. Uma métrica só, em horas: a
  // planilha mede a Dimensão 1 em cabeças e o Diagnóstico em horas, e as duas
  // se contradizem nos dois goldens (E-31).
  cobertura: {
    horasEntreguesMes: number; // Motor!C25
    horasNecessariasMes: number;
    pctAtendida: number; // min(1, entregues / necessárias)
    vendedoresNaoAtendidos: number;
  };
  // Leitura DIFERENTE, e é isso que a torna útil: se o gestor sequer tem as
  // horas. No §14 ele tem (o problema é escopo); no FIESC não tem.
  capacidade: {
    horasDisponiveisMes: number; // Motor!C23
    horasNecessariasMes: number;
    gapHorasMes: number;
    pctNaoAtendida: number;
  };
  dimensoes: DimensaoCoi[]; // 5, sempre na mesma ordem
  totalAno: number;
  recuperadoAno: number; // min(valorAno, totalAno)
  residualAno: number; // max(0, totalAno − valorAno)
  pctRecuperado: number; // 0 quando totalAno === 0
  checagemPct: number; // totalAno / margem anual × 100
  checagemAlerta: boolean; // > CHECAGEM_ALERTA × 100
};

export type ParcelasPerformance = {
  margemTicketAno: number;
  margemRampaAno: number;
  ganhoConversaoAno: number;
  ganhoCicloAno: number | null; // null = funil não preenchido
};

// Teto de funil da alavanca de ciclo (Excel Engine!C64–C69): fechar mais
// rápido só vira receita se houver oportunidade ociosa para ocupar a
// capacidade liberada. `limitou` é o C69 — o teto foi quem definiu a parcela.
export type TetoFunil = {
  limitou: boolean;
  ganhoCapacidadeVendasMes: number; // C66 — capacidade liberada pelo ciclo
  tetoVendasMes: number; // C65 — o que o funil sustenta
  oportunidadesOciosasMes: number; // C64
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
      deltas: DeltasEfetivos;
      cobertura: number;
      eficienciaAno: number;
      tetoEficienciaAno: number;
      parcelas: ParcelasPerformance;
      tetoFunil: TetoFunil | null; // null = funil não preenchido
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
      paybackExcedeContrato: boolean; // Excel Account!C32
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

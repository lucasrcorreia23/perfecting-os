// Motor de cálculo por time (§4.2–§4.7 do V5). Funções puras, isomórficas:
// rodam no browser (recálculo instantâneo) e no servidor (resumo do link).
// O gating roda ANTES de qualquer aritmética — nunca resultado parcial.

import {
  CENARIOS,
  DIAS_UTEIS_ANO,
  DIAS_UTEIS_MES,
  ENCARGOS,
  FATOR_ESCOPO_MAX,
  FATOR_ESCOPO_MIN,
  FATOR_ESCOPO_PREMISSA,
  FINE_TUNE_RAMPA_MAX,
  FINE_TUNE_TICKET_MAX,
  HAIRCUT,
  JORNADA_MENSAL_H,
  PCT_EVENTO_SUBSTITUIVEL,
  PLANOS,
  PRAZO_DEFAULT,
  RECEITA_POR_VENDEDOR_MAX,
  RECEITA_POR_VENDEDOR_MIN,
  REDUCAO_CICLO_MAX,
  SUPERVISAO,
  CHECAGEM_ALERTA,
} from "./constants";
import type {
  AvisoCoerencia,
  CampoId,
  CenarioSelecionado,
  DeltasEfetivos,
  EntradasTime,
  LinhaNaoSomada,
  PlanoId,
  ResultadoFatorEscopo,
  ResultadoTime,
} from "./types";

// Proposta do time com os defaults já resolvidos (assentosEfetivos no modelo).
export type PropostaEfetiva = { plano: PlanoId; assentos: number };

function valido(valor: number | null): valor is number {
  return valor !== null && Number.isFinite(valor) && valor >= 0;
}

function positivo(valor: number | null): valor is number {
  return valido(valor) && valor > 0;
}

// Passo 5 é "os dois juntos ou nenhum" (§4.1).
export function funilPreenchido(entradas: EntradasTime): boolean {
  return positivo(entradas.cicloDias) && valido(entradas.leadsMes);
}

export function funilIncompleto(entradas: EntradasTime): boolean {
  const temCiclo = entradas.cicloDias !== null;
  const temLeads = entradas.leadsMes !== null;
  return temCiclo !== temLeads;
}

// Gating (§4.6): 13 campos obrigatórios + custo condicional do caminho.
// Campo fora do domínio (negativo, não finito, conversão fora de 0–100)
// conta como faltando: melhor travessão que número indefensável (P6).
// O Excel (Engine!C15) exige Ng, Hg, Vg e Pr estritamente > 0; aqui 0 é
// válido e o fator de escopo cai na premissa 2,1 — superset deliberado:
// time sem programa de treino existe, a planilha trava por limitação de
// formulário. Decisão registrada em 17/08/2026.
export function camposFaltando(entradas: EntradasTime): CampoId[] {
  const faltando: CampoId[] = [];
  if (!positivo(entradas.numVendedores)) faltando.push("numVendedores");
  if (!valido(entradas.numGestoresTreino)) faltando.push("numGestoresTreino");
  if (!valido(entradas.horasTreinoGestorMes)) faltando.push("horasTreinoGestorMes");
  if (!valido(entradas.vendedoresPorGestorMes)) faltando.push("vendedoresPorGestorMes");
  if (!valido(entradas.horasPraticaPorRepHoje)) faltando.push("horasPraticaPorRepHoje");
  if (!positivo(entradas.receitaMensal)) faltando.push("receitaMensal");
  if (!positivo(entradas.ticketMedio)) faltando.push("ticketMedio");
  if (!positivo(entradas.conversaoPct) || (entradas.conversaoPct ?? 0) > 100) {
    faltando.push("conversaoPct");
  }
  if (!positivo(entradas.margemPct) || (entradas.margemPct ?? 0) > 100) {
    faltando.push("margemPct");
  }
  if (!valido(entradas.salarioGestor)) faltando.push("salarioGestor");
  if (!valido(entradas.rampaMeses)) faltando.push("rampaMeses");
  if (!valido(entradas.contratacoesAno)) faltando.push("contratacoesAno");
  if (entradas.caminho === null) faltando.push("caminho");
  if (entradas.caminho === "externo" && !valido(entradas.custoExternoAno)) {
    faltando.push("custoExternoAno");
  }
  if (entradas.caminho === "evento" && !valido(entradas.custoEventoAno)) {
    faltando.push("custoEventoAno");
  }
  return faltando;
}

// Fator de escopo declarado (§4.2): aritmética da operação do cliente, com
// faixa de validade 0,25–6 e fallback à premissa 2,1 [H] exibindo a origem.
export function fatorEscopoDeclarado(entradas: EntradasTime): ResultadoFatorEscopo {
  const camposOk =
    valido(entradas.horasTreinoGestorMes) &&
    valido(entradas.numGestoresTreino) &&
    valido(entradas.vendedoresPorGestorMes) &&
    valido(entradas.horasPraticaPorRepHoje);
  let declarado: number | null = null;
  if (camposOk) {
    const horasGestorMes = entradas.horasTreinoGestorMes! * entradas.numGestoresTreino!;
    const repsCobertosMes = entradas.vendedoresPorGestorMes! * entradas.numGestoresTreino!;
    const horasPraticaEntreguesMes = repsCobertosMes * entradas.horasPraticaPorRepHoje!;
    declarado =
      horasPraticaEntreguesMes > 0 ? horasGestorMes / horasPraticaEntreguesMes : null;
  }
  const dentroDaFaixa =
    declarado !== null && declarado >= FATOR_ESCOPO_MIN && declarado <= FATOR_ESCOPO_MAX;
  if (!dentroDaFaixa) {
    return {
      valor: FATOR_ESCOPO_PREMISSA,
      origem: "premissa",
      declarado,
      foraDaFaixa: declarado !== null,
      treinoEmGrupo: false,
    };
  }
  return {
    valor: declarado!,
    origem: "declarado",
    declarado,
    foraDaFaixa: false,
    // < 1 indica treino em grupo: a comparação por hora não captura a
    // diferença entre prática coletiva e individual (§4.2).
    treinoEmGrupo: declarado! < 1,
  };
}

// Teto da alavanca de conversão (§4.4), em pontos percentuais.
export function deltaConvMax(conversaoPct: number): number {
  return Math.min(5, conversaoPct * 0.4, 100 - conversaoPct);
}

function clamp(valor: number, min: number, max: number): number {
  return Math.min(Math.max(valor, min), max);
}

// Ciclo curto demais para operar em dias inteiros (Excel Engine!C53): abaixo
// de 7 dias a mecânica volta ao percentual contínuo do cenário.
export const CICLO_DIAS_MINIMO = 7;

// Único caminho pelo qual deltas entram no cálculo: resolve o preset OU os
// sliders de parâmetros personalizados e clampa tudo pelos tetos do modelo.
// Mecânica do ciclo (Excel Engine!C52–C56): com ciclo ≥ 7 dias, DIAS inteiros
// são a fonte da verdade — preset vira max(1, round(ciclo×Δ%)), teto é
// round(ciclo×30%) (half-up, como ROUND do Excel) e o percentual efetivo é
// derivado dos dias. Com 0 < ciclo < 7, o delta é o percentual contínuo do
// cenário, clampado em 30%; o fine-tune em dias não se aplica (o percentual
// do Excel para esse ramo não é exposto na UI — decisão de 17/08/2026).
export function deltasEfetivos(
  sel: CenarioSelecionado,
  entradas: EntradasTime,
): DeltasEfetivos {
  const preset = CENARIOS[sel.modo === "preset" ? sel.cenario : sel.base];
  const cicloDias = positivo(entradas.cicloDias) ? entradas.cicloDias : null;
  const brutos =
    sel.modo === "preset"
      ? { ticketPct: preset.ticketPct, rampaPct: preset.rampaPct, convPp: preset.convPp }
      : sel.deltas;

  let cicloDiasMenos = 0;
  let cicloPct = 0;
  if (cicloDias !== null && cicloDias >= CICLO_DIAS_MINIMO) {
    const cicloDiasMax = Math.round(cicloDias * REDUCAO_CICLO_MAX);
    cicloDiasMenos =
      sel.modo === "preset"
        ? clamp(Math.max(1, Math.round(cicloDias * preset.cicloPct)), 0, cicloDiasMax)
        : clamp(Math.round(sel.deltas.cicloDiasMenos), 0, cicloDiasMax);
    cicloPct = cicloDiasMenos / cicloDias;
  } else if (cicloDias !== null) {
    cicloPct = clamp(preset.cicloPct, 0, REDUCAO_CICLO_MAX);
  }

  const convMax = positivo(entradas.conversaoPct) ? deltaConvMax(entradas.conversaoPct) : 0;
  return {
    ticketPct: clamp(brutos.ticketPct, 0, FINE_TUNE_TICKET_MAX),
    rampaPct: clamp(brutos.rampaPct, 0, FINE_TUNE_RAMPA_MAX),
    cicloDiasMenos,
    cicloPct,
    convPp: clamp(brutos.convPp, 0, convMax),
  };
}

// Cobertura (§4.5): aplicada às quatro parcelas de performance e NUNCA à
// eficiência — que já é limitada pelo teto dependente dos assentos. Sem esse
// fator, comprar menos assentos aumentava o ROI (teste de monotonicidade).
export function cobertura(assentos: number, numVendedores: number): number {
  return Math.min(1, assentos / numVendedores);
}

export function resolverMargem(entradas: EntradasTime): number | null {
  if (!positivo(entradas.margemPct) || entradas.margemPct > 100) return null;
  return entradas.margemPct / 100;
}

export function calcResultadoTime(
  entradas: EntradasTime,
  proposta: PropostaEfetiva,
  precoMes: number,
  sel: CenarioSelecionado,
  prazoMeses: number = PRAZO_DEFAULT,
): ResultadoTime {
  const faltando = camposFaltando(entradas);
  if (faltando.length > 0) return { status: "incompleto", faltando };

  const margem = resolverMargem(entradas)!;
  const fatorEscopo = fatorEscopoDeclarado(entradas);
  const custoHoraGestor = (entradas.salarioGestor! * ENCARGOS) / JORNADA_MENSAL_H;
  const horasPraticaMes = proposta.assentos * PLANOS[proposta.plano].horasMes;

  // Eficiência (§4.3): o custo do caminho declarado, limitado pelo teto.
  const tetoEficienciaAno =
    horasPraticaMes * fatorEscopo.valor * custoHoraGestor * (1 - SUPERVISAO) * 12;
  let caminhoAno = 0;
  if (entradas.caminho === "gestores") {
    caminhoAno =
      entradas.horasTreinoGestorMes! *
      entradas.numGestoresTreino! *
      custoHoraGestor *
      (1 - SUPERVISAO) *
      12;
  } else if (entradas.caminho === "externo") {
    caminhoAno = entradas.custoExternoAno! * (1 - SUPERVISAO);
  } else if (entradas.caminho === "evento") {
    caminhoAno = entradas.custoEventoAno! * PCT_EVENTO_SUBSTITUIVEL;
  }
  const eficienciaAno = Math.min(caminhoAno, tetoEficienciaAno);

  // Performance (§4.4): quatro alavancas, haircuts e cobertura.
  const fatorCobertura = cobertura(proposta.assentos, entradas.numVendedores!);
  const deltas = deltasEfetivos(sel, entradas);
  const margemTicketAno =
    entradas.receitaMensal! * deltas.ticketPct * 12 * margem * fatorCobertura;
  const receitaRepPleno = entradas.receitaMensal! / entradas.numVendedores!;
  const margemRampaAno =
    entradas.rampaMeses! *
    deltas.rampaPct *
    receitaRepPleno *
    entradas.contratacoesAno! *
    margem *
    HAIRCUT *
    fatorCobertura;
  const vendasMes = entradas.receitaMensal! / entradas.ticketMedio!;
  const conversao = entradas.conversaoPct! / 100;
  const oportunidadesMes = vendasMes / conversao;
  const ganhoConversaoAno =
    oportunidadesMes *
    (deltas.convPp / 100) *
    entradas.ticketMedio! *
    margem *
    12 *
    HAIRCUT *
    fatorCobertura;

  // Ciclo (§4.4): só com o funil preenchido; teto de funil — ciclo menor só
  // vira receita se houver oportunidade ociosa. Interação descartada.
  let ganhoCicloAno: number | null = null;
  if (funilPreenchido(entradas)) {
    const dCiclo = deltas.cicloPct;
    const ganhoCapacidade = vendasMes * (1 / (1 - dCiclo) - 1);
    const tetoFunil = Math.max(0, entradas.leadsMes! - oportunidadesMes) * conversao;
    ganhoCicloAno =
      Math.min(ganhoCapacidade, tetoFunil) *
      entradas.ticketMedio! *
      margem *
      12 *
      HAIRCUT *
      fatorCobertura;
  }

  const G = margemTicketAno + margemRampaAno + ganhoConversaoAno + (ganhoCicloAno ?? 0);
  const valorAno = eficienciaAno + G;
  const precoAno = precoMes * 12;
  const roi = valorAno / precoAno;
  const paybackMeses = (precoAno / valorAno) * 12;

  // Checagem de realidade (§4.7): só performance contra a margem atual —
  // exclui a eficiência deliberadamente.
  const margemMensalAtual = entradas.receitaMensal! * margem;
  const checagemRealidadePct = (G / (margemMensalAtual * 12)) * 100;

  const avisos: AvisoCoerencia[] = [];
  const receitaPorVendedor = entradas.receitaMensal! / entradas.numVendedores!;
  if (
    receitaPorVendedor < RECEITA_POR_VENDEDOR_MIN ||
    receitaPorVendedor > RECEITA_POR_VENDEDOR_MAX
  ) {
    avisos.push({ tipo: "receita_por_vendedor", valor: receitaPorVendedor });
  }
  if (funilPreenchido(entradas) && oportunidadesMes > entradas.leadsMes!) {
    avisos.push({
      tipo: "funil_fecha_mais",
      oportunidadesMes,
      leadsMes: entradas.leadsMes!,
    });
  }
  if (fatorEscopo.foraDaFaixa) {
    avisos.push({ tipo: "fator_fora_faixa", declarado: fatorEscopo.declarado! });
  }
  if (fatorEscopo.treinoEmGrupo) {
    avisos.push({ tipo: "fator_treino_grupo", declarado: fatorEscopo.declarado! });
  }
  if (funilIncompleto(entradas)) {
    avisos.push({ tipo: "funil_incompleto" });
  }
  if (paybackMeses > prazoMeses) {
    avisos.push({ tipo: "payback_excede_contrato", paybackMeses, prazoMeses });
  }

  // Linhas exibidas e não somadas (§7), com selo e racional na UI. O salário
  // do vendedor em rampa não é economizado — a folha renderia antes, o que já
  // está contabilizado como receita antecipada.
  const temSalarioVendedor = valido(entradas.salarioVendedor);
  // Excel Engine!C88–C91: gestores para cobrir o time hoje vs com a
  // supervisão residual de 25% — a diferença é o headcount evitado.
  const gestoresHoje =
    entradas.vendedoresPorGestorMes! > 0
      ? entradas.numVendedores! / entradas.vendedoresPorGestorMes!
      : null;
  const gestoresComPerfecting = gestoresHoje === null ? null : gestoresHoje * SUPERVISAO;
  const gestoresEvitados =
    gestoresHoje === null ? null : Math.max(0, gestoresHoje - gestoresComPerfecting!);
  const linhasNaoSomadas: LinhaNaoSomada[] = [
    {
      id: "custo_rampa_evitado",
      valorAno: temSalarioVendedor
        ? entradas.rampaMeses! *
          deltas.rampaPct *
          entradas.salarioVendedor! *
          ENCARGOS *
          entradas.contratacoesAno! *
          HAIRCUT
        : null,
    },
    {
      id: "custo_time_em_rampa",
      valorAno: temSalarioVendedor
        ? entradas.salarioVendedor! *
          ENCARGOS *
          entradas.rampaMeses! *
          entradas.contratacoesAno!
        : null,
    },
    {
      id: "economia_headcount",
      valorAno:
        gestoresEvitados === null
          ? null
          : gestoresEvitados * entradas.salarioGestor! * ENCARGOS * 12,
      detalhe:
        gestoresEvitados === null
          ? undefined
          : {
              gestores: gestoresEvitados,
              gestoresHoje: gestoresHoje!,
              gestoresComPerfecting: gestoresComPerfecting!,
            },
    },
    {
      id: "ancoragem_hora_roleplay",
      valorAno: null,
      detalhe: {
        custoHoraGestor: custoHoraGestor * fatorEscopo.valor,
        custoHoraPerfecting: precoMes / horasPraticaMes,
      },
    },
    { id: "teto_eficiencia", valorAno: tetoEficienciaAno },
  ];

  // Granularidade (§4.10). Invariante 12: retorno_dia ÷ custo_dia === roi —
  // vale por construção porque DIAS_UTEIS_ANO = DIAS_UTEIS_MES × 12.
  const precoPorAssento = precoMes / proposta.assentos;
  const granularidade = {
    precoPorAssento,
    custoDiaPorVendedor: precoPorAssento / DIAS_UTEIS_MES,
    custoHoraRoleplayPerfecting: precoMes / horasPraticaMes,
    retornoDiaPorAssento: valorAno / proposta.assentos / DIAS_UTEIS_ANO,
  };

  return {
    status: "ok",
    fatorEscopo,
    deltas,
    cobertura: fatorCobertura,
    eficienciaAno,
    tetoEficienciaAno,
    parcelas: { margemTicketAno, margemRampaAno, ganhoConversaoAno, ganhoCicloAno },
    valorAno,
    G,
    precoMes,
    precoAno,
    roi,
    paybackMeses,
    checagemRealidadePct,
    checagemAlerta: checagemRealidadePct > CHECAGEM_ALERTA * 100,
    margemMensalAtual,
    avisos,
    linhasNaoSomadas,
    granularidade,
  };
}

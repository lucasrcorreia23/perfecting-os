// Premissas injetáveis no motor, por LINK — não no estado do visitante.
//
// O racional do produto continua em `constants.ts` (fonte: Template em
// `docs/referencia/`). Este módulo é o override OPCIONAL de um único link:
// um interno logado sobe um .xlsx ou edita os números na aba Racional, e
// só aquela calculadora passa a usar os valores novos. `null` no banco é
// o padrão global. Fórmulas de Motor/Conta NÃO entram aqui — o motor
// continua sendo TypeScript.

import {
  CENARIOS,
  CHECAGEM_ALERTA,
  COI_CUSTO_SUBSTITUICAO,
  COI_DELTA_ATTAINMENT,
  COI_FRACAO_COACHAVEL,
  COI_HAIRCUT,
  COI_HORAS_COACHING_MIN,
  COI_HORAS_PERDIDAS_SEMANA,
  COI_NO_DECISION,
  COI_RAMPA_EXTENSAO_MESES,
  COI_RAMPA_PRODUTIVIDADE,
  COI_RETENCAO_COM,
  COI_RETENCAO_SEM,
  COI_SEMANAS_ESPERA,
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
  RECEITA_POR_VENDEDOR_MAX,
  RECEITA_POR_VENDEDOR_MIN,
  REDUCAO_CICLO_MAX,
  SUPERVISAO,
  TABELA_TIERS,
  TAXA_MINIMA,
} from "./constants";
import type { Cenario, PlanoId } from "./types";

export type FaixaTierPremissa = {
  tier: number;
  /** `Infinity` no último tier — no JSON vira `null`. */
  ateHoras: number;
  taxaHora: number;
};

export type DeltasCenarioPremissa = {
  ticketPct: number;
  rampaPct: number;
  cicloPct: number;
  convPp: number;
};

export type PremissasCoi = {
  deltaAttainment: number;
  haircut: number;
  horasCoachingMin: number;
  rampaExtensaoMeses: number;
  rampaProdutividade: number;
  retencaoCom: number;
  retencaoSem: number;
  custoSubstituicao: number;
  noDecision: number;
  fracaoCoachavel: number;
  semanasEspera: number;
  horasPerdidasSemana: number;
};

export type PremissasRacional = {
  encargos: number;
  jornadaMensalH: number;
  supervisao: number;
  haircut: number;
  pctEventoSubstituivel: number;
  fatorEscopoPremissa: number;
  fatorEscopoMin: number;
  fatorEscopoMax: number;
  reducaoCicloMax: number;
  checagemAlerta: number;
  diasUteisMes: number;
  diasUteisAno: number;
  receitaPorVendedorMin: number;
  receitaPorVendedorMax: number;
  taxaMinima: number;
  tabelaTiers: FaixaTierPremissa[];
  horasPlanos: Record<PlanoId, number>;
  cenarios: Record<Cenario, DeltasCenarioPremissa>;
  fineTuneTicketMax: number;
  fineTuneRampaMax: number;
  coi: PremissasCoi;
};

export const PREMISSAS_PADRAO: PremissasRacional = {
  encargos: ENCARGOS,
  jornadaMensalH: JORNADA_MENSAL_H,
  supervisao: SUPERVISAO,
  haircut: HAIRCUT,
  pctEventoSubstituivel: PCT_EVENTO_SUBSTITUIVEL,
  fatorEscopoPremissa: FATOR_ESCOPO_PREMISSA,
  fatorEscopoMin: FATOR_ESCOPO_MIN,
  fatorEscopoMax: FATOR_ESCOPO_MAX,
  reducaoCicloMax: REDUCAO_CICLO_MAX,
  checagemAlerta: CHECAGEM_ALERTA,
  diasUteisMes: 22,
  diasUteisAno: 264,
  receitaPorVendedorMin: RECEITA_POR_VENDEDOR_MIN,
  receitaPorVendedorMax: RECEITA_POR_VENDEDOR_MAX,
  taxaMinima: TAXA_MINIMA,
  tabelaTiers: TABELA_TIERS.map((faixa) => ({ ...faixa })),
  horasPlanos: {
    essencial: PLANOS.essencial.horasMes,
    pratica: PLANOS.pratica.horasMes,
    intensivo: PLANOS.intensivo.horasMes,
  },
  cenarios: {
    conservador: deltasDe(CENARIOS.conservador),
    realista: deltasDe(CENARIOS.realista),
    otimista: deltasDe(CENARIOS.otimista),
  },
  fineTuneTicketMax: FINE_TUNE_TICKET_MAX,
  fineTuneRampaMax: FINE_TUNE_RAMPA_MAX,
  coi: {
    deltaAttainment: COI_DELTA_ATTAINMENT,
    haircut: COI_HAIRCUT,
    horasCoachingMin: COI_HORAS_COACHING_MIN,
    rampaExtensaoMeses: COI_RAMPA_EXTENSAO_MESES,
    rampaProdutividade: COI_RAMPA_PRODUTIVIDADE,
    retencaoCom: COI_RETENCAO_COM,
    retencaoSem: COI_RETENCAO_SEM,
    custoSubstituicao: COI_CUSTO_SUBSTITUICAO,
    noDecision: COI_NO_DECISION,
    fracaoCoachavel: COI_FRACAO_COACHAVEL,
    semanasEspera: COI_SEMANAS_ESPERA,
    horasPerdidasSemana: COI_HORAS_PERDIDAS_SEMANA,
  },
};

function deltasDe(cenario: {
  ticketPct: number;
  rampaPct: number;
  cicloPct: number;
  convPp: number;
}): DeltasCenarioPremissa {
  return {
    ticketPct: cenario.ticketPct,
    rampaPct: cenario.rampaPct,
    cicloPct: cenario.cicloPct,
    convPp: cenario.convPp,
  };
}

function ehNumero(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

function positivo(valor: unknown): number | null {
  return ehNumero(valor) && valor > 0 ? valor : null;
}

function naoNegativo(valor: unknown): number | null {
  return ehNumero(valor) && valor >= 0 ? valor : null;
}

function fracao(valor: unknown): number | null {
  const n = naoNegativo(valor);
  return n !== null && n <= 1 ? n : null;
}

function ateHorasDe(valor: unknown): number | null {
  if (valor === null || valor === "Infinity") return Infinity;
  if (typeof valor === "number" && valor === Infinity) return Infinity;
  return positivo(valor);
}

function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

/**
 * Junta um parcial (JSON do banco ou do parser) com o padrão. Campo inválido
 * ou ausente cai no padrão — nunca NaN, nunca negativo onde o motor assume
 * positivo. `null`/`undefined` devolve o padrão inteiro.
 */
export function fundirPremissas(parcial: unknown): PremissasRacional {
  const base = clonar(PREMISSAS_PADRAO);
  if (parcial === null || parcial === undefined) return base;
  if (typeof parcial !== "object" || Array.isArray(parcial)) return base;
  const fonte = parcial as Record<string, unknown>;

  const n = (
    chave: keyof Omit<PremissasRacional, "tabelaTiers" | "horasPlanos" | "cenarios" | "coi">,
    ler: (v: unknown) => number | null,
  ) => {
    const lido = ler(fonte[chave]);
    if (lido !== null) base[chave] = lido;
  };

  n("encargos", positivo);
  n("jornadaMensalH", positivo);
  n("supervisao", fracao);
  n("haircut", fracao);
  n("pctEventoSubstituivel", fracao);
  n("fatorEscopoPremissa", positivo);
  n("fatorEscopoMin", positivo);
  n("fatorEscopoMax", positivo);
  n("reducaoCicloMax", fracao);
  n("checagemAlerta", fracao);
  n("diasUteisMes", positivo);
  n("diasUteisAno", positivo);
  n("receitaPorVendedorMin", positivo);
  n("receitaPorVendedorMax", positivo);
  n("taxaMinima", naoNegativo);
  n("fineTuneTicketMax", fracao);
  n("fineTuneRampaMax", fracao);

  if (base.fatorEscopoMin > base.fatorEscopoMax) {
    base.fatorEscopoMin = PREMISSAS_PADRAO.fatorEscopoMin;
    base.fatorEscopoMax = PREMISSAS_PADRAO.fatorEscopoMax;
  }
  if (base.receitaPorVendedorMin > base.receitaPorVendedorMax) {
    base.receitaPorVendedorMin = PREMISSAS_PADRAO.receitaPorVendedorMin;
    base.receitaPorVendedorMax = PREMISSAS_PADRAO.receitaPorVendedorMax;
  }

  const tiers = lerTiers(fonte.tabelaTiers);
  if (tiers) base.tabelaTiers = tiers;

  const horas = fonte.horasPlanos;
  if (horas && typeof horas === "object" && !Array.isArray(horas)) {
    const h = horas as Record<string, unknown>;
    for (const plano of ["essencial", "pratica", "intensivo"] as const) {
      const valor = positivo(h[plano]);
      if (valor !== null) base.horasPlanos[plano] = valor;
    }
  }

  const cenarios = fonte.cenarios;
  if (cenarios && typeof cenarios === "object" && !Array.isArray(cenarios)) {
    const c = cenarios as Record<string, unknown>;
    for (const id of ["conservador", "realista", "otimista"] as const) {
      const bloco = c[id];
      if (!bloco || typeof bloco !== "object" || Array.isArray(bloco)) continue;
      const d = bloco as Record<string, unknown>;
      const ticketPct = fracao(d.ticketPct);
      const rampaPct = fracao(d.rampaPct);
      const cicloPct = fracao(d.cicloPct);
      const convPp = naoNegativo(d.convPp);
      if (ticketPct !== null) base.cenarios[id].ticketPct = ticketPct;
      if (rampaPct !== null) base.cenarios[id].rampaPct = rampaPct;
      if (cicloPct !== null) base.cenarios[id].cicloPct = cicloPct;
      if (convPp !== null) base.cenarios[id].convPp = convPp;
    }
  }

  const coi = fonte.coi;
  if (coi && typeof coi === "object" && !Array.isArray(coi)) {
    const d = coi as Record<string, unknown>;
    const campo = (
      chave: keyof PremissasCoi,
      ler: (v: unknown) => number | null,
    ) => {
      const valor = ler(d[chave]);
      if (valor !== null) base.coi[chave] = valor;
    };
    campo("deltaAttainment", fracao);
    campo("haircut", fracao);
    campo("horasCoachingMin", positivo);
    campo("rampaExtensaoMeses", naoNegativo);
    campo("rampaProdutividade", fracao);
    campo("retencaoCom", fracao);
    campo("retencaoSem", fracao);
    campo("custoSubstituicao", naoNegativo);
    campo("noDecision", fracao);
    campo("fracaoCoachavel", fracao);
    campo("semanasEspera", naoNegativo);
    campo("horasPerdidasSemana", naoNegativo);
  }

  return base;
}

function lerTiers(bruto: unknown): FaixaTierPremissa[] | null {
  if (!Array.isArray(bruto) || bruto.length < 2) return null;
  const faixas: FaixaTierPremissa[] = [];
  for (let i = 0; i < bruto.length; i += 1) {
    const item = bruto[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    const ultimo = i === bruto.length - 1;
    const ate = ultimo ? (ateHorasDe(row.ateHoras) ?? Infinity) : positivo(row.ateHoras);
    const taxa = positivo(row.taxaHora);
    const tier = positivo(row.tier) ?? i + 1;
    if (ate === null || taxa === null) return null;
    faixas.push({ tier, ateHoras: ate, taxaHora: taxa });
  }
  for (let i = 1; i < faixas.length - 1; i += 1) {
    if (!(faixas[i].ateHoras > faixas[i - 1].ateHoras)) return null;
  }
  return faixas;
}

/** JSON-safe: `Infinity` vira `null` no último tier. */
export function serializarPremissas(p: PremissasRacional): Record<string, unknown> {
  return {
    ...p,
    tabelaTiers: p.tabelaTiers.map((faixa) => ({
      ...faixa,
      ateHoras: Number.isFinite(faixa.ateHoras) ? faixa.ateHoras : null,
    })),
  };
}

export function hidratarPremissas(json: unknown): PremissasRacional {
  return fundirPremissas(json);
}

export function premissasSaoPadrao(p: PremissasRacional): boolean {
  return JSON.stringify(serializarPremissas(p)) === JSON.stringify(serializarPremissas(PREMISSAS_PADRAO));
}

export function horasDoPlano(
  plano: PlanoId,
  p: PremissasRacional = PREMISSAS_PADRAO,
): number {
  return p.horasPlanos[plano];
}

export function sessaoPodeEditarPremissas(role: string | null | undefined): boolean {
  return role === "interno";
}

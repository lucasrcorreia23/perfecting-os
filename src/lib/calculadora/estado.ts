// Estado persistido do visitante (jsonb `state`, versionado `{ v: 2 }`).
// O visitante é dono dos times (cria, nomeia, remove) e da proposta de cada
// um (plano/assentos) + prazo da conta. O endpoint público aceita qualquer
// portador do token, então TUDO que chega passa por sanitização: números
// finitos clampados, enums validados, nomes de time (única string livre)
// limpos de caracteres de controle e clampados.

import { camposFaltando, funilPreenchido } from "./calc";
import { aplicarEstrutura } from "./estrutura";
import {
  CAMINHOS,
  CENARIO_DEFAULT,
  CENARIOS,
  MARGEM_LEGADO,
  MAX_ASSENTOS,
  MAX_TIMES,
  PLANO_DEFAULT,
  PLANOS,
  PRAZO_DEFAULT,
  PRAZOS_MESES,
} from "./constants";
import type {
  CampoId,
  Caminho,
  Cenario,
  CenarioSelecionado,
  EntradasTime,
  EstadoCalculadora,
  EstadoTime,
  EstruturaCompartilhada,
  FaixaMargemId,
  PassoId,
  PlanoId,
  PropostaTime,
} from "./types";

const VALOR_MAX = 1e12;
const TRAJETORIA_VALOR_MAX = 1e13;
export const NOME_MAX = 60;
const ID_MAX = 40;

// As oito perguntas do quiz (etapa 02). Uma pergunta por tela, no máximo dois
// campos numéricos cada — o passo 1 pedia cinco números de uma vez, e quem lê
// esta tela (§8.12b: finanças, 45+, abre o link uma vez) desistia antes de
// responder o primeiro.
//
// A pergunta 8 não tem `campos`: ela edita a PROPOSTA (plano, prazo, cenário),
// que vive fora de `EntradasTime`. Array vazio ⇒ `passoCompleto` devolve true
// por `every`, que é o certo — não há o que faltar ali. Assentos ficaram de
// fora dela (20/08/2026): vazio já vale "o time inteiro", e quem precisa de um
// grupo menor ajusta na etapa avançada.
export const PASSOS: {
  id: PassoId;
  titulo: string;
  campos: CampoId[];
  opcional?: boolean;
}[] = [
  {
    id: 1,
    titulo: "Estrutura do time",
    campos: ["numVendedores", "numGestoresTreino", "horasTreinoGestorMes"],
  },
  {
    id: 2,
    titulo: "Como a prática acontece",
    campos: ["vendedoresPorGestorMes", "horasPraticaPorRepHoje"],
  },
  {
    id: 3,
    titulo: "Custo do treinamento atual",
    campos: ["salarioGestor", "salarioVendedor", "caminho", "custoExternoAno", "custoEventoAno"],
  },
  {
    id: 4,
    titulo: "Receita da equipe",
    campos: ["receitaMensal", "ticketMedio"],
  },
  {
    id: 5,
    titulo: "Conversão e margem",
    campos: ["conversaoPct", "margemPct"],
  },
  {
    id: 6,
    titulo: "Rampa",
    campos: ["rampaMeses", "contratacoesAno"],
  },
  {
    id: 7,
    titulo: "Pipeline e ciclo",
    campos: ["leadsMes", "cicloDias"],
    opcional: true,
  },
  {
    id: 8,
    titulo: "Plano, cenário e contrato",
    campos: [],
  },
];

/** A pergunta opcional, derivada — nunca um número literal espalhado. */
export const PASSO_OPCIONAL: PassoId = PASSOS.find((passo) => passo.opcional)!.id;

export const ULTIMO_PASSO: PassoId = PASSOS[PASSOS.length - 1].id;

export function entradasVazias(): EntradasTime {
  return {
    numVendedores: null,
    numGestoresTreino: null,
    horasTreinoGestorMes: null,
    vendedoresPorGestorMes: null,
    horasPraticaPorRepHoje: null,
    receitaMensal: null,
    ticketMedio: null,
    conversaoPct: null,
    margemPct: null,
    salarioGestor: null,
    salarioVendedor: null,
    rampaMeses: null,
    contratacoesAno: null,
    caminho: null,
    custoExternoAno: null,
    custoEventoAno: null,
    cicloDias: null,
    leadsMes: null,
  };
}

export function cenarioDefault(): CenarioSelecionado {
  return { modo: "preset", cenario: CENARIO_DEFAULT };
}

export function propostaDefault(): PropostaTime {
  // assentos null = "os vendedores do time" (resolvido em assentosEfetivos).
  return { plano: PLANO_DEFAULT, assentos: null };
}

function novoId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `t${Date.now()}-${Math.floor(performance.now() * 1000)}`;
}

export function timeVazio(nome: string): EstadoTime {
  return {
    id: novoId(),
    nome,
    proposta: propostaDefault(),
    entradas: entradasVazias(),
    cenarioSel: cenarioDefault(),
  };
}

export function estadoInicial(): EstadoCalculadora {
  return { v: 2, prazoMeses: PRAZO_DEFAULT, times: [timeVazio("Time 1")] };
}

function sanitizarNumero(valor: unknown, max = VALOR_MAX): number | null {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return null;
  if (valor < 0) return null;
  return Math.min(valor, max);
}

function sanitizarEnum<T extends string>(valor: unknown, validos: readonly T[]): T | null {
  return typeof valor === "string" && (validos as readonly string[]).includes(valor)
    ? (valor as T)
    : null;
}

// Única string livre do visitante no estado. React escapa no render, mas o
// nome também vai a payloads de evento e à UI interna — limpar mesmo assim.
export function sanitizarNomeTime(bruto: unknown, fallback: string): string {
  if (typeof bruto !== "string") return fallback;
  const limpo = bruto.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, NOME_MAX);
  return limpo === "" ? fallback : limpo;
}

const FAIXAS_LEGADO_IDS = Object.keys(MARGEM_LEGADO) as FaixaMargemId[];
const CAMINHOS_IDS = Object.keys(CAMINHOS) as Caminho[];
const CENARIOS_IDS = Object.keys(CENARIOS) as Cenario[];
const PLANOS_IDS = Object.keys(PLANOS) as PlanoId[];

function sanitizarEntradas(bruto: unknown): EntradasTime {
  const entradas = entradasVazias();
  if (typeof bruto !== "object" || bruto === null) return entradas;
  const fonte = bruto as Record<string, unknown>;
  for (const campo of Object.keys(entradas) as CampoId[]) {
    if (campo === "caminho") {
      entradas.caminho = sanitizarEnum(fonte[campo], CAMINHOS_IDS);
    } else {
      entradas[campo] = sanitizarNumero(fonte[campo]);
    }
  }
  // Retrocompat (margem virou % livre em 17/08/2026): estado salvo com a
  // faixa antiga entra pelo valor central — v: 2 segue, sem migração.
  // `margemPct` presente vence o legado.
  if (entradas.margemPct === null) {
    const legado = sanitizarEnum(fonte.margemFaixa, FAIXAS_LEGADO_IDS);
    if (legado !== null) entradas.margemPct = MARGEM_LEGADO[legado];
  }
  return entradas;
}

function sanitizarCenario(bruto: unknown): CenarioSelecionado {
  if (typeof bruto !== "object" || bruto === null) return cenarioDefault();
  const fonte = bruto as Record<string, unknown>;
  if (fonte.modo === "personalizado") {
    const base = sanitizarEnum(fonte.base, CENARIOS_IDS) ?? CENARIO_DEFAULT;
    const deltasFonte =
      typeof fonte.deltas === "object" && fonte.deltas !== null
        ? (fonte.deltas as Record<string, unknown>)
        : {};
    return {
      modo: "personalizado",
      base,
      // Faixas duras aqui; os tetos finos do V5 aplicam em deltasEfetivos().
      deltas: {
        ticketPct: sanitizarNumero(deltasFonte.ticketPct, 1) ?? 0,
        rampaPct: sanitizarNumero(deltasFonte.rampaPct, 1) ?? 0,
        cicloDiasMenos: Math.round(sanitizarNumero(deltasFonte.cicloDiasMenos, 3650) ?? 0),
        convPp: sanitizarNumero(deltasFonte.convPp, 100) ?? 0,
      },
    };
  }
  const cenario = sanitizarEnum(fonte.cenario, CENARIOS_IDS);
  return cenario ? { modo: "preset", cenario } : cenarioDefault();
}

function sanitizarTrajetoria(bruto: unknown): { editada: number[] } | undefined {
  if (typeof bruto !== "object" || bruto === null) return undefined;
  const editada = (bruto as Record<string, unknown>).editada;
  if (!Array.isArray(editada)) return undefined;
  const pontos = editada.slice(0, 12).map((valor) => {
    if (typeof valor !== "number" || !Number.isFinite(valor)) return 0;
    return Math.max(Math.min(valor, TRAJETORIA_VALOR_MAX), -TRAJETORIA_VALOR_MAX);
  });
  while (pontos.length < 12) pontos.push(0);
  return { editada: pontos };
}

function sanitizarProposta(bruto: unknown): PropostaTime {
  if (typeof bruto !== "object" || bruto === null) return propostaDefault();
  const fonte = bruto as Record<string, unknown>;
  const plano = sanitizarEnum(fonte.plano, PLANOS_IDS) ?? PLANO_DEFAULT;
  const assentosBruto = sanitizarNumero(fonte.assentos, MAX_ASSENTOS);
  const assentos =
    assentosBruto !== null && assentosBruto >= 1 ? Math.trunc(assentosBruto) : null;
  return { plano, assentos };
}

// Estrutura compartilhada (§4.11): mesmos helpers do resto do estado. Ausente
// ou lixo vira `undefined` — o estado segue válido em `v: 2`, sem migração.
function sanitizarEstrutura(bruto: unknown): EstruturaCompartilhada | undefined {
  if (typeof bruto !== "object" || bruto === null) return undefined;
  const fonte = bruto as Record<string, unknown>;
  return {
    ativa: fonte.ativa === true,
    numGestoresTreino: sanitizarNumero(fonte.numGestoresTreino),
    custoExternoAno: sanitizarNumero(fonte.custoExternoAno),
    custoEventoAno: sanitizarNumero(fonte.custoEventoAno),
    horasTreinoGestorMes: sanitizarNumero(fonte.horasTreinoGestorMes),
    vendedoresPorGestorMes: sanitizarNumero(fonte.vendedoresPorGestorMes),
    salarioGestor: sanitizarNumero(fonte.salarioGestor),
    caminho: sanitizarEnum(fonte.caminho, CAMINHOS_IDS),
  };
}

function sanitizarId(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null;
  const limpo = bruto.replace(/[^A-Za-z0-9_-]/g, "").slice(0, ID_MAX);
  return limpo === "" ? null : limpo;
}

// Parse tolerante e sanitizador — usado no browser (hidratar) e no servidor
// (validar o autosave). Estados vazios/lixo/v1 viram o estado inicial.
export function parseEstado(json: unknown): EstadoCalculadora {
  if (typeof json !== "object" || json === null) return estadoInicial();
  const fonte = json as Record<string, unknown>;
  if (fonte.v !== 2 || !Array.isArray(fonte.times)) return estadoInicial();

  const vistos = new Set<string>();
  const times: EstadoTime[] = [];
  for (const bruto of fonte.times.slice(0, MAX_TIMES)) {
    if (typeof bruto !== "object" || bruto === null) continue;
    const timeFonte = bruto as Record<string, unknown>;
    const id = sanitizarId(timeFonte.id) ?? novoId();
    if (vistos.has(id)) continue;
    vistos.add(id);
    times.push({
      id,
      nome: sanitizarNomeTime(timeFonte.nome, `Time ${times.length + 1}`),
      proposta: sanitizarProposta(timeFonte.proposta),
      entradas: sanitizarEntradas(timeFonte.entradas),
      cenarioSel: sanitizarCenario(timeFonte.cenarioSel),
      trajetoria: sanitizarTrajetoria(timeFonte.trajetoria),
    });
  }
  if (times.length === 0) return estadoInicial();

  const prazoBruto = sanitizarNumero(fonte.prazoMeses, 240);
  const prazoMeses =
    prazoBruto !== null && (PRAZOS_MESES as readonly number[]).includes(prazoBruto)
      ? prazoBruto
      : PRAZO_DEFAULT;

  return { v: 2, prazoMeses, estrutura: sanitizarEstrutura(fonte.estrutura), times };
}

export function passoCompleto(entradas: EntradasTime, passoId: PassoId): boolean {
  const passo = PASSOS.find((p) => p.id === passoId)!;
  // A pergunta opcional não tem "completo" pelo gating (nenhum dos dois campos
  // é obrigatório): completa é ter os dois, que é o que liga a alavanca de
  // ciclo. A regra mora em `funilPreenchido`, não aqui.
  if (passo.opcional) return funilPreenchido(entradas);
  const faltando = camposFaltando(entradas);
  return passo.campos.every((campo) => !faltando.includes(campo));
}

export type Progresso = {
  preenchidos: number;
  total: number;
  porTime: { timeId: string; preenchidos: number; total: number; completo: boolean }[];
};

// Progresso pelos campos obrigatórios (13 por time; o custo condicional do
// caminho conta como pendência quando falta). Deriva a estrutura compartilhada
// primeiro: com ela ativa, um campo declarado uma vez preenche todos os times.
export function progresso(estadoBruto: EstadoCalculadora): Progresso {
  const estado = aplicarEstrutura(estadoBruto);
  const porTime = estado.times.map((time) => {
    const faltando = camposFaltando(time.entradas);
    const preenchidos = Math.max(0, 13 - faltando.length);
    return { timeId: time.id, preenchidos, total: 13, completo: faltando.length === 0 };
  });
  return {
    preenchidos: porTime.reduce((total, time) => total + time.preenchidos, 0),
    total: porTime.reduce((total, time) => total + time.total, 0),
    porTime,
  };
}

// Transições incompleto → completo entre dois estados, para os eventos
// `passo_concluido` (o estado antigo já é lido para o update — zero queries
// extras; dedupe por construção). Times casam por id.
export function diffPassosCompletos(
  antesBruto: EstadoCalculadora,
  depoisBruto: EstadoCalculadora,
): { timeId: string; timeNome: string; passo: number }[] {
  const antes = aplicarEstrutura(antesBruto);
  const depois = aplicarEstrutura(depoisBruto);
  const transicoes: { timeId: string; timeNome: string; passo: number }[] = [];
  for (const time of depois.times) {
    const entradasAntes =
      antes.times.find((t) => t.id === time.id)?.entradas ?? entradasVazias();
    for (const passo of PASSOS) {
      if (
        !passoCompleto(entradasAntes, passo.id) &&
        passoCompleto(time.entradas, passo.id)
      ) {
        transicoes.push({ timeId: time.id, timeNome: time.nome, passo: passo.id });
      }
    }
  }
  return transicoes;
}

// Diff raso para o rastreio de edição pós-envio: nomes dos campos alterados
// por time (+ proposta, cenário e trajetória), sem valores — o snapshot
// completo já está no state.
export function diffCamposAlterados(
  antes: EstadoCalculadora,
  depois: EstadoCalculadora,
): string[] {
  const alterados: string[] = [];
  if (antes.prazoMeses !== depois.prazoMeses) alterados.push("conta: prazo do contrato");
  if (JSON.stringify(antes.estrutura ?? null) !== JSON.stringify(depois.estrutura ?? null)) {
    alterados.push("conta: estrutura compartilhada");
  }
  for (const time of depois.times) {
    const anterior = antes.times.find((t) => t.id === time.id);
    if (!anterior) {
      alterados.push(`${time.nome}: time adicionado`);
      continue;
    }
    if (anterior.nome !== time.nome) alterados.push(`${time.nome}: nome`);
    if (anterior.proposta.plano !== time.proposta.plano) {
      alterados.push(`${time.nome}: plano`);
    }
    if (anterior.proposta.assentos !== time.proposta.assentos) {
      alterados.push(`${time.nome}: assentos`);
    }
    for (const campo of Object.keys(time.entradas) as CampoId[]) {
      if (anterior.entradas[campo] !== time.entradas[campo]) {
        alterados.push(`${time.nome}: ${campo}`);
      }
    }
    if (JSON.stringify(anterior.cenarioSel) !== JSON.stringify(time.cenarioSel)) {
      alterados.push(`${time.nome}: cenário`);
    }
    if (
      JSON.stringify(anterior.trajetoria ?? null) !==
      JSON.stringify(time.trajetoria ?? null)
    ) {
      alterados.push(`${time.nome}: trajetória`);
    }
  }
  for (const anterior of antes.times) {
    if (!depois.times.some((t) => t.id === anterior.id)) {
      alterados.push(`${anterior.nome}: time removido`);
    }
  }
  return alterados;
}

export type { PassoId };

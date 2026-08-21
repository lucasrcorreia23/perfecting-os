// "De onde saiu este número?" — a resposta, para os poucos valores do
// relatório em que a pergunta de fato nasce.
//
// ONDE O ÍCONE VAI, E POR QUE SÃO POUCOS. A primeira versão desta camada
// (22/08/2026) pôs um gatilho em toda declaração de reais da etapa 03 —
// quarenta e poucos — e foi reprovada no mesmo dia: a maioria deles abria uma
// divisão que a própria linha já mostrava (o total do contrato é a mensalidade
// vezes o prazo, e as duas estão na tela), ou repetia o que o bloco ao lado
// explicava por extenso (o extrato do preço vive dentro de um "De onde vem
// esse preço"). Ícone em número óbvio não informa: ele treina o olho a ignorar
// o ícone, e aí o de cima — que importava — some junto.
//
// A regra que sobrou tem duas condições, e as DUAS precisam valer:
//
//   1. O número é RESULTADO de uma regra que a tela não mostra. Um `min()`
//      entre duas grandezas, uma taxa que reprecifica o volume inteiro, um
//      haircut embutido. Uma soma cujas parcelas estão listadas logo abaixo
//      não conta — ali o olho faz a conta.
//   2. Não existe explicação ADJACENTE. Onde há um bloco recolhível, uma nota
//      de rodapé ou uma descrição de seção respondendo a mesma coisa, o ícone
//      é a segunda afordância para a mesma pergunta.
//
// Isso deixa dez gatilhos: os quatro KPIs da capa, o total da Eficiência, as
// quatro alavancas de performance e o total do custo da inação. O total da
// Performance ficou de FORA justamente pela condição 1 — ele é a soma das
// quatro linhas impressas logo abaixo dele.
//
// O QUE CADA BALÃO CARREGA, e de onde vem:
//
//   - a CONTA (`conta`), no máximo quatro linhas, com os números deste link
//     substituídos. É o que o balão existe para mostrar. Cada operando sai do
//     resultado do motor ou de `constants.ts` — nunca de uma transcrição.
//   - uma NOTA (`nota`), uma frase, escrita para quem lê o relatório. Ela NÃO
//     é a `explicacao` de `referencia.ts`: aquela é escrita para o auditor
//     interno e tem parágrafos: coladas aqui, as dez viravam a parede de texto
//     que a primeira versão levou de volta.
//   - um TERMO do glossário (`termo`), no máximo um, e só quando ele ACRESCENTA
//     — cinco dos dez balões não têm nenhum. A definição da gaveta é escrita
//     para a gaveta, onde há espaço; colada debaixo de uma nota que já diz a
//     mesma coisa (o balão do ROI definindo "ROI" logo abaixo da divisão que
//     acabou de mostrar), ela vira o parágrafo a mais que a primeira versão
//     levou de volta. É a MESMA definição da gaveta, nunca uma segunda.
//   - a FONTE (`fonte`), a trinca célula + `arquivo.ts#símbolo` de
//     `referencia.ts`. É por ela que o caminho até a auditoria interna
//     continua aberto sem que o balão precise carregá-la inteira.

import { CAMINHOS, PLANOS } from "./constants";
import {
  formatBRL,
  formatDias,
  formatFaixaTier,
  formatHoras,
  formatMeses,
  formatNumero,
  formatPct,
  formatX,
} from "./format";
import type { TermoId } from "./glossario";
import { PREMISSAS_PADRAO, type PremissasRacional } from "./premissas";
import { REFERENCIA } from "./referencia";
import type {
  DimensaoCoiId,
  EntradasTime,
  ParcelasPerformance,
  PlanoId,
  PrecoConta,
  ResultadoCoi,
  ResultadoTime,
} from "./types";

type ResultadoOk = Extract<ResultadoTime, { status: "ok" }>;

export type ExplicacaoValor = {
  /** O que está sendo explicado. Vira o nome acessível do gatilho. */
  titulo: string;
  /**
   * A conta, uma linha por operando, com os números deste link. Notação de
   * leitura — não é código. Quatro linhas é o teto, e é deliberado: acima
   * disso o balão deixa de responder e passa a exigir leitura.
   */
  conta: string[];
  /** Uma frase. O que a conta sozinha não diz. */
  nota?: string;
  /** No máximo um termo do glossário, e só se a conta precisar dele. */
  termo?: TermoId;
  /** "Motor!C72 · calc.ts#calcResultadoTime". */
  fonte: string;
};

// ---------------------------------------------------------------------------
// A ponte com a referência de fórmulas
// ---------------------------------------------------------------------------

const POR_ID = new Map(REFERENCIA.map((entrada) => [entrada.id, entrada]));

// Não lança: o balão é renderizado na tela do visitante, e um id errado não
// pode virar tela branca. O que ele vira é um rodapé vazio — e
// `explicacoes.test.ts` reprova antes de chegar lá.
function fonteDe(id: string): string {
  const entrada = POR_ID.get(id);
  return entrada ? `${entrada.celula} · ${entrada.codigo}` : "";
}

/** Os ids de `referencia.ts` que este módulo cita. O teste os confere. */
export const REFERENCIAS_CITADAS = [
  "tiers",
  "piso",
  "rateio-preco",
  "valor-ano",
  "roi-payback",
  "consolidado",
  "eficiencia-ano",
  "ganho-ticket",
  "ganho-rampa",
  "ganho-conversao",
  "ganho-ciclo",
  "ciclo-teto-funil",
  "coi-total",
  "coi-subperformance",
  "coi-rampa",
  "coi-turnover",
  "coi-no-decision",
  "coi-fila",
] as const;

const pctSimples = (v: number) =>
  `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function pDe(premissas?: PremissasRacional): PremissasRacional {
  return premissas ?? PREMISSAS_PADRAO;
}

/** "= R$ 1.131.818/ano" — o fecho de toda conta, e o que a tela destaca. */
function igual(resultado: string): string {
  return `= ${resultado}`;
}

// ---------------------------------------------------------------------------
// O texto achatado, para o nome acessível do gatilho
// ---------------------------------------------------------------------------

/**
 * Uma string só com tudo que o balão mostra.
 *
 * O balão é `aria-hidden` e este texto vai ao `aria-label` do gatilho — o
 * mesmo contrato do `HintTooltip` de `ui/tooltip.tsx`, e pela mesma razão:
 * leitor de tela e teclado alcançam a informação sem que uma leitura linear da
 * página passe a recitar explicações que ninguém pediu.
 */
export function textoAcessivel(explicacao: ExplicacaoValor): string {
  const partes = [`Como calculamos: ${explicacao.titulo}`, explicacao.conta.join("; ")];
  if (explicacao.nota) partes.push(explicacao.nota);
  return partes.join(". ");
}

// ---------------------------------------------------------------------------
// Os quatro KPIs da capa
// ---------------------------------------------------------------------------

/**
 * Investimento por mês.
 *
 * Passa na condição 1 com folga: a tabela de tiers não é faixa de imposto — o
 * volume escolhe um tier e TODAS as horas do mês saem pela taxa dele. Quem lê
 * "R$ 13.000" ao lado de "80 h" não tem como chegar sozinho nem à taxa nem ao
 * motivo de ela ser aquela.
 */
export function explicarInvestimentoMes(args: {
  mensalidade: number;
  preco: PrecoConta;
  /** Verdadeiro na aba de UM time: o número é a fatia dele, não a conta. */
  rateado?: boolean;
  premissas?: PremissasRacional;
}): ExplicacaoValor {
  const { mensalidade, preco, rateado = false } = args;
  const p = pDe(args.premissas);
  const conta: string[] = [];

  if (preco.horasMes > 0) {
    conta.push(
      `${formatHoras(preco.horasMes)}/mês na conta → Tier ${preco.tier.tier} (${formatFaixaTier(preco.tier)})`,
    );
    conta.push(
      `${formatNumero(preco.horasMes, 0)} h × ${formatBRL(preco.tier.taxaHora)}/h = ${formatBRL(preco.bruto)}`,
    );
  }
  if (preco.pisoAplicado) {
    conta.push(`abaixo da cobrança mínima de ${formatBRL(p.taxaMinima)}/mês`);
  }
  conta.push(
    igual(
      rateado
        ? `${formatBRL(mensalidade)}/mês — a fatia deste time`
        : `${formatBRL(mensalidade)}/mês`,
    ),
  );

  return {
    titulo: rateado ? "Investimento por mês deste time" : "Investimento por mês",
    conta,
    nota: preco.pisoAplicado
      ? `Contas pequenas pagam o piso de ${formatBRL(p.taxaMinima)}: é ele que vale neste volume, não a tabela.`
      : "O preço vem do volume de horas da conta, não do plano — e o tier vale para a hora inteira, não só para as acima da fronteira.",
    fonte: fonteDe(rateado ? "rateio-preco" : preco.pisoAplicado ? "piso" : "tiers"),
  };
}

/**
 * Valor gerado por ano.
 *
 * A pergunta que este balão responde não é "quanto", é "de quê": receita ou
 * margem, com ou sem otimismo. As cinco parcelas aparecem abertas na etapa
 * mais abaixo, mas a capa é onde a decisão começa.
 */
export function explicarValorAno(args: {
  valorAno: number;
  /** Ausente no consolidado de vários times: ali a soma é DOS TIMES. */
  detalhe?: { eficienciaAno: number; parcelas: ParcelasPerformance } | null;
  premissas?: PremissasRacional;
}): ExplicacaoValor {
  const { valorAno, detalhe } = args;
  const p = pDe(args.premissas);
  const conta = !detalhe
    ? ["soma do valor anual de cada time completo", igual(`${formatBRL(valorAno)}/ano`)]
    : [
        `eficiência: ${formatBRL(detalhe.eficienciaAno)}`,
        `ticket + conversão + rampa: ${formatBRL(
          detalhe.parcelas.margemTicketAno +
            detalhe.parcelas.ganhoConversaoAno +
            detalhe.parcelas.margemRampaAno,
        )}`,
        detalhe.parcelas.ganhoCicloAno === null
          ? "ciclo de venda: fora da conta (funil não preenchido)"
          : `ciclo de venda: ${formatBRL(detalhe.parcelas.ganhoCicloAno)}`,
        igual(`${formatBRL(valorAno)}/ano`),
      ];
  return {
    titulo: "Valor gerado por ano",
    conta,
    nota: `Em margem, nunca em receita — e rampa, conversão e ciclo já entram com ${pctSimples(1 - p.haircut)} de desconto.`,
    termo: "margem-contribuicao",
    fonte: fonteDe("valor-ano"),
  };
}

/**
 * ROI.
 *
 * Com vários times, a condição 1 é o próprio jeito de somar: Σ valor ÷ Σ
 * preço, e não a média dos ROIs (invariante 11). Com um time só, o que ele
 * responde é qual janela está no denominador — o ano, nunca o prazo.
 */
export function explicarRoi(args: {
  valorAno: number;
  precoAno: number;
  roi: number;
  ponderado?: boolean;
}): ExplicacaoValor {
  return {
    titulo: "ROI",
    conta: [
      `${formatBRL(args.valorAno)} de valor no ano`,
      `÷ ${formatBRL(args.precoAno)} de investimento no ano`,
      igual(formatX(args.roi)),
    ],
    nota: args.ponderado
      ? "Com vários times é Σ valor ÷ Σ investimento: a média dos ROIs daria outro número."
      : "A janela do cálculo é sempre o ano, mesmo quando o contrato é de outro tamanho.",
    fonte: fonteDe(args.ponderado ? "consolidado" : "roi-payback"),
  };
}

/**
 * Payback.
 *
 * Sozinho ele seria óbvio (é o recíproco do ROI). O que o põe aqui é a
 * comparação com o prazo escolhido: um payback maior que o contrato significa
 * que ele termina antes de a conta se pagar, e isso não está em lugar nenhum
 * da capa.
 */
export function explicarPayback(args: {
  precoAno: number;
  valorAno: number;
  paybackMeses: number;
  prazoMeses: number;
}): ExplicacaoValor {
  return {
    titulo: "Payback",
    conta: [
      `${formatBRL(args.precoAno)} ÷ ${formatBRL(args.valorAno)} × 12 meses`,
      igual(formatMeses(args.paybackMeses)),
    ],
    nota:
      args.paybackMeses > args.prazoMeses
        ? `Passa dos ${args.prazoMeses} meses de contrato: ele termina antes de a conta se pagar.`
        : `Dentro dos ${args.prazoMeses} meses de contrato escolhidos.`,
    termo: "payback",
    fonte: fonteDe("roi-payback"),
  };
}

// ---------------------------------------------------------------------------
// Eficiência — o total do card
// ---------------------------------------------------------------------------

/**
 * O total da Eficiência.
 *
 * É o único total da etapa que NÃO é a soma das linhas abaixo dele: é o menor
 * entre o custo do caminho declarado e o teto do plano, e quando o teto morde,
 * o número na tela não aparece em lugar nenhum da lista.
 */
export function explicarEficiencia(args: {
  resultado: ResultadoOk;
  entradas: EntradasTime;
  plano: PlanoId;
}): ExplicacaoValor {
  const { resultado: r, entradas: e, plano } = args;
  const tetoMordeu = r.eficienciaAno >= r.tetoEficienciaAno - 0.005;
  const caminho = e.caminho ? CAMINHOS[e.caminho].label : "—";
  return {
    titulo: "Eficiência: o que deixa de ser gasto",
    conta: [
      tetoMordeu
        ? `custo de "${caminho}": acima do teto`
        : `custo de "${caminho}": ${formatBRL(r.eficienciaAno)}/ano`,
      `teto do plano ${PLANOS[plano].label}: ${formatBRL(r.tetoEficienciaAno)}/ano`,
      `o menor dos dois ${igual(`${formatBRL(r.eficienciaAno)}/ano`)}`,
    ],
    nota: tetoMordeu
      ? "O teto definiu a parcela: a economia não pode passar do valor da prática que o plano entrega."
      : "A economia nunca passa do que a empresa de fato gasta hoje, nem do valor da prática contratada.",
    fonte: fonteDe("eficiencia-ano"),
  };
}

// ---------------------------------------------------------------------------
// Performance — as quatro alavancas
// ---------------------------------------------------------------------------

export type AlavancaId = "ticket" | "rampa" | "conversao" | "ciclo";

const ALAVANCA_TITULO: Record<AlavancaId, string> = {
  ticket: "Ganho de ticket médio",
  rampa: "Ganho de rampa",
  conversao: "Ganho de conversão",
  ciclo: "Ganho de ciclo de venda",
};

/**
 * Uma alavanca.
 *
 * As quatro são o coração da condição 1: a linha mostra o delta e o valor, e
 * entre um e outro há uma multiplicação de cinco fatores que ninguém refaz de
 * cabeça — inclusive dois que mudam a ordem de grandeza (a margem e a
 * cobertura) e um que corta 30% (o haircut).
 *
 * Recebe `deltas` e `parcelas` SOLTOS, e não um `ResultadoOk`: a comparação de
 * cenários chamaria a mesma função com a linha de outro cenário, e um
 * resultado cravado faria a coluna Otimista explicar o número do Conservador.
 */
export function explicarAlavanca(args: {
  alavanca: AlavancaId;
  entradas: EntradasTime;
  cobertura: number;
  deltas: {
    ticketPct: number;
    rampaPct: number;
    convPp: number;
    cicloDiasMenos: number;
    cicloPct: number;
  };
  parcelas: ParcelasPerformance;
  tetoFunil: ResultadoOk["tetoFunil"];
  premissas?: PremissasRacional;
}): ExplicacaoValor {
  const { alavanca, entradas: e, cobertura, deltas, parcelas, tetoFunil } = args;
  const p = pDe(args.premissas);
  const receitaRep =
    e.receitaMensal && e.numVendedores ? e.receitaMensal / e.numVendedores : null;
  const vendasMes = e.receitaMensal && e.ticketMedio ? e.receitaMensal / e.ticketMedio : null;
  const oportunidadesMes =
    vendasMes !== null && e.conversaoPct ? vendasMes / (e.conversaoPct / 100) : null;

  // O rabicho comum às quatro: margem e cobertura sempre entram, o haircut em
  // três delas. Escrito uma vez porque é literalmente o mesmo fator.
  const fecho = (comHaircut: boolean) =>
    `× ${formatPct(e.margemPct, 0)} de margem × ${formatPct(cobertura * 100, 0)} de cobertura${
      comHaircut ? ` × ${pctSimples(p.haircut)} de haircut` : ""
    }`;

  if (alavanca === "ticket") {
    return {
      titulo: ALAVANCA_TITULO.ticket,
      conta: [
        `${formatBRL(e.receitaMensal)}/mês × ${formatPct(deltas.ticketPct * 100, 0)} × 12 meses`,
        fecho(false),
        igual(`${formatBRL(parcelas.margemTicketAno)}/ano`),
      ],
      nota: "A única alavanca sem haircut: o ticket sobe na receita que já existe, sem depender de mais volume.",
      termo: "cobertura",
      fonte: fonteDe("ganho-ticket"),
    };
  }

  if (alavanca === "rampa") {
    return {
      titulo: ALAVANCA_TITULO.rampa,
      conta: [
        `${formatMeses(e.rampaMeses)} de rampa × ${formatPct(deltas.rampaPct * 100, 0)} mais curta`,
        `× ${formatBRL(receitaRep)} por vendedor/mês × ${formatNumero(e.contratacoesAno, 0)} contratações/ano`,
        fecho(true),
        igual(`${formatBRL(parcelas.margemRampaAno)}/ano`),
      ],
      nota: "Não é folha economizada: é a mesma folha rendendo antes.",
      termo: "rampa",
      fonte: fonteDe("ganho-rampa"),
    };
  }

  if (alavanca === "conversao") {
    return {
      titulo: ALAVANCA_TITULO.conversao,
      conta: [
        `${formatNumero(oportunidadesMes, 0)} oportunidades trabalhadas/mês`,
        `× ${formatNumero(deltas.convPp, 1)} p.p. × ${formatBRL(e.ticketMedio)} de ticket × 12 meses`,
        fecho(true),
        igual(`${formatBRL(parcelas.ganhoConversaoAno)}/ano`),
      ],
      nota: "Sobre as mesmas oportunidades: não pressupõe mais leads. E p.p. não é %: de 20% para 22% são +2 p.p.",
      termo: "oportunidades-trabalhadas",
      fonte: fonteDe("ganho-conversao"),
    };
  }

  if (parcelas.ganhoCicloAno === null) {
    return {
      titulo: ALAVANCA_TITULO.ciclo,
      conta: [
        "o funil não foi preenchido (ciclo em dias e leads/mês)",
        "sem ele, esta alavanca fica fora da conta",
      ],
      // Sem o termo: a definição de "teto de funil" fala de funil SEM FOLGA, e
      // aqui o motivo é outro — o funil não foi preenchido. Colar a definição
      // certa no caso errado é o tipo de imprecisão que a tela não pode pagar.
      nota: "Nunca estimamos por default: sem os dois números, a parcela não existe.",
      fonte: fonteDe("ganho-ciclo"),
    };
  }

  const limitou = tetoFunil?.limitou === true;
  return {
    titulo: ALAVANCA_TITULO.ciclo,
    conta: [
      deltas.cicloDiasMenos > 0
        ? `ciclo ${formatDias(deltas.cicloDiasMenos)} mais curto (de ${formatDias(e.cicloDias)})`
        : `ciclo ${formatPct(deltas.cicloPct * 100, 0)} mais curto`,
      tetoFunil
        ? `libera ${formatNumero(tetoFunil.ganhoCapacidadeVendasMes, 1)} vendas/mês, o funil sustenta ${formatNumero(tetoFunil.tetoVendasMes, 1)}`
        : "",
      `o menor × ${formatBRL(e.ticketMedio)} × 12 ${fecho(true)}`,
      igual(`${formatBRL(parcelas.ganhoCicloAno)}/ano`),
    ].filter((linha) => linha !== ""),
    nota: limitou
      ? "O teto de funil definiu a parcela: fechar mais rápido só vira receita se houver oportunidade sobrando."
      : "Fechar mais rápido só vira receita até onde o funil consegue alimentar a capacidade liberada.",
    termo: "teto-funil",
    fonte: fonteDe(limitou ? "ciclo-teto-funil" : "ganho-ciclo"),
  };
}

// ---------------------------------------------------------------------------
// Custo da inação — um gatilho, no total
// ---------------------------------------------------------------------------

/**
 * O total do custo da inação.
 *
 * As cinco dimensões abaixo dele têm fórmula própria e nenhuma ganhou ícone:
 * a lista já traz rótulo, nota e a linha de rodapé sobre o desconto declarado,
 * e cinco gatilhos numa lista de cinco é a parede que a primeira versão levou
 * de volta. O que ESTE balão carrega e nenhum outro lugar carrega é a regra de
 * que a lacuna nunca se soma ao ROI (invariante 1).
 */
export function explicarCoiTotal(coi: ResultadoCoi): ExplicacaoValor {
  return {
    titulo: "Custo da inação, por ano",
    conta: [
      // NÃO é uma multiplicação, e a primeira redação dizia que era: ela abria
      // com "N vendedores sem a prática mínima ×", e no golden FIESC esse N é
      // ZERO enquanto o total passa de R$ 231 mil — as cinco dimensões não
      // dependem todas da cobertura. Balão que mostra uma conta que não fecha
      // é pior do que balão nenhum: ele destrói a credibilidade que a página
      // inteira está construindo.
      "cinco dimensões de perda: quota, rampa, saída de vendedor,",
      "negócio sem decisão e espera na agenda do gestor",
      "cada uma com desconto de conservadorismo declarado",
      igual(`${formatBRL(coi.totalAno)}/ano`),
    ],
    nota: "Esta lacuna NÃO se soma ao ROI: o ROI mede o que o programa devolve, ela mede o que vaza sem ele.",
    fonte: fonteDe("coi-total"),
  };
}

const COI_REF: Record<DimensaoCoiId, string> = {
  subperformance: "coi-subperformance",
  rampa_estendida: "coi-rampa",
  turnover: "coi-turnover",
  no_decision: "coi-no-decision",
  fila: "coi-fila",
};

const COI_TITULO: Record<DimensaoCoiId, string> = {
  subperformance: "Quota que não se bate sem prática",
  rampa_estendida: "Rampa mais longa nas novas contratações",
  turnover: "Reposição de quem sai por falta de coaching",
  no_decision: "Negócios que morrem sem decisão",
  fila: "Espera por uma vaga na agenda do gestor",
};

/**
 * Uma dimensão de "onde o dinheiro vaza".
 *
 * Passa nas duas condições com folga. A linha mostra um rótulo de sete
 * palavras e um valor, e entre os dois há uma cadeia de cinco a seis fatores
 * — dois deles constantes de benchmark ([H]) que não estão em lugar nenhum da
 * tela do visitante. Sem o balão, "R$ 2.304/ano" em "Negócios que morrem sem
 * decisão" é um número que o leitor pode aceitar ou recusar, mas não conferir.
 *
 * O CHAMADOR SÓ RENDERIZA O GATILHO QUANDO HÁ VALOR. Zero é medição, não
 * ausência — a linha fica, com barra vazia, para o leitor ver o conjunto
 * inteiro —, mas um balão abrindo uma multiplicação que termina em R$ 0 não
 * explica nada: o que ele diria já está na barra vazia ao lado. E travessão
 * (as duas linhas que dependem do salário do vendedor) tem afordância própria,
 * o atalho "Preencher no passo 3" logo abaixo da lista.
 *
 * A conta NÃO reconstrói os produtos intermediários do motor (as saídas extras
 * do turnover, por exemplo, que carregam um `min()`): ela nomeia os FATORES,
 * na ordem em que `coi.ts` os multiplica, e fecha no valor que o motor
 * devolveu. Recalcular aqui criaria uma segunda aritmética, que é o defeito
 * que este módulo inteiro existe para não ter.
 */
export function explicarDimensaoCoi(args: {
  id: DimensaoCoiId;
  valorAno: number;
  coi: ResultadoCoi;
  entradas: EntradasTime;
  premissas?: PremissasRacional;
}): ExplicacaoValor {
  const { id, valorAno, coi, entradas: e } = args;
  const p = pDe(args.premissas);
  const c = p.coi;
  const naoAtendidos = formatNumero(coi.cobertura.vendedoresNaoAtendidos, 1);
  const receitaRep =
    e.receitaMensal && e.numVendedores ? e.receitaMensal / e.numVendedores : null;
  const vendasMes = e.receitaMensal && e.ticketMedio ? e.receitaMensal / e.ticketMedio : null;
  const margem = `${formatPct(e.margemPct, 0)} de margem`;
  const fecho = igual(`${formatBRL(valorAno)}/ano`);

  if (id === "subperformance") {
    return {
      titulo: COI_TITULO.subperformance,
      conta: [
        `${formatBRL(receitaRep)}/mês por vendedor × ${naoAtendidos} sem a prática mínima`,
        `× ${pctSimples(c.deltaAttainment)} de quota a mais com prática × ${pctSimples(c.haircut)} de haircut`,
        `× 12 meses × ${margem}`,
        fecho,
      ],
      nota: "Só sobre quem não recebe a prática mínima hoje: quem já recebe não entra nesta conta.",
      fonte: fonteDe(COI_REF.subperformance),
    };
  }

  if (id === "rampa_estendida") {
    return {
      titulo: COI_TITULO.rampa_estendida,
      conta: [
        `${num(c.rampaExtensaoMeses)} mês a mais de rampa sem coaching × ${pctSimples(c.haircut)} de haircut`,
        `× ${formatNumero(e.contratacoesAno, 0)} contratações/ano × ${formatBRL(receitaRep)}/mês × ${pctSimples(c.rampaProdutividade)}`,
        `× ${margem}`,
        fecho,
      ],
      nota: "Incide só sobre quem entra no ano, não sobre o time todo — e vendedor em rampa produz, só que metade.",
      termo: "rampa",
      fonte: fonteDe(COI_REF.rampa_estendida),
    };
  }

  if (id === "turnover") {
    return {
      titulo: COI_TITULO.turnover,
      conta: [
        `${naoAtendidos} sem a prática mínima × ${pctSimples(c.retencaoCom - c.retencaoSem)} de diferença de retenção`,
        `× ${pctSimples(c.haircut)} de haircut, travado em ${formatNumero(e.contratacoesAno, 0)} contratações/ano`,
        `× ${num(c.custoSubstituicao)} salário anual carregado por saída (salário × ${num(p.encargos)} × 12)`,
        fecho,
      ],
      nota: "Duas travas: só quem não é atendido corre risco, e ninguém perde mais gente do que repõe no ano.",
      termo: "encargos",
      fonte: fonteDe(COI_REF.turnover),
    };
  }

  if (id === "no_decision") {
    return {
      titulo: COI_TITULO.no_decision,
      conta: [
        `${formatNumero(vendasMes, 1)} negócios/mês (${formatBRL(e.receitaMensal)} ÷ ${formatBRL(e.ticketMedio)} de ticket)`,
        `× ${pctSimples(c.noDecision)} que morrem no status quo × ${pctSimples(c.fracaoCoachavel)} que coaching destrava`,
        `× ${formatBRL(e.ticketMedio)} × 12 meses × ${margem}`,
        fecho,
      ],
      nota: `A maioria das perdas B2B não vai para o concorrente, vai para o status quo. Os ${pctSimples(c.fracaoCoachavel)} são o haircut desta linha.`,
      fonte: fonteDe(COI_REF.no_decision),
    };
  }

  return {
    titulo: COI_TITULO.fila,
    conta: [
      `${naoAtendidos} vendedores esperando × ${num(c.semanasEspera)} semanas × ${num(c.horasPerdidasSemana)} h perdidas por semana`,
      `× o custo da hora do vendedor (salário × ${num(p.encargos)} ÷ ${p.jornadaMensalH} h)`,
      `× 12 meses × ${pctSimples(c.haircut)} de haircut`,
      fecho,
    ],
    nota: "Folha, não receita: é produtividade perdida de quem espera, não venda que deixou de acontecer.",
    fonte: fonteDe(COI_REF.fila),
  };
}

/*
 * A leitura agregada de um recorte de sessões — pura, sem I/O.
 *
 * É genérica sobre o ROTEIRO: toda pergunta de escala vira média, toda pergunta
 * de escolha vira distribuição. Acrescentar uma pergunta ao roteiro produz a
 * leitura dela sem tocar neste arquivo — e é isso que impede a lista de KPIs de
 * envelhecer em silêncio quando o roteiro muda.
 *
 * As três coisas que este arquivo existe para nunca deixar acontecer:
 *
 * 1. DIVIDIR PELO TOTAL DE SESSÕES. "Criou o roleplay" só se aplica a gestores;
 *    o Bloco 4, só a varejo. Toda leitura carrega `deN` (aplicáveis) além de `n`
 *    (respondidas), e é `deN` que é o denominador. Com 4 gestores de 10 sessões,
 *    4 de 4 (100%) viraria 4 de 10 (40%) — a etapa perfeita lendo como a pior do
 *    funil.
 * 2. LER AUSÊNCIA COMO ZERO. `Media` e `EtapaFunil` são uniões discriminadas no
 *    molde de `Recorrencia`: sem aplicáveis ou sem respostas, o estado é
 *    `sem_dados` e não existe `media` nem `pct` para ninguém coagir a 0.
 * 3. IMPRIMIR PORCENTAGEM ANÔNIMA. "Sozinho | Com ajuda | Não concluiu" tem três
 *    valores, e "a taxa de sucesso" pode significar duas coisas muito
 *    diferentes: com 3/6/1 em dez sessões, "sem ajuda" é 30% e "concluiu" é 90%.
 *    O tipo devolve as duas, nomeadas, e nenhuma solta.
 */

import {
  MIN_RESPOSTAS_PARA_RANQUEAR,
  PALETA_FALLBACK,
  TESTE_FLUXO_ORDER,
  TESTE_FLUXOS,
  TESTE_PERFIL_ORDER,
  TESTE_PERFIS,
  DESAFIO_SEVERIDADE_ORDER,
  DESAFIO_SEVERIDADES,
  DESAFIO_TIPO_ORDER,
  DESAFIO_TIPOS,
  type DesafioSeveridade,
  type DesafioTipo,
  type TesteAchadoStatus,
  type TesteFluxo,
  type TestePerfil,
} from "@/lib/constants";
import { dependenciaSatisfeita, type RespostasMap } from "./respostas";
import {
  perguntaPorId,
  perguntasDoPerfil,
  TODAS_AS_PERGUNTAS,
  type Pergunta,
} from "./roteiro";

export type SessaoDashboardRow = {
  id: string;
  codigo: number;
  perfil: TestePerfil;
  fluxo: TesteFluxo;
  varejo: boolean;
  realizado_em: string;
  respostas: RespostasMap;
};

export type TaxonomiaRef = { id: string; nome: string; cor: string } | null;

export type AchadoDashboardRow = {
  id: string;
  sessao_id: string;
  resumo: string;
  tipo: DesafioTipo;
  severidade: DesafioSeveridade;
  status: TesteAchadoStatus;
  categoria: TaxonomiaRef;
  fluxo: TaxonomiaRef;
  desafio_id: string | null;
  desafio_codigo: number | null;
};

export type Contagem = { id: string; label: string; cor: string; n: number };

/*
 * `min`/`max` são OBRIGATÓRIOS e viajam com a média: um 6 na escala 1–7 (86% da
 * régua) e um 6 na 0–10 (60%) imprimem igual e não significam o mesmo. Por isso
 * também não existe média entre perguntas de réguas diferentes — a "nota geral"
 * de facilidade 6/7 com realismo 6/10 seria "6,0 de 8,5", que não é nada.
 */
export type Media =
  | { status: "sem_dados"; deN: number; n: number }
  | {
      status: "medido";
      media: number;
      n: number;
      deN: number;
      min: number;
      max: number;
    };

export type Distribuicao = {
  perguntaId: string;
  rotulo: string;
  deN: number;
  respondidas: number;
  baldes: Contagem[];
};

export type EtapaFunil = {
  perguntaId: string;
  rotulo: string;
  deN: number;
} & (
  | { status: "sem_dados" }
  | {
      status: "medido";
      respondidas: number;
      semAjuda: number;
      comAjuda: number;
      naoConcluiu: number;
      // Duas taxas NOMEADAS, nunca uma anônima — ver o ponto 3 do cabeçalho.
      semAjudaPct: number;
      concluiuPct: number;
    }
);

export type ProblemaRecorrente = {
  desafioId: string;
  desafioCodigo: number;
  resumo: string;
  sessoes: number;
  deN: number;
};

export type LeituraAchados = {
  total: number;
  porStatus: Record<TesteAchadoStatus, number>;
  porTipo: Contagem[];
  porSeveridade: Contagem[];
  porCategoria: Contagem[];
  porFluxo: Contagem[];
  recorrentes: ProblemaRecorrente[];
};

export type UsabilidadeDashboard = {
  sessoes: number;
  porPerfil: Contagem[];
  porFluxo: Contagem[];
  medias: Record<string, Media>;
  distribuicoes: Record<string, Distribuicao>;
  funil: EtapaFunil[];
  achados: LeituraAchados;
};

const SEM_RESPOSTA = "__sem_resposta__";
const SEM_CLASSIFICACAO = "__sem_classificacao__";

/*
 * As etapas do funil de tarefa, na ordem da jornada. Os três baldes são
 * declarados por etapa porque os conjuntos de opção DIFEREM: "não concluiu"
 * numa etapa de criação é "não encontrou" numa de localização, e "Finalizou a
 * chamada" é sim/não sem meio-termo. Derivar isso de heurística sobre o id da
 * opção funcionaria hoje e quebraria na primeira opção nova.
 */
const ETAPAS_FUNIL: readonly {
  perguntaId: string;
  rotulo: string;
  semAjuda: readonly string[];
  comAjuda: readonly string[];
  naoConcluiu: readonly string[];
}[] = [
  {
    perguntaId: "b1_criou_roleplay",
    rotulo: "Criou o roleplay",
    semAjuda: ["sozinho"],
    comAjuda: ["com_ajuda"],
    naoConcluiu: ["nao_concluiu"],
  },
  {
    perguntaId: "b1_atribuiu_roleplay",
    rotulo: "Atribuiu ao vendedor",
    semAjuda: ["sozinho"],
    comAjuda: ["com_ajuda"],
    naoConcluiu: ["nao_concluiu"],
  },
  {
    perguntaId: "b1_localizou_roleplay",
    rotulo: "Localizou o roleplay",
    semAjuda: ["sozinho"],
    comAjuda: ["com_ajuda"],
    naoConcluiu: ["nao_encontrou"],
  },
  {
    perguntaId: "b1_iniciou_chamada",
    rotulo: "Iniciou a chamada",
    semAjuda: ["sozinho"],
    comAjuda: ["com_ajuda"],
    naoConcluiu: ["nao_concluiu"],
  },
  {
    perguntaId: "b1_finalizou_chamada",
    rotulo: "Finalizou a chamada",
    semAjuda: ["sim"],
    comAjuda: [],
    naoConcluiu: ["nao"],
  },
  {
    perguntaId: "b1_acessou_feedback",
    rotulo: "Acessou o feedback",
    semAjuda: ["sozinho"],
    comAjuda: ["com_ajuda"],
    naoConcluiu: ["nao_encontrou"],
  },
];

/*
 * A pergunta se APLICA a esta sessão? É a única definição de denominador do
 * módulo, e ela tem duas metades: o perfil × varejo (quem responde o quê) e a
 * dependência (o "Se não, motivo" só existe quando não finalizou).
 */
export function aplicaA(pergunta: Pergunta, sessao: SessaoDashboardRow): boolean {
  const doPerfil = perguntasDoPerfil(sessao.perfil, sessao.varejo);
  if (!doPerfil.some((candidata) => candidata.id === pergunta.id)) return false;
  return dependenciaSatisfeita(pergunta, sessao.respostas);
}

function contar<T extends string>(
  ordem: readonly T[],
  rotulos: Record<T, { label: string; color: string }>,
  valores: readonly T[],
): Contagem[] {
  const contagem = new Map<T, number>();
  for (const valor of valores) contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
  return ordem.map((id) => ({
    id,
    label: rotulos[id].label,
    cor: rotulos[id].color,
    n: contagem.get(id) ?? 0,
  }));
}

function mediaDe(
  pergunta: Pergunta,
  sessoes: readonly SessaoDashboardRow[],
): Media {
  let deN = 0;
  let n = 0;
  let soma = 0;

  for (const sessao of sessoes) {
    if (!aplicaA(pergunta, sessao)) continue;
    deN += 1;
    const valor = sessao.respostas[pergunta.id];
    if (typeof valor !== "number" || !Number.isFinite(valor)) continue;
    n += 1;
    soma += valor;
  }

  if (n === 0) return { status: "sem_dados", deN, n: 0 };

  // A régua vem da PERGUNTA, não dos dados: `min`/`max` de uma escala são
  // declarados; para duração, a régua é o próprio máximo observado e não faz
  // sentido — por isso duração usa 0 e o formatador a trata à parte.
  const escala = pergunta.forma.tipo === "escala" ? pergunta.forma : null;
  return {
    status: "medido",
    media: soma / n,
    n,
    deN,
    min: escala ? escala.min : 0,
    max: escala ? escala.max : 0,
  };
}

function distribuicaoDe(
  pergunta: Pergunta,
  sessoes: readonly SessaoDashboardRow[],
): Distribuicao {
  if (pergunta.forma.tipo !== "escolha") {
    return {
      perguntaId: pergunta.id,
      rotulo: pergunta.rotulo,
      deN: 0,
      respondidas: 0,
      baldes: [],
    };
  }

  const contagem = new Map<string, number>();
  let deN = 0;
  let respondidas = 0;

  for (const sessao of sessoes) {
    if (!aplicaA(pergunta, sessao)) continue;
    deN += 1;
    const valor = sessao.respostas[pergunta.id];
    if (typeof valor !== "string") continue;
    respondidas += 1;
    contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
  }

  const baldes: Contagem[] = pergunta.forma.opcoes.map((opcao) => ({
    id: opcao.id,
    label: opcao.label,
    cor: PALETA_FALLBACK,
    n: contagem.get(opcao.id) ?? 0,
  }));

  /*
   * O balde "Não respondeu" — herdeiro direto de "Sem categoria"/"Sem fluxo" do
   * dashboard de desafios. Com 70 perguntas e importação por colagem, branco é a
   * norma; sem este balde a soma das fatias não bate com o KPI de sessões, e
   * "Concordei: 100%" apareceria em cima de três respostas ao lado de um número
   * que diz dez. Ele só nasce quando há o que pôr nele.
   */
  const semResposta = deN - respondidas;
  if (semResposta > 0) {
    baldes.push({
      id: SEM_RESPOSTA,
      label: "Não respondeu",
      cor: PALETA_FALLBACK,
      n: semResposta,
    });
  }

  return { perguntaId: pergunta.id, rotulo: pergunta.rotulo, deN, respondidas, baldes };
}

function etapaDe(
  etapa: (typeof ETAPAS_FUNIL)[number],
  sessoes: readonly SessaoDashboardRow[],
): EtapaFunil {
  const pergunta = perguntaPorId(etapa.perguntaId);
  const base = { perguntaId: etapa.perguntaId, rotulo: etapa.rotulo };
  if (!pergunta) return { ...base, deN: 0, status: "sem_dados" };

  let deN = 0;
  let semAjuda = 0;
  let comAjuda = 0;
  let naoConcluiu = 0;

  for (const sessao of sessoes) {
    if (!aplicaA(pergunta, sessao)) continue;
    deN += 1;
    const valor = sessao.respostas[pergunta.id];
    if (typeof valor !== "string") continue;
    if (etapa.semAjuda.includes(valor)) semAjuda += 1;
    else if (etapa.comAjuda.includes(valor)) comAjuda += 1;
    else if (etapa.naoConcluiu.includes(valor)) naoConcluiu += 1;
  }

  const respondidas = semAjuda + comAjuda + naoConcluiu;
  if (respondidas === 0) return { ...base, deN, status: "sem_dados" };

  return {
    ...base,
    deN,
    status: "medido",
    respondidas,
    semAjuda,
    comAjuda,
    naoConcluiu,
    // Denominador é quem RESPONDEU, não quem se aplica: quem não respondeu não
    // é um fracasso da etapa, é uma medição que não houve.
    semAjudaPct: semAjuda / respondidas,
    concluiuPct: (semAjuda + comAjuda) / respondidas,
  };
}

function taxonomiaContagem(
  refs: readonly TaxonomiaRef[],
  rotuloVazio: string,
): Contagem[] {
  const porId = new Map<string, Contagem>();
  let semClassificacao = 0;

  for (const ref of refs) {
    if (!ref) {
      semClassificacao += 1;
      continue;
    }
    const atual = porId.get(ref.id);
    if (atual) atual.n += 1;
    else porId.set(ref.id, { id: ref.id, label: ref.nome, cor: ref.cor, n: 1 });
  }

  const lista = [...porId.values()].sort(
    (a, b) => b.n - a.n || a.label.localeCompare(b.label, "pt-BR"),
  );

  // Mesmo balde de sempre, pela mesma razão: sem ele a soma das linhas para de
  // bater com o total de achados.
  if (semClassificacao > 0) {
    lista.push({
      id: SEM_CLASSIFICACAO,
      label: rotuloVazio,
      cor: PALETA_FALLBACK,
      n: semClassificacao,
    });
  }

  return lista;
}

function leituraAchados(
  achados: readonly AchadoDashboardRow[],
  totalSessoes: number,
): LeituraAchados {
  const porStatus: Record<TesteAchadoStatus, number> = {
    aberto: 0,
    virou_desafio: 0,
    descartado: 0,
  };
  for (const achado of achados) porStatus[achado.status] += 1;

  /*
   * A ponte quantitativa do módulo: quantas SESSÕES DISTINTAS registraram um
   * achado que aponta para o mesmo desafio. Sessões distintas e não achados —
   * dois achados da mesma sessão sobre o mesmo problema são um problema, não
   * dois, e contá-los duas vezes inflaria a recorrência do mesmo jeito que somar
   * contador e log inflaria a do desafio.
   */
  const porDesafio = new Map<
    string,
    { codigo: number; resumo: string; sessoes: Set<string> }
  >();

  for (const achado of achados) {
    if (!achado.desafio_id || achado.desafio_codigo === null) continue;
    const atual = porDesafio.get(achado.desafio_id);
    if (atual) atual.sessoes.add(achado.sessao_id);
    else
      porDesafio.set(achado.desafio_id, {
        codigo: achado.desafio_codigo,
        resumo: achado.resumo,
        sessoes: new Set([achado.sessao_id]),
      });
  }

  const recorrentes: ProblemaRecorrente[] = [...porDesafio.entries()]
    // Uma sessão não é recorrência. O corte é o mesmo espírito de
    // MIN_TENTATIVAS_PARA_RANQUEAR, com o limiar que a palavra exige.
    .filter(([, dados]) => dados.sessoes.size >= 2)
    .map(([desafioId, dados]) => ({
      desafioId,
      desafioCodigo: dados.codigo,
      resumo: dados.resumo,
      sessoes: dados.sessoes.size,
      deN: totalSessoes,
    }))
    .sort((a, b) => b.sessoes - a.sessoes || a.desafioCodigo - b.desafioCodigo);

  return {
    total: achados.length,
    porStatus,
    porTipo: contar(DESAFIO_TIPO_ORDER, DESAFIO_TIPOS, achados.map((a) => a.tipo)),
    porSeveridade: contar(
      DESAFIO_SEVERIDADE_ORDER,
      DESAFIO_SEVERIDADES,
      achados.map((a) => a.severidade),
    ),
    porCategoria: taxonomiaContagem(
      achados.map((a) => a.categoria),
      "Sem categoria",
    ),
    porFluxo: taxonomiaContagem(achados.map((a) => a.fluxo), "Sem fluxo"),
    recorrentes,
  };
}

export function computeUsabilidadeDashboard({
  sessoes,
  achados,
}: {
  sessoes: readonly SessaoDashboardRow[];
  achados: readonly AchadoDashboardRow[];
}): UsabilidadeDashboard {
  const medias: Record<string, Media> = {};
  const distribuicoes: Record<string, Distribuicao> = {};

  for (const pergunta of TODAS_AS_PERGUNTAS) {
    if (pergunta.forma.tipo === "escala" || pergunta.forma.tipo === "duracao") {
      medias[pergunta.id] = mediaDe(pergunta, sessoes);
      continue;
    }
    if (pergunta.forma.tipo === "escolha") {
      distribuicoes[pergunta.id] = distribuicaoDe(pergunta, sessoes);
    }
  }

  return {
    sessoes: sessoes.length,
    porPerfil: contar(
      TESTE_PERFIL_ORDER,
      TESTE_PERFIS,
      sessoes.map((sessao) => sessao.perfil),
    ),
    porFluxo: contar(
      TESTE_FLUXO_ORDER,
      TESTE_FLUXOS,
      sessoes.map((sessao) => sessao.fluxo),
    ),
    medias,
    distribuicoes,
    funil: ETAPAS_FUNIL.map((etapa) => etapaDe(etapa, sessoes)),
    achados: leituraAchados(achados, sessoes.length),
  };
}

/*
 * Formatação — travessão para `sem_dados`, e a RÉGUA sempre junto. "5,1" sozinho
 * não diz se foi bom; "5,1 de 7" diz.
 */
export function formatarMedia(media: Media): string {
  if (media.status === "sem_dados") return "—";
  const valor = media.media.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return media.max > 0 ? `${valor} de ${media.max}` : `${valor} min`;
}

// "5 de 8" é a leitura primária com amostra pequena; a porcentagem acompanha,
// nunca substitui — 5/8 e 12/19 arredondam para o mesmo 63%.
export function formatarProporcao(n: number, deN: number): string {
  if (deN <= 0) return "—";
  const pct = Math.round((n / deN) * 100);
  return `${n} de ${deN} (${pct}%)`;
}

export function podeRanquear(media: Media): boolean {
  return media.status === "medido" && media.n >= MIN_RESPOSTAS_PARA_RANQUEAR;
}

// As perguntas comuns sobre o número, com os dados DESTE link.
//
// Quem preenche a calculadora quase nunca é quem assina: é quem vai levar o
// número para a mesa e defendê-lo. Por isso a peça é munição para a defesa
// dela, não um interrogatório contra ela — e por isso não se chama nem se
// comporta como roteiro de contorno de objeção. Nomear a técnica ("objeções",
// "o que o CFO vai perguntar") entregaria o jogo e queimaria a credibilidade
// que o resto da tela passa cinco passos construindo; além disso presumiria o
// cargo de quem lê, que tanto pode ser o CFO quanto o gerente que fala com ele.
//
// A copy é escrita a partir do motor, nunca transcrita do guia interno: o guia
// descreve uma versão anterior da oferta (desconto por prazo, contrato de 18
// meses, plano "Enterprise", haircut em quatro das cinco alavancas) que esta
// calculadora não implementa. Citar aquilo seria entregar um número que a tela
// ao lado desmente — o oposto do objetivo.
//
// Módulo puro: recebe o resultado já calculado e devolve texto. Sem resultado
// (time incompleto), as respostas existem sem número — a pergunta continua
// respondida, só não é ilustrada. Nunca número parcial (P6).

import type { LinhaCenario } from "./cenarios-comparacao";
import { CENARIOS, MAX_TIMES, PLANOS } from "./constants";
import {
  formatBRL,
  formatMeses,
  formatNumero,
  formatPct,
  formatX,
} from "./format";
import { horasDoPlano, PREMISSAS_PADRAO, type PremissasRacional } from "./premissas";
import type {
  Cenario,
  EntradasTime,
  PlanoId,
  PrecoConta,
  ResultadoCoi,
  ResultadoTime,
} from "./types";

type ResultadoOk = Extract<ResultadoTime, { status: "ok" }>;

export type FaqContexto = {
  resultado: ResultadoOk | null;
  entradas: EntradasTime | null;
  proposta: { plano: PlanoId; assentos: number } | null;
  preco: PrecoConta;
  prazoMeses: number;
  comparacao: LinhaCenario[] | null;
  // Custo da inação do time em foco. `null` enquanto ele estiver incompleto —
  // a resposta existe sem número, como todas as outras.
  coi: ResultadoCoi | null;
  multiTime: boolean;
  premissas?: PremissasRacional;
};

// Três frentes por onde o número é atacado. Doze perguntas numa lista plana
// viram paredão: agrupadas, quem tem a dúvida acha a sua sem ler as outras.
export type GrupoPergunta = "numero" | "decisao" | "programa";

export const GRUPOS: Record<GrupoPergunta, { titulo: string; descricao: string }> = {
  numero: {
    titulo: "Sobre o cálculo",
    descricao: "Como os números desta tela são construídos.",
  },
  decisao: {
    titulo: "Sobre custo e risco",
    descricao: "Investimento, prazo e exposição.",
  },
  programa: {
    titulo: "Sobre o programa",
    descricao: "O que muda na prática, e o que dura.",
  },
};

export type PerguntaCfo = {
  id: string;
  grupo: GrupoPergunta;
  pergunta: string;
  paragrafos: string[];
};

function linhaCenario(
  comparacao: LinhaCenario[] | null,
  cenario: Cenario,
): LinhaCenario | null {
  return comparacao?.find((linha) => linha.cenario === cenario) ?? null;
}

export function perguntasCfo(ctx: FaqContexto): PerguntaCfo[] {
  const r = ctx.resultado;
  const e = ctx.entradas;
  const { preco, prazoMeses, comparacao } = ctx;
  const p = ctx.premissas ?? PREMISSAS_PADRAO;
  const pctHaircut = Math.round((1 - p.haircut) * 100);

  const cons = linhaCenario(comparacao, "conservador");
  const real = linhaCenario(comparacao, "realista");
  const otim = linhaCenario(comparacao, "otimista");

  const exposicaoTotal = preco.mensal > 0 ? preco.mensal * prazoMeses : null;
  const custoGestorAno =
    e?.salarioGestor != null ? e.salarioGestor * p.encargos * 12 : null;
  const horasPorVendedorMes = ctx.proposta
    ? horasDoPlano(ctx.proposta.plano, p)
    : null;
  const ancoragem = r?.linhasNaoSomadas.find((l) => l.id === "ancoragem_hora_roleplay");
  const timeEmRampa = r?.linhasNaoSomadas.find((l) => l.id === "custo_time_em_rampa");

  const perguntas: PerguntaCfo[] = [];

  // 1 -------------------------------------------------------------------
  perguntas.push({
    id: "inflado",
    grupo: "numero",
    pergunta: "Como o modelo evita ser otimista demais?",
    paragrafos: [
      `O cenário que abre a tela é o Conservador, não o Otimista: ${CENARIOS.conservador.descricao}. Ele é o default justamente porque é o número com que se decide.`,
      `Três das quatro alavancas de performance — rampa, conversão e ciclo — entram com desconto de ${pctHaircut}% antes de somar. Só o ticket passa inteiro, porque é a única mudança que o CRM mede direto no valor do negócio fechado. A eficiência não leva desconto porque já tem dois freios próprios: nunca supera o valor da prática que o plano entrega (o teto) e desconta ${formatPct(p.supervisao * 100, 0)} de supervisão que continua sendo necessária.`,
      r
        ? `Nesta simulação, a checagem de realidade fica em ${formatPct(r.checagemRealidadePct, 1)}: é o quanto os ganhos de performance representam da margem anual do time hoje. O limite que usamos é ${formatPct(p.checagemAlerta * 100, 0)} — ${
            r.checagemAlerta
              ? "acima dele, como aqui, a projeção pede ceticismo e vale reduzir o cenário antes de decidir."
              : "abaixo dele, a projeção cabe dentro da estrutura de margem que a operação já tem."
          }`
        : `Existe ainda uma checagem de realidade: os ganhos de performance não podem representar mais que ${formatPct(p.checagemAlerta * 100, 0)} da margem anual do time — acima disso o próprio modelo avisa que a conta pede ceticismo.`,
    ],
  });

  // 2 -------------------------------------------------------------------
  perguntas.push({
    id: "soft-savings",
    grupo: "numero",
    pergunta: "Onde esse ganho aparece no P&L?",
    paragrafos: [
      r && e
        ? `São duas naturezas diferentes, e a tela separa as duas. A eficiência (${formatBRL(r.eficienciaAno)}/ano) é custo que deixa de existir: é exatamente o valor do caminho que você declarou que seguiria sem a Perfecting. A performance (${formatBRL(r.G)}/ano) é margem nova sobre a receita que o time já produz.`
        : "São duas naturezas diferentes, e a tela separa as duas: a eficiência é custo que deixa de existir — o valor do caminho que você seguiria sem a Perfecting — e a performance é margem nova sobre a receita que o time já produz.",
      r
        ? `Cada alavanca tem um lugar no P&L e um rastro no CRM: ticket (${formatBRL(r.parcelas.margemTicketAno)}/ano) aparece no valor médio do negócio fechado; conversão (${formatBRL(r.parcelas.ganhoConversaoAno)}/ano) na razão entre oportunidades trabalhadas e ganhas; rampa (${formatBRL(r.parcelas.margemRampaAno)}/ano) no tempo até o vendedor novo bater meta${
            r.parcelas.ganhoCicloAno !== null
              ? `; ciclo (${formatBRL(r.parcelas.ganhoCicloAno)}/ano) nos dias entre abertura e fechamento.`
              : "."
          }`
        : "Cada alavanca tem um lugar no P&L e um rastro no CRM: ticket no valor médio do negócio fechado, conversão na razão entre oportunidades trabalhadas e ganhas, rampa no tempo até o vendedor novo bater meta, ciclo nos dias entre abertura e fechamento.",
      "Nenhum desses números é medição: são projeções sobre premissas que você declarou. O que propomos é medir o baseline no piloto e comparar contra estas mesmas linhas.",
    ],
  });

  // 3 -------------------------------------------------------------------
  perguntas.push({
    id: "nao-gruda",
    grupo: "programa",
    pergunta: "Por que isto funcionaria melhor que treinamento tradicional?",
    paragrafos: [
      horasPorVendedorMes !== null && e?.horasPraticaPorRepHoje != null
        ? `A diferença primeira é volume. O plano ${PLANOS[ctx.proposta!.plano].label} entrega ${formatNumero(horasPorVendedorMes, 0)} h de prática por vendedor por mês; hoje, pelos seus próprios números, cada vendedor coberto recebe ${formatNumero(e.horasPraticaPorRepHoje, 1)} h. Repetição muda comportamento; palestra não.`
        : "A diferença primeira é volume: prática medida em horas por vendedor por mês, contra as poucas horas por trimestre que um treinamento em sala entrega. Repetição muda comportamento; palestra não.",
      "A segunda é registro. Cada sessão de roleplay é gravada e pontuada, então adoção e evolução de habilidade aparecem antes de chegarem ao CRM — você audita o mecanismo funcionando sem esperar o resultado financeiro.",
      "A terceira é custo marginal. Coaching escala com o número de gestores; aqui a hora adicional entra pela tabela de preços por tier, e volume maior derruba a taxa de TODAS as horas, sem abrir linha nova de orçamento.",
    ],
  });

  // 4 -------------------------------------------------------------------
  perguntas.push({
    id: "payback",
    grupo: "decisao",
    pergunta: "Em quanto tempo o investimento se paga?",
    paragrafos: [
      cons && real && otim
        ? `A faixa desta simulação: ${formatMeses(cons.paybackMeses)} no Conservador, ${formatMeses(real.paybackMeses)} no Realista e ${formatMeses(otim.paybackMeses)} no Otimista. Os três estão na comparação de cenários, calculados com os mesmos números da sua operação.`
        : "A tela mostra o payback nos três cenários lado a lado, calculados com os mesmos números da sua operação — a decisão se toma sobre a faixa, não sobre um número só.",
      r && r.paybackMeses > prazoMeses
        ? `Vale o alerta que a tela já dá: com o prazo de ${prazoMeses} meses que está selecionado, o contrato termina antes de a conta se pagar (${formatMeses(r.paybackMeses)}). Um prazo maior, mais assentos ou um cenário revisto resolvem — mas a conta precisa fechar antes da assinatura, não depois.`
        : `Com o prazo de ${prazoMeses} meses selecionado, o payback projetado cabe dentro do contrato.`,
      "Separe as duas coisas: a prova operacional (adoção, horas praticadas, evolução de pontuação) aparece na plataforma nas primeiras semanas; o payback financeiro vem depois, no CRM. Você não precisa esperar o segundo para verificar o primeiro — e é isso que um piloto com baseline acordado compra.",
    ],
  });

  // 5 -------------------------------------------------------------------
  perguntas.push({
    id: "adocao",
    grupo: "numero",
    pergunta: "E se a adoção do time for baixa?",
    paragrafos: [
      r && e?.numVendedores != null && ctx.proposta
        ? `O modelo já não assume adoção total. Toda alavanca de performance é multiplicada pela cobertura — assentos dividido por vendedores, no máximo 1. Aqui são ${formatNumero(ctx.proposta.assentos, 0)} assentos para ${formatNumero(e.numVendedores, 0)} vendedores, ou seja ${formatPct(r.cobertura * 100, 0)} de cobertura, e é esse fator que está aplicado nos números da tela.`
        : "O modelo já não assume adoção total: toda alavanca de performance é multiplicada pela cobertura (assentos dividido por vendedores, no máximo 1). Comprar assentos para metade do time projeta metade do ganho de performance, não o ganho inteiro.",
      "Reduza os assentos na seção “Quanto custa” e observe: o ROI cai junto. Não existe configuração em que comprar menos assentos melhore o retorno projetado — isso é uma trava permanente do modelo, com teste automatizado para garantir.",
      "Se a preocupação for real, o caminho é começar menor: um piloto com parte do time, medindo adoção antes de estender.",
    ],
  });

  // 6 -------------------------------------------------------------------
  perguntas.push({
    id: "budget",
    grupo: "decisao",
    pergunta: "Como isso se compara ao que já gastamos hoje?",
    paragrafos: [
      preco.mensal > 0 && custoGestorAno !== null
        ? `Uma referência de tamanho: ${formatBRL(preco.mensal)}/mês dão ${formatBRL(preco.mensal * 12)}/ano, contra ${formatBRL(custoGestorAno)}/ano de um único gestor de treino com encargos, pelo salário que você declarou. A comparação relevante não é com zero — é com o custo do caminho que a operação seguiria de qualquer jeito.`
        : `A comparação relevante não é com zero, e sim com o custo do caminho que a operação seguiria de qualquer jeito: horas de gestor, consultoria externa ou eventos.`,
      timeEmRampa?.valorAno != null
        ? `Há também o custo que já está na folha: ${formatBRL(timeEmRampa.valorAno)}/ano em salário de vendedores que ainda não rendem o que consomem. Encurtar a rampa não economiza esse salário — faz a mesma folha render antes.`
        : "Há também o custo que já está na folha e ninguém contabiliza: o salário de vendedores em rampa, que são pagos enquanto ainda não rendem o que consomem.",
      `A tabela de preços começa na cobrança mínima de ${formatBRL(p.taxaMinima)}/mês, então dá para entrar pelo menor escopo defensável e crescer com evidência — sem overage e sem linha surpresa.`,
    ],
  });

  // 7 -------------------------------------------------------------------
  perguntas.push({
    id: "decaimento",
    grupo: "programa",
    pergunta: "O retorno se mantém depois do primeiro ano?",
    paragrafos: [
      "As alavancas se dividem em duas naturezas. Rampa e conversão são ganhos estruturais: o vendedor que rampou mais rápido não volta a rampar, e taxa de conversão que sobe não regride sozinha — regride se a prática parar. Eficiência e ciclo são operacionais: valem enquanto a prática existir, e se acumulam conforme o hábito se instala.",
      e?.contratacoesAno != null
        ? `A rampa, em especial, volta a disparar a cada nova leva: com ${formatNumero(e.contratacoesAno, 0)} contratações por ano declaradas, cada coorte nova passa pelo mesmo ganho, ao mesmo custo de plataforma.`
        : "A rampa, em especial, volta a disparar a cada nova leva de contratações — cada coorte nova passa pelo mesmo ganho, ao mesmo custo de plataforma.",
      "O preço não sobe com o uso dentro do escopo contratado, e o prazo trava a tabela. Custo estável com ganhos que se acumulam significa retorno melhor no segundo ano — não porque a projeção cresce sozinha, mas porque o denominador para de crescer.",
    ],
  });

  // 8 -------------------------------------------------------------------
  perguntas.push({
    id: "alternativas",
    grupo: "programa",
    pergunta: "Como isso se compara a coaching interno ou a um LMS?",
    paragrafos: [
      ancoragem?.detalhe?.custoHoraPraticaGestor != null
        ? `A comparação que importa é com onde o orçamento já vai hoje. Uma hora de prática conduzida pelos seus gestores custa ${formatBRL(ancoragem.detalhe.custoHoraPraticaGestor, 2)} — salário com encargos, multiplicado pelo tempo de preparação e feedback que cada hora de prática consome na sua operação. A mesma hora pela Perfecting sai a ${formatBRL(ancoragem.detalhe.custoHoraPerfecting ?? null, 2)}.`
        : "A comparação que importa é com onde o orçamento já vai hoje: a hora de prática conduzida por gestores custa salário com encargos multiplicado pelo tempo de preparação e feedback que ela consome.",
      "Essa comparação por hora é ancoragem, e não entra no ROI: somar a economia do caminho declarado e a diferença de preço por hora seria contar o mesmo benefício duas vezes. A tela marca essa linha como não somada exatamente por isso.",
      "Contra um LMS, a diferença não é o catálogo: é que a prática é conversacional e pontuada, então existe evidência de mudança de comportamento, não só de conclusão de módulo. Contra não fazer nada, o custo de oportunidade é o que a tela projeta.",
    ],
  });

  // 9 -------------------------------------------------------------------
  perguntas.push({
    id: "contrato",
    grupo: "decisao",
    pergunta: "Qual é a exposição se não funcionar?",
    paragrafos: [
      exposicaoTotal !== null
        ? `A exposição é fechada e você escolheu o tamanho dela: ${formatBRL(preco.mensal)}/mês por ${prazoMeses} meses, ou seja ${formatBRL(exposicaoTotal)} no total do compromisso. Não há overage, cobrança por uso nem linha variável.`
        : "A exposição é fechada e você escolhe o tamanho dela na seção “Quanto custa”: mensalidade vezes o prazo, sem overage, cobrança por uso ou linha variável.",
      "Prazo aqui não compra desconto — compra garantia. Três e seis meses não travam nada; doze travam o preço por hora contra reajuste; vinte e quatro travam o preço e ainda sobem o nível de serviço um degrau. Se a dúvida é sobre funcionar, o prazo curto é a resposta correta, e ele não custa mais caro por hora.",
      "O caminho de menor risco é o piloto: prazo curto, escopo do time onde a mudança é mais mensurável, baseline acordado antes de começar. Se a evidência vier, estende-se com dado real em vez de projeção.",
    ],
  });

  // 10 ------------------------------------------------------------------
  perguntas.push({
    id: "auditoria",
    grupo: "numero",
    pergunta: "Como eu verifico essas premissas por conta própria?",
    paragrafos: [
      "Todo número desta tela vem de um campo que você preencheu ou de uma premissa declarada — e as duas coisas são editáveis aqui mesmo. Mude qualquer valor em “Seus números” e o resultado inteiro recalcula na hora, incluindo a comparação de cenários.",
      "Cada linha do resultado declara a origem: dado seu, premissa nossa, projeção, ou “não somado ao ROI”. As linhas com esse último selo aparecem de propósito e ficam fora da conta — é onde outras calculadoras costumam inflar o número.",
      "O extrato do preço mostra o tier em que a conta caiu e a conta inteira; o Resumo no fim da página imprime em uma folha, com as travas do modelo listadas; e o Glossário, no topo, define cada termo. Se algum número não se explicar por esse caminho, é falha nossa e queremos saber.",
    ],
  });

  // 11 ------------------------------------------------------------------
  perguntas.push({
    id: "custo-inacao",
    grupo: "numero",
    pergunta: "O custo de não agir não está inflado?",
    paragrafos: [
      `Ele é medido com os seus números, não com médias de mercado: a lacuna sai da diferença entre a prática que hoje chega ao time e o mínimo de ${p.coi.horasCoachingMin} h por vendedor ao mês. Onde a prática já cobre esse mínimo, a linha correspondente é zero — não existe crédito por cobrir mais do que o necessário.`,
      `Cada uma das cinco linhas carrega exatamente um desconto de conservadorismo declarado, e nenhuma delas usa receita: tudo é convertido à sua margem de contribuição antes de aparecer. A reposição de quem sai ainda é travada pelo número de contratações que você declarou — ninguém perde mais gente do que repõe.`,
      ctx.coi
        ? `Nesta simulação a lacuna soma ${formatBRL(ctx.coi.totalAno)} por ano, ${formatPct(ctx.coi.checagemPct, 1)} da margem anual do time. ${
            ctx.coi.checagemAlerta
              ? `Acima dos ${formatPct(p.checagemAlerta * 100, 0)} que usamos como limite, vale conferir os dados de estrutura antes de levar o número adiante.`
              : `Fica abaixo dos ${formatPct(p.checagemAlerta * 100, 0)} que usamos como limite de plausibilidade.`
          } Nada disso entra no retorno: o valor do programa aparece descontado dessa lacuna, nunca somado a ela — seria contar a mesma economia duas vezes.`
        : "Nada disso entra no retorno: quando o resultado aparecer, o valor do programa será mostrado descontado dessa lacuna, nunca somado a ela — seria contar a mesma economia duas vezes.",
    ],
  });

  // 12 ------------------------------------------------------------------
  perguntas.push({
    id: "governanca",
    grupo: "decisao",
    pergunta: "O que eu levo para o comitê?",
    paragrafos: [
      "O Resumo, no fim desta página, foi feito para essa reunião: imprime em uma folha com a síntese, os indicadores, as travas do modelo e o disclaimer — sem hero, sem controles, sem nada que pareça material de vendas.",
      cons && otim
        ? `Leve a faixa, não o ponto: ${formatX(cons.roi)} no Conservador e ${formatX(otim.roi)} no Otimista, com a checagem de realidade explícita. Um comitê desconfia de número único; desconfia menos de um intervalo com o método à vista.`
        : "Leve a faixa dos três cenários, não um número único, com a checagem de realidade explícita: comitê desconfia de número único, e desconfia menos de um intervalo com o método à vista.",
      "Se ajudar, o link continua acessível: qualquer pessoa do comitê pode abrir, mudar uma premissa e ver o efeito durante a própria discussão.",
    ],
  });

  // 13 ------------------------------------------------------------------
  perguntas.push({
    id: "tamanho",
    grupo: "programa",
    pergunta: "O modelo serve para o tamanho da minha operação?",
    paragrafos: [
      `A calculadora aceita de um a ${MAX_TIMES} times, cada um com números próprios, e consolida a conta ponderando por valor e investimento — nunca pela média dos retornos individuais.`,
      preco.horasMes > 0
        ? `O preço acompanha o volume pela tabela de tiers: suas ${formatNumero(preco.horasMes, 0)} h/mês caem no Tier ${preco.tier.tier} e saem a ${formatBRL(preco.taxaCombinada, 2)}/hora — a taxa vale para a hora inteira, e volume maior desce o tier de todas elas. Operação pequena entra pela cobrança mínima.`
        : "O preço acompanha o volume pela tabela de tiers: operação pequena entra pela cobrança mínima, e volume maior desce a taxa por hora de toda a conta, não só das horas adicionais.",
      "Se times diferentes têm realidades diferentes, simule cada um separadamente — e, quando os mesmos gestores atendem vários, declare a estrutura uma vez só: o rateio evita contar a mesma economia duas vezes.",
    ],
  });

  return perguntas;
}

// Nota de rodapé da seção, com o teto de ciclo citado por extenso — é a trava
// que mais gera pergunta e não cabe numa objeção só.
export function faqNota(p: PremissasRacional = PREMISSAS_PADRAO): string {
  const pctHaircut = Math.round((1 - p.haircut) * 100);
  return `Todas as respostas usam os números desta simulação. As travas do modelo (desconto de ${pctHaircut}% em rampa, conversão e ciclo; teto de ${formatPct(p.reducaoCicloMax * 100, 0)} na redução do ciclo; teto de funil; cobertura por assentos) estão aplicadas nos valores da tela, não só descritas aqui.`;
}

export const FAQ_NOTA = faqNota();

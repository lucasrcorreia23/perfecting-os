// Referência de fórmulas do motor — o que o time consulta quando alguém
// pergunta "de onde sai esse número".
//
// A fonte documental é o `Referencia-Completa-Formulas-ROI-Perfecting.pdf`
// (Template de 18/08/2026), que descreve célula a célula a planilha. Este
// módulo NÃO transcreve aquele PDF: ele descreve o que o NOSSO motor faz e
// aponta, em cada entrada, a célula equivalente e a função onde a conta vive.
//
// A diferença importa. Transcrever criaria um segundo lugar onde os números
// moram, e ele passaria a mentir no primeiro ajuste do motor. Aqui todo número
// citado é interpolado de `constants.ts`, e `referencia.test.ts` falha se
// algum se soltar da constante. Quando a planilha e o código divergem — e
// divergem em quatro pontos do motor e do preço, de propósito, além das
// correções do COI — quem manda nesta tela é o código, e a divergência vem
// declarada na própria entrada.
//
// Módulo puro, sem JSX: a tela em `referencia-formulas.tsx` só renderiza.

import {
  CENARIOS,
  CHECAGEM_ALERTA,
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
  NIVEIS_SERVICO,
  PCT_EVENTO_SUBSTITUIVEL,
  PLANOS,
  PRAZO_DEGRAU_SERVICO,
  TABELA_TIERS,
  COI_CUSTO_SUBSTITUICAO,
  COI_DELTA_ATTAINMENT,
  COI_FRACAO_COACHAVEL,
  COI_FONTES,
  COI_HAIRCUT,
  COI_HORAS_COACHING_MIN,
  COI_HORAS_PERDIDAS_SEMANA,
  COI_NO_DECISION,
  COI_RAMPA_EXTENSAO_MESES,
  COI_RAMPA_PRODUTIVIDADE,
  COI_RETENCAO_COM,
  COI_RETENCAO_SEM,
  COI_SEMANAS_ESPERA,
  REDUCAO_CICLO_MAX,
  SUPERVISAO,
  TAXA_MINIMA,
  TRAJETORIA_MESES,
} from "./constants";
import { CICLO_DIAS_MINIMO } from "./calc";
import { formatFaixaTier } from "./format";

export type SecaoId =
  | "derivados"
  | "assentos"
  | "escopo"
  | "eficiencia"
  | "deltas"
  | "receita"
  | "ciclo"
  | "resultado"
  | "preco"
  | "conta"
  | "referencia-nao-somada"
  | "coi"
  | "fora-da-planilha";

export type EntradaReferencia = {
  id: string;
  secao: SecaoId;
  /** Célula equivalente na planilha. `—` quando a regra não existe lá. */
  celula: string;
  titulo: string;
  /** A conta, em notação de leitura — não é código executável. */
  formula: string;
  explicacao: string;
  /** Arquivo#símbolo onde a conta vive de verdade. */
  codigo: string;
  /** Preenchido só onde o nosso motor se afasta da planilha de propósito. */
  divergencia?: string;
};

export const SECOES: { id: SecaoId; titulo: string; descricao: string }[] = [
  {
    id: "derivados",
    titulo: "Parâmetros derivados e porta de entrada",
    descricao:
      "O que o motor calcula antes de qualquer aritmética: rateio da estrutura compartilhada e a checagem de completude que libera (ou não) o resultado.",
  },
  {
    id: "assentos",
    titulo: "Assentos e horas",
    descricao: "Quantas horas de prática a proposta compra por mês.",
  },
  {
    id: "escopo",
    titulo: "Fator de escopo e cobertura",
    descricao:
      "Quantas horas de gestor cada hora de prática consome hoje, e que fração do time a proposta alcança.",
  },
  {
    id: "eficiencia",
    titulo: "Eficiência — o que deixa de ser gasto",
    descricao:
      "O custo do caminho que a empresa seguiria sem a Perfecting, limitado pelo valor da prática que o plano entrega.",
  },
  {
    id: "deltas",
    titulo: "Cenários e ajuste fino",
    descricao:
      "Os quatro deltas de performance: de onde saem, e os tetos que nenhum slider relaxa.",
  },
  {
    id: "receita",
    titulo: "Ganhos de receita",
    descricao: "Ticket, rampa e conversão — as três alavancas sempre disponíveis.",
  },
  {
    id: "ciclo",
    titulo: "Ganho de ciclo",
    descricao:
      "A quarta alavanca, que só existe quando o passo de funil está preenchido, e o teto que o próprio funil impõe.",
  },
  {
    id: "resultado",
    titulo: "Resultado do time",
    descricao: "A soma, o ROI, o payback e a checagem de realidade.",
  },
  {
    id: "preco",
    titulo: "Preço",
    descricao: "A tabela de preços por tier sobre as horas da conta, o piso e o rateio por time.",
  },
  {
    id: "conta",
    titulo: "Consolidação da conta",
    descricao: "Como vários times viram um número só.",
  },
  {
    id: "referencia-nao-somada",
    titulo: "Linhas de referência (não somadas ao ROI)",
    descricao:
      "Números que a tela mostra para dar contexto e que ficam DE FORA do valor anual, de propósito.",
  },
  {
    id: "coi",
    titulo: "Custo da Inação (não somado ao ROI)",
    descricao:
      "A leitura contrafactual: quanto vaza hoje. Vem da aba “Custo da Inação” de ROI_Perfecting_Corrigido.xlsx (19/08/2026), que é INSUMO e não fonte — o Template e o PDF seguem mandando no motor. Nada daqui entra no valor anual.",
  },
  {
    id: "fora-da-planilha",
    titulo: "Fora da planilha",
    descricao:
      "Regras que existem só no nosso motor, porque a planilha é omissa. Aqui o racional V5 é a fonte.",
  },
];

const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

// A tabela como ela vai ao cliente: faixa, taxa e a economia contra o Tier 1
// (a coluna E da aba, `=1-D/D7`) — é essa coluna que só faz sentido com a taxa
// cheia, e foi ela que decidiu a leitura.
const tiersTexto = TABELA_TIERS.map((faixa, i) => {
  const de = i === 0 ? 0 : TABELA_TIERS[i - 1].ateHoras + 1;
  const economia = 1 - faixa.taxaHora / TABELA_TIERS[0].taxaHora;
  const rotulo = formatFaixaTier({ deHoras: de, ateHoras: faixa.ateHoras }, "h");
  return `Tier ${faixa.tier}: ${rotulo} → R$ ${num(faixa.taxaHora)}/h${
    economia > 0 ? ` (${pct(economia)} abaixo do Tier 1)` : ""
  }`;
}).join("\n");

const planosTexto = (Object.keys(PLANOS) as (keyof typeof PLANOS)[])
  .map((id) => `${PLANOS[id].label} ${PLANOS[id].horasMes} h`)
  .join(" · ");

const cenariosTexto = (Object.keys(CENARIOS) as (keyof typeof CENARIOS)[])
  .map(
    (c) =>
      `${CENARIOS[c].label}: ticket ${pct(CENARIOS[c].ticketPct)}, rampa ${pct(CENARIOS[c].rampaPct)}, ciclo ${pct(CENARIOS[c].cicloPct)}, conversão ${num(CENARIOS[c].convPp)} p.p.`,
  )
  .join("  ·  ");

export const REFERENCIA: EntradaReferencia[] = [
  // ── Parâmetros derivados ────────────────────────────────────────────────
  {
    id: "rateio-estrutura",
    secao: "derivados",
    celula: "Motor!C8–C14",
    titulo: "Rateio da estrutura de capacitação compartilhada",
    formula:
      "peso_i = vendedores_i ÷ Σ vendedores\n\nrateados por peso: nº de gestores, custo externo/ano, custo de evento/ano\npassam inalterados: horas por gestor, vendedores por gestor, salário do gestor",
    explicacao:
      "Quando os mesmos gestores atendem vários times, declarar a estrutura em cada um contaria a mesma economia N vezes. O rateio é uma transformação pura aplicada ANTES do cálculo, então nem o motor nem o consolidado sabem que ele existe. O fator de escopo é indiferente ao rateio: o nº de gestores aparece no numerador e no denominador da fração e cancela.",
    codigo: "estrutura.ts#aplicarEstrutura",
  },
  {
    id: "gate-completude",
    secao: "derivados",
    celula: "Motor!C15",
    titulo: "Porta de entrada: o time está completo?",
    formula:
      "13 campos obrigatórios preenchidos e no domínio\n+ custo externo, se o caminho declarado é “treinamento externo”\n+ custo do evento, se o caminho declarado é “evento presencial”\n\nincompleto ⇒ não existe número (travessão), nunca resultado parcial",
    explicacao:
      "Valor negativo, não finito, ou conversão/margem acima de 100 contam como faltando. O resultado é união discriminada: sem os campos, não há objeto de números para ler — é o que impede NaN e zero indevido de chegarem à tela.",
    codigo: "calc.ts#camposFaltando",
    divergencia:
      "A planilha exige gestores, horas por gestor, vendedores por gestor e prática atual MAIORES que zero. Aceitamos zero: um time sem nenhum programa de treino existe, e é justamente o caso em que a eficiência é toda ganho. Superset consciente. Em sentido inverso, exigimos o custo do evento quando o caminho é “evento presencial” — a planilha só exige no “externo”, e lá o branco vira zero por N() e apaga a eficiência inteira sem avisar.",
  },

  // ── Assentos e horas ────────────────────────────────────────────────────
  {
    id: "horas-plano",
    secao: "assentos",
    celula: "Motor!C18",
    titulo: "Horas de prática por assento/mês",
    formula: planosTexto,
    explicacao:
      "O plano define consumo, não preço. O preço vem do volume total de horas da conta, pela tabela de tiers.",
    codigo: "constants.ts#PLANOS",
  },
  {
    id: "assentos-efetivos",
    secao: "assentos",
    celula: "Motor!C19",
    titulo: "Assentos efetivos",
    formula:
      "assentos_efetivos = MIN(assentos declarados, vendedores do time)\nassentos em branco = o time inteiro",
    explicacao:
      "A cobertura satura em 1, então assento acima do tamanho do time não gera retorno — e cobrá-lo derrubaria o ROI por uma escolha que não muda o valor. O estado guarda o que a pessoa digitou e o teto é derivado, então aumentar o time devolve os assentos.",
    codigo: "modelo.ts#assentosEfetivos",
  },
  {
    id: "horas-time",
    secao: "assentos",
    celula: "Motor!C20",
    titulo: "Horas do time por mês",
    formula: "horas_time = assentos_efetivos × horas_por_assento",
    explicacao: "É o que entra no volume que escolhe o tier da conta.",
    codigo: "preco.ts#horasDoTime",
  },
  {
    id: "custo-hora-gestor",
    secao: "assentos",
    celula: "Motor!C21",
    titulo: "Custo do gestor por hora",
    formula: `custo_hora = salário mensal × ${num(ENCARGOS)} ÷ ${num(JORNADA_MENSAL_H)} h`,
    explicacao: `Encargos de ${num(ENCARGOS)} (cada R$ 1 de salário custa R$ ${num(ENCARGOS)} para a empresa) sobre uma jornada de ${num(JORNADA_MENSAL_H)} horas úteis por mês.`,
    codigo: "calc.ts#calcResultadoTime",
  },

  // ── Escopo e cobertura ──────────────────────────────────────────────────
  {
    id: "fator-escopo",
    secao: "escopo",
    celula: "Motor!C28–C31",
    titulo: "Fator de escopo",
    formula: `horas_gestor_mês = horas por gestor × nº de gestores
horas_prática_entregues = (vendedores por gestor × nº de gestores) × prática por vendedor

declarado = horas_gestor_mês ÷ horas_prática_entregues
fator = declarado, se estiver em [${num(FATOR_ESCOPO_MIN)} ; ${num(FATOR_ESCOPO_MAX)}]
fator = ${num(FATOR_ESCOPO_PREMISSA)} (premissa), caso contrário`,
    explicacao: `Quantas horas de gestor cada hora de prática consome. Fora da faixa [${num(FATOR_ESCOPO_MIN)} ; ${num(FATOR_ESCOPO_MAX)}] o número declarado é implausível e cai na premissa de ${num(FATOR_ESCOPO_PREMISSA)}. Fator declarado abaixo de 1 significa treino em grupo — a tela avisa, porque muda a leitura da economia.`,
    codigo: "calc.ts#fatorEscopoDeclarado",
  },
  {
    id: "cobertura",
    secao: "escopo",
    celula: "Motor!C34",
    titulo: "Cobertura",
    formula: "cobertura = MIN(1, assentos_efetivos ÷ vendedores)",
    explicacao:
      "Multiplica as QUATRO alavancas de performance e nunca a eficiência: metade do time com assento entrega metade do ganho de receita, mas a economia do caminho declarado não se divide assim.",
    codigo: "calc.ts#calcResultadoTime",
  },

  // ── Eficiência ──────────────────────────────────────────────────────────
  {
    id: "teto-eficiencia",
    secao: "eficiencia",
    celula: "Motor!C39",
    titulo: "Teto da eficiência (valor da prática entregue)",
    formula: `teto = horas_prática_mês × fator_escopo × custo_hora_gestor × (1 − ${num(SUPERVISAO)}) × 12`,
    explicacao: `O que a prática que o plano entrega valeria em hora de gestor. A supervisão residual de ${pct(SUPERVISAO)} é o tempo de gestor que continua necessário mesmo com a Perfecting — só ${pct(1 - SUPERVISAO)} é substituível.`,
    codigo: "calc.ts#calcResultadoTime",
    divergencia:
      "A planilha chama esta linha de “economia de coaching” (C39) e chama de “teto” a linha do caminho declarado (C40). Os nomes estão trocados em relação aos nossos; o MIN entre as duas é idêntico.",
  },
  {
    id: "custo-caminho",
    secao: "eficiencia",
    celula: "Motor!C40",
    titulo: "Custo do caminho declarado (o contrafactual)",
    formula: `nenhum   → 0
gestores → horas por gestor × nº de gestores × custo_hora_gestor × (1 − ${num(SUPERVISAO)}) × 12
externo  → custo externo/ano × (1 − ${num(SUPERVISAO)})
evento   → custo do evento/ano × ${num(PCT_EVENTO_SUBSTITUIVEL)}`,
    explicacao: `Quanto a empresa gastaria seguindo o caminho que ela mesma declarou. No evento presencial só ${pct(PCT_EVENTO_SUBSTITUIVEL)} do custo é camada de prática substituível por prática contínua — o resto é conteúdo, logística e encontro.`,
    codigo: "calc.ts#calcResultadoTime",
  },
  {
    id: "eficiencia-ano",
    secao: "eficiencia",
    celula: "Motor!C41",
    titulo: "Eficiência (R$/ano)",
    formula: "eficiência = MIN(custo do caminho declarado, teto da eficiência)",
    explicacao:
      "A economia nunca supera o que a empresa de fato paga hoje, nem o valor da prática que o plano entrega. Quando o teto morde, a tela diz que a economia parou ali.",
    codigo: "calc.ts#calcResultadoTime",
  },

  // ── Deltas ──────────────────────────────────────────────────────────────
  {
    id: "cenarios",
    secao: "deltas",
    celula: "Premissas!C43:F45",
    titulo: "Presets de cenário",
    formula: cenariosTexto,
    explicacao:
      "Conservador é o default: é o piso da projeção, e é com ele que se decide. Otimista serve para discutir potencial, não para assinar.",
    codigo: "constants.ts#CENARIOS",
  },
  {
    id: "deltas-efetivos",
    secao: "deltas",
    celula: "Motor!C45–C50",
    titulo: "Deltas efetivos e seus tetos",
    formula: `ticket:    clamp(delta, 0, ${pct(FINE_TUNE_TICKET_MAX)})
rampa:     clamp(delta, 0, ${pct(FINE_TUNE_RAMPA_MAX)})
conversão: clamp(delta, 0, MIN(5 p.p.; conversão × 0,4; 100 − conversão))`,
    explicacao: `É o único caminho de deltas para o cálculo — preset ou parâmetro personalizado passam os dois por aqui. Os tetos de ticket e rampa ficam ACIMA do preset Otimista de propósito: o slider pode passar do cenário, nunca do modelo. O teto de conversão é dinâmico, porque ganhar 5 pontos percentuais sobre uma conversão de 2% seria triplicá-la.`,
    codigo: "calc.ts#deltasEfetivos",
  },
  {
    id: "ciclo-bifurcacao",
    secao: "deltas",
    celula: "Motor!C53–C56",
    titulo: "Delta de ciclo: dias inteiros ou percentual",
    formula: `ciclo ≥ ${CICLO_DIAS_MINIMO} dias → dias inteiros
    teto  = round(ciclo × ${pct(REDUCAO_CICLO_MAX)})
    preset: clamp(MAX(1, round(ciclo × delta_cenário)), 0, teto)
    delta_% = dias_a_menos ÷ ciclo

ciclo < ${CICLO_DIAS_MINIMO} dias → percentual contínuo, clamp(delta_cenário, 0, ${pct(REDUCAO_CICLO_MAX)})`,
    explicacao: `Abaixo de ${CICLO_DIAS_MINIMO} dias, "um dia a menos" é um salto grosso demais para ser crível, então a redução volta a ser percentual. Acima, o piso de 1 dia existe porque uma redução declarada que arredonda para zero dia não é redução.`,
    codigo: "calc.ts#deltasEfetivos",
  },

  // ── Ganhos de receita ───────────────────────────────────────────────────
  {
    id: "ganho-ticket",
    secao: "receita",
    celula: "Motor!C60",
    titulo: "Ganho de ticket / ano",
    formula:
      "ganho = receita mensal × delta_ticket × 12 × margem × cobertura",
    explicacao:
      "É a única alavanca SEM haircut. O ticket sobe por negociação melhor, e o efeito é direto na receita já existente — não depende de o funil comportar mais volume.",
    codigo: "calc.ts#calcResultadoTime",
  },
  {
    id: "ganho-rampa",
    secao: "receita",
    celula: "Motor!C61",
    titulo: "Margem de rampa / ano",
    formula: `receita_por_vendedor = receita mensal ÷ vendedores

ganho = meses de rampa × delta_rampa × receita_por_vendedor
        × contratações/ano × margem × ${num(HAIRCUT)} × cobertura`,
    explicacao: `Vendedor novo que chega ao pleno mais cedo entrega margem que não existiria. O haircut de ${num(HAIRCUT)} (desconto anti-otimismo de ${pct(1 - HAIRCUT)}) reconhece que nem toda a antecipação vira receita.`,
    codigo: "calc.ts#calcResultadoTime",
  },
  {
    id: "ganho-conversao",
    secao: "receita",
    celula: "Motor!C62",
    titulo: "Ganho de conversão / ano",
    formula: `vendas_mês = receita mensal ÷ ticket médio
oportunidades_mês = vendas_mês ÷ conversão

ganho = oportunidades_mês × (delta_p.p. ÷ 100) × ticket médio
        × margem × 12 × ${num(HAIRCUT)} × cobertura`,
    explicacao:
      "Ganho sobre as MESMAS oportunidades já trabalhadas — não pressupõe mais leads. Com haircut.",
    codigo: "calc.ts#calcResultadoTime",
  },

  // ── Ciclo ───────────────────────────────────────────────────────────────
  {
    id: "ciclo-condicao",
    secao: "ciclo",
    celula: "Motor!C63",
    titulo: "Quando o ganho de ciclo existe",
    formula:
      "existe se ciclo de venda (dias) > 0 E oportunidades mensais recebidas > 0",
    explicacao:
      "O passo 5 é opcional e vale tudo ou nada: com só um dos dois campos, a alavanca não aparece e a tela avisa que o funil ficou pela metade.",
    codigo: "calc.ts#calcResultadoTime",
  },
  {
    id: "ciclo-teto-funil",
    secao: "ciclo",
    celula: "Motor!C64–C67",
    titulo: "Capacidade liberada contra o teto do funil",
    formula: `capacidade   = vendas_mês × (1 ÷ (1 − delta_ciclo) − 1)
ociosas      = MAX(0, oportunidades recebidas − oportunidades trabalhadas)
teto_funil   = ociosas × conversão

ganho_mês = MIN(capacidade, teto_funil)`,
    explicacao:
      "Encurtar o ciclo libera capacidade de vender mais — mas só adianta se houver oportunidade ociosa para preencher essa capacidade. Se o funil não tem sobra, o gargalo é volume, não velocidade, e o ganho é cortado ali.",
    codigo: "calc.ts#calcResultadoTime",
  },
  {
    id: "ganho-ciclo",
    secao: "ciclo",
    celula: "Motor!C68",
    titulo: "Ganho de ciclo / ano",
    formula: `ganho = MIN(capacidade, teto_funil) × ticket médio × margem × 12 × ${num(HAIRCUT)} × cobertura`,
    explicacao: `Com haircut de ${num(HAIRCUT)}, como rampa e conversão.`,
    codigo: "calc.ts#calcResultadoTime",
  },

  // ── Resultado ───────────────────────────────────────────────────────────
  {
    id: "valor-ano",
    secao: "resultado",
    celula: "Motor!C72",
    titulo: "Valor anual do time",
    formula:
      "valor_ano = eficiência + ticket + rampa + conversão + ciclo",
    explicacao:
      "Cinco parcelas, sem nenhum termo de interação entre elas. Descartar a interação é decisão: somar efeitos cruzados inflaria o número sem lastro.",
    codigo: "calc.ts#calcResultadoTime",
  },
  {
    id: "roi-payback",
    secao: "resultado",
    celula: "Motor!C81–C82",
    titulo: "ROI e payback",
    formula: `preço_ano = preço mensal × 12
ROI       = valor_ano ÷ preço_ano
payback   = (preço_ano ÷ valor_ano) × 12  meses`,
    explicacao:
      "ROI de 1× significa que o retorno empata com o investimento no primeiro ano. O payback é o recíproco em meses — e a tela avisa quando ele passa do prazo de contrato escolhido.",
    codigo: "calc.ts#calcResultadoTime",
  },
  {
    id: "checagem-realidade",
    secao: "resultado",
    celula: "Motor!C75–C76",
    titulo: "Checagem de realidade",
    formula: `margem_anual = receita mensal × margem × 12
checagem = (ticket + rampa + conversão + ciclo) ÷ margem_anual

alerta se checagem > ${pct(CHECAGEM_ALERTA)}`,
    explicacao: `A eficiência fica DE FORA do numerador de propósito: ela é custo que deixa de existir, não margem nova. Acima de ${pct(CHECAGEM_ALERTA)} da margem anual a projeção pede ceticismo — é um freio, não uma parcela.`,
    codigo: "calc.ts#calcResultadoTime",
  },

  // ── Preço ───────────────────────────────────────────────────────────────
  {
    id: "tiers",
    secao: "preco",
    celula: "Tabela de Preços por Tier!B7:E10",
    titulo: "Tabela de preços por tier (taxa cheia)",
    formula: tiersTexto,
    explicacao:
      "O volume TOTAL de horas da conta — não as horas de cada time — escolhe um tier, e todas as horas do mês saem pela taxa cheia dele. Entrar no tier seguinte reprecifica a conta inteira.",
    divergencia:
      "A aba Conta da MESMA planilha cobra marginal (`C17:C20`: cada faixa cobrando só as horas dentro dela), e foi assim que o motor nasceu. As duas leituras se contradizem dentro do arquivo, e o decisor manteve o critério de 18/08/2026: vale a tabela comercial, que é a que vai ao cliente. Quem decidiu foi a coluna “Economia vs Tier 1” (`=1-D8/D7`), que só é verdade se a taxa valer para a hora inteira — no marginal, 800 h/mês saíam a R$ 85,08/h ao lado de uma tabela prometendo R$ 70. O CUSTO ACEITO É A QUEBRA DO INVARIANTE 9 do V5 (“uma hora a mais nunca reduz a receita”): 263 h custam R$ 4.110 menos que 262 h, 657 h custam R$ 7.802 menos que 656 h, e 1.244 h custam R$ 12.370 menos que 1.243 h. Os três degraus estão pinados em `preco.test.ts`.",
    codigo: "preco.ts#precoPorTier",
  },
  {
    id: "piso",
    secao: "preco",
    celula: "Conta!C22",
    titulo: "Piso da conta",
    formula: `mensalidade = MAX(preço da tabela de tiers, R$ ${num(TAXA_MINIMA)})`,
    explicacao: `Abaixo de ${num(Math.ceil(TAXA_MINIMA / TABELA_TIERS[0].taxaHora))} h/mês o Tier 1 não alcança o piso, e a conta paga o mínimo. O piso é aplicado DEPOIS de qualquer desconto — piso não se desconta.`,
    codigo: "preco.ts#precoConta",
  },
  {
    id: "rateio-preco",
    secao: "preco",
    celula: "Motor!C79",
    titulo: "Rateio do preço entre os times",
    formula:
      "preço_time = mensalidade da conta × (horas do time ÷ horas da conta)",
    explicacao:
      "Rateio por HORAS, não por assentos: é a hora que o tier cobra. O arredondamento vai a R$ 0,01 e o último time absorve a diferença, para a soma fechar exatamente a mensalidade.",
    codigo: "preco.ts#rateioPorTime",
  },
  {
    id: "prazo-sem-desconto",
    secao: "preco",
    celula: "Premissas!C49:D52",
    titulo: "Prazo não altera preço",
    formula: "desconto = 0 em 3, 6, 12 e 24 meses",
    explicacao: `O prazo compra garantia, não desconto: 12 meses ou mais travam o reajuste, e ${PRAZO_DEGRAU_SERVICO} meses ainda sobem um degrau de nível de serviço. A mensalidade é a mesma nos quatro.`,
    codigo: "constants.ts#DESCONTO_PRAZO",
  },

  // ── Conta ───────────────────────────────────────────────────────────────
  {
    id: "base-preco",
    secao: "conta",
    celula: "Conta!C13",
    titulo: "Quais times entram no preço",
    formula:
      "horas da conta = Σ horas dos times COMPLETOS\n(se nenhum time fechou: Σ horas de todos os que têm assentos)",
    explicacao:
      "Um irmão preenchido pela metade barateava a taxa combinada e mexia no ROI do time que já tinha fechado. Enquanto nenhum time fechou, o preço é prévia da proposta em construção — nunca denominador de um ROI —, e a tela avisa quem ficou de fora.",
    codigo: "modelo.ts#computarModelo",
  },
  {
    id: "consolidado",
    secao: "conta",
    celula: "Conta!C29–C31",
    titulo: "Consolidado multi-time",
    formula:
      "ROI da conta = Σ valor_ano ÷ Σ preço_ano\npayback da conta = (Σ preço_ano ÷ Σ valor_ano) × 12",
    explicacao:
      "Sempre ponderado pelos totais, NUNCA média dos ROIs de cada time: a média trataria um time de 5 assentos e um de 200 como iguais.",
    codigo: "consolidado.ts#consolidar",
  },
  {
    id: "comparacao-cenarios",
    secao: "conta",
    celula: "Comparação de Cenários",
    titulo: "Os três cenários lado a lado",
    formula:
      "os três presets recalculados com AS MESMAS entradas\na eficiência é idêntica nos três (vem do caminho declarado, não do otimismo)",
    explicacao:
      "Existe para a decisão se tomar sobre a faixa, não sobre um ponto.",
    codigo: "cenarios-comparacao.ts#compararCenarios",
    divergencia:
      "Recalculamos o ganho de ciclo em CADA cenário. A planilha ainda herda o ciclo do cenário ativo na coluna Conservador (=SUM(Motor!C68:L68)); só Realista e Otimista recalculam. É correção deliberada de um quirk, e tem teste anti-regressão.",
  },

  // ── Não somadas ─────────────────────────────────────────────────────────
  {
    id: "headcount",
    secao: "referencia-nao-somada",
    celula: "Motor!C88–C91",
    titulo: "Gestores que deixaria de contratar",
    formula: `gestores_hoje = vendedores ÷ vendedores por gestor
gestores_com_perfecting = gestores_hoje × ${num(SUPERVISAO)}
evitados = MAX(0, gestores_hoje − gestores_com_perfecting)

valor/ano = evitados × salário do gestor × ${num(ENCARGOS)} × 12`,
    explicacao:
      "Fica FORA do valor anual e do ROI. É referência de contexto: contar economia de headcount junto com economia de coaching contaria a mesma hora de gestor duas vezes.",
    codigo: "calc.ts#calcResultadoTime",
  },
  {
    id: "ancoragem-hora",
    secao: "referencia-nao-somada",
    celula: "—",
    titulo: "Custo por hora de prática: gestor × Perfecting",
    formula: `gestor     = custo_hora_gestor × fator_escopo
Perfecting = preço mensal do time ÷ horas de prática do time`,
    explicacao:
      "Compara o custo de uma hora de prática pelos dois caminhos. Não entra no ROI — é a régua que torna o preço comparável a alguma coisa que a empresa já conhece.",
    codigo: "calc.ts#calcResultadoTime",
  },
  {
    id: "granularidade",
    secao: "referencia-nao-somada",
    celula: "Conta!C47–C48",
    titulo: "Régua diária",
    formula: `investimento por vendedor/dia = (preço mensal ÷ assentos) ÷ ${num(DIAS_UTEIS_MES)}
retorno por assento/dia      = (valor anual ÷ assentos) ÷ ${num(DIAS_UTEIS_ANO)}`,
    explicacao:
      "O mesmo ROI da conta, em outra unidade. Serve para a conversa sair da casa dos milhares e virar uma comparação do dia a dia.",
    codigo: "calc.ts#calcResultadoTime",
  },

  // ── Fora da planilha ────────────────────────────────────────────────────
  // ── Custo da Inação ─────────────────────────────────────────────────────
  {
    id: "coi-fora-do-roi",
    secao: "coi",
    celula: "Custo da Inação!B100",
    titulo: "Por que o custo da inação não se soma ao ROI",
    formula:
      "recuperado = min(valor_ano; COI_total)\nresidual   = max(0; COI_total − valor_ano)\n\nem lugar nenhum: COI_total + valor_ano",
    explicacao:
      "O COI é uma leitura contrafactual (o que se perde sem o programa) e o ROI é atribuição (o que o programa devolve). Os dois medem os mesmos mecanismos — rampa, conversão, ciclo — por lados opostos. A tela põe um CONTRA o outro e nunca lado a lado.",
    codigo: "coi.ts#calcCoi",
    divergencia:
      "A nota metodológica ① da aba declara o COI “ADITIVO ao ROI”. Isso viola o invariante 1 do V5 (contrafactual ⊻ atribuição) e conta a mesma economia duas vezes. Somados como a planilha pede, os dois goldens dariam um custo da inação de 5,88× (§14) e 2,62× (FIESC) o valor que o próprio motor promete na linha de cima.",
  },
  {
    id: "coi-cobertura",
    secao: "coi",
    celula: "Custo da Inação!C8–C11 e C62–C67",
    titulo: "Lacuna de prática e capacidade do gestor",
    formula: `horas_entregues = vendedores_por_gestor × gestores × prática_por_vendedor_hoje\nhoras_necessárias = vendedores × ${num(COI_HORAS_COACHING_MIN)} h/mês\npct_atendida = min(1; entregues ÷ necessárias)\nnão_atendidos = vendedores × (1 − pct_atendida)\n\ncapacidade = gestores × horas_de_treino_por_gestor\ngap = max(0; necessárias − capacidade)`,
    explicacao:
      "Duas perguntas diferentes, e é isso que as torna úteis: quanto da prática mínima CHEGA ao vendedor, e se o gestor sequer TEM as horas. No §14 o gestor tem 60 h para 60 h de demanda e ainda assim só 27 h viram prática (o problema é escopo); no FIESC a prática chega inteira mas o gestor tem 120 h para 200 h (o problema é capacidade).",
    codigo: "coi.ts#calcCoi",
    divergencia:
      "A aba mede a Dimensão 1 em cabeças (vendedores cobertos por gestor) e o Diagnóstico em horas: no §14 dão 40% e 0%, no FIESC dão −2% e 40%. Uma das duas está sempre errada. Medimos em horas dos dois lados. Descartamos também o primeiro ramo de C9, que multiplica horas por gestores e devolve h·gestor onde o rótulo pede vendedores — e que, sendo o primeiro, encobre o segundo ramo, que é o correto.",
  },
  {
    id: "coi-subperformance",
    secao: "coi",
    celula: "Custo da Inação!C15–C21",
    titulo: "Quota que não se bate sem prática",
    formula: `receita_por_vendedor × (${pct(COI_DELTA_ATTAINMENT)} × ${pct(COI_HAIRCUT)}) × não_atendidos × 12 × margem`,
    explicacao: `Quem pratica toda semana bate mais quota do que quem pratica por trimestre. O delta declarado é de ${pct(COI_DELTA_ATTAINMENT)} de quota attainment, com haircut de ${pct(COI_HAIRCUT)} — a mesma lógica anti-otimismo dos haircuts do motor. Só incide sobre os vendedores que não recebem a prática mínima.`,
    codigo: "constants.ts#COI_DELTA_ATTAINMENT",
    divergencia:
      "A planilha devolve RECEITA; multiplicamos pela margem. Todo o motor trabalha em margem, e receita contra margem na mesma tela compara grandezas diferentes.",
  },
  {
    id: "coi-rampa",
    secao: "coi",
    celula: "Custo da Inação!C25–C31",
    titulo: "Rampa mais longa nas novas contratações",
    formula: `(${num(COI_RAMPA_EXTENSAO_MESES)} meses × ${pct(COI_HAIRCUT)}) × contratações_ano × (receita_por_vendedor × ${pct(COI_RAMPA_PRODUTIVIDADE)}) × margem`,
    explicacao: `Sem coaching estruturado a rampa se estende em ${num(COI_RAMPA_EXTENSAO_MESES)} meses, com haircut de ${pct(COI_HAIRCUT)}. Cada mês a mais rende ${pct(COI_RAMPA_PRODUTIVIDADE)} da receita plena — vendedor em rampa produz, só que menos.`,
    codigo: "constants.ts#COI_RAMPA_EXTENSAO_MESES",
    divergencia: "Em margem, não em receita — mesma correção da linha acima.",
  },
  {
    id: "coi-turnover",
    secao: "coi",
    celula: "Custo da Inação!C35–C42",
    titulo: "Reposição de quem sai por falta de coaching",
    formula: `saídas = min(contratações_ano; não_atendidos × (${pct(COI_RETENCAO_COM)} − ${pct(COI_RETENCAO_SEM)}) × ${pct(COI_HAIRCUT)})\ncusto  = salário_vendedor × encargos × ${num(COI_CUSTO_SUBSTITUICAO)} × 12\n\nsem salário do vendedor ⇒ travessão, nunca zero`,
    explicacao: `A diferença de retenção declarada entre times com e sem coaching frequente é de ${pct(COI_RETENCAO_COM - COI_RETENCAO_SEM)}. Repor alguém custa ${num(COI_CUSTO_SUBSTITUICAO)}× o salário anual carregado — o piso da faixa de mercado. Já é folha, então não multiplica por margem.`,
    codigo: "constants.ts#COI_RETENCAO_COM",
    divergencia:
      "Duas travas que a aba não tem: aplicamos os p.p. só sobre os vendedores não atendidos (a planilha aplica sobre o time inteiro, inclusive sobre quem já recebe coaching), e travamos o total nas contratações do ano — ninguém perde mais gente do que repõe. Aplicamos também o haircut, que a nota ② promete “em cada dimensão” e a planilha só usa em duas.",
  },
  {
    id: "coi-no-decision",
    secao: "coi",
    celula: "Custo da Inação!C46–C50",
    titulo: "Negócios que morrem sem decisão",
    formula: `(receita_mensal ÷ ticket) × ${pct(COI_NO_DECISION)} × ${pct(COI_FRACAO_COACHAVEL)} × ticket × 12 × margem`,
    explicacao: `A maioria das perdas B2B não vai para o concorrente, vai para o status quo: ${pct(COI_NO_DECISION)} dos negócios perdidos, pela premissa declarada. Destes, ${pct(COI_FRACAO_COACHAVEL)} seriam ganhos com coaching de discovery. Esse ${pct(COI_FRACAO_COACHAVEL)} É o haircut desta dimensão — empilhar outro por cima seria conservadorismo duplo, que engana tanto quanto o otimismo.`,
    codigo: "constants.ts#COI_NO_DECISION",
    divergencia: "Em margem, não em receita — mesma correção das linhas acima.",
  },
  {
    id: "coi-fila",
    secao: "coi",
    celula: "Custo da Inação!C54–C58",
    titulo: "Espera por uma vaga na agenda do gestor",
    formula: `não_atendidos × ${num(COI_SEMANAS_ESPERA)} semanas × ${num(COI_HORAS_PERDIDAS_SEMANA)} h × (salário_vendedor × encargos ÷ jornada) × 12 × ${pct(COI_HAIRCUT)}\n\nsem salário do vendedor ⇒ travessão`,
    explicacao: `Quem não é atendido espera, em média, ${num(COI_SEMANAS_ESPERA)} semanas por uma hora de coaching, e cada semana de espera custa ${num(COI_HORAS_PERDIDAS_SEMANA)} h de produtividade subótima. Folha, não receita.`,
    codigo: "constants.ts#COI_SEMANAS_ESPERA",
    divergencia:
      `Aplicamos o haircut de ${pct(COI_HAIRCUT)} que a nota ② promete e a aba esquece nesta dimensão.`,
  },
  {
    id: "coi-total",
    secao: "coi",
    celula: "Custo da Inação!C71–C76 e C81–C85",
    titulo: "Total, o que se recupera e a régua de coerência",
    formula:
      "total = Σ dimensões preenchidas (travessão não vira zero na soma)\ncada dimensão travada em zero: cobertura acima do mínimo não vira crédito\n\ncoerência = total ÷ margem anual, alerta acima de 25%",
    explicacao:
      "A mesma régua do §4.7, respondendo outra pergunta: ali o alerta protege contra um GANHO implausível; aqui avisa que a LACUNA ficou grande demais para a margem declarada, o que quase sempre é dado de estrutura torto. A planilha publica em vez disso uma razão COI ÷ investimento, que compara a perda anual com o preço e sempre favorece a compra.",
    codigo: "coi.ts#calcCoi",
  },
  {
    id: "coi-fontes",
    secao: "coi",
    celula: "Custo da Inação!A2 (nota de rodapé)",
    titulo: "As fontes dos benchmarks",
    formula: COI_FONTES.join("\n"),
    explicacao:
      "As seis referências que a aba credita pelas constantes do COI. Saíram da referência interna para a TELA DO VISITANTE em 20/08/2026, por ratificação do decisor — até então valia a regra de não citar nome de pesquisa a quem lê o relatório. As constantes seguem marcadas [H]: nenhuma foi conferida na origem, e é por isso que a tela diz “benchmarks de mercado” e nunca “estudos comprovam”.",
    codigo: "constants.ts#COI_FONTES",
    divergencia:
      "A planilha credita os 40–60% de “negócio que morre sem decisão” a “Dixon/McKenna, HBR 2019”, e a data não confere: a dupla assina o JOLT Effect, de 2022. Publicamos a atribuição corrigida — numa tela que passa a página inteira construindo credibilidade, uma citação errada custa mais do que a citação rende.",
  },

  {
    id: "nivel-servico",
    secao: "fora-da-planilha",
    celula: "—",
    titulo: "Nível de serviço",
    formula: `por assentos: ${NIVEIS_SERVICO.map((n) => `${Number.isFinite(n.ateAssentos) ? `até ${num(n.ateAssentos)}` : "acima"} → ${n.label}`).join("  ·  ")}
contrato de ${PRAZO_DEGRAU_SERVICO} meses sobe um degrau`,
    explicacao:
      "Sem nenhum efeito sobre preço. A planilha não tem esta regra — a fonte é o racional V5.",
    codigo: "preco.ts#nivelServico",
  },
  {
    id: "trajetoria",
    secao: "fora-da-planilha",
    celula: "—",
    titulo: "Trajetória editável de 12 meses",
    formula: `Σ dos ${TRAJETORIA_MESES} meses = ganho anual de performance (G), sempre
editar redistribui a forma e reconcilia proporcionalmente`,
    explicacao:
      "Editar a curva muda a FORMA, nunca o ROI nem o payback — a função de cálculo do resultado nem recebe a trajetória. A planilha distribui o ganho linearmente e chama a série de “presentation only”.",
    codigo: "trajetoria.ts#reReconciliar",
  },
  {
    id: "avisos",
    secao: "fora-da-planilha",
    celula: "parcial (Motor!C83)",
    titulo: "Avisos de coerência",
    formula:
      "receita por vendedor fora da faixa · funil que fecha mais do que recebe · fator de escopo fora da faixa · treino em grupo · funil pela metade · payback maior que o prazo",
    explicacao:
      "Só o último tem equivalente na planilha (C83 / Conta!C32). Os outros existem porque aqui quem digita é o visitante, sem ninguém ao lado para dizer que o número saiu errado.",
    codigo: "calc.ts#calcResultadoTime",
  },
];

export function entradasDaSecao(secao: SecaoId): EntradaReferencia[] {
  return REFERENCIA.filter((entrada) => entrada.secao === secao);
}

/** Busca por título, célula, fórmula, explicação ou símbolo de código. */
export function buscarReferencia(termo: string): EntradaReferencia[] {
  const alvo = termo.trim().toLowerCase();
  if (alvo === "") return REFERENCIA;
  return REFERENCIA.filter((entrada) =>
    [
      entrada.titulo,
      entrada.celula,
      entrada.formula,
      entrada.explicacao,
      entrada.codigo,
      entrada.divergencia ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(alvo),
  );
}

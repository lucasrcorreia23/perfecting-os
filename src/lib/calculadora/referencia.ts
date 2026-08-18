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
// divergem em três pontos, de propósito — quem manda nesta tela é o código, e
// a divergência vem declarada na própria entrada.
//
// Módulo puro, sem JSX: a tela em `referencia-formulas.tsx` só renderiza.

import {
  CENARIOS,
  CHECAGEM_ALERTA,
  DIAS_UTEIS_ANO,
  DIAS_UTEIS_MES,
  ENCARGOS,
  ESCADA_PRECO,
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
  REDUCAO_CICLO_MAX,
  SUPERVISAO,
  TAXA_MINIMA,
  TRAJETORIA_MESES,
} from "./constants";
import { CICLO_DIAS_MINIMO } from "./calc";

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
    descricao: "A escada progressiva sobre as horas da conta, o piso e o rateio por time.",
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
    id: "fora-da-planilha",
    titulo: "Fora da planilha",
    descricao:
      "Regras que existem só no nosso motor, porque a planilha é omissa. Aqui o racional V5 é a fonte.",
  },
];

const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

const escadaTexto = ESCADA_PRECO.map((faixa, i) => {
  const de = i === 0 ? 0 : ESCADA_PRECO[i - 1].ateHoras;
  const ate = Number.isFinite(faixa.ateHoras) ? num(faixa.ateHoras) : "∞";
  return `${num(de)}–${ate} h × R$ ${num(faixa.taxaHora)}`;
}).join("  ·  ");

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
    codigo: "estrutura.ts#ratearEstrutura",
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
      "O plano define consumo, não preço. O preço vem do volume total de horas da conta, pela escada.",
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
    explicacao: "É o que entra na escada de preço da conta.",
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
    id: "escada",
    secao: "preco",
    celula: "Conta!C17–C21",
    titulo: "Escada progressiva (marginal por faixa)",
    formula: escadaTexto,
    explicacao:
      "Cada faixa cobra SÓ as horas que caem dentro dela, sobre o total de horas da conta — não sobre as horas de cada time. Quanto mais horas, menor a taxa efetiva.",
    codigo: "preco.ts#precoEscada",
    divergencia: `A fronteira do Tier 2 é ${num(ESCADA_PRECO[1].ateHoras)} h, valor da aba comercial “Tabela de Preços por Tier” do Template. A aba Premissas do MESMO arquivo traz 573 em C31, e é ela que o cálculo da planilha lê — as duas se contradizem dentro do arquivo. Decisão de 18/08/2026: vale a tabela comercial, que é a que vai ao cliente. Enquanto Premissas!C31 não for corrigida, nenhuma planilha reproduz esta escada.`,
  },
  {
    id: "piso",
    secao: "preco",
    celula: "Conta!C22",
    titulo: "Piso da conta",
    formula: `mensalidade = MAX(preço da escada, R$ ${num(TAXA_MINIMA)})`,
    explicacao: `Abaixo de ${num(Math.ceil(TAXA_MINIMA / ESCADA_PRECO[0].taxaHora))} h/mês a escada não alcança o piso, e a conta paga o mínimo. O piso é aplicado DEPOIS de qualquer desconto — piso não se desconta.`,
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
      "Rateio por HORAS, não por assentos: é a hora que a escada cobra. O arredondamento vai a R$ 0,01 e o último time absorve a diferença, para a soma fechar exatamente a mensalidade.",
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

// O glossário da calculadora — dado puro, no molde de `faq.ts`.
//
// Ele vivia dentro de `glossario.tsx`, que é um componente cliente. Saiu de lá
// em 22/08/2026 por uma razão só: `explicacoes.ts` cita estes termos, e um
// módulo puro não pode importar um `"use client"` sem arrastar React para o
// motor. Com o dado aqui, a gaveta e os balões de "como chegamos a este
// número" leem a MESMA definição — e uma definição que muda, muda nos dois.
//
// Os ids são estáveis e nunca aparecem na tela: são a chave que a explicação
// de um valor usa para dizer "esta conta usa margem de contribuição". Renomear
// um id é seguro (nada é persistido); renomear um `termo` muda a tela.
//
// TODO NÚMERO CITADO SAI DE `constants.ts`, pela mesma razão que vale em
// `referencia.ts`: escrever "30%" à mão criaria um segundo lugar onde o
// haircut mora, e ele começaria a mentir no primeiro ajuste do motor.
// `glossario.test.ts` reprova se algum se soltar da constante.

import { PREMISSAS_PADRAO, type PremissasRacional } from "./premissas";

const pct = (v: number) =>
  `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export type TermoId =
  | "roi"
  | "payback"
  | "margem-contribuicao"
  | "oportunidades-trabalhadas"
  | "rampa"
  | "cobertura"
  | "assentos"
  | "haircut"
  | "teto-funil"
  | "fator-escopo"
  | "supervisao-residual"
  | "eficiencia"
  | "encargos"
  | "tabela-tiers"
  | "piso-contratual"
  | "taxa-efetiva"
  | "custo-inacao"
  | "cenario";

export type TermoGlossario = {
  id: TermoId;
  termo: string;
  definicao: string;
};

// A ordem é a da gaveta, e ela é de leitura, não alfabética: primeiro o que a
// capa mostra (ROI, payback), depois o vocabulário da conta, depois o do
// preço. Quem abre o glossário quase sempre veio de um número do topo.
export function termosGlossario(
  p: PremissasRacional = PREMISSAS_PADRAO,
): TermoGlossario[] {
  return [
  {
    id: "roi",
    termo: "ROI",
    definicao:
      "Retorno sobre o investimento: o valor projetado no ano dividido pelo custo anual da assinatura. 2× significa que cada real investido projeta dois de volta.",
  },
  {
    id: "payback",
    termo: "Payback",
    definicao:
      "Quantos meses de valor gerado são necessários para cobrir o custo anual total, não fluxo a fluxo.",
  },
  {
    id: "margem-contribuicao",
    termo: "Margem de contribuição",
    definicao:
      "O que sobra da receita depois dos custos diretos da venda. É sobre ela que os ganhos são calculados, nunca sobre a receita cheia.",
  },
  {
    id: "oportunidades-trabalhadas",
    termo: "Oportunidades trabalhadas",
    definicao:
      "As oportunidades que o time efetivamente atende. A taxa de conversão é medida sobre elas.",
  },
  {
    id: "rampa",
    termo: "Rampa",
    definicao:
      "O período entre a contratação de um vendedor e a produtividade plena. Encurtar a rampa antecipa receita: a folha é a mesma.",
  },
  {
    id: "cobertura",
    termo: "Cobertura",
    definicao:
      "A fração do time com assento para praticar. Ganhos de performance são proporcionais a ela.",
  },
  {
    id: "assentos",
    termo: "Assentos",
    definicao:
      "Quantos vendedores praticam com a Perfecting. Deixar em branco vale o time inteiro, e o número trava no tamanho do time: assento acima disso não gera retorno, então não é cobrado.",
  },
  {
    id: "haircut",
    termo: "Haircut",
    definicao:
      `Redução de ${pct(1 - p.haircut)} aplicada aos ganhos de rampa, ciclo e conversão antes de entrarem na conta: anti-otimismo deliberado.`,
  },
  {
    id: "teto-funil",
    termo: "Teto de funil",
    definicao:
      "Encurtar o ciclo só vira receita se houver oportunidade sobrando no funil. Sem folga, o ganho de ciclo é zero.",
  },
  {
    id: "fator-escopo",
    termo: "Fator de escopo",
    definicao:
      `Quantas horas de gestor cada hora de prática consome (preparar, conduzir, dar feedback). Calculado dos seus números; fora da faixa ${num(p.fatorEscopoMin)}–${num(p.fatorEscopoMax)} usamos a premissa declarada de ${num(p.fatorEscopoPremissa)}.`,
  },
  {
    id: "supervisao-residual",
    termo: "Supervisão residual",
    definicao:
      `Os ${pct(p.supervisao)} de tempo de gestor que continuam necessários mesmo com a Perfecting. Só os outros ${pct(1 - p.supervisao)} contam como substituíveis — é o que impede a economia de prometer o gestor inteiro de volta.`,
  },
  {
    id: "eficiencia",
    termo: "Eficiência",
    definicao:
      "O custo do caminho que a empresa seguiria sem a Perfecting e deixa de gastar. Entra na conta pelo menor entre esse custo e o valor da prática que o plano entrega.",
  },
  {
    id: "encargos",
    termo: "Encargos",
    definicao:
      `O multiplicador de ${num(p.encargos)} sobre o salário: cada R$ 1 de folha custa R$ ${num(p.encargos)} para a empresa. É ele que transforma salário em custo de hora.`,
  },
  {
    id: "tabela-tiers",
    termo: "Tabela de preços por tier",
    definicao:
      "O preço vem do volume total de horas da conta, não do plano. O volume escolhe um dos quatro tiers, e TODAS as horas do mês saem pela taxa daquele tier — não é faixa de imposto: quem entra no tier seguinte reprecifica a conta inteira pela taxa menor.",
  },
  {
    id: "piso-contratual",
    termo: "Piso contratual",
    definicao:
      `A cobrança mínima por conta, de R$ ${p.taxaMinima.toLocaleString("pt-BR")}/mês. Abaixo dela a tabela de tiers não vale: contas pequenas pagam o piso.`,
  },
  {
    id: "taxa-efetiva",
    termo: "Taxa efetiva",
    definicao:
      "A mensalidade dividida pelas horas do mês. É a taxa do seu tier, e só fica acima dela quando o volume é pequeno o bastante para a cobrança mínima valer.",
  },
  {
    id: "custo-inacao",
    termo: "Custo da inação",
    definicao:
      "O que a operação perde hoje por não praticar. É a leitura contrafactual e NUNCA se soma ao ROI: os dois medem os mesmos mecanismos por lados opostos.",
  },
  {
    id: "cenario",
    termo: "Cenário",
    definicao:
      "O conjunto de deltas usados na projeção. Conservador é o default e o recomendado para decidir; os sliders permitem modelar dentro dos tetos do modelo.",
  },
  ];
}

export const TERMOS: TermoGlossario[] = termosGlossario();

export function termo(
  id: TermoId,
  p: PremissasRacional = PREMISSAS_PADRAO,
): TermoGlossario | undefined {
  return termosGlossario(p).find((item) => item.id === id);
}

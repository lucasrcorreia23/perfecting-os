// Registro central dos campos do §4.1: labels, ajuda didática e formato.
// Usado pelo wizard, pela sidebar "Seus números" e pelo detalhe interno —
// o mesmo texto em todo lugar.

import type { CampoId, PassoId } from "./types";

export type CampoFormato = "moeda" | "numero" | "percentual" | "horas" | "dias" | "meses";

export type CampoDef = {
  id: CampoId;
  label: string;
  // Explicação do campo, VISÍVEL sob o rótulo no wizard (`Field.help` com
  // `escala="leitura"`). Já morou num ícone de info, pelo receio de cinco
  // descrições por passo empurrarem o formulário para fora da tela — mas o
  // custo era maior: uma frase de uma linha atrás de um alvo de 16px, num
  // tab stop a mais por campo, para o leitor que §8.12b descreve. A sidebar do
  // resultado segue com o ícone, onde a coluna tem 264px e a pessoa já
  // entendeu o campo. Mantenha curto — uma linha.
  help?: string;
  // Dica dentro do campo: um exemplo do dado esperado, em cinza claro. É só
  // placeholder — nunca vira valor (vazio segue null, P4/P6). Os números vêm
  // do caso de referência §14 do V5, então são coerentes entre si.
  placeholder: string;
  formato: CampoFormato;
  inteiro?: boolean;
};

export const CAMPO_DEFS: Record<Exclude<CampoId, "caminho">, CampoDef> = {
  numVendedores: {
    id: "numVendedores",
    label: "Número de vendedores",
    help: "Vendedores ativos que entrarão no programa.",
    placeholder: "Ex.: 30",
    formato: "numero",
    inteiro: true,
  },
  numGestoresTreino: {
    id: "numGestoresTreino",
    label: "Gestores de treinamento",
    help: "Pessoas dedicadas a treinar os vendedores hoje.",
    placeholder: "Ex.: 3",
    formato: "numero",
  },
  horasTreinoGestorMes: {
    id: "horasTreinoGestorMes",
    label: "Horas de treino por gestor/mês",
    help: "Horas que cada gestor dedica a treinar, por mês — preparo, execução e feedback.",
    placeholder: "Ex.: 20",
    formato: "horas",
  },
  vendedoresPorGestorMes: {
    id: "vendedoresPorGestorMes",
    label: "Vendedores cobertos por gestor/mês",
    help: "Quantos vendedores cada gestor consegue treinar por mês.",
    placeholder: "Ex.: 6",
    formato: "numero",
  },
  horasPraticaPorRepHoje: {
    id: "horasPraticaPorRepHoje",
    label: "Horas de prática por vendedor coberto (hoje)",
    help: "Só o tempo de roleplay do vendedor coberto, sem preparo e sem feedback.",
    placeholder: "Ex.: 1,5",
    formato: "horas",
  },
  receitaMensal: {
    id: "receitaMensal",
    label: "Receita mensal da equipe",
    help: "Soma do que os vendedores desta equipe faturam por mês.",
    placeholder: "Ex.: 900.000",
    formato: "moeda",
  },
  ticketMedio: {
    id: "ticketMedio",
    label: "Ticket médio",
    help: "Valor médio por venda fechada.",
    placeholder: "Ex.: 15.000",
    formato: "moeda",
  },
  conversaoPct: {
    id: "conversaoPct",
    label: "Taxa de conversão",
    help: "Sobre oportunidades trabalhadas. Ex.: 20 = 20%.",
    placeholder: "Ex.: 25",
    formato: "percentual",
  },
  margemPct: {
    id: "margemPct",
    label: "Margem de contribuição",
    help: "Quanto sobra de cada venda depois dos custos variáveis. Se não souber, use o atalho: 30%.",
    placeholder: "Ex.: 30",
    formato: "percentual",
  },
  salarioGestor: {
    id: "salarioGestor",
    label: "Salário mensal do gestor de treinamento",
    help: "Bruto mensal. Os encargos (×1,75) entram automaticamente.",
    placeholder: "Ex.: 12.000",
    formato: "moeda",
  },
  salarioVendedor: {
    id: "salarioVendedor",
    label: "Salário mensal do vendedor",
    help: "Opcional. Alimenta as dimensões de turnover e fila do Custo da Inação, nunca o ROI.",
    placeholder: "Ex.: 6.000",
    formato: "moeda",
  },
  rampaMeses: {
    id: "rampaMeses",
    label: "Duração da rampa",
    help: "Meses até o novo vendedor bater 100% da meta.",
    placeholder: "Ex.: 4",
    formato: "meses",
  },
  contratacoesAno: {
    id: "contratacoesAno",
    label: "Novos vendedores por ano",
    help: "Contratações previstas para os próximos 12 meses: turnover mais crescimento.",
    placeholder: "Ex.: 8",
    formato: "numero",
    inteiro: true,
  },
  custoExternoAno: {
    id: "custoExternoAno",
    label: "Custo anual do programa externo",
    help: "O que você pagaria por ano em consultoria, curso ou treinamento contratado.",
    placeholder: "Ex.: 150.000",
    formato: "moeda",
  },
  custoEventoAno: {
    id: "custoEventoAno",
    label: "Custo anual com eventos e imersões",
    help: "O que você gastaria por ano em convenções, workshops e imersões. Consideramos metade como camada de prática substituível.",
    placeholder: "Ex.: 80.000",
    formato: "moeda",
  },
  cicloDias: {
    id: "cicloDias",
    label: "Ciclo médio de venda",
    help: "Da oportunidade ao fechamento, em dias.",
    placeholder: "Ex.: 45",
    formato: "dias",
    inteiro: true,
  },
  leadsMes: {
    id: "leadsMes",
    label: "Oportunidades recebidas por mês",
    help: "Leads e oportunidades novas que entram no funil mensalmente.",
    placeholder: "Ex.: 300",
    formato: "numero",
  },
};

// Por que simular mais de um time. Vive junto de cada botão "Adicionar time"
// (stepper, consolidado e sidebar), num balão de ajuda — é contexto que se lê
// uma vez, no momento da decisão, não texto permanente na tela.
export const TIMES_HELP =
  "Um time é o comum. Se a operação tem times com números bem diferentes, simule cada um separado: cada time tem os próprios números e o próprio ROI, e a conta ganha um consolidado.";

// A pergunta é sobre o presente porque é assim que ela se responde sem
// esforço; a ajuda carrega a leitura contrafactual, que é a que o motor usa
// (§4.3: a eficiência é o custo do caminho declarado, não do caminho atual).
export const CAMINHO_LABEL = "Como vocês treinam hoje, principalmente?";
export const CAMINHO_HELP =
  "A economia é calculada sobre o caminho que você seguiria sem a Perfecting: um deles, não a soma de todos.";

// O título e o subtítulo de cada uma das oito perguntas. É o `h1` da tela —
// `PASSOS[].titulo` (em `estado.ts`) é o rótulo curto, usado onde a pergunta
// aparece numa lista.
export const PASSO_INTROS: Record<PassoId, { titulo: string; texto: string }> = {
  1: {
    titulo: "Como é a estrutura do seu time hoje?",
    texto: "Começamos pelo básico: quem vende e quem treina na sua operação.",
  },
  2: {
    titulo: "Como a prática acontece hoje?",
    texto:
      "Esses dois números calibram o fator de escopo — quantas horas de gestor cada hora de prática consome.",
  },
  3: {
    titulo: "Quanto custa o treinamento atual?",
    texto:
      "O contrafactual: o que você já gasta, em dinheiro ou em tempo de gestor, para treinar.",
  },
  4: {
    titulo: "Números de receita da equipe",
    texto: "Use a receita mensal recorrente da equipe que entrará no programa.",
  },
  5: {
    titulo: "Conversão e margem",
    texto: "Dois percentuais da operação hoje — vale uma estimativa honesta.",
  },
  6: {
    titulo: "Rampa de novos vendedores",
    texto: "Tempo até um novo vendedor atingir a produtividade plena.",
  },
  7: {
    titulo: "Pipeline e ciclo (opcional)",
    texto:
      "Quantas oportunidades novas entram no funil por mês, e quanto tempo leva uma venda. Com os dois números o motor calcula o ganho de encurtar o ciclo — pode deixar em branco.",
  },
  8: {
    titulo: "Plano, cenário e contrato",
    texto:
      "Última etapa: como você quer contratar e quão otimista quer ser nas projeções.",
  },
};

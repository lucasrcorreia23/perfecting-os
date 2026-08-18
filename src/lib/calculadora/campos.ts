// Registro central dos campos do §4.1: labels, ajuda didática e formato.
// Usado pelo wizard, pela sidebar "Seus números" e pelo detalhe interno —
// o mesmo texto em todo lugar.

import type { CampoId } from "./types";

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
    label: "Vendedores",
    help: "Quem vende ativamente hoje.",
    placeholder: "Ex.: 30",
    formato: "numero",
    inteiro: true,
  },
  numGestoresTreino: {
    id: "numGestoresTreino",
    label: "Gestores que treinam",
    help: "Quem treina e acompanha o time, não a liderança inteira.",
    placeholder: "Ex.: 3",
    formato: "numero",
  },
  horasTreinoGestorMes: {
    id: "horasTreinoGestorMes",
    label: "Treino por gestor/mês",
    help: "Horas que cada gestor gasta por mês preparando, executando e dando feedback.",
    placeholder: "Ex.: 20",
    formato: "horas",
  },
  vendedoresPorGestorMes: {
    id: "vendedoresPorGestorMes",
    label: "Vendedores por gestor/mês",
    help: "Quantos vendedores cada gestor consegue atender hoje.",
    placeholder: "Ex.: 6",
    formato: "numero",
  },
  horasPraticaPorRepHoje: {
    id: "horasPraticaPorRepHoje",
    label: "Prática por vendedor/mês",
    help: "Só o tempo de roleplay do vendedor, sem preparação e sem feedback.",
    placeholder: "Ex.: 1,5",
    formato: "horas",
  },
  receitaMensal: {
    id: "receitaMensal",
    label: "Receita mensal do time",
    help: "Total da equipe, não por vendedor.",
    placeholder: "Ex.: 900.000",
    formato: "moeda",
  },
  ticketMedio: {
    id: "ticketMedio",
    label: "Ticket médio",
    help: "Receita ÷ número de vendas.",
    placeholder: "Ex.: 15.000",
    formato: "moeda",
  },
  conversaoPct: {
    id: "conversaoPct",
    label: "Taxa de conversão",
    help: "De cada 100 oportunidades trabalhadas, quantas fecham.",
    placeholder: "Ex.: 25",
    formato: "percentual",
  },
  margemPct: {
    id: "margemPct",
    label: "Margem de contribuição",
    help: "O que sobra da receita depois dos custos diretos, em %. Se não souber, use o atalho: 30%.",
    placeholder: "Ex.: 30",
    formato: "percentual",
  },
  salarioGestor: {
    id: "salarioGestor",
    label: "Salário do gestor",
    help: "Sem encargos.",
    placeholder: "Ex.: 12.000",
    formato: "moeda",
  },
  salarioVendedor: {
    id: "salarioVendedor",
    label: "Salário do vendedor",
    help: "Opcional: alimenta só linhas informativas, nunca o ROI.",
    placeholder: "Ex.: 6.000",
    formato: "moeda",
  },
  rampaMeses: {
    id: "rampaMeses",
    label: "Meses de rampa",
    help: "Até um vendedor novo atingir a produtividade plena.",
    placeholder: "Ex.: 4",
    formato: "meses",
  },
  contratacoesAno: {
    id: "contratacoesAno",
    label: "Vendedores novos por ano",
    help: "Turnover + crescimento.",
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
    label: "Oportunidades que chegam por mês",
    help: "Quantas oportunidades novas entram no funil.",
    placeholder: "Ex.: 300",
    formato: "numero",
  },
};

// Por que simular mais de um time. Vive junto de cada botão "Adicionar time"
// (stepper, consolidado e sidebar), num balão de ajuda — é contexto que se lê
// uma vez, no momento da decisão, não texto permanente na tela.
export const TIMES_HELP =
  "Um time é o comum. Se a operação tem times com números bem diferentes, simule cada um separado: cada time tem os próprios números e o próprio ROI, e a conta ganha um consolidado.";

export const CAMINHO_LABEL = "Sem a Perfecting, o que sua operação faria?";
export const CAMINHO_HELP =
  "A economia é calculada sobre o caminho que você escolheria de verdade: um deles, não a soma de todos.";

// Intro didática de cada passo do wizard.
export const PASSO_INTROS: Record<1 | 2 | 3 | 4 | 5, { titulo: string; texto: string }> = {
  1: {
    titulo: "Quem vende e quem treina",
    texto:
      "Estes números mostram quanta prática o seu time recebe hoje, e quanto tempo de gestor ela consome.",
  },
  2: {
    titulo: "Como o time performa",
    texto:
      "A base da projeção. Os números são seus: nada vem pré-preenchido e tudo pode ser ajustado depois.",
  },
  3: {
    titulo: "Contratação e rampa",
    texto:
      "Quanto tempo um vendedor novo leva para render, e quantos entram por ano.",
  },
  4: {
    titulo: "A alternativa sem a Perfecting",
    texto:
      "Toda projeção honesta compara com o que você faria no lugar. Escolha o caminho mais provável.",
  },
  5: {
    titulo: "Funil (opcional)",
    texto:
      "Com o ciclo de venda e o volume de oportunidades, a projeção inclui o ganho de encurtar o ciclo. Preencha os dois campos, ou pule este passo.",
  },
};

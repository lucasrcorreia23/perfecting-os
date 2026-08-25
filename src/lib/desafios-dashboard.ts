import {
  MIN_TENTATIVAS_PARA_RANQUEAR,
  PALETA_FALLBACK,
  type DesafioSeveridade,
  type DesafioStatus,
  type DesafioTipo,
} from "@/lib/constants";
import {
  recorrenciaAgregada,
  type DesafioMedido,
  type Recorrencia,
} from "@/lib/desafios";

/*
 * Os cruzamentos do módulo Desafios — puro, sem I/O, molde de poc-dashboard.ts.
 *
 * Recebe array e nunca consulta, porque é chamado de dois lugares com recortes
 * diferentes: a tela do dashboard (a base inteira) e o export da listagem (o
 * que está filtrado na tela).
 */

export type TaxonomiaLinha = {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  arquivada: boolean;
};

// Estruturalmente compatível com o DesafioRow das telas (mesmo arranjo de
// ExportableLead com LeadRow), para não existir um adaptador entre os dois.
export type DesafioDashboardRow = DesafioMedido & {
  id: string;
  codigo: number;
  titulo: string;
  tipo: DesafioTipo;
  status: DesafioStatus;
  severidade: DesafioSeveridade;
  categoria: { id: string } | null;
  fluxo: { id: string } | null;
};

export type EixoItem = { id: string | null; nome: string; cor: string; total: number };

export type CelulaMatriz = {
  total: number; // CONTAGEM de desafios no cruzamento
  abertos: number;
  recorrencia: Recorrencia;
  nivel: 0 | 1 | 2 | 3; // intensidade quantizada da tinta
};

export type MatrizCategoriaFluxo = {
  linhas: EixoItem[]; // categorias + "Sem categoria" ao fim
  colunas: EixoItem[]; // fluxos + "Sem fluxo" ao fim
  celulas: CelulaMatriz[][]; // [linha][coluna]
  totaisPorLinha: CelulaMatriz[];
  totaisPorColuna: CelulaMatriz[];
  total: CelulaMatriz; // canto — RECONCILIA com dashboard.total
  faixas: [number, number, number]; // topo dos níveis 1 e 2, e o máximo
};

export type LeituraTaxonomia = {
  id: string | null;
  nome: string;
  cor: string;
  total: number;
  abertos: number;
  recorrencia: Recorrencia;
};

export type Reincidente = {
  id: string;
  codigo: number;
  titulo: string;
  recorrencia: Recorrencia;
};

export type DesafiosDashboard = {
  total: number;
  abertos: number;
  criticosAbertos: number;
  // Só `tipo: "bug"` — uma lacuna de funcionalidade não "quebra 7 em 10 vezes",
  // e contá-la aqui diluiria o número que o dashboard existe para dar.
  recorrenciaGeral: Recorrencia;
  bugs: number;
  bugsMedidos: number;
  bugsSemMedicao: number; // o rodapé honesto do KPI acima
  porStatus: Record<DesafioStatus, number>;
  porTipo: Record<DesafioTipo, number>;
  porSeveridade: Record<DesafioSeveridade, number>;
  porCategoria: LeituraTaxonomia[]; // ranking: por total desc
  porFluxo: LeituraTaxonomia[];
  matriz: MatrizCategoriaFluxo;
  reincidentes: Reincidente[];
};

// "Aberto" é o que ainda pede ação. `nao_reproduz` não pede: é um desfecho.
const STATUS_ABERTOS: DesafioStatus[] = ["aberto", "em_analise"];

const SEM_CATEGORIA = "Sem categoria";
const SEM_FLUXO = "Sem fluxo";

function estaAberto(desafio: DesafioDashboardRow): boolean {
  return STATUS_ABERTOS.includes(desafio.status);
}

function celula(desafios: DesafioDashboardRow[]): Omit<CelulaMatriz, "nivel"> {
  return {
    total: desafios.length,
    abertos: desafios.filter(estaAberto).length,
    recorrencia: recorrenciaAgregada(desafios),
  };
}

/*
 * Quantização em quatro níveis, e não uma rampa contínua de `total / max`:
 * o olho não ordena rampa, a legenda vira finita e escrevível, e um outlier
 * deixa de achatar todo o resto da matriz.
 */
function faixasDe(max: number): [number, number, number] {
  const limite1 = Math.max(1, Math.ceil(max / 3));
  const limite2 = Math.max(limite1 + 1, Math.ceil((2 * max) / 3));
  return [limite1, limite2, max];
}

function nivelDe(total: number, [limite1, limite2]: [number, number, number]): 0 | 1 | 2 | 3 {
  if (total <= 0) return 0;
  if (total <= limite1) return 1;
  if (total <= limite2) return 2;
  return 3;
}

/*
 * O eixo segue a ORDEM da taxonomia, não a contagem: a coluna `ordem` existe
 * porque o eixo de fluxos é uma jornada (login → workflow → clientes), e
 * ordenar por volume embaralharia a leitura a cada bug novo. Quem ordena por
 * volume é o ranking de `porCategoria`/`porFluxo`, que é outra pergunta.
 *
 * Arquivada continua no eixo enquanto tiver desafios: arquivar tira a opção de
 * novos cadastros, não reescreve o histórico.
 */
function eixoDe(
  taxonomia: TaxonomiaLinha[],
  contagem: Map<string, number>,
  semClassificacao: number,
  rotuloVazio: string,
): EixoItem[] {
  const itens: EixoItem[] = taxonomia
    .filter((linha) => !linha.arquivada || (contagem.get(linha.id) ?? 0) > 0)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((linha) => ({
      id: linha.id,
      nome: linha.nome,
      cor: linha.cor,
      total: contagem.get(linha.id) ?? 0,
    }));

  // O balde nulo só existe quando há o que colocar nele — mas quando há, ele
  // NUNCA fica escondido: sem ele a soma das células para de bater com o total.
  if (semClassificacao > 0) {
    itens.push({
      id: null,
      nome: rotuloVazio,
      cor: PALETA_FALLBACK,
      total: semClassificacao,
    });
  }

  return itens;
}

export function computeDesafiosDashboard({
  desafios,
  categorias,
  fluxos,
}: {
  desafios: DesafioDashboardRow[];
  categorias: TaxonomiaLinha[];
  fluxos: TaxonomiaLinha[];
}): DesafiosDashboard {
  const porStatus = zerado<DesafioStatus>([
    "aberto",
    "em_analise",
    "resolvido",
    "nao_reproduz",
    "descartado",
  ]);
  const porTipo = zerado<DesafioTipo>(["bug", "atrito", "lacuna"]);
  const porSeveridade = zerado<DesafioSeveridade>(["critica", "alta", "media", "baixa"]);

  const contagemCategoria = new Map<string, number>();
  const contagemFluxo = new Map<string, number>();
  let semCategoria = 0;
  let semFluxo = 0;

  for (const desafio of desafios) {
    porStatus[desafio.status] += 1;
    porTipo[desafio.tipo] += 1;
    porSeveridade[desafio.severidade] += 1;

    const categoriaId = desafio.categoria?.id ?? null;
    if (categoriaId) contagemCategoria.set(categoriaId, (contagemCategoria.get(categoriaId) ?? 0) + 1);
    else semCategoria += 1;

    const fluxoId = desafio.fluxo?.id ?? null;
    if (fluxoId) contagemFluxo.set(fluxoId, (contagemFluxo.get(fluxoId) ?? 0) + 1);
    else semFluxo += 1;
  }

  const linhas = eixoDe(categorias, contagemCategoria, semCategoria, SEM_CATEGORIA);
  const colunas = eixoDe(fluxos, contagemFluxo, semFluxo, SEM_FLUXO);

  // Uma passagem só: os recortes saem antes, e o máximo (que define as faixas
  // de intensidade) sai deles — recalcular por célula varreria a base duas
  // vezes para chegar ao mesmo número.
  const bases = linhas.map((linha) =>
    colunas.map((coluna) => celula(recorteDe(desafios, linha.id, coluna.id))),
  );
  const max = bases
    .flat()
    .reduce((maior, base) => Math.max(maior, base.total), 0);
  const faixas = faixasDe(max);

  const celulas: CelulaMatriz[][] = bases.map((linha) =>
    linha.map((base) => ({ ...base, nivel: nivelDe(base.total, faixas) })),
  );

  const totaisPorLinha: CelulaMatriz[] = linhas.map((linha) => {
    const base = celula(desafios.filter((d) => (d.categoria?.id ?? null) === linha.id));
    return { ...base, nivel: nivelDe(base.total, faixas) };
  });

  const totaisPorColuna: CelulaMatriz[] = colunas.map((coluna) => {
    const base = celula(desafios.filter((d) => (d.fluxo?.id ?? null) === coluna.id));
    return { ...base, nivel: nivelDe(base.total, faixas) };
  });

  const totalGeral = celula(desafios);

  const bugs = desafios.filter((desafio) => desafio.tipo === "bug");
  const bugsMedidos = bugs.filter(
    (bug) => recorrenciaAgregada([bug]).status === "medido",
  ).length;

  return {
    total: desafios.length,
    abertos: totalGeral.abertos,
    criticosAbertos: desafios.filter(
      (desafio) => desafio.severidade === "critica" && estaAberto(desafio),
    ).length,
    recorrenciaGeral: recorrenciaAgregada(bugs),
    bugs: bugs.length,
    bugsMedidos,
    bugsSemMedicao: bugs.length - bugsMedidos,
    porStatus,
    porTipo,
    porSeveridade,
    porCategoria: rankear(linhas, totaisPorLinha),
    porFluxo: rankear(colunas, totaisPorColuna),
    matriz: {
      linhas,
      colunas,
      celulas,
      totaisPorLinha,
      totaisPorColuna,
      total: { ...totalGeral, nivel: nivelDe(totalGeral.total, faixas) },
      faixas,
    },
    reincidentes: rankearReincidentes(desafios),
  };
}

function recorteDe(
  desafios: DesafioDashboardRow[],
  categoriaId: string | null,
  fluxoId: string | null,
): DesafioDashboardRow[] {
  return desafios.filter(
    (desafio) =>
      (desafio.categoria?.id ?? null) === categoriaId &&
      (desafio.fluxo?.id ?? null) === fluxoId,
  );
}

// Ranking: aqui SIM por volume, e o desempate por nome mantém a lista estável
// entre dois carregamentos.
function rankear(eixo: EixoItem[], totais: CelulaMatriz[]): LeituraTaxonomia[] {
  return eixo
    .map((item, indice) => ({
      id: item.id,
      nome: item.nome,
      cor: item.cor,
      total: totais[indice].total,
      abertos: totais[indice].abertos,
      recorrencia: totais[indice].recorrencia,
    }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
}

/*
 * Amostra mínima: um desafio que falhou 1 de 1 no topo de "mais recorrentes" é
 * a mentira clássica do n pequeno — 100% de uma tentativa não é 100% de nada.
 */
function rankearReincidentes(desafios: DesafioDashboardRow[]): Reincidente[] {
  return desafios
    .map((desafio) => ({
      id: desafio.id,
      codigo: desafio.codigo,
      titulo: desafio.titulo,
      recorrencia: recorrenciaAgregada([desafio]),
    }))
    .filter(
      (item) =>
        item.recorrencia.status === "medido" &&
        item.recorrencia.tentativas >= MIN_TENTATIVAS_PARA_RANQUEAR &&
        item.recorrencia.falhas > 0,
    )
    .sort((a, b) => {
      if (a.recorrencia.status !== "medido" || b.recorrencia.status !== "medido") return 0;
      return (
        b.recorrencia.pct - a.recorrencia.pct ||
        b.recorrencia.tentativas - a.recorrencia.tentativas ||
        a.codigo - b.codigo
      );
    })
    .slice(0, 8);
}

function zerado<T extends string>(chaves: T[]): Record<T, number> {
  return Object.fromEntries(chaves.map((chave) => [chave, 0])) as Record<T, number>;
}

export type CruzamentoNaoVazio = {
  categoria: EixoItem;
  fluxo: EixoItem;
  celula: CelulaMatriz;
};

/*
 * A forma esparsa da MESMA conta. É o que a leitura mobile consome: uma matriz
 * de 10 × 15 em 375px é ilegível em qualquer corpo de fonte, e a maior parte
 * das células costuma ser zero. Mora aqui, e não no componente, para não haver
 * uma segunda filtragem — e para a ordenação ser testável.
 */
export function cruzamentosNaoVazios(
  matriz: MatrizCategoriaFluxo,
): CruzamentoNaoVazio[] {
  const cruzamentos: CruzamentoNaoVazio[] = [];

  matriz.linhas.forEach((categoria, i) => {
    matriz.colunas.forEach((fluxo, j) => {
      const celula = matriz.celulas[i][j];
      if (celula.total > 0) cruzamentos.push({ categoria, fluxo, celula });
    });
  });

  return cruzamentos.sort(
    (a, b) =>
      b.celula.total - a.celula.total ||
      a.categoria.nome.localeCompare(b.categoria.nome, "pt-BR") ||
      a.fluxo.nome.localeCompare(b.fluxo.nome, "pt-BR"),
  );
}

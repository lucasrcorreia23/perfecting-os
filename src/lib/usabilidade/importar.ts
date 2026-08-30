/*
 * Leitura do material colado — ficha preenchida ou transcrição crua.
 *
 * NUNCA LANÇA E NUNCA INVENTA VALOR. Molde de `lerXlsxPremissas`: devolve
 * `{ dado, avisos }`, e cada coisa que não deu para ler vira um aviso em pt-BR
 * em vez de um default silencioso. Campo que não casou sai como
 * `nao_reconhecido` com o texto bruto ao lado — nunca zero, string vazia ou a
 * primeira opção.
 *
 * TRÊS REGRAS QUE VÊM DE MATERIAL REAL, não de teoria:
 *
 * 1. NADA DE CASAMENTO APROXIMADO. No Bloco 2, "Não" é opção da Q5 (faria de
 *    novo) e "Não faria" é opção da Q6 (quando treinaria): qualquer
 *    `includes`/`startsWith` mapeia um no outro conforme a ordem de iteração, e
 *    o valor vai para a pergunta errada em silêncio. Falhou o exato-normalizado,
 *    guarda o cru e marca para a revisão humana.
 * 2. O PERFIL SE RESOLVE PRIMEIRO. As perguntas 9 e 10 do Bloco 2 têm o mesmo
 *    número e textos diferentes por perfil; sem o perfil, casar é adivinhar.
 * 3. A TRANSCRIÇÃO NÃO PREENCHE VALOR. Numa transcrição real o moderador
 *    parafraseia ("então, conta pra gente..."), a ASR erra nomes e números
 *    ("uns 7", "sete"), os falantes são pessoas e não papéis, e a mesma fala se
 *    parte em três turnos. Casar pergunta por texto ali teria recall baixo e —
 *    pior — precisão baixa. O que este módulo faz com transcrição é segmentar
 *    turnos: o resto é trabalho humano, e é honesto que seja.
 */

import {
  normalizarRotulo,
  parseDataBR,
  parseDuracao,
  type RespostaValor,
  type RespostasMap,
} from "./respostas";
import { perguntasDoPerfil, type Perfil, type Pergunta } from "./roteiro";

export type FormatoImportacao = "ficha" | "transcricao" | "desconhecido";

export type Fala = { tempo: string | null; falante: string | null; texto: string };

export type CampoLido = {
  perguntaId: string;
  rotulo: string;
  bruto: string;
  valor: RespostaValor | null;
  status: "lido" | "nao_reconhecido";
};

export type AvisoImportacao = {
  codigo:
    | "sem_conteudo"
    | "perfil_indefinido"
    | "linha_nao_reconhecida"
    | "valor_nao_reconhecido";
  mensagem: string;
};

export type Leitura = {
  formato: FormatoImportacao;
  perfil: Perfil | null;
  varejo: boolean;
  campos: CampoLido[];
  respostas: RespostasMap;
  falas: Fala[];
  avisos: AvisoImportacao[];
};

// Placeholder do template em branco ("Data: ____"). Não é resposta, e não é
// erro — a linha existe porque o modelo tem a linha.
const PLACEHOLDER = /^[_\s.·—-]*$/;

function limparValor(bruto: string): string {
  return bruto.replace(/_{2,}/g, " ").replace(/\s+/g, " ").trim();
}

/*
 * Os padrões de fala que aparecem no material real: Grain, Meet colado,
 * timestamp em colchete, nome com tempo entre parênteses, e Zoom (sem tempo).
 * Ganha o que casar mais linhas — heurística de escore, nunca de "o primeiro que
 * bater", porque uma transcrição do Grain contém `Nome:` e casaria o padrão do
 * Zoom em toda linha.
 */
const PADROES_FALA: readonly { nome: string; re: RegExp }[] = [
  { nome: "grain", re: /^\*\*\[(\d{1,2}:\d{2}(?::\d{2})?)\]\*\*\s*\*\*(.+?):\*\*\s*(.*)$/ },
  { nome: "colchete", re: /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.+?):\s*(.*)$/ },
  { nome: "meet", re: /^(\d{1,2}:\d{2}(?::\d{2})?)\s+-\s+(.+?)\s*$/ },
  { nome: "parenteses", re: /^(?:.*?)\((\d{1,2}:\d{2}(?::\d{2})?)\)\s*:?\s*(.*)$/ },
];

const ZOOM = /^([A-Za-zÀ-ÿ][^:]{1,40}):\s*(.+)$/;

export function segmentarFalas(texto: string): Fala[] {
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n");

  // Meet cola o cabeçalho numa linha e a fala na seguinte, então ele é tratado
  // à parte dos que trazem tudo numa linha só.
  const meet = lerMeet(linhas);
  if (meet.length >= 2) return meet;

  let melhor: { falas: Fala[]; casadas: number } = { falas: [], casadas: 0 };

  for (const padrao of PADROES_FALA) {
    if (padrao.nome === "meet") continue;
    const falas: Fala[] = [];
    let casadas = 0;

    for (const linha of linhas) {
      const m = linha.match(padrao.re);
      if (m) {
        casadas += 1;
        falas.push({
          tempo: m[1] ?? null,
          falante: (m[2] ?? "").trim() || null,
          texto: (m[3] ?? "").trim(),
        });
        continue;
      }
      // Linha solta é continuação da fala anterior — a mesma pessoa ocupa
      // vários parágrafos o tempo todo.
      const atual = falas.at(-1);
      if (atual && linha.trim()) atual.texto = `${atual.texto}\n${linha.trim()}`.trim();
    }

    if (casadas > melhor.casadas) melhor = { falas, casadas };
  }

  if (melhor.casadas >= 2) return melhor.falas;

  const zoom = lerZoom(linhas);
  if (zoom.length >= 2) return zoom;

  /*
   * FALLBACK HONESTO: nada casou, então o texto inteiro é UMA fala sem falante.
   * Devolver `[]` faria a tela dizer "não há transcrição" sobre um texto que
   * existe, e é dele que os trechos vão ser citados.
   */
  const inteiro = texto.trim();
  return inteiro ? [{ tempo: null, falante: null, texto: inteiro }] : [];
}

function lerMeet(linhas: string[]): Fala[] {
  const falas: Fala[] = [];
  for (const linha of linhas) {
    const m = linha.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+-\s+(.+?)\s*$/);
    if (m) {
      falas.push({ tempo: m[1], falante: m[2].trim() || null, texto: "" });
      continue;
    }
    const atual = falas.at(-1);
    if (atual && linha.trim()) atual.texto = `${atual.texto}\n${linha.trim()}`.trim();
  }
  return falas.filter((fala) => fala.texto);
}

function lerZoom(linhas: string[]): Fala[] {
  const falas: Fala[] = [];
  for (const linha of linhas) {
    const m = linha.match(ZOOM);
    if (m) {
      falas.push({ tempo: null, falante: m[1].trim(), texto: m[2].trim() });
      continue;
    }
    const atual = falas.at(-1);
    if (atual && linha.trim()) atual.texto = `${atual.texto}\n${linha.trim()}`.trim();
  }
  return falas;
}

/*
 * A detecção é ESCORE, e a palavra final é humana — a tela mostra o formato
 * escolhido com um clique para trocar. Uma transcrição do Grain contém `Nome:`,
 * que é literalmente `Rótulo: valor`; uma ficha com uma citação colada numa
 * resposta aberta contém `00:12 - Lucas`. Qualquer heurística inverte nos dois
 * sentidos, e errar em silêncio aqui contamina tudo o que vem depois.
 */
export function detectarFormato(texto: string): FormatoImportacao {
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n");
  if (linhas.every((linha) => !linha.trim())) return "desconhecido";

  const blocos = linhas.filter((linha) => /^\s*BLOCO\s+\d/i.test(linha)).length;
  const rotulosConhecidos = linhas.filter((linha) => {
    const m = linha.match(/^\s*(?:\d+[.)]\s*)?([^:]{2,80}):/);
    return m ? TODOS_OS_ROTULOS.has(normalizarRotulo(m[1])) : false;
  }).length;

  const comTempo = linhas.filter((linha) =>
    /(\*\*\[|\[)?\d{1,2}:\d{2}/.test(linha),
  ).length;

  // Cabeçalho de bloco vale muito: transcrição não tem "BLOCO 2".
  const escoreFicha = blocos * 5 + rotulosConhecidos * 2;
  const escoreTranscricao = comTempo;

  if (escoreFicha === 0 && escoreTranscricao === 0) return "desconhecido";
  return escoreFicha >= escoreTranscricao ? "ficha" : "transcricao";
}

/*
 * DOIS índices, e a separação não é estilo — é correção.
 *
 * "Descreva a sua experiência." e "O que te irritou, mesmo que pareça bobagem?"
 * são rótulos IDÊNTICOS no Bloco 3A (vendedor) e no 3B (gestor). Um índice único
 * de rótulo → id teria de escolher um dos dois, e o perdedor sumiria em
 * silêncio: a resposta do vendedor cairia no id do gestor, seria descartada por
 * não estar no roteiro dele, e ninguém veria.
 *
 * Então: um SET com todos os rótulos, que só serve para saber onde uma linha
 * começa (partir o texto não precisa desambiguar), e um MAPA por perfil, que
 * resolve o id depois que o perfil já foi lido. É a regra 2 do cabeçalho
 * aplicada ao índice.
 */
function chavesDe(pergunta: Pergunta): string[] {
  return [pergunta.rotulo, ...(pergunta.sinonimos ?? [])].map(normalizarRotulo);
}

const TODOS_OS_ROTULOS: ReadonlySet<string> = new Set(
  (["gestor", "vendedor"] as const).flatMap((perfil) =>
    perguntasDoPerfil(perfil, true).flatMap(chavesDe),
  ),
);

function indiceDoPerfil(perfil: Perfil | null, varejo: boolean): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const pergunta of perguntasDoPerfil(perfil, varejo)) {
    for (const chave of chavesDe(pergunta)) {
      if (!mapa.has(chave)) mapa.set(chave, pergunta.id);
    }
  }
  return mapa;
}

// Só as perguntas comuns aos dois perfis — é com ele que se descobre QUEM
// respondeu, antes de saber qual roteiro aplicar.
const INDICE_COMUM = indiceDoPerfil(null, false);

/*
 * Extrai a opção marcada de uma linha de template: "( ) Gestor (x) Vendedor".
 * Sem marca nenhuma, devolve o texto limpo — a pessoa pode ter apagado os
 * parênteses e escrito só a resposta.
 */
function opcaoMarcada(bruto: string): string {
  const marcada = bruto.match(/[([]\s*[xX✓✔]\s*[)\]]\s*([^([\n]+)/);
  if (marcada) return marcada[1].trim();
  // Só caixas vazias = nada foi marcado.
  if (/[([]\s*[)\]]/.test(bruto) && !/[xX✓✔]/.test(bruto)) {
    const semCaixas = bruto.replace(/[([]\s*[)\]]\s*[^([\n]*/g, "").trim();
    return semCaixas;
  }
  return bruto.trim();
}

function coagirBruto(pergunta: Pergunta, bruto: string): RespostaValor | null {
  const valor = limparValor(bruto);
  if (!valor || PLACEHOLDER.test(valor)) return null;

  switch (pergunta.forma.tipo) {
    case "escolha": {
      const escolhido = normalizarRotulo(opcaoMarcada(valor));
      if (!escolhido) return null;
      // EXATO, nunca aproximado — ver a regra 1 no cabeçalho.
      const opcao = pergunta.forma.opcoes.find(
        (candidata) =>
          normalizarRotulo(candidata.label) === escolhido || candidata.id === escolhido,
      );
      return opcao ? opcao.id : null;
    }
    case "escala": {
      const m = valor.match(/-?\d+/);
      if (!m) return null;
      const numero = Number(m[0]);
      if (!Number.isInteger(numero)) return null;
      // Fora da régua é recusa: um 8 numa escala 1–7 não é 7.
      if (numero < pergunta.forma.min || numero > pergunta.forma.max) return null;
      return numero;
    }
    case "duracao":
      return parseDuracao(valor);
    case "data":
      return parseDataBR(valor);
    case "texto":
    case "texto_curto":
      return valor;
  }
}

type LinhaCampo = { rotulo: string; bruto: string };

// Quebra no PRIMEIRO dois-pontos: o valor pode conter outros
// ("Objeção: preço: está caro"). Numeração de item ("4. ") sai fora.
function lerLinhas(texto: string): { campos: LinhaCampo[]; soltas: string[] } {
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n");
  const campos: LinhaCampo[] = [];
  const soltas: string[] = [];

  for (const linha of linhas) {
    if (!linha.trim()) continue;
    if (/^\s*BLOCO\s+\d/i.test(linha)) continue;

    const m = linha.match(/^\s*(?:\d+[.)]\s*)?([^:]{1,120}?)\s*:\s*(.*)$/);
    if (m && TODOS_OS_ROTULOS.has(normalizarRotulo(m[1]))) {
      campos.push({ rotulo: m[1].trim(), bruto: m[2] });
      continue;
    }

    /*
     * Linha que não casa um rótulo conhecido é CONTINUAÇÃO do valor anterior —
     * os Blocos 3A e 3B são 21 perguntas abertas, e a resposta delas é
     * parágrafo, não uma linha. Sem esta regra, tudo depois da primeira quebra
     * viraria "linha não reconhecida".
     */
    const atual = campos.at(-1);
    if (atual) atual.bruto = `${atual.bruto}\n${linha.trim()}`.trim();
    else soltas.push(linha.trim());
  }

  return { campos, soltas };
}

export function lerImportacao(
  texto: string,
  opcoes: { formato?: FormatoImportacao } = {},
): Leitura {
  const avisos: AvisoImportacao[] = [];
  const formato = opcoes.formato ?? detectarFormato(texto);

  if (!texto.trim()) {
    return {
      formato: "desconhecido",
      perfil: null,
      varejo: false,
      campos: [],
      respostas: {},
      falas: [],
      avisos: [{ codigo: "sem_conteudo", mensagem: "Não há texto para ler." }],
    };
  }

  if (formato !== "ficha") {
    // Regra 3: transcrição não preenche valor. Só segmenta.
    return {
      formato,
      perfil: null,
      varejo: false,
      campos: [],
      respostas: {},
      falas: segmentarFalas(texto),
      avisos,
    };
  }

  const { campos: linhas, soltas } = lerLinhas(texto);

  // PASSO 1 — o perfil e o varejo, pelo índice COMUM, antes de qualquer outra
  // coisa (regra 2). Só depois disso existe um roteiro para casar contra.
  const bruto = (perguntaId: string) =>
    linhas.find(
      (linha) => INDICE_COMUM.get(normalizarRotulo(linha.rotulo)) === perguntaId,
    )?.bruto;

  const perfil = resolverPerfil(bruto("b0_perfil"));
  const varejo = resolverVarejo(bruto("b0_varejo"));

  // PASSO 2 — agora o índice é o do perfil resolvido, e os rótulos que colidem
  // entre 3A e 3B deixam de ser ambíguos: só um dos dois está no roteiro.
  const indice = indiceDoPerfil(perfil, varejo);
  const porId = new Map<string, (typeof linhas)[number]>();
  for (const linha of linhas) {
    const id = indice.get(normalizarRotulo(linha.rotulo));
    if (id && !porId.has(id)) porId.set(id, linha);
  }

  if (!perfil) {
    avisos.push({
      codigo: "perfil_indefinido",
      mensagem:
        "Não deu para ler o perfil do participante. Sem ele, só as perguntas comuns aos dois perfis foram lidas.",
    });
  }

  const aplicaveis = perguntasDoPerfil(perfil, varejo);
  const campos: CampoLido[] = [];
  const respostas: RespostasMap = {};

  for (const pergunta of aplicaveis) {
    const linha = porId.get(pergunta.id);
    if (!linha) continue;

    const valor = coagirBruto(pergunta, linha.bruto);
    const bruto = limparValor(linha.bruto);

    if (valor === null) {
      // Branco de template não é erro; valor escrito e não reconhecido é.
      if (bruto && !PLACEHOLDER.test(bruto)) {
        campos.push({
          perguntaId: pergunta.id,
          rotulo: pergunta.rotulo,
          bruto,
          valor: null,
          status: "nao_reconhecido",
        });
        avisos.push({
          codigo: "valor_nao_reconhecido",
          mensagem: `"${pergunta.rotulo}": não deu para ler "${bruto}". Escolha na revisão.`,
        });
      }
      continue;
    }

    respostas[pergunta.id] = valor;
    campos.push({
      perguntaId: pergunta.id,
      rotulo: pergunta.rotulo,
      bruto,
      valor,
      status: "lido",
    });
  }

  for (const solta of soltas) {
    avisos.push({
      codigo: "linha_nao_reconhecida",
      mensagem: `Linha ignorada: "${solta.slice(0, 80)}".`,
    });
  }

  return { formato, perfil, varejo, campos, respostas, falas: [], avisos };
}

function resolverPerfil(bruto: string | undefined): Perfil | null {
  if (!bruto) return null;
  const valor = normalizarRotulo(opcaoMarcada(limparValor(bruto)));
  if (valor === "gestor") return "gestor";
  if (valor === "vendedor") return "vendedor";
  return null;
}

function resolverVarejo(bruto: string | undefined): boolean {
  if (!bruto) return false;
  return normalizarRotulo(opcaoMarcada(limparValor(bruto))) === "sim";
}

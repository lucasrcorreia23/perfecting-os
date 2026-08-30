/*
 * As respostas de uma sessão — coerção, validação e formatação, sem I/O.
 *
 * Molde de `marketing-answers.ts`, com UMA divergência deliberada e importante:
 * lá `leadFieldsFrom` COPIA a resposta para a coluna e a DEIXA no jsonb. Aqui
 * `promoverRespostas` copia e REMOVE. A diferença é que lá o schema é autoral e
 * não há id canônico, enquanto aqui o roteiro mora em código e o id É canônico
 * — duas cópias da mesma verdade divergem no primeiro `update`. O caso real:
 * sessão importada com "Perfil: Gestor", corrigida depois para Vendedor na
 * coluna; o CSV (que monta colunas a partir do roteiro) imprimiria Gestor e o
 * dashboard (que lê a coluna) contaria Vendedor, na mesma linha do mesmo
 * arquivo.
 *
 * `formatarResposta` é FONTE ÚNICA de tela, JSON e CSV — como `formatAnswer` já
 * é para o lead. Duas formatações fariam a mesma sessão ler como duas.
 */

import {
  opcaoPorId,
  type ColunaSessao,
  type Perfil,
  type Pergunta,
} from "./roteiro";

// Sem `string[]`: nenhuma pergunta deste roteiro é de escolha múltipla, e
// declarar o caso que não existe faria todo consumidor tratar um ramo morto.
export type RespostaValor = string | number;
export type RespostasMap = Record<string, RespostaValor>;

const MAX_TEXTO = 5000;
const MAX_TEXTO_CURTO = 500;

export type AvisoResposta = {
  codigo: "dependencia_nao_satisfeita" | "fora_do_roteiro";
  perguntaId: string;
  mensagem: string;
};

export type ValidarRespostasResult =
  | { ok: true; respostas: RespostasMap; avisos: AvisoResposta[] }
  | { ok: false; error: string; campo?: string };

/*
 * Normalização de rótulo e de label de opção: NFD, sem diacrítico, minúscula,
 * espaço colapsado, sem pontuação de fim. É o que permite "Sistema Operacional",
 * "sistema operacional" e "Sistema operacional?" casarem — e SÓ isso. Não existe
 * casamento aproximado em lugar nenhum deste módulo: no Bloco 2, "Não" (Q5,
 * faria de novo) e "Não faria" (Q6, quando treinaria) casariam um no outro por
 * qualquer `includes`/`startsWith`, e o valor iria para a pergunta errada em
 * silêncio.
 */
export function normalizarRotulo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    // A pontuação sai DEPOIS do trim: "Duração:  " com espaço no fim não casa
    // um `$` ancorado nos dois-pontos, e o rótulo voltaria com a pontuação.
    .replace(/[?:.!]+$/g, "")
    .trim();
}

/*
 * Duração devolve `null`, nunca zero: zero minuto seria uma MEDIÇÃO ("a sessão
 * durou nada"), e o que houve foi ausência dela — o mesmo motivo pelo qual
 * `Recorrencia` tem `sem_dados` em vez de 0%.
 */
export function parseDuracao(bruto: string): number | null {
  const texto = bruto.trim().toLowerCase();
  if (!texto) return null;

  const horaMinuto = texto.match(/^(\d{1,2})\s*[h:]\s*(\d{1,2})/);
  if (horaMinuto) {
    const minutos = Number(horaMinuto[1]) * 60 + Number(horaMinuto[2]);
    return minutos > 0 ? minutos : null;
  }

  const soHoras = texto.match(/^(\d{1,2})\s*h$/);
  if (soHoras) {
    const minutos = Number(soHoras[1]) * 60;
    return minutos > 0 ? minutos : null;
  }

  const soNumero = texto.match(/^(\d{1,4})\s*(min|minutos?)?$/);
  if (soNumero) {
    const minutos = Number(soNumero[1]);
    return minutos > 0 ? minutos : null;
  }

  return null;
}

/*
 * Data devolve `null` quando não tem certeza, e JAMAIS cai para hoje: uma sessão
 * importada uma semana depois entraria com a data errada, e `realizado_em` é o
 * eixo de ordenação e de recorte — ele mentiria em silêncio para sempre.
 */
export function parseDataBR(bruto: string): string | null {
  const texto = bruto.trim();
  if (!texto) return null;

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return validarData(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const ano = Number(br[3]);
    return validarData(ano < 100 ? 2000 + ano : ano, Number(br[2]), Number(br[1]));
  }

  // "12/08" sem ano é ambíguo — e chutar o ano corrente erraria toda sessão de
  // janeiro importada em dezembro.
  return null;
}

function validarData(ano: number, mes: number, dia: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/*
 * Leitura tolerante do jsonb. Ao contrário de `parseQuestions`, ela NÃO filtra
 * por pertencer ao roteiro: uma resposta cujo id saiu do roteiro precisa
 * sobreviver para ser renderizada como "fora do roteiro atual". Descartá-la aqui
 * faria a sessão antiga perder dado em silêncio no dia em que o roteiro mudasse.
 */
export function parseRespostas(value: unknown): RespostasMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const fonte = value as Record<string, unknown>;
  const respostas: RespostasMap = {};

  for (const [id, bruto] of Object.entries(fonte)) {
    if (typeof bruto === "string") {
      if (bruto.trim()) respostas[id] = bruto;
      continue;
    }
    if (typeof bruto === "number" && Number.isFinite(bruto)) respostas[id] = bruto;
  }

  return respostas;
}

export function respostasToJson(respostas: RespostasMap): Record<string, RespostaValor> {
  return { ...respostas };
}

/*
 * A dependência é resolvida CONTRA AS RESPOSTAS, não contra o perfil — por isso
 * não vive em `perguntasDoPerfil`.
 */
export function dependenciaSatisfeita(
  pergunta: Pergunta,
  respostas: RespostasMap,
): boolean {
  if (!pergunta.dependeDe) return true;
  return respostas[pergunta.dependeDe.pergunta] === pergunta.dependeDe.opcao;
}

function coagir(pergunta: Pergunta, valor: unknown): RespostaValor | null {
  switch (pergunta.forma.tipo) {
    case "escolha": {
      if (typeof valor !== "string") return null;
      return opcaoPorId(pergunta, valor) ? valor : null;
    }
    case "escala": {
      const numero = typeof valor === "number" ? valor : Number(valor);
      if (!Number.isInteger(numero)) return null;
      // Fora da régua é recusa, não grampeamento: um 8 numa escala 1–7 não é 7,
      // é um dado que não existe naquela pergunta.
      if (numero < pergunta.forma.min || numero > pergunta.forma.max) return null;
      return numero;
    }
    case "duracao": {
      const numero = typeof valor === "number" ? valor : Number(valor);
      if (!Number.isInteger(numero) || numero <= 0) return null;
      return numero;
    }
    case "data": {
      if (typeof valor !== "string") return null;
      return parseDataBR(valor);
    }
    case "texto":
    case "texto_curto": {
      if (typeof valor !== "string") return null;
      const limpo = valor.trim();
      if (!limpo) return null;
      const teto = pergunta.forma.tipo === "texto" ? MAX_TEXTO : MAX_TEXTO_CURTO;
      return limpo.slice(0, teto);
    }
  }
}

/*
 * Valida contra as perguntas que se APLICAM (perfil × varejo já resolvidos pelo
 * chamador). Chave desconhecida é preservada e reportada, nunca descartada.
 */
export function validarRespostas(
  perguntas: readonly Pergunta[],
  raw: unknown,
): ValidarRespostasResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Respostas em formato inválido." };
  }

  const fonte = parseRespostas(raw);
  const respostas: RespostasMap = {};
  const avisos: AvisoResposta[] = [];
  const doRoteiro = new Set(perguntas.map((pergunta) => pergunta.id));

  for (const pergunta of perguntas) {
    const bruto = fonte[pergunta.id];
    if (bruto === undefined) continue;

    const valor = coagir(pergunta, bruto);
    if (valor === null) {
      return {
        ok: false,
        error: `Resposta inválida em "${pergunta.rotulo}".`,
        campo: pergunta.id,
      };
    }
    respostas[pergunta.id] = valor;
  }

  /*
   * INVARIANTE 9 — resposta cuja dependência não está satisfeita NÃO EXISTE.
   * O template em branco convida a preencher "motivo de não ter finalizado"
   * mesmo com "Finalizou: Sim"; contá-la faria "Desistiu: 60%" sobre um
   * denominador de dois casos reais. A segunda passada é necessária porque a
   * dependência olha para respostas já coagidas.
   */
  for (const pergunta of perguntas) {
    if (respostas[pergunta.id] === undefined) continue;
    if (dependenciaSatisfeita(pergunta, respostas)) continue;
    delete respostas[pergunta.id];
    avisos.push({
      codigo: "dependencia_nao_satisfeita",
      perguntaId: pergunta.id,
      mensagem: `"${pergunta.rotulo}" foi descartada: a condição que a libera não está satisfeita.`,
    });
  }

  for (const [id, valor] of Object.entries(fonte)) {
    if (doRoteiro.has(id)) continue;
    respostas[id] = valor;
    avisos.push({
      codigo: "fora_do_roteiro",
      perguntaId: id,
      mensagem: `"${id}" não pertence ao roteiro atual e foi preservada como está.`,
    });
  }

  return { ok: true, respostas, avisos };
}

export type ColunasPromovidas = {
  perfil: Perfil | null;
  fluxo: string | null;
  varejo: boolean;
  realizado_em: string | null;
};

/*
 * Promove as respostas que são colunas E AS REMOVE do mapa. Ver o cabeçalho:
 * é aqui que este módulo diverge do `leadFieldsFrom`, de propósito.
 */
export function promoverRespostas(
  perguntas: readonly Pergunta[],
  respostas: RespostasMap,
): { colunas: ColunasPromovidas; respostasRestantes: RespostasMap } {
  const restantes: RespostasMap = { ...respostas };
  const lidas = new Map<ColunaSessao, RespostaValor>();

  for (const pergunta of perguntas) {
    if (!pergunta.coluna) continue;
    const valor = restantes[pergunta.id];
    if (valor === undefined) continue;
    lidas.set(pergunta.coluna, valor);
    delete restantes[pergunta.id];
  }

  const perfil = lidas.get("perfil");
  const fluxo = lidas.get("fluxo");
  const varejo = lidas.get("varejo");
  const data = lidas.get("realizado_em");

  return {
    colunas: {
      perfil: perfil === "gestor" || perfil === "vendedor" ? perfil : null,
      fluxo: typeof fluxo === "string" ? fluxo : null,
      varejo: varejo === "sim",
      realizado_em: typeof data === "string" ? data : null,
    },
    respostasRestantes: restantes,
  };
}

/*
 * FONTE ÚNICA de formatação. String vazia quando não há resposta — a tela é que
 * decide se escreve "Não respondida" (molde do `lead-detail`), porque o CSV
 * quer célula vazia e a tela quer a frase.
 */
export function formatarResposta(
  pergunta: Pergunta,
  valor: RespostaValor | undefined,
): string {
  if (valor === undefined) return "";

  switch (pergunta.forma.tipo) {
    case "escolha": {
      const opcao = typeof valor === "string" ? opcaoPorId(pergunta, valor) : null;
      return opcao ? opcao.label : String(valor);
    }
    case "escala": {
      // A régua vai junto SEMPRE (invariante 5): "6" numa escala 1–7 e "6" numa
      // 0–10 imprimem igual e não significam o mesmo.
      return `${valor} de ${pergunta.forma.max}`;
    }
    case "duracao": {
      const minutos = Number(valor);
      if (!Number.isFinite(minutos)) return String(valor);
      if (minutos < 60) return `${minutos} min`;
      const horas = Math.floor(minutos / 60);
      const resto = minutos % 60;
      return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
    }
    case "data":
      return typeof valor === "string" ? formatarDataBR(valor) : String(valor);
    case "texto":
    case "texto_curto":
      return String(valor);
  }
}

function formatarDataBR(iso: string): string {
  const partes = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes) return iso;
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

/*
 * Remove as respostas cuja dependência deixou de valer. Existe para o
 * FORMULÁRIO: marcar "Finalizou: Não", escolher um motivo e voltar para "Sim"
 * deixaria o motivo pendurado no estado, invisível na tela e descartado só na
 * gravação — o usuário veria o campo sumir e não saberia que a resposta foi
 * junto. Limpar na hora torna a tela e o dado a mesma coisa.
 *
 * Roda até estabilizar porque dependência encadeia: no Bloco 4,
 * `b4_qual_dispositivo_outro` depende de `b4_qual_dispositivo`, que depende de
 * `b4_usa_dispositivo`. Uma passada só deixaria o neto para trás.
 */
export function limparDependentes(
  perguntas: readonly Pergunta[],
  respostas: RespostasMap,
): RespostasMap {
  let atual: RespostasMap = { ...respostas };

  for (let passada = 0; passada < perguntas.length; passada += 1) {
    let mudou = false;
    for (const pergunta of perguntas) {
      if (atual[pergunta.id] === undefined) continue;
      if (dependenciaSatisfeita(pergunta, atual)) continue;
      const proxima: RespostasMap = { ...atual };
      delete proxima[pergunta.id];
      atual = proxima;
      mudou = true;
    }
    if (!mudou) break;
  }

  return atual;
}

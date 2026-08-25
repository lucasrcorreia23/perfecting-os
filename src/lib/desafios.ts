/*
 * Módulo Desafios — a regra da recorrência, pura e sem I/O.
 *
 * O produto responde duas perguntas: com que FREQUÊNCIA um problema acontece
 * ("de 10, 7 bugaram") e ONDE ele mora (categoria × fluxo). Este arquivo é dono
 * da primeira, e é o único lugar onde a proporção é calculada — a tela, o
 * dashboard e o export consomem o que sai daqui.
 */

// Fonte da proporção. "misto" só existe em agregado (categoria, fluxo, célula
// da matriz, KPI geral): nomear a fonte é o que impede o número de virar
// anônimo na tela e no arquivo exportado.
export type FonteRecorrencia = "log" | "contador" | "misto";

/*
 * União discriminada, no molde do ResultadoTime da calculadora: o NÃO-VALOR é
 * um estado, não um zero. Ler 0/0 como 0% afirma "nunca falhou", e isso não é
 * uma medição — é a ausência de uma. A UI formata `sem_dados` como travessão.
 */
export type Recorrencia =
  | { status: "sem_dados" }
  | {
      status: "medido";
      fonte: FonteRecorrencia;
      tentativas: number;
      falhas: number;
      pct: number; // 0..1, como PocStageProgress.pct
    };

// Uma medição é uma SESSÃO: "de 10, 7 bugaram" é `{ tentativas: 10, falhas: 7 }`,
// uma linha só. O caso unitário é `{ tentativas: 1, falhas: 1 }`.
export type Medicao = { tentativas: number; falhas: number };

export type DesafioMedido = {
  tentativas: number; // desafios.tentativas — o contador manual
  falhas: number; // desafios.falhas
  ocorrencias: readonly Medicao[]; // [] quando não há log
};

const TRAVESSAO = "—";

/*
 * CONSOLIDADO PONDERADO — Σfalhas ÷ Σtentativas, JAMAIS média de porcentagens.
 * É o invariante 11 da calculadora (src/lib/calculadora/consolidado.ts) neste
 * domínio: a média trata uma sessão de 2 tentativas e uma de 200 como iguais, e
 * superestima sempre que a amostra pequena foi a que falhou.
 *
 * Esta função NÃO valida e NÃO lança: ela grampeia. Validar aqui faria o
 * dashboard inteiro quebrar em cima de uma linha legada. O trabalho dela é
 * "nunca produzir um número que mente"; recusar entrada é de validate*Input.
 */
export function agregarPonderado(
  medicoes: readonly Medicao[],
  fonte: FonteRecorrencia,
): Recorrencia {
  let tentativas = 0;
  let falhas = 0;

  for (const medicao of medicoes) {
    if (!Number.isFinite(medicao.tentativas) || medicao.tentativas <= 0) continue;
    const nesta = Math.floor(medicao.tentativas);
    tentativas += nesta;
    falhas += Math.min(Math.max(Number.isFinite(medicao.falhas) ? medicao.falhas : 0, 0), nesta);
  }

  if (tentativas <= 0) return { status: "sem_dados" };
  return { status: "medido", fonte, tentativas, falhas, pct: falhas / tentativas };
}

/*
 * O LOG VENCE O CONTADOR, e NUNCA soma.
 *
 * Quem registra a primeira ocorrência normalmente já tinha digitado o contador
 * à mão; somar contaria a mesma medição duas vezes. Havendo log, o contador
 * vira histórico e a UI o desabilita dizendo por quê — senão editar um campo
 * que não muda número nenhum lê como defeito.
 */
export function recorrenciaDoDesafio(desafio: DesafioMedido): Recorrencia {
  if (desafio.ocorrencias.length > 0) {
    return agregarPonderado(desafio.ocorrencias, "log");
  }
  return agregarPonderado(
    [{ tentativas: desafio.tentativas, falhas: desafio.falhas }],
    "contador",
  );
}

/*
 * Recorrência de um CONJUNTO (categoria, fluxo, célula da matriz, KPI geral):
 * cada desafio entra com a medição que VALE para ele, e são as MEDIÇÕES que se
 * somam — nunca as porcentagens.
 */
export function recorrenciaAgregada(
  desafios: readonly DesafioMedido[],
): Recorrencia {
  const medicoes: Medicao[] = [];
  const fontes = new Set<"log" | "contador">();

  for (const desafio of desafios) {
    const usaLog = desafio.ocorrencias.length > 0;
    const doDesafio = usaLog
      ? desafio.ocorrencias
      : [{ tentativas: desafio.tentativas, falhas: desafio.falhas }];

    // Um desafio sem medição nenhuma não torna o agregado "misto": ele
    // simplesmente não entra na conta.
    const contribui = doDesafio.some(
      (medicao) => Number.isFinite(medicao.tentativas) && medicao.tentativas > 0,
    );
    if (!contribui) continue;

    fontes.add(usaLog ? "log" : "contador");
    medicoes.push(...doDesafio);
  }

  const unica = fontes.size === 1 ? [...fontes][0] : null;
  const fonte: FonteRecorrencia = fontes.size > 1 ? "misto" : (unica ?? "contador");
  return agregarPonderado(medicoes, fonte);
}

// Formatação num lugar só — nenhuma tela escreve o travessão à mão.
export function formatarRecorrencia(recorrencia: Recorrencia): string {
  if (recorrencia.status === "sem_dados") return TRAVESSAO;
  const pct = recorrencia.pct * 100;
  // Uma falha em 500 tentativas é 0,2%: arredondar para "0%" afirmaria que não
  // falhou. Abaixo de 1% (e acima de zero) a leitura honesta é "<1%".
  if (pct > 0 && pct < 1) return "<1%";
  return `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
}

export function formatarProporcao(recorrencia: Recorrencia): string {
  if (recorrencia.status === "sem_dados") return TRAVESSAO;
  return `${recorrencia.falhas} de ${recorrencia.tentativas}`;
}

// Rótulo legível do desafio. O FORMATO vive aqui e nunca no banco: guardá-lo
// criaria um segundo lugar onde o identificador mora.
export function codigoDesafio(codigo: number): string {
  return `DES-${String(Math.max(0, Math.trunc(codigo))).padStart(3, "0")}`;
}

// =============================================================================
// Validação — funções puras que devolvem a mensagem em pt-BR, ou null
// =============================================================================
// Molde de validatePostInput (src/lib/marketing-post.ts): a action chama, o
// CHECK do banco é o backstop. O CHECK devolveria 23514, que viraria o erro
// genérico; é daqui que sai a frase que a pessoa lê.

export type DesafioInput = {
  titulo: string;
  tentativas: number;
  falhas: number;
  evidencia_url?: string | null;
};

export function validateDesafioInput(input: DesafioInput): string | null {
  if (!input.titulo?.trim()) return "Informe o título do desafio.";
  if (input.titulo.trim().length > 200)
    return "O título precisa ter no máximo 200 caracteres.";

  const contador = validateContador(input.tentativas, input.falhas, 0);
  if (contador) return contador;

  const url = (input.evidencia_url ?? "").trim();
  if (url && !/^https?:\/\//i.test(url))
    return "O link de evidência precisa começar com http:// ou https://.";

  return null;
}

export function validateOcorrenciaInput(input: Medicao): string | null {
  return validateContador(input.tentativas, input.falhas, 1);
}

function validateContador(
  tentativas: number,
  falhas: number,
  minimoTentativas: number,
): string | null {
  if (!Number.isInteger(tentativas) || tentativas < minimoTentativas) {
    return minimoTentativas > 0
      ? "Registre ao menos uma tentativa."
      : "O número de tentativas precisa ser um inteiro igual ou maior que zero.";
  }
  if (!Number.isInteger(falhas) || falhas < 0) {
    return "O número de falhas precisa ser um inteiro igual ou maior que zero.";
  }
  if (falhas > tentativas) {
    return "Não dá para registrar mais falhas do que tentativas.";
  }
  return null;
}

export type TaxonomiaInput = { nome: string; cor: string; ordem: number };

export function validateTaxonomiaInput(input: TaxonomiaInput): string | null {
  if (!input.nome?.trim()) return "Informe o nome.";
  if (input.nome.trim().length > 60)
    return "O nome precisa ter no máximo 60 caracteres.";
  if (!/^#[0-9a-fA-F]{6}$/.test(input.cor)) return "Escolha uma cor válida.";
  if (!Number.isInteger(input.ordem) || input.ordem < 0)
    return "A ordem precisa ser um número inteiro igual ou maior que zero.";
  return null;
}

// Validação de um passo do wizard, para o erro parar de nascer só na etapa de
// resultado.
//
// Até aqui o preenchimento não avisava nada: "Continuar" sempre avançava e a
// pessoa só descobria o que faltava lá no fim, pelo `ResultadoIncompleto`.
// Quem preenche cinco passos e leva a bronca no sexto refaz o caminho todo.
//
// Módulo puro e derivado — NÃO reimplementa a regra de obrigatoriedade. A
// fonte continua sendo `camposFaltando` (que já sabe do domínio, do caminho
// declarado e dos custos condicionais); aqui só se recorta o que é DESTE passo
// e se dá nome ao que falta. Se o gating mudar em `calc.ts`, esta validação
// acompanha sozinha.

import { camposFaltando } from "./calc";
import { CAMPO_DEFS, CAMINHO_LABEL } from "./campos";
import { PASSOS } from "./estado";
import type { CampoId, EntradasTime, PassoId } from "./types";

export type ErroCampo = {
  campo: CampoId;
  /** Frase completa, com o nome do campo. Vai para o anúncio único. */
  mensagem: string;
  /**
   * O que aparece SOB o campo. Curta de propósito: o rótulo está a dois
   * centímetros acima, e repetir o nome dele em cada linha vermelha empilhava
   * cinco frases quase idênticas num passo de cinco campos — a repetição vira
   * ruído e some com a informação de onde exatamente está o problema.
   */
  curta: string;
};

/** Rótulo de um campo como a pessoa o vê no formulário. */
export function rotuloDe(campo: CampoId): string {
  if (campo === "caminho") return CAMINHO_LABEL;
  return CAMPO_DEFS[campo].label;
}

// Copy do deck de UX: uma frase por campo, sempre nomeando o campo. "Preencha
// os campos deste passo" obrigava a reler os rótulos para achar o culpado.
export function mensagemDe(campo: CampoId): string {
  if (campo === "caminho") return "Escolha uma opção para continuar.";
  return `Preencha “${rotuloDe(campo)}” para continuar.`;
}

function curtaDe(campo: CampoId): string {
  if (campo === "caminho") return "Escolha uma opção para continuar.";
  return "Preencha para continuar.";
}

const MENSAGEM_FUNIL = "Preencha os dois campos do ciclo — ou pule a etapa.";

/**
 * O que impede esta pergunta de ser dada por encerrada.
 *
 * A pergunta opcional vale a regra dos dois ou nenhum: vazio passa, cheio
 * passa, pela metade acusa — nos DOIS campos, porque qualquer um dos dois
 * resolve e apontar só para o vazio esconderia a outra saída (apagar).
 *
 * Qual é a opcional vem de `PASSOS` (`opcional: true`), nunca de um número
 * literal: a numeração já mudou uma vez (era o passo 5 de cinco, virou a 7 de
 * oito) e um `passoId === 5` cravado aqui teria passado a validar a pergunta
 * errada em silêncio.
 */
export function validarPasso(entradas: EntradasTime, passoId: PassoId): ErroCampo[] {
  const passo = PASSOS.find((p) => p.id === passoId);
  if (!passo) return [];

  if (passo.opcional) {
    const ciclo = entradas.cicloDias;
    const leads = entradas.leadsMes;
    const algum = ciclo !== null || leads !== null;
    const ambos = ciclo !== null && leads !== null;
    if (!algum || ambos) return [];
    // A frase do funil explica uma REGRA, não nomeia um campo — então vale
    // inteira nos dois lugares.
    return [
      { campo: "cicloDias", mensagem: MENSAGEM_FUNIL, curta: MENSAGEM_FUNIL },
      { campo: "leadsMes", mensagem: MENSAGEM_FUNIL, curta: MENSAGEM_FUNIL },
    ];
  }

  // `camposFaltando` é a autoridade; o passo só filtra. `salarioVendedor` não
  // aparece ali de propósito (alimenta linha informativa, nunca o ROI), então
  // fica de fora sem precisar de exceção escrita aqui.
  const faltando = camposFaltando(entradas);
  return passo.campos
    .filter((campo) => faltando.includes(campo))
    .map((campo) => ({ campo, mensagem: mensagemDe(campo), curta: curtaDe(campo) }));
}

/** Índice por campo, do jeito que o formulário consome. */
export function errosPorCampo(erros: ErroCampo[]): Partial<Record<CampoId, string>> {
  const mapa: Partial<Record<CampoId, string>> = {};
  for (const erro of erros) mapa[erro.campo] = erro.curta;
  return mapa;
}

/**
 * A frase que o bloco `role="alert"` anuncia. Uma só, sempre a do primeiro
 * campo — leitor de tela lendo cinco frases seguidas não ajuda ninguém, e o
 * foco já vai parar no primeiro campo mesmo.
 */
export function resumoDoErro(erros: ErroCampo[]): string | null {
  if (erros.length === 0) return null;
  if (erros.length === 1) return erros[0].mensagem;
  if (erros[0].mensagem === MENSAGEM_FUNIL) return MENSAGEM_FUNIL;
  return `${erros[0].mensagem} Faltam ${erros.length} campos nesta pergunta.`;
}

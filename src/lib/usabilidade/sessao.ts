/*
 * Identidade da sessão, preparação para gravação e estado do vínculo achado ↔
 * desafio. Tudo puro, sem I/O — a action só chama e grava.
 */

import { TESTE_FLUXOS, type TesteFluxo, type TestePerfil } from "@/lib/constants";
import {
  promoverRespostas,
  validarRespostas,
  type AvisoResposta,
  type RespostasMap,
} from "./respostas";
import { perguntasDoPerfil, ROTEIRO_VERSAO } from "./roteiro";

/*
 * "TU-014". Local de propósito, e NÃO uma generalização de `codigoDesafio`: os
 * dois hardcodam o próprio prefixo, e um `codigoCom(prefixo, n)` compartilhado
 * só moveria a string de um arquivo para uma chamada. Mesmo motivo pelo qual
 * `jsonFilename` não virou parâmetro de `csvFilename`.
 */
export function codigoSessao(codigo: number): string {
  return `TU-${String(Math.max(0, Math.trunc(codigo))).padStart(3, "0")}`;
}

export type EstadoVinculo = "sem_desafio" | "vinculado" | "desafio_excluido";

/*
 * TRÊS estados, não dois. `desafio_id` é `on delete set null`, então um achado
 * que virou DES-014 e teve o desafio excluído volta a ter `desafio_id` nulo —
 * indistinguível de "ninguém olhou" se a leitura for só `desafio_id === null`.
 * É o mesmo defeito de ler 0/0 como 0%: a ausência de ponteiro não é a ausência
 * de história. `desafio_codigo` é gravado no vínculo e nunca limpo, e é ele que
 * separa os dois casos.
 */
export function estadoDoVinculo(achado: {
  desafio_id: string | null;
  desafio_codigo: number | null;
}): EstadoVinculo {
  if (achado.desafio_id) return "vinculado";
  return achado.desafio_codigo === null ? "sem_desafio" : "desafio_excluido";
}

export type SessaoPreparada = {
  perfil: TestePerfil;
  fluxo: TesteFluxo;
  varejo: boolean;
  realizado_em: string;
  respostas: RespostasMap;
  roteiro_versao: number;
};

export type PrepararSessaoResult =
  | { ok: true; dados: SessaoPreparada; avisos: AvisoResposta[] }
  | { ok: false; error: string; campo?: string };

/*
 * A ORDEM AQUI NÃO É NEGOCIÁVEL: resolver o perfil → descobrir quais perguntas
 * se aplicam → validar → promover. O Bloco 2 tem duas perguntas nº 9 com o
 * mesmo número e textos diferentes por perfil; validar antes de saber o perfil
 * casaria a resposta com a pergunta errada, e o erro só apareceria na análise,
 * quando a sessão já foi.
 *
 * A função recebe SÓ o mapa de respostas — perfil, fluxo, varejo e data saem
 * dele por promoção, nunca por um parâmetro paralelo. É o que impede as duas
 * cópias da mesma verdade que `promoverRespostas` existe para evitar.
 */
export function prepararSessao(raw: unknown): PrepararSessaoResult {
  const bruto = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
  if (!bruto) return { ok: false, error: "Respostas em formato inválido." };

  const perfilBruto = bruto.b0_perfil;
  const perfil =
    perfilBruto === "gestor" || perfilBruto === "vendedor" ? perfilBruto : null;
  if (!perfil) {
    return { ok: false, error: "Escolha o perfil do participante.", campo: "b0_perfil" };
  }

  const varejo = bruto.b0_varejo === "sim";
  const perguntas = perguntasDoPerfil(perfil, varejo);

  const validado = validarRespostas(perguntas, bruto);
  if (!validado.ok) return validado;

  const { colunas, respostasRestantes } = promoverRespostas(
    perguntas,
    validado.respostas,
  );

  if (!colunas.fluxo || !(colunas.fluxo in TESTE_FLUXOS)) {
    return { ok: false, error: "Escolha o fluxo testado.", campo: "b0_fluxo" };
  }
  if (!colunas.realizado_em) {
    return { ok: false, error: "Informe a data da sessão.", campo: "b0_data" };
  }

  return {
    ok: true,
    avisos: validado.avisos,
    dados: {
      perfil,
      fluxo: colunas.fluxo as TesteFluxo,
      varejo: colunas.varejo,
      realizado_em: colunas.realizado_em,
      respostas: respostasRestantes,
      // Gravada agora e nunca reescrita: é o que permite ler uma sessão antiga
      // sabendo qual roteiro ela respondeu.
      roteiro_versao: ROTEIRO_VERSAO,
    },
  };
}

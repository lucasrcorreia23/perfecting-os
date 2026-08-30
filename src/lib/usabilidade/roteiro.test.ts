import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  blocosDoPerfil,
  opcaoPorId,
  perguntaPorId,
  perguntasDoPerfil,
  ROTEIRO,
  ROTEIRO_VERSAO,
  TODAS_AS_PERGUNTAS,
  type Pergunta,
} from "./roteiro";

/*
 * O roteiro é dado, então o teste é sobre INTEGRIDADE dele — no caráter de
 * `referencia.test.ts`, que valida arquivo e símbolo de cada entrada.
 */

function assinatura(): string {
  const canonico = TODAS_AS_PERGUNTAS.map((pergunta) => {
    const opcoes =
      pergunta.forma.tipo === "escolha"
        ? pergunta.forma.opcoes.map((opcao) => opcao.id).join(",")
        : pergunta.forma.tipo;
    return `${pergunta.id}|${pergunta.publico}|${opcoes}`;
  }).join("\n");
  return createHash("sha256").update(canonico).digest("hex").slice(0, 16);
}

describe("ROTEIRO — integridade", () => {
  it("não tem id repetido", () => {
    const ids = TODAS_AS_PERGUNTAS.map((pergunta) => pergunta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /*
   * A CONTAGEM POR BLOCO é o teste que pega a pergunta perdida no copy-paste do
   * PDF. Os números divergem do PDF de propósito, e cada divergência tem razão:
   * b0 = 11 do PDF + `b0_varejo` (a condição do Bloco 4, que no PDF é nota de
   * rodapé e aqui precisa ser campo para chegar pela ficha colada);
   * b1 = 16 do PDF + `b1_refez_quais` (o "— quais: ___" é um segundo campo, com
   * dependência própria);
   * b2 = 10 numerados, mas 9 e 10 existem DUAS vezes, uma por perfil;
   * b4 = 7 do PDF + `b4_qual_dispositivo_outro` (o "Outro: ___").
   */
  it("tem a contagem esperada por bloco", () => {
    const porBloco = Object.fromEntries(
      ROTEIRO.map((bloco) => [bloco.id, bloco.perguntas.length]),
    );
    expect(porBloco).toEqual({ b0: 12, b1: 17, b2: 12, b3a: 10, b3b: 11, b4: 8 });
    expect(TODAS_AS_PERGUNTAS).toHaveLength(70);
  });

  /*
   * Os ids são as chaves do jsonb de toda sessão salva. Este hash falha em
   * qualquer renomeação de id ou de opção — que é o ponto: renomear passa a ser
   * ato deliberado, com bump de ROTEIRO_VERSAO junto. Mesma razão pela qual
   * `proposta.plano` manteve `essencial`/`pratica` depois do rename comercial.
   */
  it("tem a assinatura de ids e opções pinada", () => {
    expect(ROTEIRO_VERSAO).toBe(1);
    expect(assinatura()).toBe("3dbefb1dae84ef9c");
  });

  it("toda escolha tem ao menos duas opções, com ids únicos", () => {
    for (const pergunta of TODAS_AS_PERGUNTAS) {
      if (pergunta.forma.tipo !== "escolha") continue;
      const ids = pergunta.forma.opcoes.map((opcao) => opcao.id);
      expect(ids.length, `${pergunta.id} precisa de ao menos duas opções`)
        .toBeGreaterThanOrEqual(2);
      expect(new Set(ids).size, `${pergunta.id} tem opção repetida`).toBe(ids.length);
    }
  });

  it("toda escala tem min < max", () => {
    for (const pergunta of TODAS_AS_PERGUNTAS) {
      if (pergunta.forma.tipo !== "escala") continue;
      expect(pergunta.forma.min, pergunta.id).toBeLessThan(pergunta.forma.max);
    }
  });

  // Sem isto, uma dependência escrita com o id errado nunca se satisfaz e a
  // pergunta simplesmente não aparece — falha silenciosa, do tipo que só
  // aparece na análise, quando a sessão já foi.
  it("toda dependência aponta para pergunta E opção existentes", () => {
    for (const pergunta of TODAS_AS_PERGUNTAS) {
      if (!pergunta.dependeDe) continue;
      const alvo = perguntaPorId(pergunta.dependeDe.pergunta);
      expect(alvo, `${pergunta.id} depende de pergunta inexistente`).not.toBeNull();
      expect(
        opcaoPorId(alvo as Pergunta, pergunta.dependeDe.opcao),
        `${pergunta.id} depende de opção inexistente em ${pergunta.dependeDe.pergunta}`,
      ).not.toBeNull();
    }
  });

  it("cada coluna promovida aparece uma vez só", () => {
    const colunas = TODAS_AS_PERGUNTAS.flatMap((p) => (p.coluna ? [p.coluna] : []));
    expect([...colunas].sort()).toEqual([
      "fluxo",
      "perfil",
      "realizado_em",
      "varejo",
    ]);
  });

  // A pergunta que decide o roteiro não pode ela mesma depender de outra: seria
  // um ciclo, e o parser precisa resolver perfil ANTES de casar qualquer coisa.
  it("as perguntas promovidas a coluna não têm dependência", () => {
    for (const pergunta of TODAS_AS_PERGUNTAS) {
      if (!pergunta.coluna) continue;
      expect(pergunta.dependeDe, pergunta.id).toBeUndefined();
    }
  });
});

describe("perguntasDoPerfil", () => {
  it("gestor não recebe pergunta de vendedor nem de varejo", () => {
    const perguntas = perguntasDoPerfil("gestor", false);
    expect(perguntas.some((p) => p.publico === "vendedor")).toBe(false);
    expect(perguntas.some((p) => p.somenteVarejo)).toBe(false);
    expect(perguntas.some((p) => p.id === "b2_gestor_parecido")).toBe(true);
    expect(perguntas.some((p) => p.id === "b3b_experiencia")).toBe(true);
    expect(perguntas.some((p) => p.id === "b3a_experiencia")).toBe(false);
  });

  it("vendedor de varejo recebe o Bloco 4", () => {
    const perguntas = perguntasDoPerfil("vendedor", true);
    expect(perguntas.some((p) => p.id === "b4_internet")).toBe(true);
    expect(perguntas.some((p) => p.id === "b2_vendedor_cliente_real")).toBe(true);
    expect(perguntas.some((p) => p.id === "b2_gestor_parecido")).toBe(false);
  });

  /*
   * Perfil indefinido é o estado real do importador antes de ler o Bloco 0. Ele
   * devolve só o que vale para os dois — as duas perguntas nº 9 do Bloco 2 têm
   * o mesmo número e textos diferentes, e escolher uma seria gravar a resposta
   * na pergunta errada.
   */
  it("perfil indefinido devolve só o que vale para os dois", () => {
    const perguntas = perguntasDoPerfil(null, false);
    expect(perguntas.every((p) => p.publico === "ambos")).toBe(true);
    expect(perguntas.some((p) => p.id === "b0_perfil")).toBe(true);
    expect(perguntas.some((p) => p.id === "b2_gestor_parecido")).toBe(false);
    expect(perguntas.some((p) => p.id === "b2_vendedor_cliente_real")).toBe(false);
  });

  it("as duas perguntas nº 9 do Bloco 2 nunca convivem", () => {
    for (const perfil of ["gestor", "vendedor"] as const) {
      const noves = perguntasDoPerfil(perfil, false).filter(
        (p) => p.bloco === "b2" && p.numero === 9,
      );
      expect(noves, perfil).toHaveLength(1);
    }
  });
});

describe("blocosDoPerfil", () => {
  it("não devolve bloco vazio", () => {
    const blocos = blocosDoPerfil("gestor", false);
    expect(blocos.every((bloco) => bloco.perguntas.length > 0)).toBe(true);
    expect(blocos.map((bloco) => bloco.id)).toEqual(["b0", "b1", "b2", "b3b"]);
  });

  it("gestor de varejo recebe o Bloco 4 e nunca o 3A", () => {
    expect(blocosDoPerfil("gestor", true).map((b) => b.id)).toEqual([
      "b0",
      "b1",
      "b2",
      "b3b",
      "b4",
    ]);
  });
});

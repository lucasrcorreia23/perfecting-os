import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
 * Testes de FONTE do módulo, no caráter de `design-tokens.test.ts`: eles leem os
 * arquivos como TEXTO e reprovam padrões que um teste de comportamento não
 * pega. Dois grupos — as regras de design que valem para toda tela interna, e os
 * invariantes deste módulo que só se garantem impedindo um import.
 */

const RAIZ = new URL("../../../", import.meta.url);

function ler(caminho: string): string {
  return readFileSync(new URL(caminho, RAIZ), "utf8");
}

// Citar não é violar: os comentários deste módulo explicam as regras, e várias
// delas nomeiam exatamente o que os testes proíbem.
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const COMPONENTES = readdirSync(new URL("src/components/desafios/usabilidade/", RAIZ))
  .filter((nome) => nome.endsWith(".tsx"))
  .map((nome) => `src/components/desafios/usabilidade/${nome}`)
  .concat("src/components/desafios/origem-testes-card.tsx");

describe("as telas do módulo seguem o guia", () => {
  it.each(COMPONENTES)("%s", (caminho) => {
    const codigo = semComentarios(ler(caminho));

    expect(codigo, `${caminho}: §3 manda flex flex-col gap-*`).not.toMatch(/space-y-/);
    expect(codigo, `${caminho}: §2 proíbe caixa alta`).not.toMatch(/\buppercase\b/);
    expect(codigo, `${caminho}: §2 proíbe tracking positivo`).not.toMatch(
      /tracking-(wide|wider|widest)/,
    );
    expect(codigo, `${caminho}: §4 exige sufixo no rounded`).not.toMatch(
      /\brounded(?![-\w])/,
    );
    // §13: a pele da calculadora não atravessa para tela interna.
    expect(codigo, `${caminho}: §13 mantém --pf-* fora das telas internas`).not.toMatch(
      /--pf-|\bpf-[a-z]/,
    );
  });
});

/*
 * INVARIANTE 7 — uma sessão de teste NUNCA vira medição de recorrência.
 *
 * A recorrência de um desafio tem duas fontes que nunca se somam (o contador
 * manual e o log de ocorrências). Se este módulo passar a escrever
 * `desafio_ocorrencias`, ele vira uma terceira — e "3 de 5 vendedores não
 * acharam o roleplay" seria somado a um placar de 10/7, produzindo 15/10, que
 * não descreve medição nenhuma.
 */
describe("o módulo não escreve recorrência", () => {
  it("as actions nunca tocam em desafio_ocorrencias", () => {
    const codigo = semComentarios(ler("src/lib/actions/usabilidade.ts"));
    expect(codigo).not.toContain("desafio_ocorrencias");
    // O desafio criado a partir de um achado nasce com o placar ZERADO. Não é
    // detalhe: é a forma de dizer "este número ainda não foi medido" sem
    // inventar uma medição a partir da sessão de teste.
    expect(codigo).toContain("tentativas: 0");
    expect(codigo).toContain("falhas: 0");
    expect(codigo).not.toMatch(/tentativas:\s*(?!0)\w/);
  });

  it("nenhum módulo de usabilidade importa os agregadores de recorrência", () => {
    const arquivos = readdirSync(new URL("src/lib/usabilidade/", RAIZ))
      .filter((nome) => nome.endsWith(".ts") && !nome.endsWith(".test.ts"))
      .map((nome) => `src/lib/usabilidade/${nome}`);

    expect(arquivos.length).toBeGreaterThan(4);
    for (const caminho of arquivos) {
      const codigo = semComentarios(ler(caminho));
      expect(codigo, `${caminho}`).not.toContain("agregarPonderado");
      expect(codigo, `${caminho}`).not.toContain("recorrenciaAgregada");
      expect(codigo, `${caminho}`).not.toContain("recorrenciaDoDesafio");
    }
  });
});

/*
 * INVARIANTES 3, 4 e 5 — a tela não pode ter uma segunda formatação.
 *
 * "5 de 8 (63%)" e "5,1 de 7" saem de `formatarProporcao` e `formatarMedia`. Um
 * `toFixed` solto num componente é como nasce a porcentagem sem `n` e a média
 * sem régua — e aí 5/8 e 12/19 imprimem o mesmo 63%.
 */
describe("uma formatação só", () => {
  it("a tela de resultados usa os formatadores e não inventa os seus", () => {
    const caminho = "src/components/desafios/usabilidade/resultados-view.tsx";
    const codigo = semComentarios(ler(caminho));
    expect(codigo).toContain("formatarProporcao");
    expect(codigo).toContain("formatarMedia");
    expect(codigo, `${caminho}: número formatado à mão`).not.toContain("toFixed");
  });
});

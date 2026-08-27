import { describe, expect, it } from "vitest";
import {
  ALT_MAX_CHARS,
  reviewPost,
  type PostReviewInput,
} from "@/lib/marketing-post-review";

function input(overrides: Partial<PostReviewInput> = {}): PostReviewInput {
  return { title: "Post de teste", ...overrides };
}

function ids(entrada: PostReviewInput): string[] {
  return reviewPost(entrada).map((achado) => achado.id);
}

describe("reviewPost — alt da capa", () => {
  it("não cobra alt quando não há capa", () => {
    expect(reviewPost(input())).toEqual([]);
    expect(reviewPost(input({ cover_alt: "" }))).toEqual([]);
  });

  it("cobra o alt quando existe capa", () => {
    expect(ids(input({ cover_path: "posts/1/capa.png" }))).toEqual([
      "capa-sem-alt",
    ]);
    expect(ids(input({ cover_path: "posts/1/capa.png", cover_alt: "   " }))).toEqual(
      ["capa-sem-alt"],
    );
  });

  it("alt em branco não dispara as outras regras de alt", () => {
    // Sem esta guarda, `alt-curto-demais` acenderia junto em cima da string
    // vazia e o painel diria duas vezes a mesma coisa.
    expect(ids(input({ cover_path: "posts/1/capa.png" }))).not.toContain(
      "alt-curto-demais",
    );
  });

  it("acusa espaço sobrando e oferece o valor já limpo", () => {
    const achados = reviewPost(input({ cover_alt: " Performance Comercial" }));
    const espaco = achados.find((a) => a.id === "alt-nao-trimado");
    expect(espaco?.fix?.value).toBe("Performance Comercial");
  });

  it("acusa alt que anuncia o artefato em vez do assunto", () => {
    expect(ids(input({ cover_alt: "Capa do artigo sobre IA em vendas" }))).toContain(
      "alt-anuncia-artefato",
    );
    expect(ids(input({ cover_alt: "Foto de um time de vendas" }))).toContain(
      "alt-anuncia-artefato",
    );
    expect(ids(input({ cover_alt: "Uma ilustração do funil" }))).toContain(
      "alt-anuncia-artefato",
    );
  });

  it("só acusa o artefato como prefixo", () => {
    // "banner" no meio da frase é descrição legítima da cena.
    expect(
      ids(input({ cover_alt: "Vendedora ajusta o banner da campanha" })),
    ).not.toContain("alt-anuncia-artefato");
  });

  it("acusa alt acima do teto de leitor de tela", () => {
    expect(ids(input({ cover_alt: "a".repeat(ALT_MAX_CHARS + 1) }))).toContain(
      "alt-longo-demais",
    );
    expect(ids(input({ cover_alt: "a".repeat(ALT_MAX_CHARS) }))).not.toContain(
      "alt-longo-demais",
    );
  });

  it("acusa alt que só repete o título, ignorando caixa e acento", () => {
    expect(
      ids(input({ title: "Rampagem de vendedores", cover_alt: "rampagem de vendedores" })),
    ).toContain("alt-igual-ao-titulo");
    expect(
      ids(input({ title: "Ciclo de vendas", cover_alt: "Ciclo de vendas" })),
    ).toContain("alt-igual-ao-titulo");
  });

  it("acusa alt curto demais", () => {
    expect(ids(input({ cover_alt: "img" }))).toContain("alt-curto-demais");
  });
});

describe("reviewPost — imagens do corpo", () => {
  it("agrega num achado só, nunca um por imagem", () => {
    const corpo = "![](a.png)\n\n![](b.png)\n\n![](c.png)";
    const achados = reviewPost(input({ body_md: corpo })).filter(
      (a) => a.id === "corpo-imagem-sem-alt",
    );
    expect(achados).toHaveLength(1);
    expect(achados[0].message).toContain("3");
  });

  it("ignora imagem que tem alt", () => {
    expect(ids(input({ body_md: "![Curva de rampa](a.png)" }))).toEqual([]);
  });
});

// Os três alts que originaram o módulo. O terceiro está aqui com contagem ZERO
// de propósito: ele não é alcançável por regra nenhuma sem um tema declarado, e
// a checagem que o pegaria (sobreposição de palavras com o título) foi RECUSADA
// por errar demais. Sem este caso escrito, a lacuna leria como esquecimento.
describe("reviewPost — os alts reais do blog", () => {
  it("pega o que anuncia o artefato", () => {
    expect(
      ids(input({ cover_alt: "Capa do artigo sobre impacto da IA em vendas" })),
    ).toEqual(["alt-anuncia-artefato"]);
  });

  it("pega o espaço à frente", () => {
    expect(ids(input({ cover_alt: " Performance Comercial" }))).toEqual([
      "alt-nao-trimado",
    ]);
  });

  it("NÃO pega o que descreve a cena — é juízo editorial, não regra", () => {
    expect(reviewPost(input({ cover_alt: "Pessoas pensando em vendas" }))).toEqual(
      [],
    );
  });

  it("um alt bom não acende nada", () => {
    expect(
      reviewPost(
        input({
          title: "Quanto custa a rampagem de um vendedor",
          cover_path: "posts/1/capa.png",
          cover_alt: "Curva de produtividade de um vendedor nos primeiros seis meses",
        }),
      ),
    ).toEqual([]);
  });
});

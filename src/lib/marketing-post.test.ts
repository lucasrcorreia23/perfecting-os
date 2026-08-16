import { describe, expect, it } from "vitest";
import {
  hasTitleHeading,
  isPubliclyVisible,
  postState,
  readingMinutes,
  seoDescriptionFor,
  seoTitleFor,
  validatePostInput,
  type PostInput,
} from "@/lib/marketing-post";

const NOW = new Date("2026-08-04T12:00:00.000Z");

function input(overrides: Partial<PostInput> = {}): PostInput {
  return { title: "Post de teste", slug: "post-de-teste", ...overrides };
}

describe("postState", () => {
  it("rascunho ignora a data de publicação", () => {
    expect(
      postState({ status: "rascunho", published_at: "2020-01-01T00:00:00Z" }, NOW),
    ).toBe("rascunho");
  });

  it("publicado com data futura é agendado", () => {
    expect(
      postState({ status: "publicado", published_at: "2026-08-04T12:00:01Z" }, NOW),
    ).toBe("agendado");
  });

  it("publicado exatamente agora já é publicado", () => {
    expect(
      postState({ status: "publicado", published_at: "2026-08-04T12:00:00Z" }, NOW),
    ).toBe("publicado");
  });

  it("arquivado nunca vira publicado", () => {
    expect(
      postState({ status: "arquivado", published_at: "2020-01-01T00:00:00Z" }, NOW),
    ).toBe("arquivado");
  });

  it("publicado sem data cai para rascunho (fail-closed)", () => {
    expect(postState({ status: "publicado", published_at: null }, NOW)).toBe(
      "rascunho",
    );
  });
});

describe("isPubliclyVisible", () => {
  it("só é verdadeiro para publicado com data já passada", () => {
    expect(
      isPubliclyVisible({ status: "publicado", published_at: "2026-08-01T00:00:00Z" }, NOW),
    ).toBe(true);
    expect(
      isPubliclyVisible({ status: "publicado", published_at: "2026-09-01T00:00:00Z" }, NOW),
    ).toBe(false);
    expect(
      isPubliclyVisible({ status: "arquivado", published_at: "2026-08-01T00:00:00Z" }, NOW),
    ).toBe(false);
    expect(isPubliclyVisible({ status: "rascunho", published_at: null }, NOW)).toBe(
      false,
    );
  });
});

describe("readingMinutes", () => {
  it("tem mínimo de 1 minuto", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("três palavras aqui")).toBe(1);
  });

  it("usa 200 palavras por minuto", () => {
    expect(readingMinutes("palavra ".repeat(600))).toBe(3);
  });
});

describe("seoTitleFor / seoDescriptionFor", () => {
  it("usa o campo de SEO quando preenchido", () => {
    expect(seoTitleFor({ title: "Título", seo_title: "SEO" })).toBe("SEO");
  });

  it("cai para título e depois para resumo e corpo", () => {
    expect(seoTitleFor({ title: "Título" })).toBe("Título");
    expect(seoDescriptionFor({ title: "T", excerpt: "Resumo" })).toBe("Resumo");
    expect(seoDescriptionFor({ title: "T", body_md: "# Oi\n\nCorpo do post." })).toBe(
      "Oi Corpo do post.",
    );
  });

  it("trunca respeitando os limites de 60 e 160", () => {
    const titulo = seoTitleFor({ title: "palavra ".repeat(30) });
    expect(titulo.length).toBeLessThanOrEqual(60);
    expect(titulo.endsWith("…")).toBe(true);

    const descricao = seoDescriptionFor({ title: "T", excerpt: "palavra ".repeat(60) });
    expect(descricao.length).toBeLessThanOrEqual(160);
  });
});

describe("validatePostInput", () => {
  it("aceita um post mínimo válido", () => {
    expect(validatePostInput(input())).toBeNull();
  });

  it("exige título e slug em formato válido", () => {
    expect(validatePostInput(input({ title: "  " }))).toBe("Informe o título do post.");
    expect(validatePostInput(input({ slug: "Slug Inválido" }))).toContain(
      "Slug inválido",
    );
  });

  it("exige data ao publicar e recusa data inválida", () => {
    expect(validatePostInput(input({ status: "publicado" }))).toContain(
      "data de publicação",
    );
    expect(validatePostInput(input({ published_at: "não é data" }))).toBe(
      "Data de publicação inválida.",
    );
    expect(
      validatePostInput(
        input({ status: "publicado", published_at: "2026-08-04T12:00:00Z" }),
      ),
    ).toBeNull();
  });

  it("recusa URL canônica sem protocolo", () => {
    expect(validatePostInput(input({ canonical_url: "perfecting.com.br" }))).toContain(
      "http://",
    );
    expect(
      validatePostInput(input({ canonical_url: "https://perfecting.com.br/a" })),
    ).toBeNull();
  });

  it("recusa HTML executável no corpo", () => {
    expect(validatePostInput(input({ body_md: "<script>alert(1)</script>" }))).toContain(
      "HTML executável",
    );
    expect(validatePostInput(input({ body_md: '<iframe src="x">' }))).toContain(
      "HTML executável",
    );
    expect(validatePostInput(input({ body_md: '<img onerror="x">' }))).toContain(
      "HTML executável",
    );
    expect(validatePostInput(input({ body_md: "**markdown** normal" }))).toBeNull();
  });

  it("recusa tags fora do formato de slug", () => {
    expect(validatePostInput(input({ tags: ["ia", "Treinamento"] }))).toContain("Tags");
    expect(validatePostInput(input({ tags: ["ia", "treinamento"] }))).toBeNull();
  });
});

describe("hasTitleHeading", () => {
  it("acusa # no corpo, que duplicaria o h1 do título do post", () => {
    expect(hasTitleHeading("# Título\n\ntexto")).toBe(true);
  });

  it("não acusa quando o corpo começa em ##", () => {
    expect(hasTitleHeading("## Seção\n\ntexto\n\n### Subseção")).toBe(false);
  });

  it("não acusa # dentro de cerca de código", () => {
    expect(hasTitleHeading("```bash\n# instala\nnpm i\n```")).toBe(false);
  });

  it("não acusa hashtag colada no texto", () => {
    expect(hasTitleHeading("Bora de #vendas")).toBe(false);
  });
});

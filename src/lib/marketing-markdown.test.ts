import { describe, expect, it } from "vitest";
import {
  isSafeUrl,
  parseMarkdown,
  plainText,
  type MdBlock,
} from "@/lib/marketing-markdown";

function firstOfType<T extends MdBlock["type"]>(
  blocks: MdBlock[],
  type: T,
): Extract<MdBlock, { type: T }> {
  const block = blocks.find((item) => item.type === type);
  if (!block) throw new Error(`nenhum bloco do tipo ${type}`);
  return block as Extract<MdBlock, { type: T }>;
}

describe("parseMarkdown — blocos", () => {
  it("reconhece os seis níveis de heading", () => {
    const blocks = parseMarkdown("# um\n\n### três\n\n###### seis");
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "heading",
      "heading",
    ]);
    expect(blocks.map((b) => (b.type === "heading" ? b.level : null))).toEqual([
      1, 3, 6,
    ]);
  });

  it("separa parágrafos por linha em branco e junta as linhas de um mesmo", () => {
    const blocks = parseMarkdown("linha um\nlinha dois\n\noutro parágrafo");
    expect(blocks).toHaveLength(2);
    expect(plainText([blocks[0]])).toBe("linha um linha dois");
  });

  it("lê cerca de código com e sem linguagem", () => {
    const comLang = firstOfType(parseMarkdown("```ts\nconst a = 1;\n```"), "code");
    expect(comLang.lang).toBe("ts");
    expect(comLang.text).toBe("const a = 1;");

    const semLang = firstOfType(parseMarkdown("```\ntexto\n```"), "code");
    expect(semLang.lang).toBeNull();
  });

  it("não interpreta marcação dentro da cerca de código", () => {
    const bloco = firstOfType(parseMarkdown("```\n**forte** e [link](x)\n```"), "code");
    expect(bloco.text).toBe("**forte** e [link](x)");
  });

  it("distingue lista ordenada de não ordenada", () => {
    const naoOrdenada = firstOfType(parseMarkdown("- um\n- dois"), "list");
    expect(naoOrdenada.ordered).toBe(false);
    expect(naoOrdenada.items).toHaveLength(2);

    const ordenada = firstOfType(parseMarkdown("1. um\n2. dois\n3. três"), "list");
    expect(ordenada.ordered).toBe(true);
    expect(ordenada.items).toHaveLength(3);
  });

  it("agrupa linhas de citação num bloco só", () => {
    const blocks = parseMarkdown("> primeira\n> segunda");
    expect(blocks).toHaveLength(1);
    expect(plainText(blocks)).toBe("primeira segunda");
  });

  it("reconhece régua horizontal", () => {
    expect(parseMarkdown("---").map((b) => b.type)).toEqual(["hr"]);
    expect(parseMarkdown("***").map((b) => b.type)).toEqual(["hr"]);
  });

  it("imagem sozinha na linha vira bloco", () => {
    const image = firstOfType(
      parseMarkdown("![Capa do post](https://cdn.exemplo.com/a.webp)"),
      "image",
    );
    expect(image.src).toBe("https://cdn.exemplo.com/a.webp");
    expect(image.alt).toBe("Capa do post");
  });

  it("devolve lista vazia para entrada vazia ou só espaços", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("\n\n   \n")).toEqual([]);
  });
});

describe("parseMarkdown — inline", () => {
  it("aninha ênfase dentro de forte", () => {
    const paragrafo = firstOfType(parseMarkdown("**a*b*c**"), "paragraph");
    expect(paragrafo.inline[0].type).toBe("strong");
    expect(plainText([paragrafo])).toBe("abc");
  });

  it("reconhece código inline sem remarcar o conteúdo", () => {
    const paragrafo = firstOfType(parseMarkdown("use `**isto**` aqui"), "paragraph");
    const code = paragrafo.inline.find((node) => node.type === "code");
    expect(code).toEqual({ type: "code", text: "**isto**" });
  });

  it("cria link para URL segura", () => {
    const paragrafo = firstOfType(
      parseMarkdown("veja o [site](https://perfecting.com.br) hoje"),
      "paragraph",
    );
    const link = paragrafo.inline.find((node) => node.type === "link");
    expect(link).toMatchObject({ type: "link", href: "https://perfecting.com.br" });
  });

  it("javascript: vira texto literal, nunca link", () => {
    const paragrafo = firstOfType(
      parseMarkdown("[clique](javascript:alert(1))"),
      "paragraph",
    );
    expect(paragrafo.inline.some((node) => node.type === "link")).toBe(false);
    expect(plainText([paragrafo])).toContain("[clique](javascript:alert(1)");
  });

  it("HTML bruto atravessa como texto, sem virar nó de marcação", () => {
    const blocks = parseMarkdown("<script>alert(1)</script>");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(plainText(blocks)).toBe("<script>alert(1)</script>");
  });

  it("não confunde asterisco solto com ênfase", () => {
    expect(plainText(parseMarkdown("2 * 3 = 6"))).toBe("2 * 3 = 6");
  });
});

describe("isSafeUrl", () => {
  it("aceita http, https, mailto e caminhos relativos", () => {
    expect(isSafeUrl("https://exemplo.com")).toBe(true);
    expect(isSafeUrl("http://exemplo.com")).toBe(true);
    expect(isSafeUrl("mailto:lucas@perfecting.com.br")).toBe(true);
    expect(isSafeUrl("/blog/post")).toBe(true);
    expect(isSafeUrl("#secao")).toBe(true);
  });

  it("recusa protocolos executáveis e string vazia", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("JavaScript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeUrl("   ")).toBe(false);
  });
});

describe("plainText", () => {
  it("ignora blocos de código e réguas", () => {
    const blocks = parseMarkdown("# Título\n\nUm texto.\n\n```\ncodigo()\n```\n\n---");
    expect(plainText(blocks)).toBe("Título Um texto.");
  });

  it("achata listas e citações", () => {
    expect(plainText(parseMarkdown("- um\n- dois\n\n> nota"))).toBe("um dois nota");
  });
});

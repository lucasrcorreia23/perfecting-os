import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@/lib/marketing-markdown";
import { hasTitleHeading } from "@/lib/marketing-post";
import {
  applyLinePrefix,
  applyWrap,
  demoteTitleHeadings,
  insertImage,
} from "./markdown-editor";

describe("applyWrap", () => {
  it("envolve a seleção e mantém o texto selecionado", () => {
    const result = applyWrap("um dois três", 3, 7, "**");
    expect(result.text).toBe("um **dois** três");
    expect(result.text.slice(result.selStart, result.selEnd)).toBe("dois");
  });

  it("sem seleção, insere os marcadores com o cursor no meio", () => {
    const result = applyWrap("um ", 3, 3, "**");
    expect(result.text).toBe("um ****");
    expect(result.selStart).toBe(5);
    expect(result.selEnd).toBe(5);
  });

  it("clicar de novo desfaz quando já está envolvido", () => {
    const result = applyWrap("um **dois** três", 5, 9, "**");
    expect(result.text).toBe("um dois três");
    expect(result.text.slice(result.selStart, result.selEnd)).toBe("dois");
  });

  it("aceita prefixo e sufixo diferentes, como no link", () => {
    const result = applyWrap("veja aqui", 5, 9, "[", "](https://)");
    expect(result.text).toBe("veja [aqui](https://)");
    expect(result.text.slice(result.selStart, result.selEnd)).toBe("aqui");
  });
});

describe("applyLinePrefix", () => {
  it("prefixa a linha do cursor", () => {
    const result = applyLinePrefix("titulo\noutra", 2, 2, "# ");
    expect(result.text).toBe("# titulo\noutra");
  });

  it("prefixa todas as linhas da seleção", () => {
    const text = "um\ndois\ntrês";
    const result = applyLinePrefix(text, 0, text.length, "- ");
    expect(result.text).toBe("- um\n- dois\n- três");
  });

  it("remove o prefixo quando todas as linhas já o têm", () => {
    const text = "- um\n- dois";
    const result = applyLinePrefix(text, 0, text.length, "- ");
    expect(result.text).toBe("um\ndois");
  });

  it("prefixa tudo quando só parte das linhas tem o marcador", () => {
    const text = "- um\ndois";
    const result = applyLinePrefix(text, 0, text.length, "- ");
    expect(result.text).toBe("- - um\n- dois");
  });

  it("a seleção resultante cobre o bloco inteiro editado", () => {
    const text = "um\ndois";
    const result = applyLinePrefix(text, 0, text.length, "- ");
    expect(result.text.slice(result.selStart, result.selEnd)).toBe("- um\n- dois");
  });
});

describe("insertImage", () => {
  const URL_IMG = "https://projeto.supabase.co/storage/v1/object/public/x.png";

  it("no texto vazio insere só a imagem", () => {
    const result = insertImage("", 0, 0, "Gráfico", URL_IMG);
    expect(result.text).toBe(`![Gráfico](${URL_IMG})`);
  });

  it("abre linha em branco antes e depois quando cai no meio do parágrafo", () => {
    const result = insertImage("um dois", 3, 3, "alt", URL_IMG);
    expect(result.text).toBe(`um\n\n![alt](${URL_IMG})\n\ndois`);
  });

  it("não duplica quebras que já existem", () => {
    const result = insertImage("um\n\n\n\ndois", 4, 4, "alt", URL_IMG);
    expect(result.text).toBe(`um\n\n![alt](${URL_IMG})\n\ndois`);
  });

  it("substitui a seleção pela imagem", () => {
    const result = insertImage("antes SELECIONADO depois", 6, 17, "alt", URL_IMG);
    expect(result.text).toBe(`antes\n\n![alt](${URL_IMG})\n\ndepois`);
  });

  it("deixa o alt selecionado, para digitar por cima", () => {
    const result = insertImage("um dois", 7, 7, "Gráfico", URL_IMG);
    expect(result.text.slice(result.selStart, result.selEnd)).toBe("Gráfico");
  });

  it("o resultado é lido pelo parser como bloco de imagem", () => {
    const { text } = insertImage("um dois", 3, 3, "alt", URL_IMG);
    const blocks = parseMarkdown(text);
    expect(blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "image",
      "paragraph",
    ]);
  });
});

describe("demoteTitleHeadings", () => {
  it("rebaixa # para ## e não mexe nos outros níveis", () => {
    expect(demoteTitleHeadings("# Título\ntexto\n## Já é dois")).toBe(
      "## Título\ntexto\n## Já é dois",
    );
  });

  it("ignora # dentro de cerca de código", () => {
    const text = "```bash\n# comentário\n```\n# Título";
    expect(demoteTitleHeadings(text)).toBe("```bash\n# comentário\n```\n## Título");
  });

  it("não confunde hashtag colada no texto com título", () => {
    expect(demoteTitleHeadings("#semespaco")).toBe("#semespaco");
  });

  it("deixa o corpo sem títulos de nível 1", () => {
    const result = demoteTitleHeadings("# Um\n\ntexto\n\n# Outro");
    expect(hasTitleHeading(result)).toBe(false);
  });
});

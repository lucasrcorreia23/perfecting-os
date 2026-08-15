import { describe, expect, it } from "vitest";
import { applyLinePrefix, applyWrap } from "./markdown-editor";

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

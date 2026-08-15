import { describe, expect, it } from "vitest";
import { isValidSlug, slugify, uniqueSlug } from "@/lib/marketing-slug";

describe("slugify", () => {
  it("remove acentos e normaliza separadores", () => {
    expect(slugify("Ação & Reação")).toBe("acao-reacao");
    expect(slugify("Como treinar times   com IA")).toBe(
      "como-treinar-times-com-ia",
    );
    expect(slugify("  POC: do zero ao piloto!  ")).toBe(
      "poc-do-zero-ao-piloto",
    );
  });

  it("devolve string vazia quando não sobra nada", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!! ###")).toBe("");
  });

  it("trunca em 80 caracteres sem terminar em hífen", () => {
    const slug = slugify("a".repeat(78) + " bcdef");
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("gera sempre um slug válido para o check do banco", () => {
    for (const input of ["Olá, mundo", "2026 — Resultados", "Ãéîõü"]) {
      const slug = slugify(input);
      if (slug) expect(isValidSlug(slug)).toBe(true);
    }
  });
});

describe("uniqueSlug", () => {
  it("mantém o slug quando está livre", () => {
    expect(uniqueSlug("Post novo", ["outro"])).toBe("post-novo");
  });

  it("acrescenta sufixo numérico em colisão", () => {
    expect(uniqueSlug("post", ["post"])).toBe("post-2");
    expect(uniqueSlug("post", ["post", "post-2"])).toBe("post-3");
    expect(uniqueSlug("post", ["post", "post-2", "post-3"])).toBe("post-4");
  });

  it("ignora buracos na sequência e pega o primeiro livre", () => {
    expect(uniqueSlug("post", ["post", "post-3"])).toBe("post-2");
  });

  it("devolve vazio quando a base não gera slug", () => {
    expect(uniqueSlug("###", ["a"])).toBe("");
  });
});

describe("isValidSlug", () => {
  it("aceita só minúsculas, números e hífens simples", () => {
    expect(isValidSlug("post-1")).toBe(true);
    expect(isValidSlug("Post")).toBe(false);
    expect(isValidSlug("post--1")).toBe(false);
    expect(isValidSlug("-post")).toBe(false);
    expect(isValidSlug("post-")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

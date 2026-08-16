import { describe, expect, it } from "vitest";
import {
  altFromFileName,
  bodyImagePath,
  coverPath,
  isAllowedImage,
  publicMediaUrl,
  sanitizeMediaName,
} from "@/lib/marketing-media";
import { MAX_COVER_SIZE_BYTES } from "@/lib/constants";

const SUPABASE_URL = "https://projeto.supabase.co";

describe("publicMediaUrl", () => {
  it("monta a URL pública do bucket", () => {
    expect(publicMediaUrl("posts/1/capa.webp", SUPABASE_URL)).toBe(
      "https://projeto.supabase.co/storage/v1/object/public/marketing-media/posts/1/capa.webp",
    );
  });

  it("tolera barra no fim da URL base", () => {
    expect(publicMediaUrl("a.png", "https://projeto.supabase.co/")).toContain(
      "supabase.co/storage/v1/object/public/marketing-media/a.png",
    );
  });

  it("devolve null sem caminho ou sem URL base", () => {
    expect(publicMediaUrl(null, SUPABASE_URL)).toBeNull();
    expect(publicMediaUrl("a.png", "")).toBeNull();
  });
});

describe("sanitizeMediaName", () => {
  it("remove acentos, espaços e caracteres perigosos", () => {
    expect(sanitizeMediaName("Foto da Reunião.PNG")).toBe("foto-da-reuniao.png");
    expect(sanitizeMediaName("../../etc/passwd")).toBe("etc-passwd");
  });

  it("cai para um nome padrão quando não sobra nada", () => {
    expect(sanitizeMediaName("###")).toBe("imagem");
    expect(sanitizeMediaName("")).toBe("imagem");
  });
});

describe("coverPath", () => {
  it("usa a pasta do post e prefixa com o uuid", () => {
    expect(coverPath("abc", "Capa Bonita.webp", "uuid-1")).toBe(
      "posts/abc/uuid-1-capa-bonita.webp",
    );
  });
});

describe("bodyImagePath", () => {
  it("fica na subpasta corpo, dentro da pasta do post", () => {
    expect(bodyImagePath("abc", "Gráfico Vendas.png", "uuid-1")).toBe(
      "posts/abc/corpo/uuid-1-grafico-vendas.png",
    );
  });

  it("não cai no caminho que setPostCover aceita como capa", () => {
    const path = bodyImagePath("abc", "foto.png", "uuid-1");
    expect(path.startsWith("posts/abc/")).toBe(true);
    expect(path.slice("posts/abc/".length)).toContain("corpo/");
  });
});

describe("altFromFileName", () => {
  it("tira a extensão e troca separadores por espaço, mantendo acentos", () => {
    expect(altFromFileName("grafico-de_vendas.PNG")).toBe("grafico de vendas");
    expect(altFromFileName("Reunião do time.jpeg")).toBe("Reunião do time");
  });

  it("devolve vazio quando o nome é só a extensão", () => {
    expect(altFromFileName(".png")).toBe("");
  });
});

describe("isAllowedImage", () => {
  it("aceita os mimes de imagem dentro do limite", () => {
    expect(isAllowedImage("image/webp", 1024)).toBe(true);
    expect(isAllowedImage("image/jpeg", MAX_COVER_SIZE_BYTES)).toBe(true);
  });

  it("recusa mime fora da lista, tamanho zero e acima do limite", () => {
    expect(isAllowedImage("application/pdf", 1024)).toBe(false);
    expect(isAllowedImage("image/png", 0)).toBe(false);
    expect(isAllowedImage("image/png", MAX_COVER_SIZE_BYTES + 1)).toBe(false);
  });
});

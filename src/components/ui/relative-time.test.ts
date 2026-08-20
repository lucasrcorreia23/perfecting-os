import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// `formatRelativeTime` lê `Date.now()` DURANTE o render: chamada dentro de um
// componente, ela devolve um texto no servidor e outro na hidratação, e o React
// derruba a subárvore inteira ("the server rendered text didn't match"). O
// conserto é estrutural — o cálculo mora em `RelativeTime`, que só o faz depois
// da montagem —, e ele só continua valendo enquanto ninguém chamar a função
// direto num componente de novo. Este teste é o que segura a fronteira: sem
// ele, o próximo `{formatRelativeTime(x)}` numa tabela reabre o mesmo bug sem
// que nada reclame.

const RAIZ = join(import.meta.dirname, "..", "..");

const AUTORIZADOS = new Set([
  join("lib", "format.ts"),
  join("lib", "format.test.ts"),
  join("components", "ui", "relative-time.tsx"),
  join("components", "ui", "relative-time.test.ts"),
]);

function arquivosDeFonte(dir: string, prefixo = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const relativo = join(prefixo, entrada.name);
    if (entrada.isDirectory()) return arquivosDeFonte(join(dir, entrada.name), relativo);
    return /\.tsx?$/.test(entrada.name) ? [relativo] : [];
  });
}

describe("RelativeTime — tempo relativo não é calculado no render", () => {
  it("só o componente chama formatRelativeTime", () => {
    const infratores = arquivosDeFonte(RAIZ).filter((relativo) => {
      if (AUTORIZADOS.has(relativo)) return false;
      return /\bformatRelativeTime\s*\(/.test(readFileSync(join(RAIZ, relativo), "utf8"));
    });

    expect(infratores).toEqual([]);
  });
});

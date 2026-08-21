import { describe, expect, it } from "vitest";
import {
  ENCARGOS,
  FATOR_ESCOPO_MAX,
  FATOR_ESCOPO_MIN,
  FATOR_ESCOPO_PREMISSA,
  HAIRCUT,
  SUPERVISAO,
  TAXA_MINIMA,
} from "./constants";
import { TERMOS, termo } from "./glossario";

// Mesma razão de `referencia.test.ts`: o glossário é lido como se fosse
// verdade, e agora ele é citado dentro dos balões de "como chegamos a este
// número". Uma definição que envelhece em silêncio mente em dois lugares.

const tudo = TERMOS.map((t) => `${t.termo} ${t.definicao}`).join("\n");

const pct = (v: number) =>
  `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

describe("glossário — integridade", () => {
  it("não tem id repetido e todo id é alcançável", () => {
    const ids = TERMOS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(termo(id)?.id).toBe(id);
  });

  it("toda entrada tem termo e definição", () => {
    for (const t of TERMOS) {
      expect(t.termo.length, t.id).toBeGreaterThan(0);
      expect(t.definicao.length, t.id).toBeGreaterThan(20);
    }
  });
});

describe("glossário — números vêm das constantes", () => {
  it("cita o haircut como está em constants.ts", () => {
    expect(tudo).toContain(pct(1 - HAIRCUT));
  });

  it("cita a faixa e a premissa do fator de escopo", () => {
    expect(tudo).toContain(`${num(FATOR_ESCOPO_MIN)}–${num(FATOR_ESCOPO_MAX)}`);
    expect(tudo).toContain(num(FATOR_ESCOPO_PREMISSA));
  });

  it("cita a supervisão residual pelos dois lados", () => {
    expect(tudo).toContain(pct(SUPERVISAO));
    expect(tudo).toContain(pct(1 - SUPERVISAO));
  });

  it("cita os encargos e o piso contratual", () => {
    expect(tudo).toContain(num(ENCARGOS));
    expect(tudo).toContain(TAXA_MINIMA.toLocaleString("pt-BR"));
  });
});

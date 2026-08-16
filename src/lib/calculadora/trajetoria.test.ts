import { describe, expect, it } from "vitest";
import {
  limitesMensais,
  painelA,
  painelB,
  painelMensal,
  pisoPonto,
  reReconciliar,
  reconciliar,
  somaRelativa,
  tetoPonto,
  trajetoriaBase,
} from "@/lib/calculadora/trajetoria";

const G = 247_680; // performance do caso §14
const MARGEM_ANUAL = 3_240_000; // 900.000 × 12 × 30%
const MARGEM_MENSAL = MARGEM_ANUAL / 12;

function soma(pontos: number[]): number {
  return pontos.reduce((total, ponto) => total + ponto, 0);
}

describe("trajetória base e clamps (§4.12)", () => {
  it("sem edição a linha é reta: 12 pontos de G/12", () => {
    const base = trajetoriaBase(G);
    expect(base).toHaveLength(12);
    for (const ponto of base) expect(ponto).toBeCloseTo(G / 12, 9);
    expect(soma(base)).toBeCloseTo(G, 6);
  });

  it("piso permite curva-J sem margem mensal negativa; teto é 3× a média", () => {
    expect(pisoPonto(MARGEM_ANUAL)).toBeCloseTo(-MARGEM_MENSAL, 6);
    expect(tetoPonto(MARGEM_ANUAL, G)).toBeCloseTo(
      (3 * (MARGEM_ANUAL + G)) / 12 - MARGEM_ANUAL / 12,
      6,
    );
    // Convergência garantida: Σ pisos < G < Σ tetos.
    expect(12 * pisoPonto(MARGEM_ANUAL)).toBeLessThan(G);
    expect(12 * tetoPonto(MARGEM_ANUAL, G)).toBeGreaterThan(G);
  });
});

describe("reconciliação iterativa", () => {
  it("preserva Σg = G após arrastar um ponto, sem mover o ponto fixo", () => {
    const editados = trajetoriaBase(G);
    editados[3] = G / 12 + 50_000;
    const { pontos, convergiu, passos } = reconciliar(editados, G, MARGEM_ANUAL, 3);
    expect(convergiu).toBe(true);
    expect(passos).toBeLessThanOrEqual(50);
    expect(soma(pontos)).toBeCloseTo(G, 2); // tolerância R$ 0,01
    expect(pontos[3]).toBeCloseTo(G / 12 + 50_000, 2);
  });

  it("suporta curva-J: primeiros meses no piso, Σg = G intacta", () => {
    const editados = trajetoriaBase(G);
    editados[0] = -MARGEM_MENSAL * 2; // abaixo do piso: será clampado
    editados[1] = -MARGEM_MENSAL;
    const { pontos, convergiu } = reconciliar(editados, G, MARGEM_ANUAL);
    expect(convergiu).toBe(true);
    const piso = pisoPonto(MARGEM_ANUAL);
    expect(pontos[0]).toBeGreaterThanOrEqual(piso - 1e-6);
    expect(soma(pontos)).toBeCloseTo(G, 2);
  });

  it("clampa todo ponto entre piso e teto", () => {
    const editados = Array.from({ length: 12 }, (_, index) =>
      index % 2 === 0 ? 10 * MARGEM_ANUAL : -10 * MARGEM_ANUAL,
    );
    const { pontos, convergiu } = reconciliar(editados, G, MARGEM_ANUAL);
    expect(convergiu).toBe(true);
    const piso = pisoPonto(MARGEM_ANUAL);
    const teto = tetoPonto(MARGEM_ANUAL, G);
    for (const ponto of pontos) {
      expect(ponto).toBeGreaterThanOrEqual(piso - 1e-6);
      expect(ponto).toBeLessThanOrEqual(teto + 1e-6);
    }
    expect(soma(pontos)).toBeCloseTo(G, 2);
  });

  it("caso degenerado (sem margem e sem ganho) devolve a reta sem iterar", () => {
    const { pontos, convergiu } = reconciliar(trajetoriaBase(0), 0, 0);
    expect(convergiu).toBe(true);
    expect(soma(pontos)).toBe(0);
  });

  it("re-reconciliação preserva a forma quando G muda entre sessões", () => {
    const editados = trajetoriaBase(G);
    editados[0] = 0;
    editados[11] = (2 * G) / 12;
    const antiga = reconciliar(editados, G, MARGEM_ANUAL).pontos;
    const GNovo = G * 1.5;
    const nova = reReconciliar(antiga, GNovo, MARGEM_ANUAL).pontos;
    expect(soma(nova)).toBeCloseTo(GNovo, 2);
    // Forma preservada: as proporções entre pontos se mantêm (~escala 1,5).
    expect(nova[11] / Math.max(nova[5], 1)).toBeCloseTo(
      antiga[11] / Math.max(antiga[5], 1),
      1,
    );
  });
});

describe("painel mensal e limites do slider", () => {
  it("sem edição, a expectativa coincide com a média projetada", () => {
    const { semPrograma, mediaProjetada, suaExpectativa } = painelMensal(
      MARGEM_MENSAL,
      trajetoriaBase(G),
      G,
    );
    expect(semPrograma).toHaveLength(12);
    for (let index = 0; index < 12; index += 1) {
      expect(semPrograma[index].valor).toBeCloseTo(MARGEM_MENSAL, 6);
      expect(mediaProjetada[index].valor).toBeCloseTo(MARGEM_MENSAL + G / 12, 6);
      expect(suaExpectativa[index].valor).toBeCloseTo(mediaProjetada[index].valor, 6);
    }
  });

  it("a área entre expectativa e margem atual soma G, qualquer que seja a forma", () => {
    const editados = trajetoriaBase(G);
    editados[0] = -MARGEM_MENSAL / 2;
    const { pontos } = reconciliar(editados, G, MARGEM_ANUAL);
    const { semPrograma, suaExpectativa } = painelMensal(MARGEM_MENSAL, pontos, G);
    const area = suaExpectativa.reduce(
      (total, ponto, index) => total + (ponto.valor - semPrograma[index].valor),
      0,
    );
    expect(area).toBeCloseTo(G, 1);
  });

  it("limites do slider derivam de piso/teto: mínimo zero, máximo 3× a média com o programa", () => {
    const { min, max } = limitesMensais(MARGEM_MENSAL, G);
    expect(min).toBeCloseTo(0, 6);
    expect(max).toBeCloseTo((3 * (MARGEM_ANUAL + G)) / 12, 6);
    expect(min).toBeCloseTo(MARGEM_MENSAL + pisoPonto(MARGEM_ANUAL), 9);
    expect(max).toBeCloseTo(MARGEM_MENSAL + tetoPonto(MARGEM_ANUAL, G), 9);
  });

  it("somaRelativa mede o rascunho contra o total projetado", () => {
    expect(somaRelativa(trajetoriaBase(G), G)).toBeCloseTo(1, 9);
    expect(somaRelativa(trajetoriaBase(G).map((ponto) => ponto * 1.49), G)).toBeCloseTo(1.49, 9);
    expect(somaRelativa(trajetoriaBase(0), 0)).toBeNull();
  });

  it("concluir a edição reajusta proporcionalmente: rascunho de 149% volta a Σg = G", () => {
    // Rascunho livre (os sliders andam sem reconciliar), com forma desigual.
    const rascunho = trajetoriaBase(G).map((ponto, index) =>
      index < 6 ? ponto * 1.0 : ponto * 2.0,
    );
    expect(somaRelativa(rascunho, G)).toBeCloseTo(1.5, 6);
    const { pontos, convergiu } = reReconciliar(rascunho, G, MARGEM_ANUAL);
    expect(convergiu).toBe(true);
    expect(soma(pontos)).toBeCloseTo(G, 2);
    // Forma preservada: os últimos seis meses seguem valendo o dobro dos primeiros.
    expect(pontos[11] / pontos[0]).toBeCloseTo(2, 6);
  });
});

describe("painéis A e B", () => {
  it("Painel A: gap no mês 12 é exatamente G, com ou sem edição", () => {
    const reto = painelA(MARGEM_MENSAL, trajetoriaBase(G));
    expect(reto.gapMes12).toBeCloseTo(G, 4);

    const editados = trajetoriaBase(G);
    editados[0] = -MARGEM_MENSAL / 2;
    const { pontos } = reconciliar(editados, G, MARGEM_ANUAL);
    const editado = painelA(MARGEM_MENSAL, pontos);
    expect(editado.gapMes12).toBeCloseTo(G, 1);
  });

  it("Painel A: séries acumulam margem na mesma grandeza (correção D-01)", () => {
    const { semPrograma, comPrograma } = painelA(MARGEM_MENSAL, trajetoriaBase(G));
    expect(semPrograma[11].valor).toBeCloseTo(MARGEM_ANUAL, 4);
    expect(comPrograma[11].valor).toBeCloseTo(MARGEM_ANUAL + G, 4);
  });

  it("Painel B: a série base cruza o custo exatamente no payback (invariante 7)", () => {
    const valorAno = 304_380;
    const precoAno = 156_000;
    const series = painelB({ valorAno, precoAno, eficienciaAno: 56_700 });
    expect(series.paybackMeses).toBeCloseTo((precoAno / valorAno) * 12, 9);
    // Valor acumulado no mês do payback (interpolação linear) = custo anual.
    expect((valorAno / 12) * series.paybackMeses).toBeCloseTo(precoAno, 6);
    expect(series.base[11].valor).toBeCloseTo(valorAno, 6);
  });

  it("Painel B: série editada soma eficiência linear + performance editada", () => {
    const valorAno = 304_380;
    const editados = trajetoriaBase(247_680);
    const series = painelB(
      { valorAno, precoAno: 156_000, eficienciaAno: 56_700 },
      editados,
    );
    expect(series.editado).not.toBeNull();
    expect(series.editado![11].valor).toBeCloseTo(valorAno, 4);
  });

  it("invariante 4: editar a trajetória não altera ROI, payback nem valor do ano", () => {
    // A trajetória nem entra em calcResultadoTime — aqui garantimos que o
    // payback do painel vem só de (preço, valor), ignorando a edição.
    const editados = trajetoriaBase(247_680).map((ponto, index) =>
      index < 3 ? 0 : ponto * 1.4,
    );
    const semEdicao = painelB({ valorAno: 304_380, precoAno: 156_000, eficienciaAno: 56_700 });
    const comEdicao = painelB(
      { valorAno: 304_380, precoAno: 156_000, eficienciaAno: 56_700 },
      editados,
    );
    expect(comEdicao.paybackMeses).toBe(semEdicao.paybackMeses);
    expect(comEdicao.custoAnual).toBe(semEdicao.custoAnual);
  });
});

import { describe, expect, it } from "vitest";
import {
  horasDaConta,
  horasDoTime,
  nivelServico,
  nivelServicoPorAssentos,
  precoConta,
  precoPorTier,
  rateioPorTime,
  tierPorHoras,
  type TimePreco,
} from "@/lib/calculadora/preco";

function times(
  lista: { id: string; plano: "essencial" | "pratica" | "intensivo"; assentos: number }[],
): TimePreco[] {
  return lista;
}

describe("tabela de preços por tier (§4.9)", () => {
  it("cobra a taxa CHEIA do tier em todas as horas, nas fronteiras 262/656/1.243", () => {
    expect(precoPorTier(120).bruto).toBe(120 * 98);
    expect(precoPorTier(262).bruto).toBe(262 * 98);
    expect(precoPorTier(263).bruto).toBe(263 * 82);
    expect(precoPorTier(656).bruto).toBe(656 * 82);
    expect(precoPorTier(657).bruto).toBe(657 * 70);
    expect(precoPorTier(1243).bruto).toBe(1243 * 70);
    expect(precoPorTier(1244).bruto).toBe(1244 * 60);
  });

  // A conta de 800 h não paga 262 h a 98 mais 394 a 82 mais 144 a 70: paga
  // 800 × 70. É a diferença entre a aba comercial e a aba Conta da planilha, e
  // o teste existe para que voltar ao marginal seja uma decisão, não um
  // deslize.
  it("nenhuma hora guarda a taxa da faixa anterior", () => {
    expect(precoPorTier(800).bruto).toBe(800 * 70);
    expect(precoPorTier(800).bruto).not.toBe(262 * 98 + 394 * 82 + 144 * 70);
  });

  it("o tier declarado traz faixa, taxa e a economia da coluna comercial", () => {
    const tier = tierPorHoras(800);
    expect(tier.tier).toBe(3);
    expect(tier.deHoras).toBe(657);
    expect(tier.ateHoras).toBe(1243);
    expect(tier.taxaHora).toBe(70);
    expect(tier.economiaVsTier1).toBeCloseTo(1 - 70 / 98, 6); // 28,6%

    const tier1 = tierPorHoras(100);
    expect(tier1.tier).toBe(1);
    expect(tier1.deHoras).toBe(0);
    expect(tier1.economiaVsTier1).toBe(0);

    const tier4 = tierPorHoras(5_000);
    expect(tier4.tier).toBe(4);
    expect(tier4.deHoras).toBe(1244);
    expect(tier4.ateHoras).toBe(Infinity);
  });

  it("conta vazia fica no Tier 1 e não gera NaN", () => {
    expect(precoPorTier(0).bruto).toBe(0);
    expect(tierPorHoras(0).tier).toBe(1);
    expect(precoPorTier(-10).bruto).toBe(0);
  });

  // O INVARIANTE 9 DO V5 ("uma hora a mais nunca reduz a receita") É QUEBRADO
  // DE PROPÓSITO, e estes são os três pontos onde. Decisão do decisor em
  // 21/08/2026, tomada com os três números à vista: a tabela comercial vale, e
  // taxa cheia por tier implica degrau. Se um destes valores mudar, foi o
  // modelo de preço que mudou — não é um bug a consertar aqui.
  it("os três degraus em que uma hora a mais cobra MENOS", () => {
    expect(precoPorTier(263).bruto - precoPorTier(262).bruto).toBe(-4_110);
    expect(precoPorTier(657).bruto - precoPorTier(656).bruto).toBe(-7_802);
    expect(precoPorTier(1244).bruto - precoPorTier(1243).bruto).toBe(-12_370);
  });

  it("fora das três fronteiras, uma hora a mais nunca reduz a receita", () => {
    const DEGRAUS = new Set([263, 657, 1244]);
    let anterior = 0;
    for (let horas = 1; horas <= 2000; horas += 1) {
      const mensal = Math.max(precoPorTier(horas).bruto, 13_000);
      if (!DEGRAUS.has(horas)) expect(mensal).toBeGreaterThanOrEqual(anterior);
      anterior = mensal;
    }
  });
});

describe("piso da conta (§4.9)", () => {
  it("R$ 13.000 aplicado depois do desconto, travando até 132 h/mês", () => {
    // 132 h × 98 = 12.936 → piso; 134 h × 98 = 13.132 → Tier 1.
    const p132 = precoConta(times([{ id: "t", plano: "essencial", assentos: 66 }]));
    expect(p132.horasMes).toBe(132);
    expect(p132.mensal).toBe(13_000);
    expect(p132.pisoAplicado).toBe(true);

    const p134 = precoConta(times([{ id: "t", plano: "essencial", assentos: 67 }]));
    expect(p134.horasMes).toBe(134);
    expect(p134.mensal).toBe(134 * 98);
    expect(p134.pisoAplicado).toBe(false);
  });

  it("taxa combinada reflete o piso quando ele morde", () => {
    const preco = precoConta(times([{ id: "t", plano: "pratica", assentos: 30 }]));
    expect(preco.taxaCombinada).toBeCloseTo(13_000 / 120, 6);
  });

  it("conta vazia (sem assentos definidos ainda) não gera NaN", () => {
    const preco = precoConta([]);
    expect(preco.horasMes).toBe(0);
    expect(preco.taxaCombinada).toBe(0);
    expect(preco.mensal).toBe(13_000);
  });
});

describe("nível de serviço por assentos (sem efeito sobre preço)", () => {
  it("até 30 Essencial · até 100 Avançado · acima Enterprise", () => {
    expect(nivelServicoPorAssentos(30)).toBe("essencial");
    expect(nivelServicoPorAssentos(31)).toBe("avancado");
    expect(nivelServicoPorAssentos(100)).toBe("avancado");
    expect(nivelServicoPorAssentos(101)).toBe("enterprise");
  });

  it("24 meses sobem um degrau, e só a partir de 24 (§4.9)", () => {
    expect(nivelServico(30, 3)).toBe("essencial");
    expect(nivelServico(30, 12)).toBe("essencial");
    expect(nivelServico(30, 24)).toBe("avancado");
    expect(nivelServico(31, 24)).toBe("enterprise");
    // Enterprise é o topo: não existe degrau acima.
    expect(nivelServico(101, 24)).toBe("enterprise");
  });

  it("o degrau por prazo aparece no preço e se declara, sem mexer no valor", () => {
    const times = [{ id: "a", plano: "pratica" as const, assentos: 30 }];
    const curto = precoConta(times, 3);
    const longo = precoConta(times, 24);
    expect(longo.mensal).toBe(curto.mensal); // prazo não altera preço
    expect(curto.nivelServico).toBe("essencial");
    expect(curto.nivelPorPrazo).toBe(false);
    expect(longo.nivelServico).toBe("avancado");
    expect(longo.nivelPorPrazo).toBe(true);
  });
});

describe("horas e rateio por time (§4.11)", () => {
  it("horas do time = assentos × horas do plano", () => {
    expect(horasDoTime({ plano: "pratica", assentos: 30 })).toBe(120);
    expect(horasDoTime({ plano: "intensivo", assentos: 10 })).toBe(80);
    expect(
      horasDaConta(
        times([
          { id: "a", plano: "pratica", assentos: 30 },
          { id: "b", plano: "intensivo", assentos: 10 },
        ]),
      ),
    ).toBe(200);
  });

  it("rateia por horas e fecha a soma exata ao centavo no último time", () => {
    const lista = times([
      { id: "a", plano: "essencial", assentos: 33 }, // 66 h
      { id: "b", plano: "pratica", assentos: 50 }, // 200 h
      { id: "c", plano: "intensivo", assentos: 40 }, // 320 h
    ]);
    const preco = precoConta(lista);
    const rateio = rateioPorTime(lista);
    const soma = [...rateio.values()].reduce((total, valor) => total + valor, 0);
    expect(soma).toBeCloseTo(preco.mensal, 9);
    // Proporção por horas (com tolerância de centavos do arredondamento).
    expect(rateio.get("a")!).toBeCloseTo((preco.mensal * 66) / 586, 1);
    expect(rateio.get("b")!).toBeCloseTo((preco.mensal * 200) / 586, 1);
  });

  it("com um time só, o rateio é o preço inteiro da conta", () => {
    const lista = times([{ id: "a", plano: "pratica", assentos: 30 }]);
    expect(rateioPorTime(lista).get("a")).toBe(13_000);
  });
});

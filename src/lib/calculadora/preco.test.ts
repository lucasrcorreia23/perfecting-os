import { describe, expect, it } from "vitest";
import {
  horasDaConta,
  horasDoTime,
  nivelServico,
  nivelServicoPorAssentos,
  precoConta,
  precoEscada,
  rateioPorTime,
  type TimePreco,
} from "@/lib/calculadora/preco";

function times(
  lista: { id: string; plano: "essencial" | "pratica" | "intensivo"; assentos: number }[],
): TimePreco[] {
  return lista;
}

describe("escada progressiva (§4.9)", () => {
  it("é marginal por faixa, com as fronteiras 262/656/1.243", () => {
    expect(precoEscada(120).bruto).toBe(120 * 98);
    expect(precoEscada(262).bruto).toBe(262 * 98);
    expect(precoEscada(263).bruto).toBe(262 * 98 + 82);
    expect(precoEscada(656).bruto).toBe(262 * 98 + 394 * 82);
    expect(precoEscada(657).bruto).toBe(262 * 98 + 394 * 82 + 70);
    expect(precoEscada(1243).bruto).toBe(262 * 98 + 394 * 82 + 587 * 70);
    expect(precoEscada(1244).bruto).toBe(262 * 98 + 394 * 82 + 587 * 70 + 60);
  });

  // A faixa que a mudança de 573 para 656 move (18/08/2026). Abaixo de 574 h
  // nada muda; de 656 em diante a diferença trava em +R$ 996/mês, porque são
  // 83 horas que saem de R$ 70 e voltam para R$ 82.
  it("cobra as horas de 574 a 656 no Tier 2, não no Tier 3", () => {
    expect(precoEscada(573).bruto).toBe(262 * 98 + 311 * 82);
    expect(precoEscada(574).bruto - (262 * 98 + 311 * 82)).toBe(82);
    expect(precoEscada(656).bruto - (262 * 98 + 311 * 82 + 83 * 70)).toBe(83 * 12);
    expect(precoEscada(657).bruto - precoEscada(656).bruto).toBe(70);
  });

  it("o extrato soma exatamente o bruto", () => {
    for (const horas of [50, 262, 300, 573, 656, 800, 1243, 2000]) {
      const { bruto, extrato } = precoEscada(horas);
      const soma = extrato.reduce((total, faixa) => total + faixa.subtotal, 0);
      expect(soma).toBeCloseTo(bruto, 9);
      const horasExtrato = extrato.reduce((total, faixa) => total + faixa.horasNaFaixa, 0);
      expect(horasExtrato).toBe(horas);
    }
  });

  it("invariante 9: uma hora a mais nunca reduz a receita (1..2000 h)", () => {
    let anterior = 0;
    for (let horas = 1; horas <= 2000; horas += 1) {
      const mensal = Math.max(precoEscada(horas).bruto, 13_000);
      expect(mensal).toBeGreaterThanOrEqual(anterior);
      anterior = mensal;
    }
  });
});

describe("piso da conta (§4.9)", () => {
  it("R$ 13.000 aplicado depois do desconto, travando até 132 h/mês", () => {
    // 132 h × 98 = 12.936 → piso; 134 h × 98 = 13.132 → escada.
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

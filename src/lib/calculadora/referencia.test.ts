import { describe, expect, it } from "vitest";
import {
  CENARIOS,
  CHECAGEM_ALERTA,
  ENCARGOS,
  ESCADA_PRECO,
  FATOR_ESCOPO_PREMISSA,
  FINE_TUNE_RAMPA_MAX,
  FINE_TUNE_TICKET_MAX,
  HAIRCUT,
  JORNADA_MENSAL_H,
  PCT_EVENTO_SUBSTITUIVEL,
  PLANOS,
  SUPERVISAO,
  TAXA_MINIMA,
} from "./constants";
import { CICLO_DIAS_MINIMO } from "./calc";
import {
  REFERENCIA,
  SECOES,
  buscarReferencia,
  entradasDaSecao,
  type SecaoId,
} from "./referencia";

// Esta suíte existe por um motivo só: a referência é lida pelo time como se
// fosse verdade, então ela não pode envelhecer em silêncio. Se alguém mexer
// numa constante do motor e não na referência, é aqui que estoura.

const tudo = REFERENCIA.map((e) =>
  [e.titulo, e.formula, e.explicacao, e.divergencia ?? ""].join(" "),
).join("\n");

describe("referência de fórmulas — integridade", () => {
  it("toda entrada declara célula, código e seção conhecida", () => {
    const secoes = new Set<SecaoId>(SECOES.map((s) => s.id));
    for (const entrada of REFERENCIA) {
      expect(entrada.celula, entrada.id).not.toBe("");
      expect(entrada.codigo, entrada.id).toMatch(/^[a-z-]+\.ts#\w+$/);
      expect(secoes.has(entrada.secao), `${entrada.id}: seção ${entrada.secao}`).toBe(
        true,
      );
    }
  });

  it("não tem id repetido", () => {
    const ids = REFERENCIA.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nenhuma seção fica vazia", () => {
    for (const secao of SECOES) {
      expect(entradasDaSecao(secao.id).length, secao.id).toBeGreaterThan(0);
    }
  });

  it("só aponta para arquivos que existem no motor", () => {
    const modulos = new Set([
      "calc.ts",
      "constants.ts",
      "consolidado.ts",
      "estrutura.ts",
      "modelo.ts",
      "preco.ts",
      "trajetoria.ts",
      "cenarios-comparacao.ts",
    ]);
    for (const entrada of REFERENCIA) {
      const arquivo = entrada.codigo.split("#")[0];
      expect(modulos.has(arquivo), `${entrada.id} aponta para ${arquivo}`).toBe(true);
    }
  });
});

describe("referência de fórmulas — números vêm das constantes", () => {
  // Cada par é "o que o texto tem de dizer" derivado da constante viva. Trocar
  // a constante sem trocar a referência quebra aqui, que é o ponto.
  it("cita encargos, jornada e supervisão como estão em constants.ts", () => {
    expect(tudo).toContain(String(ENCARGOS).replace(".", ","));
    expect(tudo).toContain(String(JORNADA_MENSAL_H));
    expect(tudo).toContain(`${SUPERVISAO * 100}%`);
  });

  it("cita o haircut e os tetos de ajuste fino", () => {
    expect(tudo).toContain(String(HAIRCUT).replace(".", ","));
    expect(tudo).toContain(`${FINE_TUNE_TICKET_MAX * 100}%`);
    expect(tudo).toContain(`${FINE_TUNE_RAMPA_MAX * 100}%`);
  });

  it("cita a premissa de escopo, o evento substituível e a checagem", () => {
    expect(tudo).toContain(String(FATOR_ESCOPO_PREMISSA).replace(".", ","));
    expect(tudo).toContain(String(PCT_EVENTO_SUBSTITUIVEL).replace(".", ","));
    expect(tudo).toContain(`${CHECAGEM_ALERTA * 100}%`);
  });

  it("cita o piso e o mínimo de dias do ciclo", () => {
    expect(tudo).toContain(TAXA_MINIMA.toLocaleString("pt-BR"));
    expect(tudo).toContain(String(CICLO_DIAS_MINIMO));
  });

  it("reproduz a escada inteira, faixa a faixa", () => {
    const escada = REFERENCIA.find((e) => e.id === "escada");
    expect(escada).toBeDefined();
    for (const faixa of ESCADA_PRECO) {
      expect(escada!.formula).toContain(String(faixa.taxaHora));
      if (Number.isFinite(faixa.ateHoras)) {
        expect(escada!.formula).toContain(faixa.ateHoras.toLocaleString("pt-BR"));
      }
    }
  });

  it("reproduz os três cenários com os deltas vivos", () => {
    const cenarios = REFERENCIA.find((e) => e.id === "cenarios");
    expect(cenarios).toBeDefined();
    for (const cenario of Object.values(CENARIOS)) {
      expect(cenarios!.formula).toContain(cenario.label);
      expect(cenarios!.formula).toContain(`${cenario.ticketPct * 100}%`);
      expect(cenarios!.formula).toContain(`${cenario.rampaPct * 100}%`);
    }
  });

  it("reproduz os planos com os nomes e as horas vivos", () => {
    const planos = REFERENCIA.find((e) => e.id === "horas-plano");
    expect(planos).toBeDefined();
    for (const plano of Object.values(PLANOS)) {
      expect(planos!.formula).toContain(`${plano.label} ${plano.horasMes} h`);
    }
  });
});

describe("referência de fórmulas — divergências declaradas", () => {
  it("as três divergências deliberadas estão registradas", () => {
    const comDivergencia = REFERENCIA.filter((e) => e.divergencia);
    const ids = comDivergencia.map((e) => e.id);
    // Gating aceita zero + custo do evento exigido; quirk do ciclo no
    // Conservador; fronteira do Tier 2 contra a aba Premissas.
    expect(ids).toContain("gate-completude");
    expect(ids).toContain("comparacao-cenarios");
    expect(ids).toContain("escada");
  });

  it("a divergência da escada nomeia os dois números em disputa", () => {
    const escada = REFERENCIA.find((e) => e.id === "escada")!;
    expect(escada.divergencia).toContain(String(ESCADA_PRECO[1].ateHoras));
    expect(escada.divergencia).toContain("573");
  });

  it("não promete que a planilha valida a escada", () => {
    const escada = REFERENCIA.find((e) => e.id === "escada")!;
    expect(escada.divergencia).toMatch(/nenhuma planilha reproduz/i);
  });
});

describe("busca", () => {
  it("acha por célula", () => {
    expect(buscarReferencia("C41").map((e) => e.id)).toContain("eficiencia-ano");
    expect(buscarReferencia("Motor!C19").map((e) => e.id)).toContain(
      "assentos-efetivos",
    );
  });

  it("acha por termo do texto e por símbolo de código", () => {
    expect(buscarReferencia("haircut").length).toBeGreaterThan(0);
    expect(buscarReferencia("deltasEfetivos").map((e) => e.id)).toContain(
      "deltas-efetivos",
    );
  });

  it("é indiferente a caixa e devolve tudo com termo vazio", () => {
    expect(buscarReferencia("HAIRCUT").length).toBe(buscarReferencia("haircut").length);
    expect(buscarReferencia("   ").length).toBe(REFERENCIA.length);
  });
});

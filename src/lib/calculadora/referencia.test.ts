import { describe, expect, it } from "vitest";
import {
  CENARIOS,
  CHECAGEM_ALERTA,
  COI_CUSTO_SUBSTITUICAO,
  COI_DELTA_ATTAINMENT,
  COI_FONTES,
  COI_FRACAO_COACHAVEL,
  COI_HAIRCUT,
  COI_HORAS_COACHING_MIN,
  COI_HORAS_PERDIDAS_SEMANA,
  COI_NO_DECISION,
  COI_RAMPA_EXTENSAO_MESES,
  COI_RAMPA_PRODUTIVIDADE,
  COI_RETENCAO_COM,
  COI_RETENCAO_SEM,
  COI_SEMANAS_ESPERA,
  ENCARGOS,
  FATOR_ESCOPO_PREMISSA,
  FINE_TUNE_RAMPA_MAX,
  FINE_TUNE_TICKET_MAX,
  HAIRCUT,
  JORNADA_MENSAL_H,
  PCT_EVENTO_SUBSTITUIVEL,
  PLANOS,
  SUPERVISAO,
  TABELA_TIERS,
  TAXA_MINIMA,
} from "./constants";
import { CICLO_DIAS_MINIMO } from "./calc";
import * as modCalc from "./calc";
import * as modCenarios from "./cenarios-comparacao";
import * as modCoi from "./coi";
import * as modConsolidado from "./consolidado";
import * as modConstants from "./constants";
import * as modEstrutura from "./estrutura";
import * as modModelo from "./modelo";
import * as modPreco from "./preco";
import * as modTrajetoria from "./trajetoria";
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

  // Valida o ARQUIVO e o SÍMBOLO. Só o arquivo deixava passar ponteiro para
  // função inexistente — foi assim que `estrutura.ts#ratearEstrutura` (o nome
  // certo é `aplicarEstrutura`) sobreviveu à auditoria de 18/08/2026.
  it("só aponta para símbolos que existem no motor", () => {
    const modulos: Record<string, Record<string, unknown>> = {
      "calc.ts": modCalc,
      "cenarios-comparacao.ts": modCenarios,
      "coi.ts": modCoi,
      "consolidado.ts": modConsolidado,
      "constants.ts": modConstants,
      "estrutura.ts": modEstrutura,
      "modelo.ts": modModelo,
      "preco.ts": modPreco,
      "trajetoria.ts": modTrajetoria,
    };
    for (const entrada of REFERENCIA) {
      const [arquivo, simbolo] = entrada.codigo.split("#");
      const modulo = modulos[arquivo];
      expect(modulo, `${entrada.id} aponta para ${arquivo}`).toBeDefined();
      expect(
        Object.hasOwn(modulo, simbolo),
        `${entrada.id} aponta para ${arquivo}#${simbolo}, que não é exportado`,
      ).toBe(true);
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

  it("reproduz a tabela de tiers inteira, tier a tier", () => {
    const tiers = REFERENCIA.find((e) => e.id === "tiers");
    expect(tiers).toBeDefined();
    for (const faixa of TABELA_TIERS) {
      expect(tiers!.formula).toContain(String(faixa.taxaHora));
      if (Number.isFinite(faixa.ateHoras)) {
        expect(tiers!.formula).toContain(faixa.ateHoras.toLocaleString("pt-BR"));
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

  it("cita as constantes do custo da inação como estão em constants.ts", () => {
    const coi = REFERENCIA.filter((e) => e.secao === "coi")
      .map((e) => [e.formula, e.explicacao, e.divergencia ?? ""].join(" "))
      .join("\n");
    // Mesma formatação da referência: `0.29 * 100` dá 28,999… em ponto
    // flutuante, e comparar a string crua acusaria uma divergência que não
    // existe.
    const comoNaTela = (v: number) =>
      `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
    for (const fracao of [
      COI_DELTA_ATTAINMENT,
      COI_HAIRCUT,
      COI_NO_DECISION,
      COI_FRACAO_COACHAVEL,
      COI_RAMPA_PRODUTIVIDADE,
      COI_RETENCAO_COM,
      COI_RETENCAO_SEM,
    ]) {
      expect(coi, String(fracao)).toContain(comoNaTela(fracao));
    }
    for (const n of [
      COI_HORAS_COACHING_MIN,
      COI_RAMPA_EXTENSAO_MESES,
      COI_CUSTO_SUBSTITUICAO,
      COI_SEMANAS_ESPERA,
      COI_HORAS_PERDIDAS_SEMANA,
    ]) {
      expect(coi, String(n)).toContain(String(n).replace(".", ","));
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
  it("as divergências do motor e do preço estão registradas", () => {
    const comDivergencia = REFERENCIA.filter((e) => e.divergencia);
    const ids = comDivergencia.map((e) => e.id);
    // Gating aceita zero + custo do evento exigido; quirk do ciclo no
    // Conservador; e, desde 21/08/2026, o preço por taxa cheia do tier contra
    // o marginal da aba Conta. A FRONTEIRA do Tier 2 não está mais aqui e não
    // deve voltar: ela foi corrigida para 656 na planilha em 19/08/2026 (E-24)
    // e as duas abas concordam — o que diverge é a forma de cobrar, não o
    // limite.
    expect(ids).toContain("gate-completude");
    expect(ids).toContain("comparacao-cenarios");
    expect(ids).toContain("tiers");
  });

  it("as cinco divergências do custo da inação estão registradas", () => {
    const ids = REFERENCIA.filter((e) => e.secao === "coi" && e.divergencia).map(
      (e) => e.id,
    );
    // Não somado ao ROI; cobertura em horas (e o ramo quebrado de C9); margem
    // em vez de receita, nas três dimensões que saem em receita; travas do
    // turnover; haircut que a aba esquece na fila.
    for (const id of [
      "coi-fora-do-roi",
      "coi-cobertura",
      "coi-subperformance",
      "coi-rampa",
      "coi-turnover",
      "coi-no-decision",
      "coi-fila",
    ]) {
      expect(ids, id).toContain(id);
    }
  });

  // O COI é contrafactual e o ROI é atribuição: o invariante 1 do V5 manda
  // escolher um dos dois. A referência não pode sugerir soma em lugar nenhum.
  it("a referência do COI nunca promete soma com o ROI", () => {
    const coi = REFERENCIA.filter((e) => e.secao === "coi");
    expect(coi.length).toBeGreaterThan(0);
    for (const entrada of coi) {
      const texto = [entrada.formula, entrada.explicacao].join(" ");
      expect(texto, entrada.id).not.toMatch(/somad[oa] ao ROI(?! )/i);
      expect(texto, entrada.id).not.toMatch(/COI \+ |aditiv[oa] ao ROI/i);
    }
  });

  // A fronteira do Tier 2 deixou de ser divergência em 19/08/2026 (E-24), com
  // as duas abas concordando em 656 — e continua assim. O que virou
  // divergência em 21/08/2026 foi a FORMA de cobrar: a aba comercial vale, e
  // ela cobra a taxa cheia do tier, enquanto a aba Conta soma faixa a faixa.
  // O teste guarda as duas pontas: a fronteira sem contradição, e o preço
  // marginal declarado como divergência em vez de reaparecer em silêncio.
  it("a tabela de tiers declara a divergência contra o marginal da aba Conta", () => {
    const tiers = REFERENCIA.find((e) => e.id === "tiers")!;
    expect(tiers.formula).toContain(String(TABELA_TIERS[1].ateHoras));
    expect(tiers.divergencia).toBeDefined();
    expect(tiers.divergencia).toMatch(/C17:C20/);
    expect(tiers.divergencia).toMatch(/invariante 9/i);
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

  // As fontes saíram da referência interna para a tela do visitante em
  // 20/08/2026, e com elas saiu uma atribuição que a própria errata registrava
  // como suspeita: a planilha credita os 40–60% de "no decision" a
  // "Dixon/McKenna, HBR 2019", e o par assina o JOLT Effect, de 2022. Publicar
  // a data errada numa tela que passa a página inteira construindo
  // credibilidade custa mais do que a citação rende.
  //
  // O teste é por SUBSTRING e não por igualdade da lista: acrescentar uma
  // sétima fonte é decisão editorial e não deve quebrar; reintroduzir a
  // atribuição errada deve.
  describe("as fontes publicadas do COI", () => {
    it("não reintroduz a atribuição incorreta da planilha", () => {
      const tudo = COI_FONTES.join(" | ");
      expect(tudo, "a dupla Dixon/McKenna assina o JOLT Effect (2022)").not.toMatch(
        /HBR\s*2019/i,
      );
      expect(tudo).toContain("JOLT Effect");
    });

    // Sem data, a citação não é verificável — e é a verificabilidade que
    // justifica ter trazido as fontes para a tela do visitante.
    it("data toda fonte publicada", () => {
      for (const fonte of COI_FONTES) {
        expect(fonte, `${fonte} deveria trazer o ano entre parênteses`).toMatch(
          /\((19|20)\d{2}\)$/,
        );
      }
    });

    // A referência interna é o lugar onde a correção fica registrada com o
    // porquê. Se a entrada sumir, a decisão perde o rastro.
    it("é registrada na referência, com a divergência declarada", () => {
      const entrada = REFERENCIA.find((r) => r.id === "coi-fontes");
      expect(entrada, "a entrada coi-fontes precisa existir").toBeDefined();
      expect(entrada?.divergencia).toMatch(/JOLT Effect/);
      expect(entrada?.codigo).toBe("constants.ts#COI_FONTES");
    });
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DESAFIOS_EXPORT_FORMATO,
  desafiosParaJson,
  desafiosParaTexto,
  jsonFilename,
  type ExportableDesafio,
} from "./desafios-export";
import {
  computeDesafiosDashboard,
  type TaxonomiaLinha,
} from "./desafios-dashboard";

const GERADO_EM = "2026-08-25T14:32:00.000Z";

function taxonomia(id: string, nome: string, ordem = 1): TaxonomiaLinha {
  return { id, nome, cor: "#2E63CD", ordem, arquivada: false };
}

const CATEGORIAS = [taxonomia("cat-1", "Erro ou quebra", 1), taxonomia("cat-2", "Visual", 2)];
const FLUXOS = [taxonomia("flu-1", "Workflow", 1)];

function desafio(overrides: Partial<ExportableDesafio> & { id: string }): ExportableDesafio {
  return {
    codigo: 14,
    titulo: "Kanban perde o cliente ao arrastar",
    descricao: "Volta para a origem.",
    tipo: "bug",
    severidade: "alta",
    status: "aberto",
    categoria: { id: "cat-1", nome: "Erro ou quebra", cor: "#E11D48" },
    fluxo: { id: "flu-1", nome: "Workflow", cor: "#7C3AED" },
    tentativas: 10,
    falhas: 7,
    ocorrencias: [],
    passos: "1. Arrastar\n2. Soltar",
    esperado: "Fica na etapa nova",
    obtido: "Volta para a origem",
    ambiente: "macOS · Chrome",
    rota: "/workflow",
    evidencia_url: null,
    resolucao: null,
    resolvido_em: null,
    observacoes: null,
    created_at: "2026-08-01T12:00:00.000Z",
    updated_at: "2026-08-02T12:00:00.000Z",
    ...overrides,
  };
}

function exportar(desafios: ExportableDesafio[], deTotal = desafios.length) {
  const resumo = computeDesafiosDashboard({
    desafios: desafios.map((d) => ({ ...d, ocorrencias: d.ocorrencias })),
    categorias: CATEGORIAS,
    fluxos: FLUXOS,
  });
  return {
    resumo,
    payload: desafiosParaJson({
      desafios,
      categorias: CATEGORIAS,
      fluxos: FLUXOS,
      resumo,
      deTotal,
      geradoEm: GERADO_EM,
    }),
  };
}

describe("envelope", () => {
  it("carimba formato, versão e data de geração", () => {
    const { payload } = exportar([desafio({ id: "1" })]);
    expect(payload.formato).toBe(DESAFIOS_EXPORT_FORMATO);
    expect(payload.versao).toBe(1);
    expect(payload.geradoEm).toBe(GERADO_EM);
  });

  it("diz quantos de quantos, e se houve filtro", () => {
    const inteiro = exportar([desafio({ id: "1" })]).payload;
    expect(inteiro.recorte).toEqual({ total: 1, deTotal: 1, filtrado: false });

    const recortado = exportar([desafio({ id: "1" })], 300).payload;
    expect(recortado.recorte).toEqual({ total: 1, deTotal: 300, filtrado: true });
  });

  it("leva o eixo completo, inclusive a taxonomia sem desafio no recorte", () => {
    // A FORMA da matriz não é reconstituível a partir das linhas exportadas.
    const { payload } = exportar([desafio({ id: "1" })]);
    expect(payload.taxonomias.categorias.map((c) => c.id)).toEqual(["cat-1", "cat-2"]);
  });
});

describe("o desafio exportado é autocontido", () => {
  it("leva categoria e fluxo por id E por extenso", () => {
    const { payload } = exportar([desafio({ id: "1" })]);
    expect(payload.desafios[0].categoria).toEqual({
      id: "cat-1",
      nome: "Erro ou quebra",
      cor: "#E11D48",
    });
    expect(payload.desafios[0].codigoLegivel).toBe("DES-014");
    expect(payload.desafios[0].statusLabel).toBe("Aberto");
  });

  it("leva a recorrência RESOLVIDA e o contador junto, para ser auditável", () => {
    const { payload } = exportar([
      desafio({
        id: "1",
        tentativas: 10,
        falhas: 7,
        ocorrencias: [
          { ocorrido_em: GERADO_EM, tentativas: 4, falhas: 1, nota: null, ambiente: null },
        ],
      }),
    ]);
    const exportado = payload.desafios[0];
    // O log vence: quem lê o arquivo não precisa reimplementar a regra.
    expect(exportado.recorrencia).toMatchObject({
      status: "medido",
      fonte: "log",
      tentativas: 4,
      falhas: 1,
    });
    expect(exportado.contador).toEqual({ tentativas: 10, falhas: 7 });
    expect(exportado.ocorrencias).toHaveLength(1);
  });

  it("recorrência sem dados viaja como estado, nunca como zero", () => {
    // `null` seria coagido a 0 por qualquer Number(x) num visualizador ingênuo,
    // e "não medido" viraria "nunca falhou".
    const { payload } = exportar([desafio({ id: "1", tentativas: 0, falhas: 0 })]);
    expect(payload.desafios[0].recorrencia).toEqual({ status: "sem_dados" });
    expect(payload.desafios[0].recorrencia).not.toHaveProperty("pct");
  });
});

describe("o resumo é o dashboard, não uma segunda conta", () => {
  it("devolve exatamente o objeto recebido", () => {
    const { resumo, payload } = exportar([desafio({ id: "1" })]);
    expect(payload.resumo).toBe(resumo);
  });

  it("o módulo de export não agrega recorrência por conta própria", () => {
    // Teste de fonte, no caráter de design-tokens.test.ts: é o que impede
    // alguém de "otimizar" o resumo recalculando-o aqui e criando a segunda
    // aritmética que divergiria da tela.
    const fonte = readFileSync(new URL("./desafios-export.ts", import.meta.url), "utf8");
    expect(fonte).not.toContain("agregarPonderado");
    expect(fonte).not.toContain("recorrenciaAgregada");
    expect(fonte).not.toContain("computeDesafiosDashboard");
  });
});

describe("serialização e nome do arquivo", () => {
  it("sobrevive ao round-trip sem perda", () => {
    const { payload } = exportar([desafio({ id: "1" })]);
    expect(JSON.parse(desafiosParaTexto(payload))).toEqual(payload);
  });

  it("nomeia com a data e cai para o padrão quando a data é inválida", () => {
    expect(jsonFilename("desafios", GERADO_EM)).toBe("desafios-2026-08-25.json");
    expect(jsonFilename("Desafios · Fluxo", GERADO_EM)).toBe("desafios-fluxo-2026-08-25.json");
    expect(jsonFilename("", "não é data")).toBe("desafios.json");
  });
});

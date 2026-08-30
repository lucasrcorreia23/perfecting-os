import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeUsabilidadeDashboard,
  type AchadoDashboardRow,
  type SessaoDashboardRow,
} from "./dashboard";
import {
  usabilidadeFilename,
  usabilidadeParaJson,
  usabilidadeParaTexto,
  type ExportableAchado,
  type ExportableSessao,
} from "./export";

const GERADO_EM = "2026-08-30T14:32:00.000Z";

const SESSAO: ExportableSessao = {
  id: "s1",
  codigo: 7,
  perfil: "gestor",
  fluxo: "configuracao",
  varejo: false,
  realizado_em: "2026-08-28",
  roteiro_versao: 1,
  origem: "ficha",
  observacoes: "Piloto interno",
  respostas: {
    b2_facilidade: 5,
    b2_concordou_avaliacao: "concordei_em_parte",
    b9_pergunta_extinta: "resposta de uma versão anterior",
  },
};

const ACHADO: ExportableAchado = {
  id: "a1",
  sessao_id: "s1",
  pergunta_id: "b3b_irritou",
  resumo: "Não achou onde publicar o roleplay",
  trecho: "fiquei rodando a tela procurando o botão",
  tipo: "atrito",
  severidade: "alta",
  status: "virou_desafio",
  categoria: { id: "c1", nome: "Navegação" },
  fluxo: { id: "f1", nome: "Configuração" },
  desafio_id: null,
  desafio_codigo: 14,
};

function exportar(deTotal = 1) {
  const sessoes: SessaoDashboardRow[] = [
    {
      id: SESSAO.id,
      codigo: SESSAO.codigo,
      perfil: SESSAO.perfil,
      fluxo: SESSAO.fluxo,
      varejo: SESSAO.varejo,
      realizado_em: SESSAO.realizado_em,
      respostas: SESSAO.respostas,
    },
  ];
  const achados: AchadoDashboardRow[] = [
    {
      id: ACHADO.id,
      sessao_id: ACHADO.sessao_id,
      resumo: ACHADO.resumo,
      tipo: ACHADO.tipo,
      severidade: ACHADO.severidade,
      status: ACHADO.status,
      categoria: { id: "c1", nome: "Navegação", cor: "#2E63CD" },
      fluxo: { id: "f1", nome: "Configuração", cor: "#2E63CD" },
      desafio_id: ACHADO.desafio_id,
      desafio_codigo: ACHADO.desafio_codigo,
    },
  ];
  const resumo = computeUsabilidadeDashboard({ sessoes, achados });
  return {
    resumo,
    payload: usabilidadeParaJson({
      sessoes: [SESSAO],
      achados: [ACHADO],
      resumo,
      deTotal,
      geradoEm: GERADO_EM,
    }),
  };
}

describe("usabilidadeParaJson", () => {
  it("declara o envelope e o recorte", () => {
    const { payload } = exportar(300);
    expect(payload.formato).toBe("perfecting.usabilidade");
    expect(payload.versao).toBe(1);
    expect(payload.geradoEm).toBe(GERADO_EM);
    // "1 de 300" precisa estar escrito: sem isso, um arquivo com um recorte lê
    // como a base inteira e um dashboard montado sobre ele mentiria em silêncio.
    expect(payload.recorte).toEqual({ total: 1, deTotal: 300, filtrado: true });
  });

  it("marca `filtrado: false` quando o recorte é a base", () => {
    expect(exportar(1).payload.recorte.filtrado).toBe(false);
  });

  /*
   * IDENTIDADE REFERENCIAL, não igualdade: é o que prova que o resumo foi
   * RECEBIDO e não recalculado. Uma segunda aritmética divergiria da tela no
   * primeiro ajuste do agregador.
   */
  it("carrega o resumo recebido, sem recalcular", () => {
    const { resumo, payload } = exportar();
    expect(payload.resumo).toBe(resumo);
  });

  it("leva cada resposta por id E por extenso", () => {
    const { payload } = exportar();
    const facilidade = payload.sessoes[0].respostas.find(
      (r) => r.perguntaId === "b2_facilidade",
    );
    expect(facilidade?.valor).toBe(5);
    // A régua vai junto, como na tela — "5" sozinho não diz se foi bom.
    expect(facilidade?.valorLegivel).toBe("5 de 7");

    const concordou = payload.sessoes[0].respostas.find(
      (r) => r.perguntaId === "b2_concordou_avaliacao",
    );
    expect(concordou?.valorLegivel).toBe("Concordei em parte");
  });

  it("resposta fora do roteiro vai marcada, nunca sumida", () => {
    const { payload } = exportar();
    const orfa = payload.sessoes[0].respostas.find(
      (r) => r.perguntaId === "b9_pergunta_extinta",
    );
    expect(orfa?.foraDoRoteiro).toBe(true);
    expect(orfa?.valor).toBe("resposta de uma versão anterior");
  });

  it("o roteiro inteiro viaja junto", () => {
    const { payload } = exportar();
    expect(payload.roteiro.versao).toBe(1);
    expect(payload.roteiro.blocos.map((b) => b.id)).toEqual([
      "b0",
      "b1",
      "b2",
      "b3a",
      "b3b",
      "b4",
    ]);
  });

  /*
   * O estado do vínculo é RESOLVIDO no arquivo. Deixar `desafio_id: null` e
   * `desafio_codigo: 14` para o visualizador interpretar é como se perde a
   * distinção entre "nunca virou desafio" e "virou DES-014 e foi excluído".
   */
  it("resolve os três estados do vínculo", () => {
    const { payload } = exportar();
    expect(payload.achados[0].vinculo).toBe("desafio_excluido");
    expect(payload.achados[0].desafioCodigo).toBe(14);
    expect(payload.achados[0].sessaoCodigo).toBe(7);
  });

  it("o não-valor atravessa como estado, nunca como zero", () => {
    const { payload } = exportar();
    // Nenhuma sessão de vendedor no recorte, então a etapa "Localizou o
    // roleplay" não tem aplicáveis. Um `pct: 0` no arquivo viraria "ninguém
    // conseguiu" num visualizador ingênuo.
    const localizou = payload.resumo.funil.find(
      (e) => e.perguntaId === "b1_localizou_roleplay",
    );
    expect(localizou?.status).toBe("sem_dados");
    expect(localizou).not.toHaveProperty("semAjudaPct");
    expect(payload.resumo.medias.b2_conversa_real).not.toHaveProperty("media");
  });

  it("sobrevive a um round-trip por JSON", () => {
    const { payload } = exportar();
    expect(JSON.parse(usabilidadeParaTexto(payload))).toEqual(payload);
  });
});

describe("usabilidadeFilename", () => {
  it("faz slug e carimba a data", () => {
    expect(usabilidadeFilename("usabilidade", GERADO_EM)).toBe(
      "usabilidade-2026-08-30.json",
    );
    expect(usabilidadeFilename("Sessões · Varejo", GERADO_EM)).toBe(
      "sessoes-varejo-2026-08-30.json",
    );
  });

  it("tem fallback para prefixo vazio e data inválida", () => {
    expect(usabilidadeFilename("", "não é data")).toBe("usabilidade.json");
  });
});

/*
 * TESTE DE FONTE, no caráter de `desafios-export.test.ts`: o export não pode
 * ganhar uma aritmética própria. Ele recebe o resumo pronto — o dia em que
 * importar o agregador é o dia em que a tela e o arquivo podem divergir.
 */
describe("o export não recalcula", () => {
  it("não importa o agregador", () => {
    const fonte = readFileSync(new URL("./export.ts", import.meta.url), "utf8");
    expect(fonte).not.toContain("computeUsabilidadeDashboard");
    // `import type` é apagado em runtime e é legítimo — o tipo do resumo tem de
    // vir de algum lugar. O que não pode entrar é import de VALOR do agregador.
    expect(fonte).not.toMatch(/import\s+\{[^}]*\}\s+from\s+"\.\/dashboard"/);
  });
});

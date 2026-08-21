import { describe, expect, it } from "vitest";
import { etapasLiberadas, type EtapaId } from "./etapas-nav";

// A trava de navegação entre as três etapas (decisão de 20/08/2026; a etapa
// 04 saiu em 21/08). Ela tem
// duas pontas — o botão `aria-disabled` em `EtapasNav` e a checagem em
// `irParaEtapa` — e as duas leem ESTA função. É por isso que ela vale um teste
// próprio: uma regra lida de dois lugares, se for reescrita num só, diverge.

function preenchimento(
  parcial: Partial<Record<EtapaId, number>>,
): Record<EtapaId, number> {
  return { mensalidade: 0, quiz: 0, relatorio: 0, ...parcial };
}

describe("etapasLiberadas", () => {
  it("no começo, só a primeira etapa abre", () => {
    const liberadas = etapasLiberadas(preenchimento({}), "mensalidade");
    expect(liberadas).toEqual({
      mensalidade: true,
      quiz: false,
      relatorio: false,
    });
  });

  it("concluir uma etapa abre a seguinte, e só ela", () => {
    const liberadas = etapasLiberadas(preenchimento({ mensalidade: 1 }), "mensalidade");
    expect(liberadas.quiz).toBe(true);
    expect(liberadas.relatorio).toBe(false);
  });

  // O ponto que a decisão preserva: a trava é contra o pulo para frente, não
  // contra reconferir um número. Etapa antiga não tem pendência atrás de si.
  it("voltar é sempre livre", () => {
    const liberadas = etapasLiberadas(
      preenchimento({ mensalidade: 1, quiz: 0.4 }),
      "quiz",
    );
    expect(liberadas.mensalidade).toBe(true);
    expect(liberadas.quiz).toBe(true);
  });

  it("etapa incompleta barra todas as seguintes, não só a próxima", () => {
    const liberadas = etapasLiberadas(
      preenchimento({ mensalidade: 1, quiz: 0.5 }),
      "mensalidade",
    );
    expect(liberadas.quiz).toBe(true);
    expect(liberadas.relatorio).toBe(false);
  });

  // A regra olha só para TRÁS. O relatório abre com o quiz completo, mesmo com
  // o preenchimento dele em zero — olhar para si mesma faria a última etapa da
  // régua não abrir nunca, e era assim que a antiga etapa 04 (que só valia 1
  // depois do envio) ficaria inalcançável.
  it("depende das anteriores, nunca do preenchimento da própria etapa", () => {
    const liberadas = etapasLiberadas(
      preenchimento({ mensalidade: 1, quiz: 1, relatorio: 0 }),
      "quiz",
    );
    expect(liberadas.relatorio).toBe(true);
  });

  // Estado restaurado de um link salvo pode pousar numa etapa cujas anteriores
  // regrediram (um campo apagado). Trancar o chão sob os pés de quem já está
  // lá seria pior que não ter trava.
  it("a etapa atual nunca tranca", () => {
    const liberadas = etapasLiberadas(preenchimento({}), "relatorio");
    expect(liberadas.relatorio).toBe(true);
    expect(liberadas.quiz).toBe(false);
  });

  it("com tudo completo, todas abrem", () => {
    const liberadas = etapasLiberadas(
      preenchimento({ mensalidade: 1, quiz: 1, relatorio: 1 }),
      "relatorio",
    );
    expect(Object.values(liberadas).every(Boolean)).toBe(true);
  });
});

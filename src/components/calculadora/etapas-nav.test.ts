import { describe, expect, it } from "vitest";
import { etapasLiberadas, type EtapaId } from "./etapas-nav";

// A trava de navegação entre as quatro etapas (decisão de 20/08/2026). Ela tem
// duas pontas — o botão `aria-disabled` em `EtapasNav` e a checagem em
// `irParaEtapa` — e as duas leem ESTA função. É por isso que ela vale um teste
// próprio: uma regra lida de dois lugares, se for reescrita num só, diverge.

function preenchimento(
  parcial: Partial<Record<EtapaId, number>>,
): Record<EtapaId, number> {
  return { mensalidade: 0, quiz: 0, relatorio: 0, exportar: 0, ...parcial };
}

describe("etapasLiberadas", () => {
  it("no começo, só a primeira etapa abre", () => {
    const liberadas = etapasLiberadas(preenchimento({}), "mensalidade");
    expect(liberadas).toEqual({
      mensalidade: true,
      quiz: false,
      relatorio: false,
      exportar: false,
    });
  });

  it("concluir uma etapa abre a seguinte, e só ela", () => {
    const liberadas = etapasLiberadas(preenchimento({ mensalidade: 1 }), "mensalidade");
    expect(liberadas.quiz).toBe(true);
    expect(liberadas.relatorio).toBe(false);
    expect(liberadas.exportar).toBe(false);
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
      preenchimento({ mensalidade: 1, quiz: 0.9 }),
      "quiz",
    );
    expect(liberadas.relatorio).toBe(false);
    expect(liberadas.exportar).toBe(false);
  });

  // `exportar` só vale 1 depois do envio. Se a trava olhasse o preenchimento da
  // PRÓPRIA etapa, a última nunca abriria — e não há como enviar sem entrar.
  it("depende das anteriores, nunca do preenchimento da própria etapa", () => {
    const liberadas = etapasLiberadas(
      preenchimento({ mensalidade: 1, quiz: 1, relatorio: 1, exportar: 0 }),
      "relatorio",
    );
    expect(liberadas.exportar).toBe(true);
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
      preenchimento({ mensalidade: 1, quiz: 1, relatorio: 1, exportar: 1 }),
      "exportar",
    );
    expect(Object.values(liberadas).every(Boolean)).toBe(true);
  });
});

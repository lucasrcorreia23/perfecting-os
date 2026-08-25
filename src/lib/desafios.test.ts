import { describe, expect, it } from "vitest";
import {
  agregarPonderado,
  codigoDesafio,
  formatarProporcao,
  formatarRecorrencia,
  recorrenciaAgregada,
  recorrenciaDoDesafio,
  validateDesafioInput,
  validateOcorrenciaInput,
  validateTaxonomiaInput,
  type DesafioMedido,
  type Recorrencia,
} from "./desafios";

function desafio(overrides: Partial<DesafioMedido> = {}): DesafioMedido {
  return { tentativas: 0, falhas: 0, ocorrencias: [], ...overrides };
}

// Lookup que lança em vez de devolver undefined (molde de kpis.test.ts).
function medido(r: Recorrencia) {
  if (r.status !== "medido") {
    throw new Error(`esperava recorrência medida, veio "${r.status}"`);
  }
  return r;
}

describe("recorrenciaDoDesafio", () => {
  it("sem log e sem contador devolve sem_dados — 0/0 nunca vira 0%", () => {
    // 0% afirma "nunca falhou". Isso não é uma medição, é a ausência de uma.
    expect(recorrenciaDoDesafio(desafio())).toEqual({ status: "sem_dados" });
  });

  it("com contador e sem log, a fonte é o contador", () => {
    const r = medido(recorrenciaDoDesafio(desafio({ tentativas: 10, falhas: 7 })));
    expect(r.fonte).toBe("contador");
    expect(r.tentativas).toBe(10);
    expect(r.falhas).toBe(7);
    expect(r.pct).toBeCloseTo(0.7);
  });

  it("com log, o contador é IGNORADO — nunca somado", () => {
    const r = medido(
      recorrenciaDoDesafio(
        desafio({ tentativas: 10, falhas: 7, ocorrencias: [{ tentativas: 4, falhas: 1 }] }),
      ),
    );
    expect(r.fonte).toBe("log");
    expect(r.tentativas).toBe(4);
    expect(r.falhas).toBe(1);
    // A asserção que falha no dia em que alguém "consertar" para soma.
    expect(r.tentativas).not.toBe(14);
    expect(r.falhas).not.toBe(8);
  });

  it("soma as sessões do log entre si", () => {
    const r = medido(
      recorrenciaDoDesafio(
        desafio({
          ocorrencias: [
            { tentativas: 10, falhas: 7 },
            { tentativas: 5, falhas: 1 },
          ],
        }),
      ),
    );
    expect(r.tentativas).toBe(15);
    expect(r.falhas).toBe(8);
  });

  it("log só com sessões de zero tentativas devolve sem_dados", () => {
    const r = recorrenciaDoDesafio(desafio({ ocorrencias: [{ tentativas: 0, falhas: 0 }] }));
    expect(r).toEqual({ status: "sem_dados" });
  });

  it("falhas acima de tentativas é grampeado, não estourado", () => {
    // Linha legada não pode quebrar o dashboard nem produzir pct > 1.
    const r = medido(recorrenciaDoDesafio(desafio({ tentativas: 3, falhas: 99 })));
    expect(r.falhas).toBe(3);
    expect(r.pct).toBe(1);
  });
});

describe("agregarPonderado", () => {
  it("soma as MEDIÇÕES, não as porcentagens (consolidado ponderado)", () => {
    // 2 de 2 (100%) e 20 de 200 (10%). Ponderado: 22/202 ≈ 10,9%.
    const r = medido(
      agregarPonderado(
        [
          { tentativas: 2, falhas: 2 },
          { tentativas: 200, falhas: 20 },
        ],
        "log",
      ),
    );
    expect(r.tentativas).toBe(202);
    expect(r.falhas).toBe(22);
    expect(r.pct).toBeCloseTo(22 / 202, 6);
    // A média das porcentagens daria 55% — o erro que este invariante barra.
    expect(r.pct).not.toBeCloseTo(0.55, 2);
  });

  it("lista vazia devolve sem_dados", () => {
    expect(agregarPonderado([], "log")).toEqual({ status: "sem_dados" });
  });
});

describe("recorrenciaAgregada", () => {
  it("usa a medição que vale para cada desafio e marca a fonte como mista", () => {
    const r = medido(
      recorrenciaAgregada([
        desafio({ tentativas: 10, falhas: 7, ocorrencias: [{ tentativas: 4, falhas: 1 }] }),
        desafio({ tentativas: 10, falhas: 3 }),
      ]),
    );
    // 4 (do log do primeiro) + 10 (do contador do segundo) — o 10 do contador
    // do primeiro não entra.
    expect(r.tentativas).toBe(14);
    expect(r.falhas).toBe(4);
    expect(r.fonte).toBe("misto");
  });

  it("um desafio sem medição não torna o agregado misto nem entra na conta", () => {
    const r = medido(
      recorrenciaAgregada([desafio({ tentativas: 10, falhas: 7 }), desafio()]),
    );
    expect(r.fonte).toBe("contador");
    expect(r.tentativas).toBe(10);
  });

  it("nenhum desafio medido devolve sem_dados", () => {
    expect(recorrenciaAgregada([desafio(), desafio()])).toEqual({ status: "sem_dados" });
    expect(recorrenciaAgregada([])).toEqual({ status: "sem_dados" });
  });
});

describe("formatação", () => {
  it("devolve travessão quando não há dados — nunca 0%", () => {
    const vazio: Recorrencia = { status: "sem_dados" };
    expect(formatarRecorrencia(vazio)).toBe("—");
    expect(formatarProporcao(vazio)).toBe("—");
  });

  it("formata a proporção e a porcentagem", () => {
    const r = recorrenciaDoDesafio(desafio({ tentativas: 10, falhas: 7 }));
    expect(formatarRecorrencia(r)).toBe("70%");
    expect(formatarProporcao(r)).toBe("7 de 10");
  });

  it("arredonda para inteiro, e não achata uma falha rara em 0%", () => {
    expect(formatarRecorrencia(recorrenciaDoDesafio(desafio({ tentativas: 3, falhas: 2 })))).toBe("67%");
    // 1 em 500 é 0,2%: "0%" afirmaria que nunca falhou.
    expect(formatarRecorrencia(recorrenciaDoDesafio(desafio({ tentativas: 500, falhas: 1 })))).toBe("<1%");
    expect(formatarRecorrencia(recorrenciaDoDesafio(desafio({ tentativas: 500, falhas: 0 })))).toBe("0%");
  });
});

describe("codigoDesafio", () => {
  it("preenche com zeros até três dígitos e não trunca acima disso", () => {
    expect(codigoDesafio(14)).toBe("DES-014");
    expect(codigoDesafio(1)).toBe("DES-001");
    expect(codigoDesafio(1400)).toBe("DES-1400");
  });
});

describe("validateDesafioInput", () => {
  const valido = { titulo: "Kanban perde o cliente ao arrastar", tentativas: 10, falhas: 7 };

  it("aceita entrada válida", () => {
    expect(validateDesafioInput(valido)).toBeNull();
  });

  it("recusa título vazio", () => {
    expect(validateDesafioInput({ ...valido, titulo: "   " })).toBe("Informe o título do desafio.");
  });

  it("recusa mais falhas do que tentativas", () => {
    expect(validateDesafioInput({ ...valido, tentativas: 3, falhas: 4 })).toBe(
      "Não dá para registrar mais falhas do que tentativas.",
    );
  });

  it("recusa contador negativo ou fracionário", () => {
    expect(validateDesafioInput({ ...valido, tentativas: -1, falhas: 0 })).not.toBeNull();
    expect(validateDesafioInput({ ...valido, tentativas: 2.5, falhas: 0 })).not.toBeNull();
  });

  it("recusa link de evidência que não seja http(s)", () => {
    expect(validateDesafioInput({ ...valido, evidencia_url: "javascript:alert(1)" })).toBe(
      "O link de evidência precisa começar com http:// ou https://.",
    );
    expect(validateDesafioInput({ ...valido, evidencia_url: "https://drive.example/a" })).toBeNull();
    expect(validateDesafioInput({ ...valido, evidencia_url: "" })).toBeNull();
  });
});

describe("validateOcorrenciaInput", () => {
  it("exige ao menos uma tentativa", () => {
    expect(validateOcorrenciaInput({ tentativas: 0, falhas: 0 })).toBe("Registre ao menos uma tentativa.");
  });

  it("aceita a sessão que originou o módulo", () => {
    expect(validateOcorrenciaInput({ tentativas: 10, falhas: 7 })).toBeNull();
  });
});

describe("validateTaxonomiaInput", () => {
  it("aceita nome e cor válidos", () => {
    expect(validateTaxonomiaInput({ nome: "Checkout", cor: "#2E63CD", ordem: 1 })).toBeNull();
  });

  it("recusa nome vazio e cor fora do formato hex", () => {
    expect(validateTaxonomiaInput({ nome: " ", cor: "#2E63CD", ordem: 1 })).toBe("Informe o nome.");
    expect(validateTaxonomiaInput({ nome: "Checkout", cor: "azul", ordem: 1 })).toBe("Escolha uma cor válida.");
  });
});

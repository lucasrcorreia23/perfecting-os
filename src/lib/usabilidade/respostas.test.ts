import { describe, expect, it } from "vitest";
import {
  dependenciaSatisfeita,
  formatarResposta,
  limparDependentes,
  normalizarRotulo,
  parseDataBR,
  parseDuracao,
  parseRespostas,
  promoverRespostas,
  validarRespostas,
  type RespostasMap,
} from "./respostas";
import { perguntaPorId, perguntasDoPerfil, type Pergunta } from "./roteiro";

function pergunta(id: string): Pergunta {
  const encontrada = perguntaPorId(id);
  if (!encontrada) throw new Error(`pergunta inexistente no roteiro: ${id}`);
  return encontrada;
}

function valido(resultado: ReturnType<typeof validarRespostas>) {
  if (!resultado.ok) throw new Error(`esperava ok, veio erro: ${resultado.error}`);
  return resultado;
}

const GESTOR = perguntasDoPerfil("gestor", false);

describe("normalizarRotulo", () => {
  it("ignora acento, caixa e pontuação de fim", () => {
    expect(normalizarRotulo("Sistema Operacional?")).toBe("sistema operacional");
    expect(normalizarRotulo("  Duração:  ")).toBe("duracao");
    expect(normalizarRotulo("Objeção ou situação escolhida")).toBe(
      "objecao ou situacao escolhida",
    );
  });

  /*
   * O contraexemplo que proíbe casamento aproximado neste módulo. "Não" é opção
   * da Q5 (faria de novo) e "Não faria" é opção da Q6 (quando treinaria).
   * Qualquer `startsWith`/`includes` mapearia um no outro conforme a ordem de
   * iteração, e o valor iria para a pergunta errada em silêncio.
   */
  it("não torna 'Não' e 'Não faria' equivalentes", () => {
    expect(normalizarRotulo("Não")).not.toBe(normalizarRotulo("Não faria"));
    expect(normalizarRotulo("Não faria").startsWith(normalizarRotulo("Não"))).toBe(true);
  });
});

describe("parseDuracao", () => {
  it("lê as formas que o moderador escreve", () => {
    expect(parseDuracao("45")).toBe(45);
    expect(parseDuracao("45 min")).toBe(45);
    expect(parseDuracao("45 minutos")).toBe(45);
    expect(parseDuracao("1h10")).toBe(70);
    expect(parseDuracao("0:45")).toBe(45);
    expect(parseDuracao("2h")).toBe(120);
  });

  // Zero minuto seria uma medição ("durou nada"); o que houve foi a ausência
  // dela. Mesma disciplina do `sem_dados` da Recorrencia.
  it("devolve null em vez de zero", () => {
    expect(parseDuracao("")).toBeNull();
    expect(parseDuracao("0")).toBeNull();
    expect(parseDuracao("0:00")).toBeNull();
    expect(parseDuracao("uns 40 minutos")).toBeNull();
  });
});

describe("parseDataBR", () => {
  it("lê ISO e formato brasileiro", () => {
    expect(parseDataBR("2026-08-28")).toBe("2026-08-28");
    expect(parseDataBR("28/08/2026")).toBe("2026-08-28");
    expect(parseDataBR("5/8/26")).toBe("2026-08-05");
  });

  // Cair para hoje faria toda sessão importada com atraso entrar com a data
  // errada — e `realizado_em` é o eixo de ordenação e de recorte.
  it("devolve null quando não tem certeza, nunca hoje", () => {
    expect(parseDataBR("12/08")).toBeNull();
    expect(parseDataBR("31/02/2026")).toBeNull();
    expect(parseDataBR("ontem")).toBeNull();
    expect(parseDataBR("")).toBeNull();
  });
});

describe("parseRespostas", () => {
  it("descarta forma inválida sem lançar", () => {
    expect(parseRespostas(null)).toEqual({});
    expect(parseRespostas([1, 2])).toEqual({});
    expect(parseRespostas({ a: {}, b: true, c: "  ", d: "ok", e: 7 })).toEqual({
      d: "ok",
      e: 7,
    });
  });

  /*
   * Ao contrário de `parseQuestions`, NÃO filtra por pertencer ao roteiro: uma
   * resposta cujo id saiu do roteiro precisa sobreviver para ser renderizada
   * como "fora do roteiro atual" (invariante 10).
   */
  it("preserva id que não está mais no roteiro", () => {
    expect(parseRespostas({ b9_pergunta_extinta: "sim" })).toEqual({
      b9_pergunta_extinta: "sim",
    });
  });
});

describe("validarRespostas", () => {
  it("aceita o que casa com a forma", () => {
    const r = valido(
      validarRespostas(GESTOR, {
        b0_perfil: "gestor",
        b2_facilidade: 5,
        b1_campos_hesitou: "  travou no seletor de cenário  ",
      }),
    );
    expect(r.respostas.b2_facilidade).toBe(5);
    expect(r.respostas.b1_campos_hesitou).toBe("travou no seletor de cenário");
  });

  // Fora da régua é recusa, não grampeamento: um 8 numa escala 1–7 não é 7, é
  // um dado que não existe naquela pergunta.
  it("recusa valor fora da escala em vez de grampear", () => {
    const oito = validarRespostas(GESTOR, { b2_facilidade: 8 });
    expect(oito.ok).toBe(false);
    const zero = validarRespostas(GESTOR, { b2_facilidade: 0 });
    expect(zero.ok).toBe(false);
    // 0 é válido na 0–10, e inválido na 1–7. As réguas não são intercambiáveis.
    expect(valido(validarRespostas(GESTOR, { b2_conversa_real: 0 })).respostas)
      .toEqual({ b2_conversa_real: 0 });
  });

  it("recusa opção que não existe na pergunta", () => {
    expect(validarRespostas(GESTOR, { b2_concordou_avaliacao: "talvez" }).ok).toBe(
      false,
    );
  });

  /*
   * INVARIANTE 9. O template em branco convida a preencher o motivo mesmo com
   * "Finalizou: Sim"; contá-lo faria "Desistiu: 60%" sobre um denominador de
   * dois casos reais.
   */
  it("descarta resposta cuja dependência não está satisfeita", () => {
    const r = valido(
      validarRespostas(GESTOR, {
        b1_finalizou_chamada: "sim",
        b1_motivo_nao_finalizou: "desistiu",
      }),
    );
    expect(r.respostas).not.toHaveProperty("b1_motivo_nao_finalizou");
    expect(r.avisos.map((a) => a.codigo)).toContain("dependencia_nao_satisfeita");
  });

  it("mantém a resposta quando a dependência está satisfeita", () => {
    const r = valido(
      validarRespostas(GESTOR, {
        b1_finalizou_chamada: "nao",
        b1_motivo_nao_finalizou: "erro_tecnico",
      }),
    );
    expect(r.respostas.b1_motivo_nao_finalizou).toBe("erro_tecnico");
    expect(r.avisos).toHaveLength(0);
  });

  it("preserva id fora do roteiro e avisa", () => {
    const r = valido(validarRespostas(GESTOR, { b9_extinta: "algo" }));
    expect(r.respostas.b9_extinta).toBe("algo");
    expect(r.avisos[0]?.codigo).toBe("fora_do_roteiro");
  });

  it("ignora pergunta de outro perfil sem quebrar", () => {
    const r = valido(validarRespostas(GESTOR, { b2_vendedor_cliente_real: 9 }));
    // Não está nas perguntas do gestor, então cai no ramo "fora do roteiro" —
    // preservada, nunca descartada em silêncio.
    expect(r.respostas.b2_vendedor_cliente_real).toBe(9);
  });
});

describe("dependenciaSatisfeita", () => {
  it("é falsa quando a pergunta-mãe não foi respondida", () => {
    expect(dependenciaSatisfeita(pergunta("b1_motivo_nao_finalizou"), {})).toBe(false);
  });
});

describe("promoverRespostas", () => {
  /*
   * A divergência deliberada do `leadFieldsFrom`: promove E REMOVE. Sem o
   * remove, uma correção na coluna faria o CSV (que lê o roteiro) e o dashboard
   * (que lê a coluna) imprimirem perfis diferentes para a mesma sessão.
   */
  it("remove do mapa o que promoveu", () => {
    const respostas: RespostasMap = {
      b0_perfil: "gestor",
      b0_fluxo: "preparacao",
      b0_varejo: "sim",
      b0_data: "2026-08-28",
      b0_dispositivo: "notebook",
    };
    const { colunas, respostasRestantes } = promoverRespostas(GESTOR, respostas);

    expect(colunas).toEqual({
      perfil: "gestor",
      fluxo: "preparacao",
      varejo: true,
      realizado_em: "2026-08-28",
    });
    expect(Object.keys(respostasRestantes)).toEqual(["b0_dispositivo"]);
    for (const id of ["b0_perfil", "b0_fluxo", "b0_varejo", "b0_data"]) {
      expect(respostasRestantes).not.toHaveProperty(id);
    }
  });

  it("não muta a entrada", () => {
    const respostas: RespostasMap = { b0_perfil: "gestor" };
    promoverRespostas(GESTOR, respostas);
    expect(respostas.b0_perfil).toBe("gestor");
  });

  it("ausente vira null, e varejo ausente é false", () => {
    const { colunas } = promoverRespostas(GESTOR, {});
    expect(colunas).toEqual({
      perfil: null,
      fluxo: null,
      varejo: false,
      realizado_em: null,
    });
  });
});

describe("formatarResposta", () => {
  it("devolve o label da opção, não o id", () => {
    expect(formatarResposta(pergunta("b2_concordou_avaliacao"), "concordei_em_parte"))
      .toBe("Concordei em parte");
  });

  /*
   * INVARIANTE 5 — a régua vai junto. Sem ela, um 6 da escala 1–7 (86%) e um 6
   * da 0–10 (60%) imprimem igual e leem como o mesmo resultado.
   */
  it("imprime a régua junto da escala", () => {
    expect(formatarResposta(pergunta("b2_facilidade"), 6)).toBe("6 de 7");
    expect(formatarResposta(pergunta("b2_conversa_real"), 6)).toBe("6 de 10");
    expect(formatarResposta(pergunta("b2_facilidade"), 6)).not.toBe("6");
  });

  it("formata duração e data em pt-BR", () => {
    expect(formatarResposta(pergunta("b0_duracao"), 45)).toBe("45 min");
    expect(formatarResposta(pergunta("b0_duracao"), 70)).toBe("1 h 10 min");
    expect(formatarResposta(pergunta("b0_duracao"), 120)).toBe("2 h");
    expect(formatarResposta(pergunta("b0_data"), "2026-08-28")).toBe("28/08/2026");
  });

  // Vazio, não travessão: a tela escreve "Não respondida" e o CSV quer célula
  // vazia. Molde do `formatAnswer` do lead.
  it("devolve string vazia quando não há resposta", () => {
    expect(formatarResposta(pergunta("b2_facilidade"), undefined)).toBe("");
  });

  it("não perde valor cujo id de opção sumiu do roteiro", () => {
    expect(formatarResposta(pergunta("b2_concordou_avaliacao"), "opcao_extinta"))
      .toBe("opcao_extinta");
  });
});

describe("limparDependentes", () => {
  it("remove a resposta cuja condição deixou de valer", () => {
    const limpo = limparDependentes(GESTOR, {
      b1_finalizou_chamada: "sim",
      b1_motivo_nao_finalizou: "desistiu",
      b2_facilidade: 5,
    });
    expect(limpo).toEqual({ b1_finalizou_chamada: "sim", b2_facilidade: 5 });
  });

  // A cadeia do Bloco 4 tem três níveis: usa dispositivo → qual → qual outro.
  // Uma passada só deixaria o neto pendurado.
  it("segue a cadeia até o neto", () => {
    const varejo = perguntasDoPerfil("vendedor", true);
    const limpo = limparDependentes(varejo, {
      b4_usa_dispositivo: "nao",
      b4_qual_dispositivo: "outro",
      b4_qual_dispositivo_outro: "balança",
    });
    expect(limpo).toEqual({ b4_usa_dispositivo: "nao" });
  });

  it("não mexe no que está satisfeito e não muta a entrada", () => {
    const entrada = {
      b1_finalizou_chamada: "nao",
      b1_motivo_nao_finalizou: "erro_tecnico",
    };
    expect(limparDependentes(GESTOR, entrada)).toEqual(entrada);
    expect(entrada.b1_motivo_nao_finalizou).toBe("erro_tecnico");
  });
});

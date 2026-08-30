import { describe, expect, it } from "vitest";
import {
  computeUsabilidadeDashboard,
  formatarMedia,
  formatarProporcao,
  podeRanquear,
  type AchadoDashboardRow,
  type EtapaFunil,
  type Media,
  type SessaoDashboardRow,
} from "./dashboard";
import { codigoSessao, estadoDoVinculo, prepararSessao } from "./sessao";
import { ROTEIRO_VERSAO } from "./roteiro";
import type { RespostasMap } from "./respostas";

let seq = 0;

function sessao(
  respostas: RespostasMap,
  overrides: Partial<SessaoDashboardRow> = {},
): SessaoDashboardRow {
  seq += 1;
  return {
    id: `s${seq}`,
    codigo: seq,
    perfil: "vendedor",
    fluxo: "chamada",
    varejo: false,
    realizado_em: "2026-08-28",
    respostas,
    ...overrides,
  };
}

function achado(overrides: Partial<AchadoDashboardRow> = {}): AchadoDashboardRow {
  seq += 1;
  return {
    id: `a${seq}`,
    sessao_id: "s1",
    resumo: "Não achou o botão de feedback",
    tipo: "atrito",
    severidade: "media",
    status: "aberto",
    categoria: null,
    fluxo: null,
    desafio_id: null,
    desafio_codigo: null,
    ...overrides,
  };
}

const semAchados: AchadoDashboardRow[] = [];

function medida(media: Media) {
  if (media.status !== "medido")
    throw new Error(`esperava média medida, veio "${media.status}"`);
  return media;
}

function etapaMedida(etapa: EtapaFunil) {
  if (etapa.status !== "medido")
    throw new Error(`esperava etapa medida, veio "${etapa.status}"`);
  return etapa;
}

function etapa(d: ReturnType<typeof computeUsabilidadeDashboard>, id: string) {
  const encontrada = d.funil.find((e) => e.perguntaId === id);
  if (!encontrada) throw new Error(`etapa inexistente: ${id}`);
  return encontrada;
}

describe("INVARIANTE 1 — o denominador é o conjunto aplicável", () => {
  /*
   * 10 sessões, 4 gestores, e os 4 criaram o roleplay sozinhos. "Criou o
   * roleplay" só existe para gestor: 4 de 4 é 100%. Dividir pelas 10 daria 40%,
   * e a etapa perfeita leria como a pior do funil.
   */
  it("etapa de gestor não divide pelas sessões de vendedor", () => {
    const gestores = Array.from({ length: 4 }, () =>
      sessao({ b1_criou_roleplay: "sozinho" }, { perfil: "gestor" }),
    );
    const vendedores = Array.from({ length: 6 }, () =>
      sessao({ b1_localizou_roleplay: "sozinho" }, { perfil: "vendedor" }),
    );
    const d = computeUsabilidadeDashboard({
      sessoes: [...gestores, ...vendedores],
      achados: semAchados,
    });

    const criou = etapaMedida(etapa(d, "b1_criou_roleplay"));
    expect(criou.deN).toBe(4);
    expect(criou.semAjudaPct).toBe(1);
    expect(criou.semAjudaPct).not.toBeCloseTo(0.4);
    expect(etapaMedida(etapa(d, "b1_localizou_roleplay")).deN).toBe(6);
  });

  /*
   * A outra metade do denominador é a DEPENDÊNCIA. "Se não, motivo" só se aplica
   * a quem não finalizou; contá-lo sobre todas as sessões faria "Desistiu: 20%"
   * onde o número real é 1 de 1.
   */
  it("pergunta dependente só conta quem satisfaz a condição", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [
        sessao({ b1_finalizou_chamada: "sim" }),
        sessao({ b1_finalizou_chamada: "sim" }),
        sessao({ b1_finalizou_chamada: "nao", b1_motivo_nao_finalizou: "desistiu" }),
      ],
      achados: semAchados,
    });

    const motivo = d.distribuicoes.b1_motivo_nao_finalizou;
    expect(motivo.deN).toBe(1);
    expect(motivo.respondidas).toBe(1);
    expect(motivo.baldes.find((b) => b.id === "desistiu")?.n).toBe(1);
  });

  it("Bloco 4 só conta sessões de varejo", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [
        sessao({ b4_treino_sem_cliente: "sim" }, { varejo: true }),
        sessao({}, { varejo: false }),
        sessao({}, { varejo: false }),
      ],
      achados: semAchados,
    });
    expect(d.distribuicoes.b4_treino_sem_cliente.deN).toBe(1);
  });
});

describe("INVARIANTE 2 — ausência é estado, nunca zero", () => {
  it("média sem resposta é sem_dados e não tem `media`", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [sessao({}), sessao({})],
      achados: semAchados,
    });
    const seq7 = d.medias.b2_facilidade;
    expect(seq7.status).toBe("sem_dados");
    expect(seq7).not.toHaveProperty("media");
    expect(formatarMedia(seq7)).toBe("—");
  });

  /*
   * Sem aplicáveis, a etapa não tem `pct` para ninguém coagir. Um `pct: 0` no
   * JSON exportado vira "ninguém conseguiu criar o roleplay" num visualizador
   * ingênuo, onde ninguém sequer tentou.
   */
  it("etapa sem aplicáveis é sem_dados e não tem `pct`", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [sessao({}, { perfil: "vendedor" })],
      achados: semAchados,
    });
    const criou = etapa(d, "b1_criou_roleplay");
    expect(criou.status).toBe("sem_dados");
    expect(criou.deN).toBe(0);
    expect(criou).not.toHaveProperty("semAjudaPct");
    expect(criou).not.toHaveProperty("concluiuPct");
  });

  it("aplicável sem resposta também é sem_dados, mas o deN sobrevive", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [sessao({}, { perfil: "gestor" }), sessao({}, { perfil: "gestor" })],
      achados: semAchados,
    });
    const criou = etapa(d, "b1_criou_roleplay");
    expect(criou.status).toBe("sem_dados");
    expect(criou.deN).toBe(2);
  });
});

describe("INVARIANTE 3 — três valores, duas taxas nomeadas", () => {
  /*
   * 3 Sozinho, 6 Com ajuda, 1 Não concluiu. "A taxa de sucesso" é 30% ou 90%
   * conforme o que se pergunta — e por isso não existe uma taxa anônima.
   */
  it("distingue 'sem ajuda' de 'concluiu'", () => {
    const sessoes = [
      ...Array.from({ length: 3 }, () => sessao({ b1_iniciou_chamada: "sozinho" })),
      ...Array.from({ length: 6 }, () => sessao({ b1_iniciou_chamada: "com_ajuda" })),
      sessao({ b1_iniciou_chamada: "nao_concluiu" }),
    ];
    const d = computeUsabilidadeDashboard({ sessoes, achados: semAchados });
    const iniciou = etapaMedida(etapa(d, "b1_iniciou_chamada"));

    expect(iniciou.semAjudaPct).toBeCloseTo(0.3);
    expect(iniciou.concluiuPct).toBeCloseTo(0.9);
    expect(iniciou.semAjuda).toBe(3);
    expect(iniciou.comAjuda).toBe(6);
    expect(iniciou.naoConcluiu).toBe(1);
    expect(iniciou).not.toHaveProperty("pct");
  });

  it("'Finalizou' é sim/não e não inventa 'com ajuda'", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [
        sessao({ b1_finalizou_chamada: "sim" }),
        sessao({ b1_finalizou_chamada: "nao" }),
      ],
      achados: semAchados,
    });
    const finalizou = etapaMedida(etapa(d, "b1_finalizou_chamada"));
    expect(finalizou.comAjuda).toBe(0);
    expect(finalizou.semAjudaPct).toBeCloseTo(0.5);
    expect(finalizou.concluiuPct).toBeCloseTo(0.5);
  });
});

describe("INVARIANTE 4 — n viaja e n pequeno não ranqueia", () => {
  it("a média divide por quem respondeu, não por quem se aplica", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [
        sessao({ b2_facilidade: 6 }),
        sessao({ b2_facilidade: 4 }),
        sessao({}),
      ],
      achados: semAchados,
    });
    const seq7 = medida(d.medias.b2_facilidade);
    expect(seq7.media).toBeCloseTo(5);
    expect(seq7.n).toBe(2);
    expect(seq7.deN).toBe(3);
    // Dividir pelas três daria 3,33 — a sessão que não respondeu entraria como
    // se tivesse respondido zero, num campo em que zero nem existe.
    expect(seq7.media).not.toBeCloseTo(3.33);
  });

  it("uma resposta não entra em ranking", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [sessao({ b2_conversa_real: 10 }), sessao({})],
      achados: semAchados,
    });
    const realismo = medida(d.medias.b2_conversa_real);
    expect(realismo.media).toBe(10);
    expect(realismo.n).toBe(1);
    expect(podeRanquear(realismo)).toBe(false);
  });

  it("três respostas já ranqueiam", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [
        sessao({ b2_conversa_real: 8 }),
        sessao({ b2_conversa_real: 7 }),
        sessao({ b2_conversa_real: 9 }),
      ],
      achados: semAchados,
    });
    expect(podeRanquear(d.medias.b2_conversa_real)).toBe(true);
  });
});

describe("INVARIANTE 5 — a régua vai junto", () => {
  it("formata a média com o máximo da escala", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [
        sessao({ b2_facilidade: 6, b2_conversa_real: 6 }),
        sessao({ b2_facilidade: 6, b2_conversa_real: 6 }),
      ],
      achados: semAchados,
    });
    expect(formatarMedia(d.medias.b2_facilidade)).toBe("6 de 7");
    expect(formatarMedia(d.medias.b2_conversa_real)).toBe("6 de 10");
    // O mesmo "6" em réguas diferentes é 86% e 60%. Sem a régua os dois
    // imprimiriam igual e leriam como o mesmo resultado.
    expect(formatarMedia(d.medias.b2_facilidade)).not.toBe(
      formatarMedia(d.medias.b2_conversa_real),
    );
  });

  it("duração não finge ter régua", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [sessao({ b0_duracao: 40 }), sessao({ b0_duracao: 50 })],
      achados: semAchados,
    });
    expect(formatarMedia(d.medias.b0_duracao)).toBe("45 min");
  });

  it("não existe nota geral entre réguas diferentes", () => {
    const d = computeUsabilidadeDashboard({ sessoes: [sessao({})], achados: semAchados });
    expect(d).not.toHaveProperty("scoreGeral");
    expect(d).not.toHaveProperty("notaGeral");
  });
});

describe("INVARIANTE 8 — a soma fecha", () => {
  /*
   * 10 sessões aplicáveis, 3 responderam "Concordei". Sem o balde "Não
   * respondeu", a distribuição diria "Concordei: 100%" ao lado de um KPI que
   * diz dez sessões.
   */
  it("o balde 'Não respondeu' fecha a soma com o aplicável", () => {
    const sessoes = [
      ...Array.from({ length: 3 }, () =>
        sessao({ b2_concordou_avaliacao: "concordei" }),
      ),
      ...Array.from({ length: 7 }, () => sessao({})),
    ];
    const d = computeUsabilidadeDashboard({ sessoes, achados: semAchados });
    const dist = d.distribuicoes.b2_concordou_avaliacao;

    expect(dist.deN).toBe(10);
    expect(dist.baldes.reduce((soma, balde) => soma + balde.n, 0)).toBe(10);
    expect(dist.baldes.at(-1)).toMatchObject({ label: "Não respondeu", n: 7 });
  });

  it("sem faltantes, o balde não nasce", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [sessao({ b2_ruido: "silencioso" })],
      achados: semAchados,
    });
    expect(
      d.distribuicoes.b2_ruido.baldes.some((b) => b.label === "Não respondeu"),
    ).toBe(false);
  });

  it("as fatias de perfil somam o total de sessões", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [
        sessao({}, { perfil: "gestor" }),
        sessao({}, { perfil: "vendedor" }),
        sessao({}, { perfil: "vendedor" }),
      ],
      achados: semAchados,
    });
    expect(d.porPerfil.reduce((soma, c) => soma + c.n, 0)).toBe(d.sessoes);
    expect(d.porFluxo.reduce((soma, c) => soma + c.n, 0)).toBe(d.sessoes);
  });
});

describe("achados", () => {
  it("conta sessões distintas, não achados", () => {
    // Dois achados da MESMA sessão sobre o mesmo desafio são um problema, não
    // dois — contá-los duas vezes inflaria a recorrência.
    const d = computeUsabilidadeDashboard({
      sessoes: [sessao({}), sessao({}), sessao({})],
      achados: [
        achado({ sessao_id: "sA", desafio_id: "d1", desafio_codigo: 14 }),
        achado({ sessao_id: "sA", desafio_id: "d1", desafio_codigo: 14 }),
        achado({ sessao_id: "sB", desafio_id: "d1", desafio_codigo: 14 }),
      ],
    });
    expect(d.achados.recorrentes).toHaveLength(1);
    expect(d.achados.recorrentes[0].sessoes).toBe(2);
    expect(d.achados.recorrentes[0].sessoes).not.toBe(3);
    expect(d.achados.recorrentes[0].deN).toBe(3);
  });

  it("uma sessão só não é recorrência", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [sessao({})],
      achados: [achado({ sessao_id: "sA", desafio_id: "d1", desafio_codigo: 14 })],
    });
    expect(d.achados.recorrentes).toHaveLength(0);
  });

  it("achado sem desafio não entra em recorrentes e conta no status", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [sessao({})],
      achados: [achado(), achado({ status: "descartado" })],
    });
    expect(d.achados.recorrentes).toHaveLength(0);
    expect(d.achados.porStatus).toEqual({
      aberto: 1,
      virou_desafio: 0,
      descartado: 1,
    });
  });

  it("o balde 'Sem categoria' fecha a soma com o total", () => {
    const d = computeUsabilidadeDashboard({
      sessoes: [sessao({})],
      achados: [
        achado({ categoria: { id: "c1", nome: "Navegação", cor: "#2E63CD" } }),
        achado(),
        achado(),
      ],
    });
    expect(d.achados.porCategoria.reduce((s, c) => s + c.n, 0)).toBe(3);
    expect(d.achados.porCategoria.at(-1)).toMatchObject({
      label: "Sem categoria",
      n: 2,
    });
  });
});

describe("formatarProporcao", () => {
  it("dá a contagem antes da porcentagem", () => {
    expect(formatarProporcao(5, 8)).toBe("5 de 8 (63%)");
    // 5/8 e 12/19 arredondam para o mesmo 63% — é a contagem que separa os dois.
    expect(formatarProporcao(12, 19)).toBe("12 de 19 (63%)");
  });

  it("sem denominador, travessão", () => {
    expect(formatarProporcao(0, 0)).toBe("—");
  });
});

describe("identidade e vínculo", () => {
  it("codigoSessao formata com prefixo próprio", () => {
    expect(codigoSessao(14)).toBe("TU-014");
    expect(codigoSessao(1400)).toBe("TU-1400");
  });

  /*
   * INVARIANTE 11 — três estados. Sem `desafio_codigo`, "nunca virou desafio" e
   * "virou DES-014 e o desafio foi excluído" seriam o mesmo `desafio_id: null`,
   * e a lista de achados pendentes regeneraria trabalho já feito.
   */
  it("distingue nunca-vinculado de desafio-excluído", () => {
    expect(estadoDoVinculo({ desafio_id: null, desafio_codigo: null })).toBe(
      "sem_desafio",
    );
    expect(estadoDoVinculo({ desafio_id: null, desafio_codigo: 14 })).toBe(
      "desafio_excluido",
    );
    expect(estadoDoVinculo({ desafio_id: "d1", desafio_codigo: 14 })).toBe(
      "vinculado",
    );
  });
});

describe("prepararSessao", () => {
  it("resolve perfil, promove as colunas e tira do jsonb", () => {
    const r = prepararSessao({
      b0_perfil: "gestor",
      b0_fluxo: "preparacao",
      b0_data: "2026-08-28",
      b0_varejo: "nao",
      b0_dispositivo: "notebook",
      b2_facilidade: 5,
    });
    if (!r.ok) throw new Error(r.error);

    expect(r.dados.perfil).toBe("gestor");
    expect(r.dados.fluxo).toBe("preparacao");
    expect(r.dados.realizado_em).toBe("2026-08-28");
    expect(r.dados.varejo).toBe(false);
    expect(r.dados.roteiro_versao).toBe(ROTEIRO_VERSAO);
    expect(r.dados.respostas).toEqual({ b0_dispositivo: "notebook", b2_facilidade: 5 });
    expect(r.dados.respostas).not.toHaveProperty("b0_perfil");
  });

  /*
   * Sem perfil não há roteiro, e sem roteiro a pergunta nº 9 do Bloco 2 é
   * indecidível. Recusar aqui é o que impede a resposta de cair na pergunta
   * errada lá na frente.
   */
  it("recusa sem perfil, antes de qualquer casamento", () => {
    const r = prepararSessao({ b0_fluxo: "chamada", b0_data: "2026-08-28" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.campo).toBe("b0_perfil");
  });

  it("recusa sem fluxo e sem data, com a frase em pt-BR", () => {
    const semFluxo = prepararSessao({ b0_perfil: "gestor", b0_data: "2026-08-28" });
    expect(semFluxo.ok).toBe(false);
    if (!semFluxo.ok) expect(semFluxo.error).toBe("Escolha o fluxo testado.");

    const semData = prepararSessao({ b0_perfil: "gestor", b0_fluxo: "chamada" });
    expect(semData.ok).toBe(false);
    if (!semData.ok) expect(semData.campo).toBe("b0_data");
  });

  it("gestor de varejo mantém o Bloco 4 e descarta dependência não satisfeita", () => {
    const r = prepararSessao({
      b0_perfil: "gestor",
      b0_fluxo: "configuracao",
      b0_data: "2026-08-28",
      b0_varejo: "sim",
      b4_usa_dispositivo: "sim",
      b4_qual_dispositivo: "tablet",
      b1_finalizou_chamada: "sim",
      b1_motivo_nao_finalizou: "desistiu",
    });
    if (!r.ok) throw new Error(r.error);

    expect(r.dados.varejo).toBe(true);
    expect(r.dados.respostas.b4_qual_dispositivo).toBe("tablet");
    expect(r.dados.respostas).not.toHaveProperty("b1_motivo_nao_finalizou");
    expect(r.avisos.map((a) => a.codigo)).toContain("dependencia_nao_satisfeita");
  });
});

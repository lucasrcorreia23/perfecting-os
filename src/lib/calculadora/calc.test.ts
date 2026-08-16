import { describe, expect, it } from "vitest";
import {
  calcResultadoTime,
  camposFaltando,
  cobertura,
  deltaConvMax,
  deltasEfetivos,
  fatorEscopoDeclarado,
  type PropostaEfetiva,
} from "@/lib/calculadora/calc";
import {
  CENARIOS,
  SLIDER_RAMPA_MAX,
  SLIDER_TICKET_MAX,
} from "@/lib/calculadora/constants";
import { entradasVazias } from "@/lib/calculadora/estado";
import { precoConta, rateioPorTime } from "@/lib/calculadora/preco";
import type { CampoId, CenarioSelecionado, EntradasTime } from "@/lib/calculadora/types";

// Caso de referência do §14 do V5 — verificação independente reproduzida
// integralmente. Qualquer divergência aqui é incidente de racional (R2).
// A proposta (Prática, 30 assentos) agora é escolhida pelo VISITANTE; o que
// muda é só a origem dos dados, nunca a matemática.
function entradasGolden(): EntradasTime {
  return {
    ...entradasVazias(),
    numVendedores: 30,
    numGestoresTreino: 3,
    horasTreinoGestorMes: 20,
    vendedoresPorGestorMes: 6,
    horasPraticaPorRepHoje: 1.5,
    receitaMensal: 900_000,
    ticketMedio: 15_000,
    conversaoPct: 25,
    margemFaixa: "25a35", // 30%
    salarioGestor: 12_000,
    rampaMeses: 4,
    contratacoesAno: 8,
    caminho: "gestores",
  };
}

const PROPOSTA_GOLDEN: PropostaEfetiva = { plano: "pratica", assentos: 30 };
const TIMES_GOLDEN = [{ id: "t1", ...PROPOSTA_GOLDEN }];

const CONSERVADOR: CenarioSelecionado = { modo: "preset", cenario: "conservador" };

function resultadoGolden() {
  const precoMes = rateioPorTime(TIMES_GOLDEN).get("t1")!;
  const resultado = calcResultadoTime(
    entradasGolden(),
    PROPOSTA_GOLDEN,
    precoMes,
    CONSERVADOR,
  );
  if (resultado.status !== "ok") throw new Error("golden deveria estar completo");
  return resultado;
}

describe("caso de referência §14 (golden)", () => {
  it("fecha o preço no piso: 120 h/mês → R$ 13.000/mês, R$ 156.000/ano", () => {
    const preco = precoConta(TIMES_GOLDEN);
    expect(preco.horasMes).toBe(120);
    expect(preco.bruto).toBeCloseTo(11_760, 4);
    expect(preco.pisoAplicado).toBe(true);
    expect(preco.mensal).toBe(13_000);
    expect(preco.anual).toBe(156_000);
  });

  it("fator de escopo declarado = 60 ÷ 27 = 2,222", () => {
    const fator = fatorEscopoDeclarado(entradasGolden());
    expect(fator.origem).toBe("declarado");
    expect(fator.valor).toBeCloseTo(60 / 27, 6);
    expect(fator.foraDaFaixa).toBe(false);
    expect(fator.treinoEmGrupo).toBe(false);
  });

  it("reproduz todas as parcelas e agregados do §14", () => {
    const r = resultadoGolden();
    expect(r.eficienciaAno).toBeCloseTo(56_700, 4);
    expect(r.tetoEficienciaAno).toBeCloseTo(252_000, 4);
    expect(r.parcelas.margemTicketAno).toBeCloseTo(162_000, 4);
    expect(r.parcelas.margemRampaAno).toBeCloseTo(40_320, 4);
    expect(r.parcelas.ganhoConversaoAno).toBeCloseTo(45_360, 4);
    expect(r.parcelas.ganhoCicloAno).toBeNull(); // funil não preenchido
    expect(r.valorAno).toBeCloseTo(304_380, 4);
    expect(r.G).toBeCloseTo(247_680, 4);
    expect(r.precoAno).toBe(156_000);
    expect(r.roi).toBeCloseTo(304_380 / 156_000, 6); // 1,951
    expect(r.paybackMeses).toBeCloseTo((156_000 / 304_380) * 12, 6); // 6,15
    expect(r.checagemRealidadePct).toBeCloseTo(7.644, 3); // 7,64% — sem alerta
    expect(r.checagemAlerta).toBe(false);
    expect(r.cobertura).toBe(1);
  });

  it("granularidade: R$ 19,70 de custo e R$ 38,43 de retorno por assento/dia", () => {
    const r = resultadoGolden();
    expect(r.granularidade.precoPorAssento).toBeCloseTo(13_000 / 30, 6);
    expect(r.granularidade.custoDiaPorVendedor).toBeCloseTo(19.7, 2);
    expect(r.granularidade.retornoDiaPorAssento).toBeCloseTo(38.43, 2);
    expect(r.granularidade.custoHoraRoleplayPerfecting).toBeCloseTo(13_000 / 120, 6);
  });

  it("invariante 12: retorno_dia ÷ custo_dia === roi", () => {
    const r = resultadoGolden();
    expect(
      r.granularidade.retornoDiaPorAssento / r.granularidade.custoDiaPorVendedor,
    ).toBeCloseTo(r.roi, 9);
  });

  it("ancoragem por hora de roleplay: gestor R$ 233/h vs Perfecting R$ 108/h", () => {
    const r = resultadoGolden();
    const ancoragem = r.linhasNaoSomadas.find((l) => l.id === "ancoragem_hora_roleplay")!;
    expect(ancoragem.valorAno).toBeNull(); // tabela comparativa, nunca somada
    expect(ancoragem.detalhe?.custoHoraGestor).toBeCloseTo(105 * (60 / 27), 2); // 233,33
    expect(ancoragem.detalhe?.custoHoraPerfecting).toBeCloseTo(13_000 / 120, 2); // 108,33
  });

  it("linhas dependentes do salário do vendedor viram travessão sem o campo", () => {
    const r = resultadoGolden(); // salarioVendedor é opcional e está vazio
    const rampaEvitada = r.linhasNaoSomadas.find((l) => l.id === "custo_rampa_evitado")!;
    const timeEmRampa = r.linhasNaoSomadas.find((l) => l.id === "custo_time_em_rampa")!;
    expect(rampaEvitada.valorAno).toBeNull();
    expect(timeEmRampa.valorAno).toBeNull();
  });

  it("com salário do vendedor, custo de rampa evitado usa Δrampa + haircut", () => {
    const entradas = { ...entradasGolden(), salarioVendedor: 6_000 };
    const r = calcResultadoTime(entradas, PROPOSTA_GOLDEN, 13_000, CONSERVADOR);
    if (r.status !== "ok") throw new Error("deveria estar completo");
    const rampaEvitada = r.linhasNaoSomadas.find((l) => l.id === "custo_rampa_evitado")!;
    // 4 × 0,20 × 6.000 × 1,75 × 8 × 0,7 = 47.040
    expect(rampaEvitada.valorAno).toBeCloseTo(47_040, 4);
    const timeEmRampa = r.linhasNaoSomadas.find((l) => l.id === "custo_time_em_rampa")!;
    // 6.000 × 1,75 × 4 × 8 = 336.000 (folha integral, sem haircut)
    expect(timeEmRampa.valorAno).toBeCloseTo(336_000, 4);
  });
});

describe("gating (§4.6) — quatro parcelas obrigatórias, nunca resultado parcial", () => {
  const OBRIGATORIOS: CampoId[] = [
    "numVendedores",
    "numGestoresTreino",
    "horasTreinoGestorMes",
    "vendedoresPorGestorMes",
    "horasPraticaPorRepHoje",
    "receitaMensal",
    "ticketMedio",
    "conversaoPct",
    "margemFaixa",
    "salarioGestor",
    "rampaMeses",
    "contratacoesAno",
    "caminho",
  ];

  it("tem exatamente 13 campos obrigatórios", () => {
    expect(OBRIGATORIOS).toHaveLength(13);
    expect(camposFaltando(entradasVazias())).toHaveLength(13);
  });

  for (const campo of OBRIGATORIOS) {
    it(`sem ${campo} → incompleto, com o campo listado`, () => {
      const entradas = { ...entradasGolden(), [campo]: null };
      const resultado = calcResultadoTime(entradas, PROPOSTA_GOLDEN, 13_000, CONSERVADOR);
      expect(resultado.status).toBe("incompleto");
      if (resultado.status === "incompleto") {
        expect(resultado.faltando).toEqual([campo]);
      }
    });
  }

  it("caminho externo exige o custo condicional", () => {
    const entradas: EntradasTime = { ...entradasGolden(), caminho: "externo" };
    expect(camposFaltando(entradas)).toEqual(["custoExternoAno"]);
    entradas.custoExternoAno = 80_000;
    expect(camposFaltando(entradas)).toEqual([]);
  });

  it("caminho evento exige o custo condicional", () => {
    const entradas: EntradasTime = { ...entradasGolden(), caminho: "evento" };
    expect(camposFaltando(entradas)).toEqual(["custoEventoAno"]);
  });

  it("valor fora do domínio conta como faltando (P6: nunca número indefensável)", () => {
    expect(camposFaltando({ ...entradasGolden(), conversaoPct: 0 })).toEqual([
      "conversaoPct",
    ]);
    expect(camposFaltando({ ...entradasGolden(), conversaoPct: 120 })).toEqual([
      "conversaoPct",
    ]);
    expect(camposFaltando({ ...entradasGolden(), numVendedores: 0 })).toEqual([
      "numVendedores",
    ]);
    expect(camposFaltando({ ...entradasGolden(), rampaMeses: -1 })).toEqual(["rampaMeses"]);
  });
});

describe("fator de escopo (§4.2)", () => {
  it("fora da faixa 0,25–6 cai na premissa 2,1 marcando a origem", () => {
    // 40 h de gestor para 200 h de prática entregue → 0,2 (< 0,25).
    const entradas = {
      ...entradasGolden(),
      horasTreinoGestorMes: 20,
      numGestoresTreino: 2,
      vendedoresPorGestorMes: 50,
      horasPraticaPorRepHoje: 2,
    };
    const fator = fatorEscopoDeclarado(entradas);
    expect(fator.origem).toBe("premissa");
    expect(fator.valor).toBe(2.1);
    expect(fator.foraDaFaixa).toBe(true);
    expect(fator.declarado).toBeCloseTo(0.2, 6);
  });

  it("acima de 6 também cai na premissa", () => {
    const entradas = {
      ...entradasGolden(),
      horasTreinoGestorMes: 70,
      vendedoresPorGestorMes: 2,
      horasPraticaPorRepHoje: 5,
    };
    // 210 h de gestor / 30 h entregues = 7.
    const fator = fatorEscopoDeclarado(entradas);
    expect(fator.origem).toBe("premissa");
    expect(fator.foraDaFaixa).toBe(true);
  });

  it("sem horas de prática entregues (0) usa a premissa sem marcar fora da faixa", () => {
    const entradas = { ...entradasGolden(), horasPraticaPorRepHoje: 0 };
    const fator = fatorEscopoDeclarado(entradas);
    expect(fator.origem).toBe("premissa");
    expect(fator.declarado).toBeNull();
    expect(fator.foraDaFaixa).toBe(false);
  });

  it("abaixo de 1 (treino em grupo) vale como declarado e gera a ressalva", () => {
    // 60 h de gestor / 90 h entregues = 0,667.
    const entradas = { ...entradasGolden(), horasPraticaPorRepHoje: 5 };
    const fator = fatorEscopoDeclarado(entradas);
    expect(fator.origem).toBe("declarado");
    expect(fator.treinoEmGrupo).toBe(true);
    const resultado = calcResultadoTime(entradas, PROPOSTA_GOLDEN, 13_000, CONSERVADOR);
    if (resultado.status !== "ok") throw new Error("deveria estar completo");
    expect(resultado.avisos.some((a) => a.tipo === "fator_treino_grupo")).toBe(true);
  });

  it("nos limites 0,25 e 6 o declarado vale", () => {
    // 15 h gestor / 60 h entregues = 0,25.
    const bordaBaixa = {
      ...entradasGolden(),
      horasTreinoGestorMes: 5,
      vendedoresPorGestorMes: 10,
      horasPraticaPorRepHoje: 2,
    };
    expect(fatorEscopoDeclarado(bordaBaixa).origem).toBe("declarado");
    // 180 h gestor / 30 h entregues = 6.
    const bordaAlta = {
      ...entradasGolden(),
      horasTreinoGestorMes: 60,
      vendedoresPorGestorMes: 2,
      horasPraticaPorRepHoje: 5,
    };
    expect(fatorEscopoDeclarado(bordaAlta).origem).toBe("declarado");
  });
});

describe("tetos e travas (§5)", () => {
  it("teto de eficiência: a economia nunca supera o valor da prática do plano", () => {
    const entradas: EntradasTime = {
      ...entradasGolden(),
      caminho: "externo",
      custoExternoAno: 10_000_000,
    };
    const r = calcResultadoTime(entradas, PROPOSTA_GOLDEN, 13_000, CONSERVADOR);
    if (r.status !== "ok") throw new Error("deveria estar completo");
    expect(r.eficienciaAno).toBeCloseTo(r.tetoEficienciaAno, 6);
  });

  it("caminho nenhum → eficiência zero; evento usa o percentual substituível [H]", () => {
    const nenhum = calcResultadoTime(
      { ...entradasGolden(), caminho: "nenhum" },
      PROPOSTA_GOLDEN,
      13_000,
      CONSERVADOR,
    );
    if (nenhum.status !== "ok") throw new Error("deveria estar completo");
    expect(nenhum.eficienciaAno).toBe(0);

    const evento = calcResultadoTime(
      { ...entradasGolden(), caminho: "evento", custoEventoAno: 100_000 },
      PROPOSTA_GOLDEN,
      13_000,
      CONSERVADOR,
    );
    if (evento.status !== "ok") throw new Error("deveria estar completo");
    expect(evento.eficienciaAno).toBeCloseTo(50_000, 4); // 100.000 × 0,5
  });

  it("teto de funil: sem oportunidade ociosa, encurtar o ciclo não gera receita", () => {
    // 240 oportunidades/mês chegam exatamente 240 leads → teto 0.
    const entradas = { ...entradasGolden(), cicloDias: 45, leadsMes: 240 };
    const r = calcResultadoTime(entradas, PROPOSTA_GOLDEN, 13_000, CONSERVADOR);
    if (r.status !== "ok") throw new Error("deveria estar completo");
    expect(r.parcelas.ganhoCicloAno).toBe(0);
  });

  it("com folga no funil, o ganho de ciclo entra com haircut e vira parte do G", () => {
    const entradas = { ...entradasGolden(), cicloDias: 45, leadsMes: 400 };
    const r = calcResultadoTime(entradas, PROPOSTA_GOLDEN, 13_000, CONSERVADOR);
    if (r.status !== "ok") throw new Error("deveria estar completo");
    // Conservador: 5% de 45 dias → 2 dias inteiros → Δciclo = 2/45.
    const dCiclo = 2 / 45;
    const ganhoCapacidade = 60 * (1 / (1 - dCiclo) - 1);
    const tetoFunil = (400 - 240) * 0.25; // 40 vendas de folga
    const esperado = Math.min(ganhoCapacidade, tetoFunil) * 15_000 * 0.3 * 12 * 0.7;
    expect(r.parcelas.ganhoCicloAno).toBeCloseTo(esperado, 4);
    expect(r.G).toBeCloseTo(247_680 + esperado, 4);
    expect(r.valorAno).toBeCloseTo(304_380 + esperado, 4);
  });

  it("Δconv_max = min(5 p.p., conversão × 0,4, 100 − conversão)", () => {
    expect(deltaConvMax(25)).toBe(5);
    expect(deltaConvMax(2)).toBeCloseTo(0.8, 6);
    expect(deltaConvMax(98)).toBeCloseTo(2, 6);
  });

  it("conversão baixa clampa o delta até de um preset", () => {
    const entradas = { ...entradasGolden(), conversaoPct: 2 };
    const deltas = deltasEfetivos({ modo: "preset", cenario: "otimista" }, entradas);
    expect(deltas.convPp).toBeCloseTo(0.8, 6); // e não os 3,5 p.p. do preset
  });
});

describe("deltas efetivos (cenários §4.8 + sliders do protótipo)", () => {
  it("preset conservador resolve os deltas exatos do V5", () => {
    const deltas = deltasEfetivos(CONSERVADOR, entradasGolden());
    expect(deltas).toEqual({ ticketPct: 0.05, rampaPct: 0.2, cicloDiasMenos: 0, convPp: 0.5 });
  });

  it("preset com ciclo derruba dias inteiros e deriva o percentual deles", () => {
    const entradas = { ...entradasGolden(), cicloDias: 45, leadsMes: 400 };
    expect(deltasEfetivos(CONSERVADOR, entradas).cicloDiasMenos).toBe(2); // 45 × 5% → 2
    expect(
      deltasEfetivos({ modo: "preset", cenario: "realista" }, entradas).cicloDiasMenos,
    ).toBe(7); // 45 × 15% → 6,75 → 7
  });

  it("sliders personalizados são clampados pelos tetos, nunca os relaxam", () => {
    const entradas = { ...entradasGolden(), cicloDias: 45, leadsMes: 400 };
    const deltas = deltasEfetivos(
      {
        modo: "personalizado",
        base: "conservador",
        deltas: { ticketPct: 0.9, rampaPct: 0.95, cicloDiasMenos: 40, convPp: 50 },
      },
      entradas,
    );
    expect(deltas.cicloDiasMenos).toBe(13); // floor(45 × 30%)
    expect(deltas.convPp).toBe(5); // Δconv_max
    // Ticket e rampa não têm teto próprio no §5: herdam o preset Otimista, e
    // herdam por derivação — o slider não pode passar do que o V5 documenta.
    expect(deltas.ticketPct).toBe(CENARIOS.otimista.ticketPct);
    expect(deltas.rampaPct).toBe(CENARIOS.otimista.rampaPct);
    expect(SLIDER_TICKET_MAX).toBe(CENARIOS.otimista.ticketPct);
    expect(SLIDER_RAMPA_MAX).toBe(CENARIOS.otimista.rampaPct);
  });

  it("nenhum preset ultrapassa a faixa dos sliders (§4.8 é o teto)", () => {
    for (const cenario of Object.values(CENARIOS)) {
      expect(cenario.ticketPct).toBeLessThanOrEqual(SLIDER_TICKET_MAX);
      expect(cenario.rampaPct).toBeLessThanOrEqual(SLIDER_RAMPA_MAX);
    }
  });

  it("valores negativos viram zero", () => {
    const deltas = deltasEfetivos(
      {
        modo: "personalizado",
        base: "conservador",
        deltas: { ticketPct: -0.1, rampaPct: -1, cicloDiasMenos: -5, convPp: -2 },
      },
      entradasGolden(),
    );
    expect(deltas).toEqual({ ticketPct: 0, rampaPct: 0, cicloDiasMenos: 0, convPp: 0 });
  });
});

describe("cobertura (§4.5) e monotonicidade", () => {
  it("cobertura = min(1, assentos ÷ vendedores)", () => {
    expect(cobertura(30, 30)).toBe(1);
    expect(cobertura(45, 30)).toBe(1);
    expect(cobertura(15, 30)).toBe(0.5);
  });

  it("comprar menos assentos NUNCA aumenta o ROI (trava permanente)", () => {
    let roiAnterior = -Infinity;
    for (let assentos = 1; assentos <= 30; assentos += 1) {
      const proposta: PropostaEfetiva = { plano: "pratica", assentos };
      const precoMes = rateioPorTime([{ id: "t1", ...proposta }]).get("t1")!;
      const r = calcResultadoTime(entradasGolden(), proposta, precoMes, CONSERVADOR);
      if (r.status !== "ok") throw new Error("deveria estar completo");
      expect(r.roi).toBeGreaterThanOrEqual(roiAnterior - 1e-9);
      roiAnterior = r.roi;
    }
  });
});

describe("avisos de coerência (§4.7)", () => {
  it("receita por vendedor fora de R$ 5 mil–1 milhão", () => {
    const entradas = { ...entradasGolden(), receitaMensal: 60_000 }; // 2 mil por vendedor
    const r = calcResultadoTime(entradas, PROPOSTA_GOLDEN, 13_000, CONSERVADOR);
    if (r.status !== "ok") throw new Error("deveria estar completo");
    expect(r.avisos.some((a) => a.tipo === "receita_por_vendedor")).toBe(true);
  });

  it("funil que fecha mais do que chega", () => {
    const entradas = { ...entradasGolden(), cicloDias: 45, leadsMes: 100 }; // 240 opp > 100 leads
    const r = calcResultadoTime(entradas, PROPOSTA_GOLDEN, 13_000, CONSERVADOR);
    if (r.status !== "ok") throw new Error("deveria estar completo");
    expect(r.avisos.some((a) => a.tipo === "funil_fecha_mais")).toBe(true);
  });

  it("passo 5 pela metade avisa e não calcula ciclo (os dois juntos ou nenhum)", () => {
    const entradas = { ...entradasGolden(), cicloDias: 45 }; // sem leadsMes
    const r = calcResultadoTime(entradas, PROPOSTA_GOLDEN, 13_000, CONSERVADOR);
    if (r.status !== "ok") throw new Error("deveria estar completo");
    expect(r.parcelas.ganhoCicloAno).toBeNull();
    expect(r.avisos.some((a) => a.tipo === "funil_incompleto")).toBe(true);
  });

  it("checagem de realidade alerta acima de 25% da margem anual", () => {
    // Receita menor com cenário otimista + funil folgado infla o G relativo.
    const entradas: EntradasTime = {
      ...entradasGolden(),
      receitaMensal: 200_000,
      contratacoesAno: 30,
      cicloDias: 45,
      leadsMes: 2_000,
    };
    const r = calcResultadoTime(entradas, PROPOSTA_GOLDEN, 13_000, {
      modo: "preset",
      cenario: "otimista",
    });
    if (r.status !== "ok") throw new Error("deveria estar completo");
    expect(r.checagemRealidadePct).toBeGreaterThan(25);
    expect(r.checagemAlerta).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { calcResultadoTime, type PropostaEfetiva } from "./calc";
import {
  COI_DELTA_ATTAINMENT,
  COI_FRACAO_COACHAVEL,
  COI_RAMPA_EXTENSAO_MESES,
  COI_RETENCAO_COM,
  COI_RETENCAO_SEM,
  COI_SEMANAS_ESPERA,
} from "./constants";
import { calcCoi } from "./coi";
import { entradasVazias } from "./estado";
import { formatBRL, formatMeses, formatX } from "./format";
import { TERMOS } from "./glossario";
import { precoConta, rateioPorTime } from "./preco";
import { REFERENCIA } from "./referencia";
import type { CenarioSelecionado, DimensaoCoiId, EntradasTime } from "./types";
import {
  REFERENCIAS_CITADAS,
  explicarAlavanca,
  explicarCoiTotal,
  explicarDimensaoCoi,
  explicarEficiencia,
  explicarInvestimentoMes,
  explicarPayback,
  explicarRoi,
  explicarValorAno,
  textoAcessivel,
  type AlavancaId,
  type ExplicacaoValor,
} from "./explicacoes";

// Esta suíte existe pelo mesmo motivo de `referencia.test.ts`: o balão de "de
// onde saiu este número" é lido como prova, e prova que envelhece em silêncio é
// pior do que nenhuma. Ela garante que (a) toda entrada aponta para uma entrada
// VIVA da referência de fórmulas, (b) todo termo citado existe no glossário,
// (c) os números da conta são os que o motor devolveu, e (d) o balão continua
// CURTO — a primeira versão foi reprovada por parede de texto, e um teto em
// teste é o que impede a prosa de voltar a crescer entrada por entrada.

const CONSERVADOR: CenarioSelecionado = { modo: "preset", cenario: "conservador" };

// Os dois goldens de `calc.test.ts`, um sem funil e outro com: é sobre eles que
// o motor está pinado, e a explicação não pode ter um caso próprio.
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
    margemPct: 30,
    salarioGestor: 12_000,
    salarioVendedor: 6_000,
    rampaMeses: 4,
    contratacoesAno: 8,
    caminho: "gestores",
  };
}

function entradasFiesc(): EntradasTime {
  return {
    ...entradasVazias(),
    numVendedores: 100,
    numGestoresTreino: 6,
    horasTreinoGestorMes: 20,
    vendedoresPorGestorMes: 17,
    horasPraticaPorRepHoje: 2,
    receitaMensal: 750_000,
    ticketMedio: 50_000,
    conversaoPct: 15,
    margemPct: 25,
    salarioGestor: 10_000,
    salarioVendedor: 8_000,
    rampaMeses: 4,
    contratacoesAno: 10,
    caminho: "gestores",
    cicloDias: 60,
    leadsMes: 120,
  };
}

const PROPOSTA_GOLDEN: PropostaEfetiva = { plano: "pratica", assentos: 30 };
const PROPOSTA_FIESC: PropostaEfetiva = { plano: "intensivo", assentos: 100 };

function caso(entradas: EntradasTime, proposta: PropostaEfetiva, prazoMeses = 3) {
  const times = [{ id: "t1", ...proposta }];
  const precoMes = rateioPorTime(times).get("t1")!;
  const resultado = calcResultadoTime(entradas, proposta, precoMes, CONSERVADOR, prazoMeses);
  if (resultado.status !== "ok") throw new Error("golden deveria estar completo");
  return {
    entradas,
    proposta,
    resultado,
    preco: precoConta(times, prazoMeses),
    prazoMeses,
    coi: calcCoi(entradas, resultado)!,
  };
}

const GOLDEN = caso(entradasGolden(), PROPOSTA_GOLDEN);
const FIESC = caso(entradasFiesc(), PROPOSTA_FIESC);
const CASOS = [
  ["§14", GOLDEN],
  ["FIESC", FIESC],
] as const;

const ALAVANCAS: AlavancaId[] = ["ticket", "rampa", "conversao", "ciclo"];

function alavancaDe(c: typeof GOLDEN, id: AlavancaId): ExplicacaoValor {
  const { resultado: r } = c;
  return explicarAlavanca({
    alavanca: id,
    entradas: c.entradas,
    cobertura: r.cobertura,
    deltas: r.deltas,
    parcelas: r.parcelas,
    tetoFunil: r.tetoFunil,
  });
}

/** As DEZ explicações da etapa, de um caso. Toda regra estrutural corre sobre
 *  esta lista, e é ela que impede uma entrada nova de nascer sem fonte. */
function todasAs(c: typeof GOLDEN): Record<string, ExplicacaoValor> {
  const { entradas, proposta, resultado: r, preco, prazoMeses, coi } = c;
  return {
    investimentoMes: explicarInvestimentoMes({ mensalidade: preco.mensal, preco }),
    investimentoMesRateado: explicarInvestimentoMes({
      mensalidade: r.precoMes,
      preco,
      rateado: true,
    }),
    valorAno: explicarValorAno({
      valorAno: r.valorAno,
      detalhe: { eficienciaAno: r.eficienciaAno, parcelas: r.parcelas },
    }),
    valorAnoConsolidado: explicarValorAno({ valorAno: r.valorAno, detalhe: null }),
    roi: explicarRoi({ valorAno: r.valorAno, precoAno: r.precoAno, roi: r.roi }),
    roiPonderado: explicarRoi({
      valorAno: r.valorAno,
      precoAno: r.precoAno,
      roi: r.roi,
      ponderado: true,
    }),
    payback: explicarPayback({
      precoAno: r.precoAno,
      valorAno: r.valorAno,
      paybackMeses: r.paybackMeses,
      prazoMeses,
    }),
    eficiencia: explicarEficiencia({ resultado: r, entradas, plano: proposta.plano }),
    coiTotal: explicarCoiTotal(coi),
    ...Object.fromEntries(ALAVANCAS.map((id) => [`alavanca:${id}`, alavancaDe(c, id)])),
    // As cinco dimensões, sempre — a tela só as renderiza onde há valor, mas o
    // módulo precisa devolver uma explicação correta para qualquer uma delas.
    ...Object.fromEntries(
      coi.dimensoes.map((d) => [
        `coi:${d.id}`,
        explicarDimensaoCoi({ id: d.id, valorAno: d.valorAno ?? 0, coi, entradas }),
      ]),
    ),
  };
}

describe("explicações — integridade estrutural", () => {
  it("todo id citado existe na referência de fórmulas", () => {
    const vivos = new Set(REFERENCIA.map((e) => e.id));
    for (const id of REFERENCIAS_CITADAS) {
      expect(vivos.has(id), `referencia.ts não tem a entrada "${id}"`).toBe(true);
    }
  });

  it.each(CASOS)("%s: toda explicação tem título, conta e fonte", (_, c) => {
    for (const [chave, expl] of Object.entries(todasAs(c))) {
      expect(expl.titulo.length, chave).toBeGreaterThan(0);
      expect(expl.conta.length, `${chave}: conta vazia`).toBeGreaterThan(0);
      for (const linha of expl.conta) {
        expect(linha.trim().length, `${chave}: linha vazia na conta`).toBeGreaterThan(0);
      }
      // Sem fonte o balão vira afirmação sem lastro, que é o oposto do que ele
      // existe para fazer. `fonteDe` devolve vazio quando o id não casa — é
      // assim que um id errado aparece aqui, e não na tela do visitante.
      expect(expl.fonte, `${chave}: sem fonte`).toMatch(/·\s[a-z-]+\.ts#\w+$/);
    }
  });

  it.each(CASOS)("%s: todo termo citado existe no glossário", (_, c) => {
    const ids = new Set(TERMOS.map((t) => t.id));
    for (const [chave, expl] of Object.entries(todasAs(c))) {
      if (!expl.termo) continue;
      expect(ids.has(expl.termo), `${chave} cita o termo inexistente`).toBe(true);
    }
  });

  it.each(CASOS)("%s: nenhuma conta vaza NaN, Infinity ou undefined", (_, c) => {
    for (const [chave, expl] of Object.entries(todasAs(c))) {
      const texto = [...expl.conta, expl.nota ?? ""].join(" ");
      expect(texto, chave).not.toMatch(/NaN|Infinity|undefined|\[object/);
    }
  });

  it.each(CASOS)("%s: o texto acessível carrega o que o balão mostra", (_, c) => {
    for (const [chave, expl] of Object.entries(todasAs(c))) {
      const texto = textoAcessivel(expl);
      expect(texto, chave).toContain(expl.titulo);
      expect(texto, chave).toContain(expl.conta[0]);
    }
  });
});

describe("explicações — o balão continua curto", () => {
  // A primeira versão (22/08/2026) foi reprovada por dois defeitos, e este bloco
  // guarda o segundo: o balão levava a conta, uma ressalva, o parágrafo inteiro
  // da referência, duas definições de glossário e a fonte — alto demais para
  // caber na janela, que é como o primeiro defeito (render fora do viewport)
  // aparecia na prática. Os tetos abaixo são o que impede a prosa de voltar a
  // crescer entrada por entrada, sem ninguém notar.
  it.each(CASOS)("%s: no máximo quatro linhas de conta", (_, c) => {
    for (const [chave, expl] of Object.entries(todasAs(c))) {
      expect(expl.conta.length, `${chave}: conta longa demais`).toBeLessThanOrEqual(4);
    }
  });

  it.each(CASOS)("%s: a nota é UMA frase curta", (_, c) => {
    for (const [chave, expl] of Object.entries(todasAs(c))) {
      if (!expl.nota) continue;
      expect(expl.nota.length, `${chave}: nota longa demais`).toBeLessThanOrEqual(160);
    }
  });

  // A definição do glossário só entra onde ACRESCENTA. Metade dos balões não
  // tem nenhuma, e é isso que impede o balão do ROI de definir "ROI" logo
  // abaixo da divisão que acabou de mostrar. O teste guarda a proporção: se
  // alguém voltar a pendurar um termo em cada entrada, a conta estoura.
  it.each(CASOS)("%s: no máximo metade dos balões carrega definição", (_, c) => {
    const todas = Object.values(todasAs(c));
    const comTermo = todas.filter((e) => e.termo).length;
    expect(comTermo).toBeLessThanOrEqual(Math.ceil(todas.length / 2));
  });
});

describe("explicações — os números são os do motor", () => {
  it.each(CASOS)("%s: o ROI fecha a divisão que a conta mostra", (_, c) => {
    const expl = explicarRoi({
      valorAno: c.resultado.valorAno,
      precoAno: c.resultado.precoAno,
      roi: c.resultado.roi,
    });
    const texto = expl.conta.join(" ");
    expect(texto).toContain(formatBRL(c.resultado.valorAno));
    expect(texto).toContain(formatBRL(c.resultado.precoAno));
    expect(texto).toContain(formatX(c.resultado.roi));
  });

  it.each(CASOS)("%s: o payback cita os meses e compara com o prazo", (_, c) => {
    const expl = explicarPayback({
      precoAno: c.resultado.precoAno,
      valorAno: c.resultado.valorAno,
      paybackMeses: c.resultado.paybackMeses,
      prazoMeses: c.prazoMeses,
    });
    expect(expl.conta.join(" ")).toContain(formatMeses(c.resultado.paybackMeses));
    expect(expl.nota).toContain(String(c.prazoMeses));
  });

  it.each(CASOS)("%s: o valor do ano fecha no total do motor", (_, c) => {
    const { resultado: r } = c;
    const texto = explicarValorAno({
      valorAno: r.valorAno,
      detalhe: { eficienciaAno: r.eficienciaAno, parcelas: r.parcelas },
    }).conta.join(" ");
    expect(texto).toContain(formatBRL(r.eficienciaAno));
    expect(texto).toContain(formatBRL(r.valorAno));
  });

  it.each(CASOS)("%s: a eficiência mostra o teto e o menor dos dois", (_, c) => {
    const texto = explicarEficiencia({
      resultado: c.resultado,
      entradas: c.entradas,
      plano: c.proposta.plano,
    }).conta.join(" ");
    expect(texto).toContain(formatBRL(c.resultado.tetoEficienciaAno));
    expect(texto).toContain(formatBRL(c.resultado.eficienciaAno));
  });

  it.each(CASOS)("%s: cada alavanca cita a própria parcela", (_, c) => {
    const { resultado: r } = c;
    const valores: Record<AlavancaId, number | null> = {
      ticket: r.parcelas.margemTicketAno,
      rampa: r.parcelas.margemRampaAno,
      conversao: r.parcelas.ganhoConversaoAno,
      ciclo: r.parcelas.ganhoCicloAno,
    };
    for (const id of ALAVANCAS) {
      const texto = alavancaDe(c, id).conta.join(" ");
      const valor = valores[id];
      if (valor === null) {
        // Sem funil a alavanca de ciclo não existe, e a explicação diz isso em
        // vez de inventar zero (invariante 8).
        expect(texto.toLowerCase(), id).toContain("fora da conta");
        expect(texto, id).not.toMatch(/R\$/);
      } else {
        expect(texto, id).toContain(formatBRL(valor));
      }
    }
  });

  it("só o ticket entra sem haircut", () => {
    // A assimetria é a coisa mais perguntada do bloco, e a única defesa contra
    // "vocês inflaram o número" é ela estar escrita em cada linha.
    for (const c of [GOLDEN, FIESC]) {
      expect(alavancaDe(c, "ticket").conta.join(" ")).not.toContain("haircut");
      for (const id of ["rampa", "conversao"] as AlavancaId[]) {
        expect(alavancaDe(c, id).conta.join(" "), id).toContain("haircut");
      }
    }
    // No ciclo só quando a parcela existe — sem funil não há multiplicação.
    expect(alavancaDe(FIESC, "ciclo").conta.join(" ")).toContain("haircut");
  });

  it.each(CASOS)("%s: o investimento abre a taxa do tier e a mensalidade", (_, c) => {
    const texto = explicarInvestimentoMes({
      mensalidade: c.preco.mensal,
      preco: c.preco,
    }).conta.join(" ");
    expect(texto).toContain(formatBRL(c.preco.tier.taxaHora));
    expect(texto).toContain(formatBRL(c.preco.mensal));
  });
});

describe("explicações — o custo da inação nunca se soma ao ROI", () => {
  // Invariante 1 do V5: contrafactual ⊻ atribuição. O balão do COI é justamente
  // onde a tentação de somar aparece, porque ele fica ao lado do valor anual.
  it.each(CASOS)("%s: a nota do COI diz que a lacuna não entra no ROI", (_, c) => {
    const expl = explicarCoiTotal(c.coi);
    expect(expl.nota?.toLowerCase()).toContain("não se soma ao roi");
    expect(expl.conta.join(" ")).toContain(formatBRL(c.coi.totalAno));
  });

  it.each(CASOS)("%s: a soma proibida não aparece em balão nenhum", (_, c) => {
    const soma = formatBRL(c.coi.totalAno + c.resultado.valorAno);
    for (const [chave, expl] of Object.entries(todasAs(c))) {
      expect(expl.conta.join(" "), chave).not.toContain(soma);
    }
  });
});

describe("explicações — as cinco dimensões do custo da inação", () => {
  // Elas voltaram em 22/08/2026, depois de terem saído na poda: a linha mostra
  // um rótulo e um valor, e entre os dois há uma cadeia de cinco a seis
  // fatores — dois deles constantes de benchmark que não aparecem em lugar
  // nenhum da tela do visitante.
  const IDS: DimensaoCoiId[] = [
    "subperformance",
    "rampa_estendida",
    "turnover",
    "no_decision",
    "fila",
  ];

  it.each(CASOS)("%s: cada dimensão fecha no valor que o motor devolveu", (_, c) => {
    for (const d of c.coi.dimensoes) {
      if (!d.valorAno) continue; // a tela não renderiza balão sem valor
      const texto = explicarDimensaoCoi({
        id: d.id,
        valorAno: d.valorAno,
        coi: c.coi,
        entradas: c.entradas,
      }).conta.join(" ");
      expect(texto, d.id).toContain(formatBRL(d.valorAno));
    }
  });

  it.each(CASOS)("%s: as cinco têm título próprio e fonte da aba do COI", (_, c) => {
    const titulos = new Set<string>();
    for (const id of IDS) {
      const expl = explicarDimensaoCoi({ id, valorAno: 1, coi: c.coi, entradas: c.entradas });
      expect(expl.fonte, id).toContain("Custo da Inação!");
      titulos.add(expl.titulo);
    }
    // Cinco títulos distintos: um rótulo repetido significaria que uma
    // dimensão está explicando a conta de outra.
    expect(titulos.size).toBe(IDS.length);
  });

  it.each(CASOS)("%s: cada dimensão cita a constante que a define", (_, c) => {
    // O que estas linhas têm de próprio são os benchmarks [H]. Se um deles se
    // soltar de `constants.ts`, o balão passa a afirmar um número que o motor
    // não usa — e é justamente ele que o leitor não tem como conferir sozinho.
    // Os valores são DERIVADOS da constante, no molde de `referencia.test.ts`:
    // escritos à mão, criariam um segundo lugar onde o benchmark mora.
    const pct = (v: number) =>
      `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
    const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

    // Cada um é EXCLUSIVO da sua dimensão: 50% (o haircut) aparece em quatro
    // delas e não distinguiria nada.
    const esperado: Record<DimensaoCoiId, string> = {
      subperformance: pct(COI_DELTA_ATTAINMENT),
      rampa_estendida: num(COI_RAMPA_EXTENSAO_MESES),
      turnover: pct(COI_RETENCAO_COM - COI_RETENCAO_SEM),
      no_decision: pct(COI_FRACAO_COACHAVEL),
      fila: `${num(COI_SEMANAS_ESPERA)} semanas`,
    };
    for (const id of IDS) {
      const expl = explicarDimensaoCoi({ id, valorAno: 1, coi: c.coi, entradas: c.entradas });
      expect(expl.conta.join(" "), id).toContain(esperado[id]);
    }
  });
});

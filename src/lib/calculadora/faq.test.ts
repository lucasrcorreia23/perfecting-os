import { describe, expect, it } from "vitest";
import { calcResultadoTime, type PropostaEfetiva } from "@/lib/calculadora/calc";
import { compararCenarios } from "@/lib/calculadora/cenarios-comparacao";
import { entradasVazias } from "@/lib/calculadora/estado";
import { GRUPOS, perguntasCfo, type FaqContexto } from "@/lib/calculadora/faq";
import { formatMeses } from "@/lib/calculadora/format";
import { precoConta, rateioPorTime } from "@/lib/calculadora/preco";
import type { EntradasTime } from "@/lib/calculadora/types";

// Mesmo caso FIESC dos goldens: se a copy citar um número, ele tem de ser o
// número que o motor produz. É o teste que impede o FAQ de virar peça de
// marketing com número próprio.
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
    rampaMeses: 4,
    contratacoesAno: 10,
    caminho: "gestores",
    cicloDias: 60,
    leadsMes: 120,
  };
}

const PROPOSTA: PropostaEfetiva = { plano: "intensivo", assentos: 100 };
const TIMES = [{ id: "t1", ...PROPOSTA }];

function contextoFiesc(prazoMeses = 3): FaqContexto {
  const preco = precoConta(TIMES, prazoMeses);
  const precoMes = rateioPorTime(TIMES).get("t1")!;
  const resultado = calcResultadoTime(
    entradasFiesc(),
    PROPOSTA,
    precoMes,
    { modo: "preset", cenario: "conservador" },
    prazoMeses,
  );
  if (resultado.status !== "ok") throw new Error("FIESC deveria estar completo");
  return {
    resultado,
    entradas: entradasFiesc(),
    proposta: PROPOSTA,
    preco,
    prazoMeses,
    comparacao: compararCenarios(entradasFiesc(), PROPOSTA, precoMes, prazoMeses),
    multiTime: false,
  };
}

// Caso §14: payback de 6,15 meses, o oposto do FIESC — serve para provar que
// o alerta de contrato some quando a conta fecha dentro do prazo.
function contextoGolden(prazoMeses: number): FaqContexto {
  const entradas: EntradasTime = {
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
    rampaMeses: 4,
    contratacoesAno: 8,
    caminho: "gestores",
  };
  const proposta: PropostaEfetiva = { plano: "pratica", assentos: 30 };
  const times = [{ id: "t1", ...proposta }];
  const precoMes = rateioPorTime(times).get("t1")!;
  const resultado = calcResultadoTime(
    entradas,
    proposta,
    precoMes,
    { modo: "preset", cenario: "conservador" },
    prazoMeses,
  );
  if (resultado.status !== "ok") throw new Error("golden deveria estar completo");
  return {
    resultado,
    entradas,
    proposta,
    preco: precoConta(times, prazoMeses),
    prazoMeses,
    comparacao: compararCenarios(entradas, proposta, precoMes, prazoMeses),
    multiTime: false,
  };
}

function contextoVazio(): FaqContexto {
  return {
    resultado: null,
    entradas: entradasVazias(),
    proposta: null,
    preco: precoConta([], 3),
    prazoMeses: 3,
    comparacao: null,
    multiTime: false,
  };
}

// `toLocaleString("pt-BR")` separa "R$" do número com espaço não-quebrável;
// normalizar aqui deixa as asserções legíveis.
function normalizar(texto: string): string {
  return texto.replace(/ /g, " ");
}

function textoDe(perguntas: ReturnType<typeof perguntasCfo>, id: string): string {
  const item = perguntas.find((p) => p.id === id);
  if (!item) throw new Error(`objeção ${id} não existe`);
  return normalizar(item.paragrafos.join(" "));
}

describe("FAQ de CFO", () => {
  it("distribui as perguntas pelas três frentes, sem grupo vazio nem órfã", () => {
    const perguntas = perguntasCfo(contextoFiesc());
    const grupos = Object.keys(GRUPOS) as (keyof typeof GRUPOS)[];
    for (const grupo of grupos) {
      const doGrupo = perguntas.filter((p) => p.grupo === grupo);
      // Grupo vazio renderiza um cabeçalho sem conteúdo abaixo.
      expect(doGrupo.length).toBeGreaterThan(0);
    }
    // Toda pergunta cai num grupo conhecido — senão some da tela agrupada.
    for (const p of perguntas) expect(grupos).toContain(p.grupo);
  });

  it("cobre as doze dúvidas, cada uma com pergunta e resposta", () => {
    const perguntas = perguntasCfo(contextoFiesc());
    expect(perguntas).toHaveLength(12);
    expect(new Set(perguntas.map((p) => p.id)).size).toBe(12);
    for (const item of perguntas) {
      expect(item.pergunta.length).toBeGreaterThan(10);
      // Pergunta de quem lê, não objeção encenada: termina em interrogação.
      expect(item.pergunta.trimEnd().endsWith("?")).toBe(true);
      expect(item.paragrafos.length).toBeGreaterThanOrEqual(2);
      for (const paragrafo of item.paragrafos) {
        expect(paragrafo).not.toContain("—,"); // travessão colado em pontuação
        expect(paragrafo.trim()).not.toBe("");
      }
    }
  });

  it("cita a checagem de realidade do próprio cálculo", () => {
    // 11,48% no caso FIESC, contra o limite de 25%.
    expect(textoDe(perguntasCfo(contextoFiesc()), "inflado")).toContain("11,5%");
    expect(textoDe(perguntasCfo(contextoFiesc()), "inflado")).toContain("25%");
  });

  it("decompõe o valor com as parcelas reais", () => {
    const texto = textoDe(perguntasCfo(contextoFiesc()), "soft-savings");
    expect(texto).toContain("R$ 94.500"); // eficiência
    expect(texto).toContain("R$ 112.500"); // ticket
    expect(texto).toContain("R$ 52.500"); // conversão
  });

  it("usa o payback real dos três cenários, não o do cenário ativo", () => {
    const ctx = contextoFiesc();
    const texto = textoDe(perguntasCfo(ctx), "payback");
    // Conservador bate com o Excel; realista e otimista divergem da planilha
    // de propósito, porque lá o ganho de ciclo não era recalculado por
    // cenário (o quirk `=C19`). Os números vêm da comparação, não do texto.
    expect(texto).toContain("27,4 meses");
    for (const linha of ctx.comparacao!) {
      expect(texto).toContain(formatMeses(linha.paybackMeses));
    }
    const paybacks = ctx.comparacao!.map((l) => l.paybackMeses);
    expect(new Set(paybacks.map((p) => p.toFixed(4))).size).toBe(3);
  });

  it("avisa quando o payback passa do prazo, e cala quando não passa", () => {
    // FIESC leva 27,4 meses para se pagar: passa de qualquer prazo ofertado.
    expect(textoDe(perguntasCfo(contextoFiesc(3)), "payback")).toContain(
      "termina antes de a conta se pagar",
    );
    expect(textoDe(perguntasCfo(contextoFiesc(24)), "payback")).toContain(
      "termina antes de a conta se pagar",
    );
    // Já o caso §14 se paga em 6,15 meses: com prazo de 12, nada a alertar.
    const texto = textoDe(perguntasCfo(contextoGolden(12)), "payback");
    expect(texto).not.toContain("termina antes de a conta se pagar");
    expect(texto).toContain("cabe dentro do contrato");
  });

  it("mostra a cobertura real na objeção de adoção", () => {
    const texto = textoDe(perguntasCfo(contextoFiesc()), "adocao");
    expect(texto).toContain("100 assentos");
    expect(texto).toContain("100%"); // cobertura cheia
  });

  it("calcula a exposição total do contrato pelo prazo escolhido", () => {
    // 67.068 × 3 = 201.204
    expect(textoDe(perguntasCfo(contextoFiesc(3)), "contrato")).toContain("R$ 201.204");
    // 67.068 × 24 = 1.609.632
    expect(textoDe(perguntasCfo(contextoFiesc(24)), "contrato")).toContain(
      "R$ 1.609.632",
    );
  });

  // O guia de objeções cita desconto por prazo, contrato de 18 meses e um
  // plano "Enterprise" — nada disso existe neste motor. Copiar aquele texto
  // daria ao CFO um número que a tela ao lado desmente.
  it("não promete nada que o motor não faz", () => {
    const tudo = perguntasCfo(contextoFiesc())
      .flatMap((p) => [p.pergunta, ...p.paragrafos])
      .join(" ")
      .toLowerCase();
    // Prazo não compra desconto: a única menção legítima a "desconto" é o
    // haircut anti-otimismo e a negativa explícita sobre prazo.
    expect(tudo).toContain("não compra desconto");
    expect(tudo).not.toMatch(/desconto de \d+% (para|no|em) contrato/);
    expect(tudo).not.toContain("18 meses");
    expect(tudo).not.toContain("enterprise");
    expect(tudo).not.toContain("801");
    // O haircut vale para três alavancas, não quatro: o ticket entra inteiro.
    expect(tudo).not.toContain("quatro das cinco");
    expect(tudo).toContain("rampa, conversão e ciclo");
    // Os prazos ofertados são 3/6/12/24, e só o de 24 sobe o nível de serviço.
    expect(tudo).toContain("vinte e quatro travam o preço");
  });

  it("sem resultado, responde sem número em vez de número parcial", () => {
    const perguntas = perguntasCfo(contextoVazio());
    expect(perguntas).toHaveLength(12);
    const tudo = perguntas.flatMap((p) => p.paragrafos).join(" ");
    // O travessão de prosa é legítimo; o de campo vazio (formatador sem
    // valor) nunca deve escapar para o texto, nem NaN, nem zero indevido.
    expect(tudo).not.toMatch(/R\$\s*—/);
    expect(tudo).not.toMatch(/—\s*(meses|mês|h\/mês|\/ano|%)/);
    expect(tudo).not.toContain("NaN");
    expect(tudo).not.toContain("R$ 0");
    expect(tudo).not.toContain("Infinity");
  });

  it("nenhuma resposta some quando o time está incompleto", () => {
    const vazio = perguntasCfo(contextoVazio());
    const cheio = perguntasCfo(contextoFiesc());
    expect(vazio.map((p) => p.id)).toEqual(cheio.map((p) => p.id));
  });
});

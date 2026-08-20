import { describe, expect, it } from "vitest";
import { horasGestorDevolvidas, metasCase } from "@/lib/calculadora/business-case";
import { calcResultadoTime, type PropostaEfetiva } from "@/lib/calculadora/calc";
import {
  CASE_ADOCAO_PCT,
  CASE_CSAT_MIN,
  CASE_JANELA_DIAS,
  CASE_JANELA_MESES,
  CENARIOS,
  HAIRCUT,
} from "@/lib/calculadora/constants";
import { entradasVazias } from "@/lib/calculadora/estado";
import { rateioPorTime } from "@/lib/calculadora/preco";
import type { CenarioSelecionado, EntradasTime } from "@/lib/calculadora/types";

// Mesmo caso de referência do §14 usado em `calc.test.ts`: as metas do case
// são releitura dos números do golden, então elas se conferem contra ele.
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
    rampaMeses: 4,
    contratacoesAno: 8,
    caminho: "gestores",
  };
}

const PROPOSTA: PropostaEfetiva = { plano: "pratica", assentos: 30 };
const CONSERVADOR: CenarioSelecionado = { modo: "preset", cenario: "conservador" };

function resultadoGolden() {
  const precoMes = rateioPorTime([{ id: "t1", ...PROPOSTA }]).get("t1")!;
  return calcResultadoTime(entradasGolden(), PROPOSTA, precoMes, CONSERVADOR);
}

describe("metas do case de sucesso", () => {
  it("time incompleto não tem metas — nunca meta pela metade", () => {
    const incompleto = calcResultadoTime(
      entradasVazias(),
      PROPOSTA,
      13_000,
      CONSERVADOR,
    );
    expect(metasCase(incompleto, entradasVazias(), "pratica", 30)).toBeNull();
  });

  it("a rampa da meta herda o haircut do cenário, não o delta cru", () => {
    const metas = metasCase(resultadoGolden(), entradasGolden(), "pratica", 30)!;
    // Conservador: +20% de encurtamento, com haircut 0,7 ⇒ 14% efetivos.
    const deltaEfetivo = CENARIOS.conservador.rampaPct * HAIRCUT;
    expect(metas.rampaDeMeses).toBe(4);
    expect(metas.rampaParaMeses).toBeCloseTo(4 * (1 - deltaEfetivo), 10);
    // A meta é sempre mais curta que a rampa de hoje, e nunca negativa.
    expect(metas.rampaParaMeses).toBeLessThan(metas.rampaDeMeses);
    expect(metas.rampaParaMeses).toBeGreaterThan(0);
  });

  it("as horas de gestor devolvidas travam no que hoje se gasta treinando", () => {
    // Golden: 3 gestores × 20 h = 60 h/mês na agenda. O teto do plano é
    // 30 assentos × 4 h × fator 2,222… × 0,75 = 200 h — folgado, então quem
    // manda é a agenda.
    const resultado = resultadoGolden();
    if (resultado.status !== "ok") throw new Error("golden deveria estar completo");
    const gestor = horasGestorDevolvidas(
      entradasGolden(),
      "pratica",
      30,
      resultado.fatorEscopo.valor,
    );
    expect(gestor.horas).toBe(60);
    expect(gestor.limitadoPeloPlano).toBe(false);
  });

  it("um plano pequeno demais limita as horas devolvidas, e diz que foi ele", () => {
    const resultado = resultadoGolden();
    if (resultado.status !== "ok") throw new Error("golden deveria estar completo");
    // 2 assentos de plano Leve entregam 2 × 2 × 2,222… × 0,75 = 6,67 h — bem
    // abaixo das 60 h de agenda.
    const gestor = horasGestorDevolvidas(
      entradasGolden(),
      "essencial",
      2,
      resultado.fatorEscopo.valor,
    );
    expect(gestor.horas).toBeLessThan(60);
    expect(gestor.limitadoPeloPlano).toBe(true);
  });

  it("nunca devolve hora negativa", () => {
    const semTreino = { ...entradasGolden(), horasTreinoGestorMes: 0 };
    const gestor = horasGestorDevolvidas(semTreino, "pratica", 30, 2.2);
    expect(gestor.horas).toBe(0);
  });

  it("adoção, CSAT e janela saem das constantes, não de literais na tela", () => {
    const metas = metasCase(resultadoGolden(), entradasGolden(), "pratica", 30)!;
    expect(metas.adocaoPct).toBe(CASE_ADOCAO_PCT);
    expect(metas.csatMin).toBe(CASE_CSAT_MIN);
    expect(metas.janelaMeses).toBe(CASE_JANELA_MESES);
    expect(metas.janelaDias).toBe(CASE_JANELA_DIAS);
    expect(metas.assentos).toBe(30);
  });

  it("ler as metas não mexe no ROI (invariante 4, mesmo molde da trajetória)", () => {
    const antes = resultadoGolden();
    if (antes.status !== "ok") throw new Error("golden deveria estar completo");
    const roi = antes.roi;
    const payback = antes.paybackMeses;
    const valor = antes.valorAno;
    metasCase(antes, entradasGolden(), "pratica", 30);
    expect(antes.roi).toBe(roi);
    expect(antes.paybackMeses).toBe(payback);
    expect(antes.valorAno).toBe(valor);
  });
});

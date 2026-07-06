import { describe, expect, it } from "vitest";
import { STAGE_ORDER } from "@/lib/constants";
import {
  METHODOLOGY,
  PROGRAM_TOTAL_DAYS,
  stageSchedule,
  weekRangeLabel,
  weekRangeShortLabel,
} from "@/lib/methodology";

describe("METHODOLOGY", () => {
  it("tem os 21 passos da planilha, em ordem 1..21", () => {
    expect(METHODOLOGY).toHaveLength(21);
    METHODOLOGY.forEach((step, index) => {
      expect(step.order).toBe(index + 1);
    });
  });

  it("Dias totais é a soma corrente dos Prazos", () => {
    let acc = 0;
    for (const step of METHODOLOGY) {
      acc += step.durationDays;
      expect(step.cumulativeDays).toBe(acc);
    }
    expect(PROGRAM_TOTAL_DAYS).toBe(50);
  });

  it("etapas seguem a ordem do workflow e semanas nunca voltam", () => {
    let lastStageIdx = 0;
    let lastWeek = 1;
    for (const step of METHODOLOGY) {
      const stageIdx = STAGE_ORDER.indexOf(step.stage);
      expect(stageIdx).toBeGreaterThanOrEqual(lastStageIdx);
      expect(step.week).toBeGreaterThanOrEqual(lastWeek);
      lastStageIdx = stageIdx;
      lastWeek = step.week;
    }
    expect(lastWeek).toBe(8);
  });

  it("aponta os passos atuais de Engenho, Suri e RD", () => {
    // Status pedidos: Engenho #4, Suri #7, RD #15 (ver seed.sql).
    expect(METHODOLOGY[3]).toMatchObject({
      stage: "diagnosticar",
      activity: "Criação das trilhas e apresentação",
      responsavel: "perfecting",
    });
    expect(METHODOLOGY[6]).toMatchObject({
      stage: "priorizar",
      activity: "Testes de roleplay e feedbacks",
      responsavel: "cliente",
    });
    expect(METHODOLOGY[14]).toMatchObject({
      stage: "executar",
      activity: "Confecção do relatório de resultados (semana 2)",
      responsavel: "perfecting",
    });
  });
});

describe("stageSchedule", () => {
  it("agrega janela de semanas e contagem por etapa", () => {
    expect(stageSchedule("diagnosticar")).toEqual({
      weekFrom: 1,
      weekTo: 2,
      count: 5,
    });
    expect(stageSchedule("executar")).toEqual({
      weekFrom: 4,
      weekTo: 7,
      count: 8,
    });
    expect(stageSchedule("medir")).toEqual({
      weekFrom: 7,
      weekTo: 8,
      count: 3,
    });
  });

  it("cobre todas as etapas do workflow", () => {
    for (const stage of STAGE_ORDER) {
      expect(stageSchedule(stage)).not.toBeNull();
    }
  });
});

describe("weekRangeLabel", () => {
  it("singular e intervalo", () => {
    expect(weekRangeLabel(2, 2)).toBe("Semana 2");
    expect(weekRangeLabel(4, 7)).toBe("Semanas 4–7");
  });
});

describe("weekRangeShortLabel", () => {
  it("singular e intervalo, abreviados", () => {
    expect(weekRangeShortLabel(2, 2)).toBe("S2");
    expect(weekRangeShortLabel(4, 7)).toBe("S4-7");
  });
});

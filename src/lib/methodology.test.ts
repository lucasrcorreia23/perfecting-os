import { describe, expect, it } from "vitest";
import {
  ATIVIDADE_TIPOS,
  CANAIS,
  RESPONSAVEIS,
  STAGE_ORDER,
  type WorkflowStage,
} from "@/lib/constants";
import {
  METHODOLOGY,
  PROGRAM_TOTAL_DAYS,
  parseSubatividades,
  seedSubatividades,
  stageSchedule,
  stageSteps,
  subatividadesToJson,
  weekRangeLabel,
  weekRangeShortLabel,
  type Subatividade,
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

  it("todo passo tem cat único no formato N.N e canal válido", () => {
    const cats = new Set<string>();
    for (const step of METHODOLOGY) {
      expect(step.cat).toMatch(/^\d+\.\d+$/);
      expect(cats.has(step.cat)).toBe(false);
      cats.add(step.cat);
      expect(step.canal in CANAIS).toBe(true);
    }
  });

  it("tem as 53 subatividades da planilha, na distribuição por etapa", () => {
    const subsByStage: Record<WorkflowStage, number> = {
      diagnosticar: 8,
      priorizar: 6,
      construir: 5,
      calibrar: 4,
      executar: 20,
      medir: 10,
    };
    for (const stage of STAGE_ORDER) {
      const count = stageSteps(stage).reduce(
        (sum, step) => sum + step.subatividades.length,
        0,
      );
      expect(count).toBe(subsByStage[stage]);
    }
    const total = METHODOLOGY.reduce(
      (sum, step) => sum + step.subatividades.length,
      0,
    );
    expect(total).toBe(53);
  });

  it("subatividades têm code prefixado pelo cat do pai e enums válidos", () => {
    for (const step of METHODOLOGY) {
      step.subatividades.forEach((sub, index) => {
        expect(sub.code).toBe(`${step.cat}.${index + 1}`);
        expect(sub.title.length).toBeGreaterThan(0);
        expect(sub.responsavel in RESPONSAVEIS).toBe(true);
        expect(sub.tipo in ATIVIDADE_TIPOS).toBe(true);
        expect(sub.canal in CANAIS).toBe(true);
      });
    }
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

describe("stageSteps", () => {
  it("retorna os passos da etapa na ordem do programa", () => {
    const steps = stageSteps("diagnosticar");
    expect(steps.map((step) => step.order)).toEqual([1, 2, 3, 4, 5]);
    expect(steps.every((step) => step.stage === "diagnosticar")).toBe(true);
  });

  it("bate com a contagem de stageSchedule para cada etapa", () => {
    for (const stage of STAGE_ORDER) {
      expect(stageSteps(stage)).toHaveLength(stageSchedule(stage)!.count);
    }
  });

  it("cobre todos os 21 passos somando as etapas", () => {
    const total = STAGE_ORDER.reduce(
      (sum, stage) => sum + stageSteps(stage).length,
      0,
    );
    expect(total).toBe(METHODOLOGY.length);
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

describe("parseSubatividades", () => {
  it("formato legado string[] vira sub sem metadados, não feita", () => {
    expect(parseSubatividades(["Enviar e-mail", "Conferir aceite"])).toEqual([
      {
        code: "",
        title: "Enviar e-mail",
        responsavel: null,
        tipo: null,
        canal: null,
        done: false,
      },
      {
        code: "",
        title: "Conferir aceite",
        responsavel: null,
        tipo: null,
        canal: null,
        done: false,
      },
    ]);
  });

  it("formato novo passa intacto", () => {
    const sub: Subatividade = {
      code: "1.3.1",
      title: "Envio dos formulários",
      responsavel: "perfecting",
      tipo: "assincrono",
      canal: "whatsapp",
      done: true,
    };
    expect(parseSubatividades([{ ...sub }])).toEqual([sub]);
  });

  it("enums inválidos viram null e done é coagido com === true", () => {
    const [sub] = parseSubatividades([
      {
        code: 12,
        title: "Sub",
        responsavel: "gerente",
        tipo: "hibrido",
        canal: "telefone",
        done: "true",
      },
    ]);
    expect(sub).toEqual({
      code: "",
      title: "Sub",
      responsavel: null,
      tipo: null,
      canal: null,
      done: false,
    });
  });

  it("descarta itens sem title e conteúdo fora do formato", () => {
    expect(
      parseSubatividades([42, null, { done: true }, ["x"], { title: "Ok" }]),
    ).toEqual([
      {
        code: "",
        title: "Ok",
        responsavel: null,
        tipo: null,
        canal: null,
        done: false,
      },
    ]);
  });

  it("retorna [] para não-array", () => {
    expect(parseSubatividades(null)).toEqual([]);
    expect(parseSubatividades("[]")).toEqual([]);
    expect(parseSubatividades({ title: "x" })).toEqual([]);
  });

  it("ida e volta: subatividadesToJson(parse(x)) preserva o conteúdo", () => {
    const subs = parseSubatividades(["Legado"]);
    expect(parseSubatividades(subatividadesToJson(subs))).toEqual(subs);
  });
});

describe("seedSubatividades", () => {
  it("templates canônicos viram subs persistidas com done=false", () => {
    const json = seedSubatividades(METHODOLOGY[0].subatividades);
    const subs = parseSubatividades(json);
    expect(subs).toHaveLength(2);
    expect(subs[0]).toMatchObject({
      code: "1.1.1",
      responsavel: "perfecting",
      canal: "email",
      done: false,
    });
  });
});

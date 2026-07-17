import { describe, expect, it } from "vitest";
import {
  computePocDashboard,
  type PocDashboardActivity,
} from "@/lib/poc-dashboard";

function activity(
  overrides: Partial<PocDashboardActivity> = {},
): PocDashboardActivity {
  return {
    stage: "diagnosticar",
    status: "pendente",
    responsavel: null,
    tipo: null,
    criticidade: null,
    duration_days: null,
    ...overrides,
  };
}

const CREATED_AT = "2026-06-01T00:00:00Z";

describe("computePocDashboard", () => {
  it("calcula % de conclusão e progresso por etapa", () => {
    const dashboard = computePocDashboard({
      activities: [
        activity({ status: "concluida", duration_days: 1 }),
        activity({ status: "pendente", duration_days: 2 }),
        activity({ stage: "priorizar", status: "concluida", duration_days: 6 }),
        activity({ stage: "priorizar", status: "concluida" }),
      ],
      createdAt: CREATED_AT,
      now: new Date("2026-06-11T00:00:00Z"),
    });

    expect(dashboard.totalActivities).toBe(4);
    expect(dashboard.completionPct).toBe(0.75);
    expect(dashboard.byStage[0]).toEqual({
      stage: "diagnosticar",
      total: 2,
      done: 1,
      durationDays: 3,
      pct: 0.5,
    });
    expect(dashboard.byStage[1]).toEqual({
      stage: "priorizar",
      total: 2,
      done: 2,
      durationDays: 6,
      pct: 1,
    });
    // Etapas sem atividades vêm zeradas, na ordem do workflow.
    expect(dashboard.byStage).toHaveLength(6);
    expect(dashboard.byStage[2]).toMatchObject({
      stage: "construir",
      total: 0,
      pct: 0,
    });
  });

  it("% do cronograma decorrido usa o now injetado e satura em 1", () => {
    const activities = [activity()];
    const onDay10 = computePocDashboard({
      activities,
      createdAt: CREATED_AT,
      now: new Date("2026-06-11T00:00:00Z"),
    });
    expect(onDay10.elapsedDays).toBe(10);
    expect(onDay10.totalDays).toBe(50);
    expect(onDay10.schedulePct).toBeCloseTo(0.2);

    const past = computePocDashboard({
      activities,
      createdAt: CREATED_AT,
      now: new Date("2026-09-01T00:00:00Z"),
    });
    expect(past.schedulePct).toBe(1);

    const before = computePocDashboard({
      activities,
      createdAt: CREATED_AT,
      now: new Date("2026-05-01T00:00:00Z"),
    });
    expect(before.elapsedDays).toBe(0);
  });

  it("quebra por status inclui bloqueada", () => {
    const dashboard = computePocDashboard({
      activities: [
        activity({ status: "pendente" }),
        activity({ status: "em_andamento" }),
        activity({ status: "bloqueada" }),
        activity({ status: "bloqueada" }),
        activity({ status: "concluida" }),
      ],
      createdAt: CREATED_AT,
    });
    expect(dashboard.statusBreakdown).toEqual({
      pendente: 1,
      em_andamento: 1,
      bloqueada: 2,
      concluida: 1,
    });
  });

  it("gargalos: bloqueadas, dependem do cliente e criticidade alta (abertas)", () => {
    const dashboard = computePocDashboard({
      activities: [
        activity({ status: "bloqueada", responsavel: "cliente" }),
        activity({ status: "pendente", responsavel: "ambos" }),
        // Concluídas não contam como gargalo.
        activity({ status: "concluida", responsavel: "cliente" }),
        activity({ status: "concluida", criticidade: "alta" }),
        activity({ status: "em_andamento", criticidade: "alta" }),
        activity({ status: "pendente", responsavel: "perfecting" }),
      ],
      createdAt: CREATED_AT,
    });
    expect(dashboard.bottlenecks).toEqual({
      blocked: 1,
      waitingOnClient: 2,
      highCriticality: 1,
    });
  });

  it("coordenação: síncronas/assíncronas e responsáveis", () => {
    const dashboard = computePocDashboard({
      activities: [
        activity({ tipo: "sincrono", responsavel: "ambos" }),
        activity({ tipo: "assincrono", responsavel: "perfecting" }),
        activity({ tipo: "assincrono", responsavel: "cliente" }),
        activity({ tipo: null, responsavel: null }),
      ],
      createdAt: CREATED_AT,
    });
    expect(dashboard.coordination).toEqual({
      sincronas: 1,
      assincronas: 2,
      soPerfecting: 1,
      soCliente: 1,
      conjuntas: 1,
    });
  });

  it("lista vazia não divide por zero", () => {
    const dashboard = computePocDashboard({
      activities: [],
      createdAt: CREATED_AT,
    });
    expect(dashboard.completionPct).toBe(0);
    expect(dashboard.totalActivities).toBe(0);
    expect(dashboard.byStage.every((stage) => stage.pct === 0)).toBe(true);
  });
});

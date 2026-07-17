import { describe, expect, it } from "vitest";
import { computeKpis } from "@/lib/kpis";

function kpisFor(activities: { status: string; due_date: string | null }[]) {
  return computeKpis({
    clients: [],
    activities,
    events: [],
    stageDeadlineDays: 25,
  });
}

function byLabel(
  kpis: ReturnType<typeof computeKpis>,
  label: string,
) {
  const kpi = kpis.find((item) => item.label === label);
  if (!kpi) throw new Error(`KPI "${label}" não encontrado`);
  return kpi;
}

describe("computeKpis", () => {
  const activities = [
    { status: "pendente", due_date: null },
    { status: "em_andamento", due_date: null },
    { status: "bloqueada", due_date: null },
    { status: "bloqueada", due_date: "2000-01-01" },
    { status: "concluida", due_date: "2000-01-01" },
  ];

  it("conta atividades bloqueadas com tendência indisponível", () => {
    const kpi = byLabel(kpisFor(activities), "Atividades bloqueadas");
    expect(kpi.value).toBe(2);
    expect(kpi.goodDirection).toBe("down");
    expect(kpi.direction).toBe("flat");
    expect(kpi.trendLabel).toBe("—");
  });

  it("atividades em aberto incluem as bloqueadas", () => {
    const kpi = byLabel(kpisFor(activities), "Atividades em aberto");
    expect(kpi.value).toBe(4);
  });

  it("atividades atrasadas ignoram concluídas mas contam bloqueadas vencidas", () => {
    const kpi = byLabel(kpisFor(activities), "Atividades atrasadas");
    expect(kpi.value).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { cardStats, type BoardActivity, type BoardClient } from "./client-card";

function activity(overrides: Partial<BoardActivity> & { id: string }): BoardActivity {
  return {
    canal: null,
    cat: null,
    client_id: "client-1",
    created_at: "2026-01-01T00:00:00Z",
    criticidade: null,
    cumulative_days: null,
    depends_on_cat: null,
    description: null,
    due_date: null,
    duration_days: null,
    modelo_mensagem: null,
    parallel_with_cat: null,
    position: 0,
    responsavel: null,
    setor_responsavel: null,
    stage: "construir",
    status: "pendente",
    subatividades: null,
    tipo: null,
    title: "Tarefa",
    updated_at: "2026-01-01T00:00:00Z",
    week: null,
    assignee_id: null,
    assignee: null,
    ...overrides,
  };
}

function client(activities: BoardActivity[]): BoardClient {
  return {
    id: "client-1",
    name: "Cliente",
    company: null,
    email: null,
    notes: null,
    phone: null,
    created_at: "2026-01-01T00:00:00Z",
    created_by: null,
    updated_at: "2026-01-01T00:00:00Z",
    stage: "construir",
    stage_entered_at: "2026-01-01T00:00:00Z",
    status: "ativo",
    activities,
    client_files: [],
  };
}

describe("cardStats", () => {
  it("current é a primeira atividade em andamento da etapa, por position", () => {
    const activities = [
      activity({ id: "1", status: "concluida", position: 0 }),
      activity({ id: "2", status: "em_andamento", position: 2 }),
      activity({ id: "3", status: "em_andamento", position: 1 }),
      activity({ id: "4", status: "pendente", position: 3 }),
    ];
    const { current, done, total } = cardStats(client(activities));
    expect(current?.id).toBe("3");
    expect(done).toBe(1);
    expect(total).toBe(4);
  });

  it("current é nulo quando não há atividade em andamento na etapa", () => {
    const activities = [
      activity({ id: "1", status: "pendente" }),
      activity({ id: "2", status: "concluida" }),
    ];
    const { current } = cardStats(client(activities));
    expect(current).toBeNull();
  });

  it("ignora atividades de etapas diferentes da atual do cliente", () => {
    const activities = [
      activity({ id: "1", stage: "diagnosticar", status: "em_andamento" }),
      activity({ id: "2", stage: "construir", status: "em_andamento" }),
    ];
    const { current, total } = cardStats(client(activities));
    expect(total).toBe(1);
    expect(current?.id).toBe("2");
  });

  it("bloqueada conta em blocked, não em done, e não vira current", () => {
    const activities = [
      activity({ id: "1", status: "bloqueada", position: 0 }),
      activity({ id: "2", status: "concluida", position: 1 }),
      activity({ id: "3", status: "pendente", position: 2 }),
    ];
    const { blocked, done, current, total } = cardStats(client(activities));
    expect(blocked).toBe(1);
    expect(done).toBe(1);
    expect(current).toBeNull();
    expect(total).toBe(3);
  });

  it("blocked é zero sem atividades bloqueadas", () => {
    const activities = [
      activity({ id: "1", status: "pendente" }),
      activity({ id: "2", status: "em_andamento" }),
    ];
    expect(cardStats(client(activities)).blocked).toBe(0);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dateInputToISO,
  dateTimeInputToISO,
  daysSince,
  formatBytes,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  isOverdue,
  toDateInputValue,
  toDateTimeInputValue,
  todayISO,
} from "@/lib/format";

describe("formatDate", () => {
  it("formata data DATE (YYYY-MM-DD) sem voltar um dia em UTC−3", () => {
    // Interpretada como UTC, "2026-06-12" viraria 11/jun em São Paulo.
    expect(formatDate("2026-06-12")).toBe("12 jun 2026");
  });

  it("aceita um objeto Date", () => {
    expect(formatDate(new Date(2026, 0, 5, 12))).toBe("5 jan 2026");
  });
});

describe("formatDateTime", () => {
  it("formata data e hora em pt-BR", () => {
    expect(formatDateTime("2026-07-05T14:32:00Z")).toBe("5 jul 2026, 11:32");
  });
});

describe("isOverdue", () => {
  beforeEach(() => {
    // Horário fixo ao meio-dia UTC (09h em São Paulo) para não cair na janela
    // 21h–00h SP em que "ontem" em UTC ainda é "hoje" em São Paulo.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("é falso quando não há data", () => {
    expect(isOverdue(null)).toBe(false);
  });

  it("compara a due_date com hoje por string", () => {
    const hoje = todayISO();
    const ontem = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    expect(isOverdue(ontem)).toBe(true);
    expect(isOverdue(hoje)).toBe(false);
    expect(isOverdue(amanha)).toBe(false);
  });
});

describe("toDateInputValue / dateInputToISO", () => {
  it("converte timestamp → YYYY-MM-DD em São Paulo e volta sem perder o dia", () => {
    expect(toDateInputValue("2026-06-12T02:00:00Z")).toBe("2026-06-11");
    expect(toDateInputValue(dateInputToISO("2026-06-12"))).toBe("2026-06-12");
  });
});

describe("formatBytes", () => {
  it("mostra travessão para nulo ou zero", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(0)).toBe("—");
  });

  it("escala para a unidade apropriada com vírgula pt-BR", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1_572_864)).toBe("1,5 MB");
  });
});

describe("tempo relativo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formatRelativeTime cobre as faixas de agora a dias", () => {
    const agora = new Date("2026-07-05T12:00:00Z").toISOString();
    const min5 = new Date("2026-07-05T11:55:00Z").toISOString();
    const h3 = new Date("2026-07-05T09:00:00Z").toISOString();
    const dia1 = new Date("2026-07-04T12:00:00Z").toISOString();
    const dias3 = new Date("2026-07-02T12:00:00Z").toISOString();

    expect(formatRelativeTime(agora)).toBe("agora");
    expect(formatRelativeTime(min5)).toBe("há 5 min");
    expect(formatRelativeTime(h3)).toBe("há 3 h");
    expect(formatRelativeTime(dia1)).toBe("há 1 dia");
    expect(formatRelativeTime(dias3)).toBe("há 3 dias");
  });

  it("daysSince nunca é negativo", () => {
    const futuro = new Date("2026-07-10T12:00:00Z").toISOString();
    const passado = new Date("2026-07-01T12:00:00Z").toISOString();
    expect(daysSince(futuro)).toBe(0);
    expect(daysSince(passado)).toBe(4);
  });
});

describe("toDateTimeInputValue / dateTimeInputToISO", () => {
  it("converte timestamp para o relógio de parede de São Paulo (UTC−3)", () => {
    expect(toDateTimeInputValue("2026-08-04T18:00:00Z")).toBe("2026-08-04T15:00");
  });

  it("volta o relógio de parede para UTC, sem o clássico erro de 3 horas", () => {
    expect(dateTimeInputToISO("2026-08-04T15:00")).toBe("2026-08-04T18:00:00.000Z");
  });

  it("faz a ida e a volta sem perder o valor", () => {
    const iso = "2026-12-31T02:30:00.000Z";
    expect(dateTimeInputToISO(toDateTimeInputValue(iso))).toBe(iso);
  });

  it("meia-noite em São Paulo vira 03:00 UTC do mesmo dia", () => {
    expect(dateTimeInputToISO("2026-08-04T00:00")).toBe("2026-08-04T03:00:00.000Z");
    expect(toDateTimeInputValue("2026-08-04T03:00:00Z")).toBe("2026-08-04T00:00");
  });

  it("aceita o valor com segundos que alguns browsers enviam", () => {
    expect(dateTimeInputToISO("2026-08-04T15:00:00")).toBe("2026-08-04T18:00:00.000Z");
  });
});

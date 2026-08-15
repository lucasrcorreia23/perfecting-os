const TIME_ZONE = "America/Sao_Paulo";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const inputDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const inputDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// "12 de jun. de 2026" → "12 jun 2026"
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? parseDate(value) : value;
  return dateFormatter
    .format(date)
    .replaceAll(" de ", " ")
    .replaceAll(".", "");
}

// "12 de jun. de 2026, 14:32" → "12 jun 2026, 14:32"
export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? parseDate(value) : value;
  return dateTimeFormatter
    .format(date)
    .replaceAll(" de ", " ")
    .replaceAll(".", "");
}

// Datas DATE (YYYY-MM-DD) não podem virar new Date(str) direto:
// seriam interpretadas como UTC e voltariam um dia em UTC−3.
function parseDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
  }
  return new Date(value);
}

// Data de hoje (YYYY-MM-DD) em São Paulo — para comparar com due_date por string.
export function todayISO(): string {
  return inputDateFormatter.format(new Date());
}

// Timestamp → "YYYY-MM-DD" em São Paulo, para preencher <input type="date">.
export function toDateInputValue(iso: string): string {
  return inputDateFormatter.format(new Date(iso));
}

// "YYYY-MM-DD" de <input type="date"> → timestamp ISO (meio-dia local, mesma
// convenção de parseDate, evita o dia voltar por causa do fuso UTC).
export function dateInputToISO(value: string): string {
  return parseDate(value).toISOString();
}

// Timestamp → "YYYY-MM-DDTHH:mm" em São Paulo, para <input type="datetime-local">.
export function toDateTimeInputValue(iso: string): string {
  const parts = dateTimePartsInSaoPaulo(new Date(iso));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// "YYYY-MM-DDTHH:mm" de <input type="datetime-local"> → timestamp ISO.
// O input é um relógio de parede ingênuo: sem converter explicitamente de
// São Paulo para UTC, um agendamento sai 3 h adiantado/atrasado.
export function dateTimeInputToISO(value: string): string {
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00`
    : value;
  const asIfUtc = Date.parse(`${normalized}Z`);
  if (Number.isNaN(asIfUtc)) return new Date(value).toISOString();
  // Duas passadas: a primeira estima o deslocamento, a segunda o confirma no
  // instante correto (o Brasil não tem mais horário de verão, mas sai de graça).
  let instant = asIfUtc - saoPauloOffsetMs(new Date(asIfUtc));
  instant = asIfUtc - saoPauloOffsetMs(new Date(instant));
  return new Date(instant).toISOString();
}

function dateTimePartsInSaoPaulo(date: Date) {
  const parts = inputDateTimeFormatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  // en-CA com hour12:false pode devolver "24" à meia-noite em alguns runtimes.
  const hour = pick("hour") === "24" ? "00" : pick("hour");
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour,
    minute: pick("minute"),
  };
}

// Quanto o relógio de parede de São Paulo difere do UTC naquele instante.
function saoPauloOffsetMs(date: Date): number {
  const p = dateTimePartsInSaoPaulo(date);
  const wallClock = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
  return wallClock - date.getTime();
}

export function isOverdue(dueDate: string | null): boolean {
  return dueDate !== null && dueDate < todayISO();
}

// "há 2 h", "há 5 min", "há 3 dias"; além de ~30 dias exibe a data.
export function formatRelativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "há 1 dia";
  if (days <= 30) return `há ${days} dias`;
  return formatDate(iso);
}

export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function daysSince(iso: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000),
  );
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${units[exponent]}`;
}

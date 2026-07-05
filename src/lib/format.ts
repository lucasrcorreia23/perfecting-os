const TIME_ZONE = "America/Sao_Paulo";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

// "12 de jun. de 2026" → "12 jun 2026"
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? parseDate(value) : value;
  return dateFormatter
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
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

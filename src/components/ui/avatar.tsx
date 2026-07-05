const FONT_SIZE: Record<number, string> = {
  24: "text-[10px]",
  32: "text-xs",
  48: "text-base",
  64: "text-xl",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 32,
}: {
  name: string;
  src?: string | null;
  size?: 24 | 32 | 48 | 64;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL do Supabase Storage depende de env; evita acoplar images.remotePatterns
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full bg-slate-100 font-medium text-slate-600 ${FONT_SIZE[size]}`}
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}

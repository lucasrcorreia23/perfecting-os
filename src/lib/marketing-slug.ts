// Slugs de posts e funis. O formato é validado também no banco pelos checks
// marketing_posts_slug_format / marketing_funnels_slug_format.

const MAX_SLUG_LENGTH = 80;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, ""); // o corte pode ter deixado um hífen solto no fim
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

// Acrescenta -2, -3… até escapar dos slugs já usados.
export function uniqueSlug(base: string, taken: string[]): string {
  const slug = slugify(base);
  if (!slug) return "";
  const used = new Set(taken);
  if (!used.has(slug)) return slug;
  let suffix = 2;
  while (used.has(`${slug}-${suffix}`)) suffix += 1;
  return `${slug}-${suffix}`;
}

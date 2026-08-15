// Janela deslizante pura sobre um Map injetado pelo chamador.
//
// Limitação honesta: o Map vive na memória da instância. Em serverless ele some
// no cold start e não é compartilhado entre lambdas — segura enxurrada ingênua,
// não ataque distribuído. A defesa que atravessa instâncias é o throttle por
// ip_hash no banco (índice marketing_leads_throttle_idx).

export type HitBucket = Map<string, number[]>;

export type RateLimitOptions = { limit: number; windowMs: number };

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function hitAllowed(
  bucket: HitBucket,
  key: string,
  now: number,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const cutoff = now - windowMs;
  const recent = (bucket.get(key) ?? []).filter((timestamp) => timestamp > cutoff);

  if (recent.length >= limit) {
    bucket.set(key, recent);
    const oldest = recent[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  recent.push(now);
  bucket.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

// Evita o Map crescer sem limite num processo de vida longa.
export function pruneBucket(bucket: HitBucket, now: number, windowMs: number): void {
  const cutoff = now - windowMs;
  for (const [key, timestamps] of bucket) {
    const recent = timestamps.filter((timestamp) => timestamp > cutoff);
    if (recent.length === 0) bucket.delete(key);
    else bucket.set(key, recent);
  }
}

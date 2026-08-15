import { describe, expect, it } from "vitest";
import { hitAllowed, pruneBucket, type HitBucket } from "@/lib/api/rate-limit";

const OPTIONS = { limit: 3, windowMs: 60_000 };

describe("hitAllowed", () => {
  it("libera até o limite e bloqueia a partir dele", () => {
    const bucket: HitBucket = new Map();
    expect(hitAllowed(bucket, "ip", 1000, OPTIONS).allowed).toBe(true);
    expect(hitAllowed(bucket, "ip", 1100, OPTIONS).allowed).toBe(true);
    expect(hitAllowed(bucket, "ip", 1200, OPTIONS).allowed).toBe(true);
    expect(hitAllowed(bucket, "ip", 1300, OPTIONS).allowed).toBe(false);
  });

  it("informa em quantos segundos vale tentar de novo", () => {
    const bucket: HitBucket = new Map();
    for (let i = 0; i < 3; i += 1) hitAllowed(bucket, "ip", 1000, OPTIONS);
    const result = hitAllowed(bucket, "ip", 1000, OPTIONS);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(60);
  });

  it("a janela desliza: eventos antigos saem da conta", () => {
    const bucket: HitBucket = new Map();
    for (let i = 0; i < 3; i += 1) hitAllowed(bucket, "ip", 1000, OPTIONS);
    // Um registro expira ao completar a janela, não depois dela.
    expect(hitAllowed(bucket, "ip", 1000 + 59_999, OPTIONS).allowed).toBe(false);
    expect(hitAllowed(bucket, "ip", 1000 + 60_000, OPTIONS).allowed).toBe(true);
  });

  it("chaves diferentes têm contagens independentes", () => {
    const bucket: HitBucket = new Map();
    for (let i = 0; i < 3; i += 1) hitAllowed(bucket, "a", 1000, OPTIONS);
    expect(hitAllowed(bucket, "a", 1000, OPTIONS).allowed).toBe(false);
    expect(hitAllowed(bucket, "b", 1000, OPTIONS).allowed).toBe(true);
  });

  it("limite zero bloqueia tudo", () => {
    const bucket: HitBucket = new Map();
    expect(hitAllowed(bucket, "ip", 1000, { limit: 0, windowMs: 1000 }).allowed).toBe(
      false,
    );
  });
});

describe("pruneBucket", () => {
  it("remove chaves cujos registros expiraram", () => {
    const bucket: HitBucket = new Map();
    hitAllowed(bucket, "antiga", 1000, OPTIONS);
    hitAllowed(bucket, "nova", 100_000, OPTIONS);
    pruneBucket(bucket, 120_000, OPTIONS.windowMs);
    expect(bucket.has("antiga")).toBe(false);
    expect(bucket.has("nova")).toBe(true);
  });
});

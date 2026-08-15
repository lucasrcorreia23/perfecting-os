import type { NextRequest } from "next/server";
import { authorizeSubmit, clientIp, hashIp } from "@/lib/api/auth";
import { corsHeaders, preflight } from "@/lib/api/cors";
import {
  countRecentLeadsByIp,
  fetchFunnelVersion,
  insertLead,
} from "@/lib/api/marketing-queries";
import { hitAllowed, pruneBucket, type HitBucket } from "@/lib/api/rate-limit";
import { apiError, apiOk } from "@/lib/api/responses";
import type { Json } from "@/lib/database.types";
import { isMarketingApiConfigured } from "@/lib/env";
import {
  leadFieldsFrom,
  scoreSubmission,
  validateAnswers,
} from "@/lib/marketing-answers";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

// Camada 3 da defesa: por instância, some no cold start e não é compartilhada
// entre lambdas. Segura enxurrada ingênua; o throttle no banco (camada 4) é
// quem atravessa instâncias.
const MEMORY_BUCKET: HitBucket = new Map();
const MEMORY_LIMIT = { limit: 5, windowMs: 60_000 };

// Throttle no banco: teto por IP na última hora.
const DB_LIMIT = 20;
const DB_WINDOW_MS = 60 * 60 * 1000;

// Humano não preenche o campo escondido nem responde em menos de 1,5 s.
const MIN_ELAPSED_MS = 1500;

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function POST(request: NextRequest, context: Context) {
  const headers = corsHeaders(request.headers.get("origin"));

  try {
    if (!isMarketingApiConfigured()) {
      return apiError("service_unavailable", { headers });
    }

    const auth = authorizeSubmit(request);
    if (!auth.ok) return apiError(auth.reason, { headers });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("invalid_body", { headers });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return apiError("invalid_body", { headers });
    }
    const payload = body as Record<string, unknown>;

    const version = Number(payload.version);
    if (!Number.isInteger(version) || version < 1) {
      return apiError("invalid_body", {
        message: 'Informe a "version" do formulário recebida no GET do funil.',
        field: "version",
        headers,
      });
    }

    const { slug } = await context.params;
    const record = await fetchFunnelVersion(slug, version);
    if (record === undefined) return apiError("service_unavailable", { headers });
    if (record === null) return apiError("not_found", { headers });
    if (record === "version_mismatch") {
      return apiError("version_mismatch", { headers });
    }

    // Anti-bot: resposta de sucesso sem gravar nada. O bot não recebe sinal
    // para calibrar a próxima tentativa.
    const honeypot = typeof payload.hp === "string" ? payload.hp.trim() : "";
    const elapsed = Number(payload.elapsed_ms);
    const tooFast = Number.isFinite(elapsed) && elapsed < MIN_ELAPSED_MS;
    if (honeypot !== "" || tooFast) {
      return apiOk(
        {
          id: null,
          success_message: record.successMessage,
          redirect_url: record.redirectUrl,
        },
        { status: 201, headers },
      );
    }

    const ipHash = hashIp(clientIp(request));
    const now = Date.now();

    if (ipHash) {
      pruneBucket(MEMORY_BUCKET, now, MEMORY_LIMIT.windowMs);
      const memory = hitAllowed(MEMORY_BUCKET, ipHash, now, MEMORY_LIMIT);
      if (!memory.allowed) {
        return apiError("rate_limited", {
          headers: {
            ...headers,
            "Retry-After": String(memory.retryAfterSeconds),
          },
        });
      }

      const recent = await countRecentLeadsByIp(
        ipHash,
        new Date(now - DB_WINDOW_MS).toISOString(),
      );
      if (recent >= DB_LIMIT) {
        return apiError("rate_limited", {
          headers: { ...headers, "Retry-After": "3600" },
        });
      }
    }

    const validated = validateAnswers(record.questions, payload.answers);
    if (!validated.ok) {
      return apiError("validation_failed", {
        message: validated.error,
        field: validated.field,
        headers,
      });
    }

    const scored = scoreSubmission({
      questions: record.questions,
      answers: validated.answers,
      thresholds: record.thresholds,
    });
    const fields = leadFieldsFrom(record.questions, validated.answers);

    const created = await insertLead({
      funnelId: record.funnelId,
      funnelVersionId: record.versionId,
      name: fields.name,
      email: fields.email,
      phone: fields.phone,
      company: fields.company,
      roleTitle: fields.role_title,
      answers: validated.answers,
      score: scored.score,
      // Teto congelado na versão: mexer nos pesos depois não reescreve o lead.
      scoreMax: record.scoreMax || scored.max,
      scorePct: scored.pct,
      qualificacao: scored.qualificacao,
      sourceUrl: typeof payload.source_url === "string" ? payload.source_url : null,
      utm: sanitizeUtm(payload.utm),
      ipHash,
      userAgent: request.headers.get("user-agent"),
    });
    if (!created) return apiError("service_unavailable", { headers });

    // Nunca devolve score nem qualificação: o visitante não pode inferir a régua.
    return apiOk(
      {
        id: created.id,
        success_message: record.successMessage,
        redirect_url: record.redirectUrl,
      },
      { status: 201, headers },
    );
  } catch {
    return apiError("internal_error", { headers });
  }
}

const UTM_KEYS = ["source", "medium", "campaign", "term", "content"];

function sanitizeUtm(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const item = raw[key];
    if (typeof item === "string" && item.trim()) {
      utm[key] = item.trim().slice(0, 200);
    }
  }
  return utm;
}

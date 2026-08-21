import type { NextRequest } from "next/server";
import { clientIp, hashIp } from "@/lib/api/auth";
import {
  countRecentEventsByIp,
  fetchLinkByTokenHash,
  hasRecentEvent,
  insertEvents,
  saveEstado,
  type NovoEvento,
} from "@/lib/api/calculator-queries";
import { isTokenShaped, tokenHash } from "@/lib/api/calculator-token";
import { hitAllowed, pruneBucket, type HitBucket } from "@/lib/api/rate-limit";
import { apiError, apiOk } from "@/lib/api/responses";
import {
  diffCamposAlterados,
  diffPassosCompletos,
  parseEstado,
  progresso,
} from "@/lib/calculadora/estado";
import { resumo } from "@/lib/calculadora/modelo";
import { linkAceitaAcesso, linkStatus } from "@/lib/calculadora/link-status";
import type { Json } from "@/lib/database.types";
import { isCalculatorConfigured } from "@/lib/env";

// Autosave e envio da calculadora pública. Same-origin (a página que posta é
// nossa) — sem CORS nem OPTIONS, diferente do funil que atende site externo.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ token: string }> };

// Por instância; some no cold start. O backstop entre lambdas é a contagem
// por ip_hash no banco (calculator_link_events_throttle_idx).
const MEMORY_BUCKET: HitBucket = new Map();
const MEMORY_LIMIT = { limit: 30, windowMs: 60_000 };

const DB_LIMIT = 120;
const DB_WINDOW_MS = 60 * 60 * 1000;

// Estado completo de 10 times fica muito abaixo disso.
const MAX_BODY_BYTES = 64 * 1024;

// Rajadas de autosave pós-envio viram um evento só.
const COALESCE_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest, context: Context) {
  try {
    if (!isCalculatorConfigured()) return apiError("service_unavailable");

    const { token } = await context.params;
    // 404 indistinto para qualquer token inválido — não vazamos o motivo.
    if (!isTokenShaped(token)) return apiError("not_found");

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) return apiError("invalid_body");

    const link = await fetchLinkByTokenHash(tokenHash(token));
    if (link === undefined) return apiError("service_unavailable");
    if (link === null) return apiError("not_found");

    const status = linkStatus({
      revokedAt: link.revoked_at,
      expiresAt: link.expires_at,
      submittedAt: link.submitted_at,
    });
    if (!linkAceitaAcesso(status)) return apiError("not_found");

    const ipHash = hashIp(clientIp(request));
    const now = Date.now();
    const chave = ipHash ?? link.id;
    pruneBucket(MEMORY_BUCKET, now, MEMORY_LIMIT.windowMs);
    const memory = hitAllowed(MEMORY_BUCKET, chave, now, MEMORY_LIMIT);
    if (!memory.allowed) {
      return apiError("rate_limited", {
        headers: { "Retry-After": String(memory.retryAfterSeconds) },
      });
    }
    if (ipHash) {
      const recentes = await countRecentEventsByIp(
        ipHash,
        new Date(now - DB_WINDOW_MS).toISOString(),
      );
      if (recentes >= DB_LIMIT) {
        return apiError("rate_limited", { headers: { "Retry-After": "3600" } });
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("invalid_body");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return apiError("invalid_body");
    }
    const payload = body as Record<string, unknown>;

    // Sanitização total: números clampados, enums validados, nomes de time
    // limpos — nenhuma string crua do visitante entra no estado.
    const estadoAntigo = parseEstado(link.state);
    const estadoNovo = parseEstado(payload.state);
    const marcarEnvio = payload.enviar === true && link.submitted_at === null;

    // Envio exige gating completo em todos os times (nunca resultado parcial).
    const prog = progresso(estadoNovo);
    if (marcarEnvio && !prog.porTime.every((time) => time.completo)) {
      return apiError("validation_failed", {
        message: "Complete todos os campos obrigatórios antes de enviar.",
      });
    }

    const novoResumo = resumo(estadoNovo, link.premissas);
    const salvo = await saveEstado({
      linkId: link.id,
      state: estadoNovo as unknown as Json,
      resultSummary: novoResumo as unknown as Json,
      marcarEnvio,
    });
    if (!salvo) return apiError("service_unavailable");

    // Rastreio (nunca bloqueia a resposta em caso de falha de insert).
    const userAgent = request.headers.get("user-agent");
    const eventos: NovoEvento[] = diffPassosCompletos(
      estadoAntigo,
      estadoNovo,
    ).map((transicao) => ({
      linkId: link.id,
      type: "passo_concluido",
      payload: {
        time_id: transicao.timeId,
        time_nome: transicao.timeNome,
        passo: transicao.passo,
      },
      ipHash,
      userAgent,
    }));

    if (marcarEnvio) {
      // O envio carrega a PROPOSTA que o visitante montou — plano, assentos,
      // prazo e preço — além do resultado.
      eventos.push({
        linkId: link.id,
        type: "enviado",
        payload: {
          consolidado: novoResumo.consolidado,
          proposta: novoResumo.proposta,
          times: novoResumo.times.map((time) => ({
            nome: time.nome,
            plano: time.plano,
            assentos: time.assentos,
            roi: time.roi,
            cenario: time.cenario,
          })),
        } as unknown as Json,
        ipHash,
        userAgent,
      });
    } else if (link.submitted_at !== null) {
      const alterados = diffCamposAlterados(estadoAntigo, estadoNovo);
      if (alterados.length > 0) {
        const jaRegistrado = await hasRecentEvent(
          link.id,
          "editado_pos_envio",
          new Date(now - COALESCE_MS).toISOString(),
        );
        if (!jaRegistrado) {
          eventos.push({
            linkId: link.id,
            type: "editado_pos_envio",
            payload: { campos_alterados: alterados.slice(0, 60) },
            ipHash,
            userAgent,
          });
        }
      }
    }
    await insertEvents(eventos);

    return apiOk({
      saved_at: new Date().toISOString(),
      submitted_at: salvo.submittedAt,
      progresso: { preenchidos: prog.preenchidos, total: prog.total },
    });
  } catch {
    return apiError("internal_error");
  }
}

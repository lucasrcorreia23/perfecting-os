import type { NextRequest } from "next/server";
import {
  fetchLinkByTokenHash,
  insertEvents,
  savePremissas,
} from "@/lib/api/calculator-queries";
import { isTokenShaped, tokenHash } from "@/lib/api/calculator-token";
import { apiError, apiOk } from "@/lib/api/responses";
import { getSessionProfile } from "@/lib/auth";
import { parseEstado } from "@/lib/calculadora/estado";
import { resumo } from "@/lib/calculadora/modelo";
import {
  fundirPremissas,
  serializarPremissas,
  sessaoPodeEditarPremissas,
} from "@/lib/calculadora/premissas";
import { lerXlsxPremissas } from "@/lib/calculadora/premissas-xlsx";
import type { Json } from "@/lib/database.types";
import { isCalculatorConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ token: string }> };

const MAX_XLSX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest, context: Context) {
  try {
    if (!isCalculatorConfigured()) return apiError("service_unavailable");

    const session = await getSessionProfile();
    if (!sessaoPodeEditarPremissas(session?.profile?.role)) {
      return apiError("unauthorized", {
        message: "Só quem está logado como interno edita o racional deste link.",
      });
    }

    const { token } = await context.params;
    if (!isTokenShaped(token)) return apiError("not_found");

    const link = await fetchLinkByTokenHash(tokenHash(token));
    if (link === undefined) return apiError("service_unavailable");
    if (link === null) return apiError("not_found");

    const contentType = request.headers.get("content-type") ?? "";
    let json: unknown = null;
    let avisos: { codigo: string; mensagem: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const arquivo = form.get("arquivo");
      if (!(arquivo instanceof File) || arquivo.size === 0) {
        return apiError("invalid_body", { message: "Envie um arquivo .xlsx." });
      }
      if (arquivo.size > MAX_XLSX_BYTES) {
        return apiError("invalid_body", { message: "O arquivo passa de 5 MB." });
      }
      const nome = arquivo.name.toLowerCase();
      if (!nome.endsWith(".xlsx")) {
        return apiError("invalid_body", { message: "Só aceitamos .xlsx." });
      }
      const buffer = Buffer.from(await arquivo.arrayBuffer());
      try {
        const lido = await lerXlsxPremissas(buffer);
        json = serializarPremissas(lido.premissas);
        avisos = lido.avisos;
      } catch {
        return apiError("invalid_body", {
          message: "Não deu para ler essa planilha. Use o formato do Template.",
        });
      }
    } else {
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
      if (payload.premissas === null) {
        json = null;
      } else {
        json = serializarPremissas(fundirPremissas(payload.premissas));
      }
    }

    const estado = parseEstado(link.state);
    const novoResumo = resumo(estado, json);
    const ok = await savePremissas({
      linkId: link.id,
      premissas: json as Json | null,
      resultSummary: novoResumo as unknown as Json,
    });
    if (!ok) return apiError("service_unavailable");

    await insertEvents([
      {
        linkId: link.id,
        type: "premissas_alteradas",
        payload: {
          restaurado: json === null,
          origem: contentType.includes("multipart") ? "xlsx" : "editor",
        } as unknown as Json,
        actorId: session!.userId,
      },
    ]);

    return apiOk({
      premissas: json,
      avisos,
    });
  } catch {
    return apiError("internal_error");
  }
}

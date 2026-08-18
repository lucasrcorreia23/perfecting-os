import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { fetchLinkByTokenHash } from "@/lib/api/calculator-queries";
import { isTokenShaped, tokenHash } from "@/lib/api/calculator-token";
import { apiError } from "@/lib/api/responses";
import { parseEstado, progresso } from "@/lib/calculadora/estado";
import { linkAceitaAcesso, linkStatus } from "@/lib/calculadora/link-status";
import { isCalculatorConfigured } from "@/lib/env";

// A referência de fórmulas em PDF, para quem recebeu o link poder conferir a
// conta fora da tela.
//
// Serve o arquivo atrás do MESMO token do link, e não de `public/`. Em
// `public/` a URL é adivinhável e o documento passa a estar aberto para a
// internet inteira; aqui ele alcança exatamente quem já podia ver os números,
// e para de alcançar quando o link expira ou é revogado — a mesma regra que
// vale para a calculadora.
//
// O arquivo vive em `docs/referencia/` (junto do .xlsx que ele descreve, com
// os SHAs registrados no CLAUDE.md) e não em `public/`: uma cópia só, no lugar
// onde a fonte é versionada. `outputFileTracingIncludes` no `next.config.ts`
// garante que ele suba com o bundle.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ token: string }> };

const ARQUIVO = "docs/referencia/Referencia-Completa-Formulas-ROI-Perfecting.pdf";
const NOME_PARA_DOWNLOAD = "Perfecting-Referencia-de-Formulas.pdf";

export async function GET(request: NextRequest, context: Context) {
  try {
    if (!isCalculatorConfigured()) return apiError("service_unavailable");

    const { token } = await context.params;
    // 404 indistinto para token malformado, desconhecido, expirado ou
    // revogado — sem vazar o motivo, como no resto do fluxo.
    if (!isTokenShaped(token)) return apiError("not_found");

    const link = await fetchLinkByTokenHash(tokenHash(token));
    if (link === undefined) return apiError("service_unavailable");
    if (link === null) return apiError("not_found");

    const status = linkStatus({
      revokedAt: link.revoked_at,
      expiresAt: link.expires_at,
      submittedAt: link.submitted_at,
    });
    if (!linkAceitaAcesso(status)) return apiError("not_found");

    // A mesma trava do botão no header, aqui do lado do servidor: o documento
    // abre quando existe resultado para conferir. Botão desabilitado é
    // afordância — quem monta a URL na mão passaria por cima dele.
    const prog = progresso(parseEstado(link.state));
    if (!prog.porTime.some((time) => time.completo)) return apiError("not_found");

    let pdf: Buffer;
    try {
      pdf = await readFile(path.join(process.cwd(), ARQUIVO));
    } catch {
      return apiError("service_unavailable");
    }

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // `inline`: abre no leitor do navegador e ainda permite salvar. Forçar
        // download seria decidir pela pessoa que ela quer o arquivo no disco
        // quando ela talvez só queira conferir uma fórmula.
        "Content-Disposition": `inline; filename="${NOME_PARA_DOWNLOAD}"`,
        "Content-Length": String(pdf.byteLength),
        // O documento é imutável por versão, mas o TOKEN não: cache privado
        // curto, para um link revogado parar de servir de verdade.
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return apiError("service_unavailable");
  }
}

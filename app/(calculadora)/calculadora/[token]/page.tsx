import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hashIp } from "@/lib/api/auth";
import { fetchLinkByTokenHash, registerAccess } from "@/lib/api/calculator-queries";
import { isTokenShaped, tokenHash } from "@/lib/api/calculator-token";
import { parseEstado } from "@/lib/calculadora/estado";
import { linkAceitaAcesso, linkStatus } from "@/lib/calculadora/link-status";
import { isCalculatorConfigured } from "@/lib/env";
import { CalculadoraApp } from "@/components/calculadora/calculadora-app";
import { LinkExpirado } from "@/components/calculadora/link-expirado";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Calculadora de ROI",
  robots: { index: false, follow: false },
};

// Sessão = mesmo link + IP dentro de 30 min; refresh não conta acesso novo.
const ACCESS_WINDOW_MS = 30 * 60 * 1000;

export default async function CalculadoraPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // 404 indistinto para token malformado ou desconhecido — sem vazar o motivo.
  if (!isTokenShaped(token)) notFound();
  if (!isCalculatorConfigured()) notFound();

  const link = await fetchLinkByTokenHash(tokenHash(token));
  if (link === undefined) {
    return <LinkExpirado variante="indisponivel" />;
  }
  if (link === null) notFound();

  const status = linkStatus({
    revokedAt: link.revoked_at,
    expiresAt: link.expires_at,
    submittedAt: link.submitted_at,
  });
  if (!linkAceitaAcesso(status)) {
    return <LinkExpirado variante={status === "revogado" ? "revogado" : "expirado"} />;
  }

  // Evento de acesso deduplicado (LGPD: só o HMAC do IP).
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip");
  await registerAccess(
    link,
    hashIp(ip),
    headerList.get("user-agent"),
    ACCESS_WINDOW_MS,
  );

  const estado = parseEstado(link.state);

  return (
    <CalculadoraApp
      token={token}
      estadoSalvo={estado}
      clientName={link.clients?.company ?? link.clients?.name ?? null}
      expiresAt={link.expires_at}
      submittedAt={link.submitted_at}
    />
  );
}

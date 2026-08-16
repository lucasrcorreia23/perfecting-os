// Status do link é DERIVADO, nunca coluna (precedente: "agendado" não é
// status no banco). Precedência: revogado > expirado > concluído > ativo.

import type { LinkStatus } from "./types";

export function linkStatus(
  link: {
    revokedAt: string | null;
    expiresAt: string;
    submittedAt: string | null;
  },
  now: Date = new Date(),
): LinkStatus {
  if (link.revokedAt) return "revogado";
  if (new Date(link.expiresAt).getTime() <= now.getTime()) return "expirado";
  if (link.submittedAt) return "concluido";
  return "ativo";
}

// Um link expirado ou revogado não aceita mais leitura de dados nem gravação.
export function linkAceitaAcesso(status: LinkStatus): boolean {
  return status === "ativo" || status === "concluido";
}

import type { Metadata } from "next";
import { RecoverForm } from "@/components/auth/recover-form";

export const metadata: Metadata = { title: "Recuperar senha" };

// Sem redirect de sessão aqui: o link do e-mail autentica o usuário e
// o traz de volta com ?etapa=redefinir para trocar a senha.
export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string }>;
}) {
  const { etapa } = await searchParams;
  return <RecoverForm redefinir={etapa === "redefinir"} />;
}

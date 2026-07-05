import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function CadastroPage() {
  const session = await getSessionProfile();
  if (session) redirect("/");

  return <SignupForm />;
}

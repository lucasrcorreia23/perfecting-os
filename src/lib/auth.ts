import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Tables } from "@/lib/database.types";

export type Profile = Tables<"profiles">;

export type SessionProfile = {
  userId: string;
  email: string | null;
  profile: Profile | null;
};

// Deduplicado por request (React cache): layouts e páginas podem chamar à vontade.
export const getSessionProfile = cache(
  async (): Promise<SessionProfile | null> => {
    if (!isSupabaseConfigured()) return null;
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return { userId: user.id, email: user.email ?? null, profile };
  },
);

export async function requireSession(): Promise<SessionProfile> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  return session;
}

// Gate de role: usuários "cliente" só acessam o próprio cliente e o perfil.
export async function requireInterno(): Promise<SessionProfile> {
  const session = await requireSession();
  if (session.profile?.role === "cliente") {
    redirect(clienteHome(session));
  }
  return session;
}

export function clienteHome(session: SessionProfile): string {
  return session.profile?.client_id
    ? `/clientes/${session.profile.client_id}`
    : "/perfil";
}

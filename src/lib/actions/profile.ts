"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import type { ActionResult } from "./clients";

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";

export type Preferences = {
  idioma?: string;
  resumo_semanal?: boolean;
  alertas_prazo?: boolean;
  prazo_etapa_dias?: number;
};

async function requireActor() {
  if (!isSupabaseConfigured()) return null;
  return getSessionProfile();
}

function revalidateProfilePaths() {
  revalidatePath("/perfil");
  // Nome/avatar aparecem no header do shell.
  revalidatePath("/", "layout");
}

export async function updateProfile(input: {
  full_name: string;
}): Promise<ActionResult> {
  const session = await requireActor();
  if (!session) return { ok: false, error: "Sem permissão." };
  if (!input.full_name.trim()) {
    return { ok: false, error: "Informe seu nome completo." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: input.full_name.trim() })
    .eq("id", session.userId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateProfilePaths();
  return { ok: true, data: undefined };
}

export async function updatePreferences(
  preferences: Preferences,
): Promise<ActionResult> {
  const session = await requireActor();
  if (!session) return { ok: false, error: "Sem permissão." };
  if (
    preferences.prazo_etapa_dias !== undefined &&
    (!Number.isInteger(preferences.prazo_etapa_dias) ||
      preferences.prazo_etapa_dias < 1)
  ) {
    return { ok: false, error: "O prazo da etapa deve ser de pelo menos 1 dia." };
  }

  const supabase = await createServerSupabase();
  const current =
    (session.profile?.preferences as Preferences | null) ?? {};

  const { error } = await supabase
    .from("profiles")
    .update({ preferences: { ...current, ...preferences } })
    .eq("id", session.userId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateProfilePaths();
  return { ok: true, data: undefined };
}

// Chamada após o upload direto do browser para o bucket público de avatares.
export async function setAvatarUrl(url: string): Promise<ActionResult> {
  const session = await requireActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", session.userId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateProfilePaths();
  return { ok: true, data: undefined };
}

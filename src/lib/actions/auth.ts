"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type AuthState = {
  error?: string;
  message?: string;
};

const NOT_CONFIGURED: AuthState = {
  error:
    "Supabase não configurado. Copie .env.local.example para .env.local e preencha as chaves.",
};

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Informe e-mail e senha." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: "E-mail ou senha inválidos." };

  redirect("/");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName) return { error: "Informe seu nome completo." };
  if (!email) return { error: "Informe seu e-mail." };
  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Consumido pelo trigger handle_new_user para criar o profile.
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: "Não foi possível criar a conta. Tente novamente." };

  // Projeto com confirmação de e-mail ligada: sem sessão imediata.
  if (!data.session) {
    return { message: "Confira seu e-mail para confirmar o cadastro." };
  }

  redirect("/");
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe seu e-mail." };

  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    `https://${headerList.get("host") ?? "localhost:3000"}`;

  const supabase = await createServerSupabase();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/recuperar?etapa=redefinir`,
  });

  // Resposta genérica de propósito (não revela se o e-mail existe).
  return {
    message: "Se o e-mail estiver cadastrado, você receberá o link de redefinição.",
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Link expirado ou inválido. Solicite uma nova redefinição." };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

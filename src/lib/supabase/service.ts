import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getServiceRoleKey, getSupabaseEnv } from "@/lib/env";

// ATENÇÃO: este cliente IGNORA RLS.
//
// Existe por um motivo só: servir a API pública (app/api/publico/*) ao site
// externo sem abrir policies `to anon` — que exporiam as tabelas diretamente no
// PostgREST do Supabase, para qualquer um, tornando token/CORS/rate-limit
// decorativos.
//
// Regras de uso, não negociáveis:
//  1. Só src/lib/api/marketing-queries.ts e src/lib/api/calculator-queries.ts
//     importam este módulo (o segundo serve a calculadora pública, cujo gate é
//     o token do link — visitante não tem sessão).
//  2. A env NÃO tem prefixo NEXT_PUBLIC_ — o Next a compila como `undefined`
//     em código de cliente, então o vazamento é estruturalmente improvável.
//     O guard abaixo é cinto e suspensório.
//  3. Toda resposta é moldada à mão: rascunho, pesos e dados de outro lead
//     nunca podem escapar.
if (typeof window !== "undefined") {
  throw new Error(
    "supabase/service só pode ser usado no servidor (ignora RLS).",
  );
}

export function createServiceSupabase() {
  const { url } = getSupabaseEnv();
  const serviceKey = getServiceRoleKey();
  if (!url || !serviceKey) return null;

  return createClient<Database>(url, serviceKey, {
    // Sem isso o supabase-js tenta usar storage de sessão e polui os logs.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

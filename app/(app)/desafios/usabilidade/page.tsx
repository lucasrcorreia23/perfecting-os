import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  SESSAO_SELECT,
  toSessaoRow,
  type SessaoRow,
} from "@/components/desafios/usabilidade/mapear-sessao";
import { SessoesView } from "@/components/desafios/usabilidade/sessoes-view";

export const metadata: Metadata = { title: "Usabilidade · Desafios" };

export default async function UsabilidadePage() {
  if (!isSupabaseConfigured()) return <SessoesView sessoes={[]} />;

  const supabase = await createServerSupabase();
  // A contagem de achados vem por embed agregado, e a transcrição não vem: ela
  // mora noutra tabela justamente para não entrar aqui.
  const { data } = await supabase
    .from("teste_sessoes")
    .select(`${SESSAO_SELECT}, teste_achados(count)`)
    .order("realizado_em", { ascending: false })
    .order("created_at", { ascending: false });

  const sessoes: SessaoRow[] = (data ?? []).map((linha) =>
    toSessaoRow(linha as Parameters<typeof toSessaoRow>[0]),
  );

  return <SessoesView sessoes={sessoes} />;
}

import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  DesafiosView,
  type TaxonomiaOption,
} from "@/components/desafios/desafios-view";
import {
  DESAFIO_SELECT,
  toDesafioRow,
} from "@/components/desafios/mapear-desafio";

export const metadata: Metadata = { title: "Desafios" };

export default async function DesafiosPage() {
  if (!isSupabaseConfigured()) {
    return <DesafiosView desafios={[]} categorias={[]} fluxos={[]} />;
  }

  const supabase = await createServerSupabase();
  const [desafiosRes, categoriasRes, fluxosRes] = await Promise.all([
    supabase
      .from("desafios")
      .select(DESAFIO_SELECT)
      .order("created_at", { ascending: false }),
    supabase
      .from("desafio_categorias")
      .select("id, nome, cor, ordem, arquivada")
      .order("ordem")
      .order("nome"),
    supabase
      .from("desafio_fluxos")
      .select("id, nome, cor, ordem, arquivado")
      .order("ordem")
      .order("nome"),
  ]);

  const categorias: TaxonomiaOption[] = (categoriasRes.data ?? []).map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    cor: linha.cor,
    ordem: linha.ordem,
    arquivada: linha.arquivada,
  }));

  const fluxos: TaxonomiaOption[] = (fluxosRes.data ?? []).map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    cor: linha.cor,
    ordem: linha.ordem,
    arquivada: linha.arquivado,
  }));

  return (
    <DesafiosView
      desafios={(desafiosRes.data ?? []).map(toDesafioRow)}
      categorias={categorias}
      fluxos={fluxos}
    />
  );
}

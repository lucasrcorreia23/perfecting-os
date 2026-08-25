import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  TaxonomiasView,
  type TaxonomiaRow,
} from "@/components/desafios/taxonomias-view";

export const metadata: Metadata = { title: "Categorias e fluxos · Desafios" };

export default async function DesafiosTaxonomiasPage() {
  if (!isSupabaseConfigured()) {
    return <TaxonomiasView categorias={[]} fluxos={[]} usos={{}} />;
  }

  const supabase = await createServerSupabase();
  const [categoriasRes, fluxosRes, desafiosRes] = await Promise.all([
    supabase
      .from("desafio_categorias")
      .select("id, nome, descricao, cor, ordem, arquivada")
      .order("ordem")
      .order("nome"),
    supabase
      .from("desafio_fluxos")
      .select("id, nome, descricao, cor, ordem, arquivado")
      .order("ordem")
      .order("nome"),
    // A contagem de uso vem numa varredura só, não numa consulta por linha: é
    // ela que diz na tela por que excluir vai ser recusado, ANTES do clique.
    supabase.from("desafios").select("categoria_id, fluxo_id"),
  ]);

  const usos: Record<string, number> = {};
  for (const desafio of desafiosRes.data ?? []) {
    if (desafio.categoria_id) usos[desafio.categoria_id] = (usos[desafio.categoria_id] ?? 0) + 1;
    if (desafio.fluxo_id) usos[desafio.fluxo_id] = (usos[desafio.fluxo_id] ?? 0) + 1;
  }

  const categorias: TaxonomiaRow[] = (categoriasRes.data ?? []).map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao,
    cor: linha.cor,
    ordem: linha.ordem,
    arquivada: linha.arquivada,
  }));

  const fluxos: TaxonomiaRow[] = (fluxosRes.data ?? []).map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao,
    cor: linha.cor,
    ordem: linha.ordem,
    arquivada: linha.arquivado,
  }));

  return <TaxonomiasView categorias={categorias} fluxos={fluxos} usos={usos} />;
}

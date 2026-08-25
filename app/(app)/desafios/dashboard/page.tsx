import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  computeDesafiosDashboard,
  type TaxonomiaLinha,
} from "@/lib/desafios-dashboard";
import {
  DESAFIO_SELECT,
  toDesafioRow,
} from "@/components/desafios/mapear-desafio";
import { DesafiosDashboardView } from "@/components/desafios/dashboard-view";

export const metadata: Metadata = { title: "Dashboard · Desafios" };

const VAZIO: TaxonomiaLinha[] = [];

export default async function DesafiosDashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <DesafiosDashboardView
        resumo={computeDesafiosDashboard({
          desafios: [],
          categorias: VAZIO,
          fluxos: VAZIO,
        })}
        desafios={[]}
        categorias={VAZIO}
        fluxos={VAZIO}
      />
    );
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

  const desafios = (desafiosRes.data ?? []).map(toDesafioRow);

  const categorias: TaxonomiaLinha[] = (categoriasRes.data ?? []).map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    cor: linha.cor,
    ordem: linha.ordem,
    arquivada: linha.arquivada,
  }));

  const fluxos: TaxonomiaLinha[] = (fluxosRes.data ?? []).map((linha) => ({
    id: linha.id,
    nome: linha.nome,
    cor: linha.cor,
    ordem: linha.ordem,
    arquivada: linha.arquivado,
  }));

  // O cruzamento é puro, então roda no servidor e desce pronto: a tela recebe o
  // MESMO objeto que o export serializa, e as duas leituras não podem divergir.
  const resumo = computeDesafiosDashboard({ desafios, categorias, fluxos });

  return (
    <DesafiosDashboardView
      resumo={resumo}
      desafios={desafios}
      categorias={categorias}
      fluxos={fluxos}
    />
  );
}

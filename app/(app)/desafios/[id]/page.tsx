import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { codigoDesafio } from "@/lib/desafios";
import type { TaxonomiaOption } from "@/components/desafios/desafios-view";
import {
  DESAFIO_SELECT,
  toDesafioRow,
} from "@/components/desafios/mapear-desafio";
import { DesafioDetail } from "@/components/desafios/desafio-detail";

export const metadata: Metadata = { title: "Desafio" };

export default async function DesafioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createServerSupabase();
  const [desafioRes, categoriasRes, fluxosRes] = await Promise.all([
    supabase.from("desafios").select(DESAFIO_SELECT).eq("id", id).single(),
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

  if (!desafioRes.data) notFound();

  const desafio = toDesafioRow(desafioRes.data);

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
    <DesafioDetail
      desafio={desafio}
      categorias={categorias}
      fluxos={fluxos}
      codigo={codigoDesafio(desafio.codigo)}
    />
  );
}

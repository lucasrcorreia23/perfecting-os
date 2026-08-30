import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  SESSAO_SELECT,
  toSessaoRow,
} from "@/components/desafios/usabilidade/mapear-sessao";
import { SessaoDetail } from "@/components/desafios/usabilidade/sessao-detail";
import type {
  AchadoRow,
  DesafioOption,
} from "@/components/desafios/usabilidade/achados-card";
import type { TaxonomiaOption } from "@/components/desafios/desafios-view";

export const metadata: Metadata = { title: "Sessão · Usabilidade" };

const ACHADO_SELECT =
  "id, pergunta_id, resumo, trecho, tipo, severidade, status, categoria_id, fluxo_id, desafio_id, desafio_codigo, desafio_categorias(nome, cor), desafio_fluxos(nome, cor)";

// O embed volta objeto ou array conforme a cardinalidade — mesmo helper `um()`
// de `mapear-desafio.ts`.
function um<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

export default async function SessaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createServerSupabase();
  // Só o detalhe seleciona a transcrição — é a única tela que precisa dela.
  const [sessaoRes, transcricaoRes, achadosRes, categoriasRes, fluxosRes, desafiosRes] =
    await Promise.all([
      supabase.from("teste_sessoes").select(SESSAO_SELECT).eq("id", id).single(),
      supabase
        .from("teste_transcricoes")
        .select("texto")
        .eq("sessao_id", id)
        .maybeSingle(),
      supabase
        .from("teste_achados")
        .select(ACHADO_SELECT)
        .eq("sessao_id", id)
        .order("created_at", { ascending: true }),
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
      supabase
        .from("desafios")
        .select("id, codigo, titulo")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  if (!sessaoRes.data) notFound();

  const achados: AchadoRow[] = (achadosRes.data ?? []).map((linha) => ({
    id: linha.id,
    pergunta_id: linha.pergunta_id,
    resumo: linha.resumo,
    trecho: linha.trecho,
    tipo: linha.tipo,
    severidade: linha.severidade,
    status: linha.status,
    categoria_id: linha.categoria_id,
    fluxo_id: linha.fluxo_id,
    categoria: um(linha.desafio_categorias),
    fluxo: um(linha.desafio_fluxos),
    desafio_id: linha.desafio_id,
    desafio_codigo: linha.desafio_codigo,
  }));

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

  const desafios: DesafioOption[] = (desafiosRes.data ?? []).map((linha) => ({
    id: linha.id,
    codigo: linha.codigo,
    titulo: linha.titulo,
  }));

  return (
    <SessaoDetail
      sessao={toSessaoRow(sessaoRes.data as Parameters<typeof toSessaoRow>[0])}
      transcricao={transcricaoRes.data?.texto ?? null}
      achados={achados}
      categorias={categorias}
      fluxos={fluxos}
      desafios={desafios}
    />
  );
}

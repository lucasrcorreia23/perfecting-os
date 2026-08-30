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
import {
  OrigemTestesCard,
  type OrigemTeste,
} from "@/components/desafios/origem-testes-card";

export const metadata: Metadata = { title: "Desafio" };

export default async function DesafioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createServerSupabase();
  const [desafioRes, categoriasRes, fluxosRes, origensRes] = await Promise.all([
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
    // A procedência é DERIVADA — consulta própria, fora do DESAFIO_SELECT, senão
    // a listagem de desafios passaria a carregar achados de teste.
    supabase
      .from("teste_achados")
      .select(
        "id, resumo, trecho, sessao_id, teste_sessoes(codigo, perfil, fluxo, realizado_em)",
      )
      .eq("desafio_id", id)
      .order("created_at", { ascending: true }),
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

  type SessaoEmbed = {
    codigo: number;
    perfil: OrigemTeste["perfil"];
    fluxo: OrigemTeste["fluxo"];
    realizado_em: string;
  };

  const origens: OrigemTeste[] = (origensRes.data ?? []).flatMap((linha) => {
    const bruto = linha.teste_sessoes as SessaoEmbed | SessaoEmbed[] | null;
    const sessao = Array.isArray(bruto) ? (bruto[0] ?? null) : bruto;
    if (!sessao) return [];
    return [
      {
        achadoId: linha.id,
        sessaoId: linha.sessao_id,
        sessaoCodigo: sessao.codigo,
        perfil: sessao.perfil,
        fluxo: sessao.fluxo,
        realizadoEm: sessao.realizado_em,
        resumo: linha.resumo,
        trecho: linha.trecho,
      },
    ];
  });

  return (
    <DesafioDetail
      desafio={desafio}
      categorias={categorias}
      fluxos={fluxos}
      codigo={codigoDesafio(desafio.codigo)}
      origem={<OrigemTestesCard origens={origens} />}
    />
  );
}

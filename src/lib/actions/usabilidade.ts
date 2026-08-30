"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import {
  DESAFIO_SEVERIDADES,
  DESAFIO_TIPOS,
  TESTE_ACHADO_STATUSES,
  TESTE_FLUXOS,
  TESTE_ORIGENS,
  TESTE_PERFIS,
  type DesafioSeveridade,
  type DesafioTipo,
  type TesteAchadoStatus,
  type TesteFluxo,
  type TestePerfil,
  type TesteOrigem,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { codigoSessao, prepararSessao } from "@/lib/usabilidade/sessao";
import type { RespostasMap } from "@/lib/usabilidade/respostas";
import type { TablesUpdate } from "@/lib/database.types";
import type { ActionResult } from "./clients";

const GENERIC_ERROR = "Algo deu errado. Tente novamente.";
const MAX_TRANSCRICAO = 400_000;

async function requireInternoActor() {
  if (!isSupabaseConfigured()) return null;
  const session = await getSessionProfile();
  if (!session || session.profile?.role !== "interno") return null;
  return session;
}

// Uma sessão nova ou editada muda a leitura agregada, então as duas rotas
// revalidam juntas. `revalidateTag` exige 2º argumento no Next 16 — aqui é só
// revalidatePath, como no resto do projeto.
function revalidateUsabilidadePaths(sessaoId?: string) {
  revalidatePath("/desafios/usabilidade");
  revalidatePath("/desafios/usabilidade/resultados");
  if (sessaoId) revalidatePath(`/desafios/usabilidade/${sessaoId}`);
}

export type SessaoFormInput = {
  // Perfil, fluxo, varejo e data NÃO são campos deste tipo de propósito: eles
  // saem de `respostas` por promoção, em `prepararSessao`. Aceitá-los aqui em
  // paralelo recriaria as duas cópias da mesma verdade que a promoção existe
  // para evitar.
  respostas: RespostasMap;
  observacoes: string;
  origem: TesteOrigem;
  transcricao: string;
};

function limpar(texto: string | null | undefined): string | null {
  return texto?.trim() ? texto.trim() : null;
}

export async function createSessao(
  input: SessaoFormInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  if (!(input.origem in TESTE_ORIGENS)) return { ok: false, error: "Origem inválida." };

  const preparada = prepararSessao(input.respostas);
  if (!preparada.ok) return { ok: false, error: preparada.error };

  const transcricao = limpar(input.transcricao);
  if (transcricao && transcricao.length > MAX_TRANSCRICAO) {
    return { ok: false, error: "A transcrição passa do tamanho aceito." };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("teste_sessoes")
    .insert({
      ...preparada.dados,
      origem: input.origem,
      observacoes: limpar(input.observacoes),
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  if (transcricao) {
    const { error: erroTranscricao } = await supabase
      .from("teste_transcricoes")
      .insert({ sessao_id: data.id, texto: transcricao });
    // A sessão já existe e vale por si — perder a transcrição não pode custar o
    // registro inteiro. O detalhe mostra que não há transcrição, e recolar é uma
    // edição.
    if (erroTranscricao) {
      revalidateUsabilidadePaths(data.id);
      return { ok: false, error: "A sessão foi salva, mas a transcrição não." };
    }
  }

  revalidateUsabilidadePaths(data.id);
  return { ok: true, data: { id: data.id } };
}

export async function updateSessao(
  sessaoId: string,
  input: SessaoFormInput,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const preparada = prepararSessao(input.respostas);
  if (!preparada.ok) return { ok: false, error: preparada.error };

  const supabase = await createServerSupabase();
  const patch: TablesUpdate<"teste_sessoes"> = {
    ...preparada.dados,
    observacoes: limpar(input.observacoes),
  };

  const { error } = await supabase
    .from("teste_sessoes")
    .update(patch)
    .eq("id", sessaoId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateUsabilidadePaths(sessaoId);
  return { ok: true, data: undefined };
}

export async function setTranscricao(
  sessaoId: string,
  texto: string,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const limpo = limpar(texto);
  if (limpo && limpo.length > MAX_TRANSCRICAO) {
    return { ok: false, error: "A transcrição passa do tamanho aceito." };
  }

  const supabase = await createServerSupabase();

  // Sem texto é remoção, não linha vazia: o CHECK do banco recusa `''`, e uma
  // linha em branco leria como "há transcrição" na tela.
  const { error } = limpo
    ? await supabase
        .from("teste_transcricoes")
        .upsert({ sessao_id: sessaoId, texto: limpo }, { onConflict: "sessao_id" })
    : await supabase.from("teste_transcricoes").delete().eq("sessao_id", sessaoId);

  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateUsabilidadePaths(sessaoId);
  return { ok: true, data: undefined };
}

export async function deleteSessao(sessaoId: string): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  // Transcrição e achados caem por cascade. Achado é evidência DESTA sessão:
  // sem a sessão, o trecho perde a procedência que o torna evidência.
  const { error } = await supabase.from("teste_sessoes").delete().eq("id", sessaoId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateUsabilidadePaths();
  return { ok: true, data: undefined };
}

// =============================================================================
// Achados — e a ponte para Desafios
// =============================================================================

const MAX_RESUMO = 200;

export type AchadoFormInput = {
  pergunta_id: string | null;
  resumo: string;
  trecho: string;
  tipo: DesafioTipo;
  severidade: DesafioSeveridade;
  status: TesteAchadoStatus;
  categoria_id: string | null;
  fluxo_id: string | null;
};

function validarAchado(input: AchadoFormInput): string | null {
  const resumo = input.resumo.trim();
  if (!resumo) return "Escreva o resumo do problema.";
  if (resumo.length > MAX_RESUMO)
    return `O resumo passa de ${MAX_RESUMO} caracteres.`;
  if (!(input.tipo in DESAFIO_TIPOS)) return "Tipo inválido.";
  if (!(input.severidade in DESAFIO_SEVERIDADES)) return "Severidade inválida.";
  if (!(input.status in TESTE_ACHADO_STATUSES)) return "Status inválido.";
  return null;
}

export async function createAchado(
  sessaoId: string,
  input: AchadoFormInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const invalido = validarAchado(input);
  if (invalido) return { ok: false, error: invalido };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("teste_achados")
    .insert({
      sessao_id: sessaoId,
      pergunta_id: input.pergunta_id,
      resumo: input.resumo.trim(),
      trecho: limpar(input.trecho),
      tipo: input.tipo,
      severidade: input.severidade,
      status: input.status,
      categoria_id: input.categoria_id,
      fluxo_id: input.fluxo_id,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: GENERIC_ERROR };

  revalidateUsabilidadePaths(sessaoId);
  return { ok: true, data: { id: data.id } };
}

export async function updateAchado(
  achadoId: string,
  sessaoId: string,
  input: AchadoFormInput,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const invalido = validarAchado(input);
  if (invalido) return { ok: false, error: invalido };

  const supabase = await createServerSupabase();
  // `desafio_id`/`desafio_codigo` NÃO entram no patch: quem escreve o vínculo é
  // criarDesafioDoAchado/vincularAchadoADesafio, e um caminho a mais para a
  // mesma coluna é como se perde o invariante de "três estados".
  const { error } = await supabase
    .from("teste_achados")
    .update({
      pergunta_id: input.pergunta_id,
      resumo: input.resumo.trim(),
      trecho: limpar(input.trecho),
      tipo: input.tipo,
      severidade: input.severidade,
      status: input.status,
      categoria_id: input.categoria_id,
      fluxo_id: input.fluxo_id,
    })
    .eq("id", achadoId);

  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateUsabilidadePaths(sessaoId);
  return { ok: true, data: undefined };
}

export async function deleteAchado(
  achadoId: string,
  sessaoId: string,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("teste_achados").delete().eq("id", achadoId);
  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateUsabilidadePaths(sessaoId);
  return { ok: true, data: undefined };
}

/*
 * A PONTE. Cria o desafio já preenchido a partir do achado e guarda o vínculo.
 *
 * Não registra `desafio_ocorrencias` — decisão do decisor, e ela protege a regra
 * mais delicada do módulo Desafios: recorrência tem DUAS fontes (o contador
 * manual e o log) e elas nunca se somam. Um teste de usabilidade não pode virar
 * uma terceira, e o placar nasce zerado justamente por isso.
 */
export async function criarDesafioDoAchado(
  achadoId: string,
): Promise<ActionResult<{ desafioId: string; codigo: number }>> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data: achado } = await supabase
    .from("teste_achados")
    .select(
      "id, resumo, trecho, tipo, severidade, categoria_id, fluxo_id, desafio_id, sessao_id, pergunta_id, teste_sessoes(codigo, perfil, fluxo, realizado_em)",
    )
    .eq("id", achadoId)
    .single();

  if (!achado) return { ok: false, error: "Achado não encontrado." };
  if (achado.desafio_id) {
    return { ok: false, error: "Este achado já está vinculado a um desafio." };
  }

  // O embed do PostgREST volta como objeto ou array conforme a cardinalidade, e
  // sem tipo — mesmo cuidado do helper `um()` de `mapear-desafio.ts`.
  type SessaoEmbed = {
    codigo: number;
    perfil: TestePerfil;
    fluxo: TesteFluxo;
    realizado_em: string;
  };
  const embed = achado.teste_sessoes as SessaoEmbed | SessaoEmbed[] | null;
  const sessao: SessaoEmbed | null = Array.isArray(embed) ? (embed[0] ?? null) : embed;

  // A procedência vai no corpo do desafio, não numa coluna: ela é texto para
  // quem lê, e o vínculo consultável já existe do outro lado.
  const procedencia = sessao
    ? `Origem: teste de usabilidade ${codigoSessao(sessao.codigo)} · ${
        TESTE_PERFIS[sessao.perfil].label
      } · fluxo ${TESTE_FLUXOS[sessao.fluxo].label} · ${formatDate(sessao.realizado_em)}`
    : "Origem: teste de usabilidade";

  const descricao = [achado.trecho?.trim(), procedencia].filter(Boolean).join("\n\n");

  const { data: desafio, error: erroDesafio } = await supabase
    .from("desafios")
    .insert({
      titulo: achado.resumo.slice(0, MAX_RESUMO),
      descricao,
      tipo: achado.tipo,
      severidade: achado.severidade,
      categoria_id: achado.categoria_id,
      fluxo_id: achado.fluxo_id,
      // Placar zerado: ver a nota acima sobre as duas fontes de recorrência.
      tentativas: 0,
      falhas: 0,
      created_by: session.userId,
    })
    .select("id, codigo")
    .single();

  if (erroDesafio || !desafio) return { ok: false, error: GENERIC_ERROR };

  const { error: erroVinculo } = await supabase
    .from("teste_achados")
    .update({
      desafio_id: desafio.id,
      desafio_codigo: desafio.codigo,
      status: "virou_desafio",
    })
    .eq("id", achadoId);

  if (erroVinculo) return { ok: false, error: GENERIC_ERROR };

  revalidateUsabilidadePaths(achado.sessao_id);
  revalidatePath("/desafios");
  revalidatePath("/desafios/dashboard");
  revalidatePath(`/desafios/${desafio.id}`);

  return { ok: true, data: { desafioId: desafio.id, codigo: desafio.codigo } };
}

/*
 * Vincula a um desafio que JÁ existe. É esta ação que faz a contagem de sessões
 * significar alguma coisa: sem ela, o segundo participante que topa com o mesmo
 * problema criaria um desafio duplicado, e "5 de 8 sessões" viraria cinco
 * desafios de uma sessão cada.
 */
export async function vincularAchadoADesafio(
  achadoId: string,
  sessaoId: string,
  desafioId: string,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { data: desafio } = await supabase
    .from("desafios")
    .select("id, codigo")
    .eq("id", desafioId)
    .single();

  if (!desafio) return { ok: false, error: "Desafio não encontrado." };

  const { error } = await supabase
    .from("teste_achados")
    .update({
      desafio_id: desafio.id,
      desafio_codigo: desafio.codigo,
      status: "virou_desafio",
    })
    .eq("id", achadoId);

  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateUsabilidadePaths(sessaoId);
  revalidatePath(`/desafios/${desafioId}`);
  return { ok: true, data: undefined };
}

/*
 * Desfaz o vínculo — e `desafio_codigo` FICA. Limpá-lo apagaria a história ("já
 * virou DES-014 uma vez") e devolveria o achado ao estado "ninguém olhou", que
 * é a confusão que o terceiro estado existe para evitar.
 */
export async function desvincularAchado(
  achadoId: string,
  sessaoId: string,
): Promise<ActionResult> {
  const session = await requireInternoActor();
  if (!session) return { ok: false, error: "Sem permissão." };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("teste_achados")
    .update({ desafio_id: null, status: "aberto" })
    .eq("id", achadoId);

  if (error) return { ok: false, error: GENERIC_ERROR };

  revalidateUsabilidadePaths(sessaoId);
  return { ok: true, data: undefined };
}

import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { TESTE_FLUXOS, TESTE_ORIGENS, TESTE_PERFIS } from "@/lib/constants";
import { parseRespostas } from "@/lib/usabilidade/respostas";
import { computeUsabilidadeDashboard } from "@/lib/usabilidade/dashboard";
import type {
  AchadoDashboardRow,
  SessaoDashboardRow,
} from "@/lib/usabilidade/dashboard";
import type {
  ExportableAchado,
  ExportableSessao,
} from "@/lib/usabilidade/export";
import { ResultadosView } from "@/components/desafios/usabilidade/resultados-view";

export const metadata: Metadata = { title: "Resultados · Usabilidade" };

const SESSAO_COLS =
  "id, codigo, perfil, fluxo, varejo, realizado_em, roteiro_versao, respostas, origem, observacoes";
const ACHADO_COLS =
  "id, sessao_id, pergunta_id, resumo, trecho, tipo, severidade, status, desafio_id, desafio_codigo, desafio_categorias(id, nome), desafio_fluxos(id, nome)";

function um<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

// `valor in catalogo` não estreita o tipo de uma string vinda da URL — este
// guard é o que transforma "entrada de fora" em membro do enum, ou em nada.
function opcaoValida<T extends string>(
  valor: string | undefined,
  catalogo: Record<T, unknown>,
): T | null {
  return valor && valor in catalogo ? (valor as T) : null;
}

/*
 * O RECORTE VEM DA URL, e é por isso que ele governa as três coisas de uma vez:
 * a listagem que o produziu, os números desta tela e o arquivo exportado. Se o
 * filtro fosse só estado de cliente na listagem, esta página falaria de um
 * conjunto e a pessoa acharia que fala do que ela estava olhando.
 */
export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ perfil?: string; fluxo?: string; origem?: string }>;
}) {
  const { perfil, fluxo, origem } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <ResultadosView
        resumo={computeUsabilidadeDashboard({ sessoes: [], achados: [] })}
        sessoes={[]}
        achados={[]}
        deTotal={0}
        filtrado={false}
      />
    );
  }

  const supabase = await createServerSupabase();

  let query = supabase
    .from("teste_sessoes")
    .select(SESSAO_COLS)
    .order("realizado_em", { ascending: false });

  // Cada filtro é validado contra o catálogo antes de virar `eq`: parâmetro de
  // URL é entrada de fora, e um valor inventado deve ser ignorado, não gerar
  // erro nem passar direto.
  const perfilFiltro = opcaoValida(perfil, TESTE_PERFIS);
  const fluxoFiltro = opcaoValida(fluxo, TESTE_FLUXOS);
  const origemFiltro = opcaoValida(origem, TESTE_ORIGENS);

  if (perfilFiltro) query = query.eq("perfil", perfilFiltro);
  if (fluxoFiltro) query = query.eq("fluxo", fluxoFiltro);
  if (origemFiltro) query = query.eq("origem", origemFiltro);

  const [recorteRes, totalRes] = await Promise.all([
    query,
    supabase.from("teste_sessoes").select("id", { count: "exact", head: true }),
  ]);

  const linhas = recorteRes.data ?? [];
  const ids = linhas.map((linha) => linha.id);

  const achadosRes = ids.length
    ? await supabase.from("teste_achados").select(ACHADO_COLS).in("sessao_id", ids)
    : { data: [] };

  const sessoes: ExportableSessao[] = linhas.map((linha) => ({
    id: linha.id,
    codigo: linha.codigo,
    perfil: linha.perfil,
    fluxo: linha.fluxo,
    varejo: linha.varejo,
    realizado_em: linha.realizado_em,
    roteiro_versao: linha.roteiro_versao,
    origem: linha.origem,
    observacoes: linha.observacoes,
    respostas: parseRespostas(linha.respostas),
  }));

  const achados: ExportableAchado[] = (achadosRes.data ?? []).map((linha) => ({
    id: linha.id,
    sessao_id: linha.sessao_id,
    pergunta_id: linha.pergunta_id,
    resumo: linha.resumo,
    trecho: linha.trecho,
    tipo: linha.tipo,
    severidade: linha.severidade,
    status: linha.status,
    categoria: um(linha.desafio_categorias),
    fluxo: um(linha.desafio_fluxos),
    desafio_id: linha.desafio_id,
    desafio_codigo: linha.desafio_codigo,
  }));

  // A conta roda no SERVIDOR e desce pronta: a tela e o arquivo recebem o mesmo
  // objeto, e as duas leituras não podem divergir. Mesma decisão do dashboard de
  // desafios.
  const paraDashboard: SessaoDashboardRow[] = sessoes.map((sessao) => ({
    id: sessao.id,
    codigo: sessao.codigo,
    perfil: sessao.perfil,
    fluxo: sessao.fluxo,
    varejo: sessao.varejo,
    realizado_em: sessao.realizado_em,
    respostas: sessao.respostas,
  }));

  const achadosDashboard: AchadoDashboardRow[] = achados.map((achado) => ({
    id: achado.id,
    sessao_id: achado.sessao_id,
    resumo: achado.resumo,
    tipo: achado.tipo,
    severidade: achado.severidade,
    status: achado.status,
    categoria: achado.categoria
      ? { ...achado.categoria, cor: "#475569" }
      : null,
    fluxo: achado.fluxo ? { ...achado.fluxo, cor: "#475569" } : null,
    desafio_id: achado.desafio_id,
    desafio_codigo: achado.desafio_codigo,
  }));

  const deTotal = totalRes.count ?? sessoes.length;

  return (
    <ResultadosView
      resumo={computeUsabilidadeDashboard({
        sessoes: paraDashboard,
        achados: achadosDashboard,
      })}
      sessoes={sessoes}
      achados={achados}
      deTotal={deTotal}
      filtrado={sessoes.length !== deTotal}
    />
  );
}

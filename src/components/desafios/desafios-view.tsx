"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownTrayIcon, BugAntIcon } from "@heroicons/react/24/outline";
import {
  DESAFIO_SEVERIDADES,
  DESAFIO_SEVERIDADE_ORDER,
  DESAFIO_STATUSES,
  DESAFIO_STATUS_ORDER,
  DESAFIO_TIPOS,
  DESAFIO_TIPO_ORDER,
  type DesafioSeveridade,
  type DesafioStatus,
  type DesafioTipo,
} from "@/lib/constants";
import {
  codigoDesafio,
  formatarProporcao,
  formatarRecorrencia,
  recorrenciaDoDesafio,
} from "@/lib/desafios";
import { computeDesafiosDashboard } from "@/lib/desafios-dashboard";
import {
  desafiosParaJson,
  desafiosParaTexto,
  jsonFilename,
} from "@/lib/desafios-export";
import { downloadText } from "@/lib/download";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { TaxonomiaChip } from "@/components/ui/taxonomia-chip";
import { DesafioStatusChip } from "@/components/ui/desafio-status-chip";
import { DesafioSeveridadeChip } from "@/components/ui/desafio-severidade-chip";
import { NovoDesafioModal } from "./novo-desafio-modal";

export type OcorrenciaRow = {
  id: string;
  ocorrido_em: string;
  tentativas: number;
  falhas: number;
  nota: string | null;
  ambiente: string | null;
};

// Estruturalmente compatível com TaxonomiaLinha (desafios-dashboard.ts): é o
// que permite a listagem alimentar o envelope do export sem um adaptador.
export type TaxonomiaOption = {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  arquivada: boolean;
};

export type DesafioRow = {
  id: string;
  codigo: number;
  titulo: string;
  descricao: string | null;
  tipo: DesafioTipo;
  severidade: DesafioSeveridade;
  status: DesafioStatus;
  categoria: { id: string; nome: string; cor: string } | null;
  fluxo: { id: string; nome: string; cor: string } | null;
  tentativas: number;
  falhas: number;
  ocorrencias: OcorrenciaRow[];
  passos: string | null;
  esperado: string | null;
  obtido: string | null;
  ambiente: string | null;
  rota: string | null;
  evidencia_url: string | null;
  resolucao: string | null;
  resolvido_em: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type DesafioFilters = {
  query: string;
  categoria: string;
  fluxo: string;
  status: string;
  tipo: string;
  severidade: string;
};

// Sentinela do filtro "sem classificação": é o mesmo balde que a matriz do
// dashboard mostra, e sem ele não haveria como chegar aos não classificados.
export const SEM_CLASSIFICACAO = "sem";

// Pura e exportada para o teste (padrão de leads-view.tsx).
export function filterDesafios(
  desafios: DesafioRow[],
  filters: DesafioFilters,
): DesafioRow[] {
  const term = filters.query.trim().toLowerCase();

  return desafios.filter((desafio) => {
    if (filters.categoria !== "todas") {
      const id = desafio.categoria?.id ?? SEM_CLASSIFICACAO;
      if (id !== filters.categoria) return false;
    }
    if (filters.fluxo !== "todos") {
      const id = desafio.fluxo?.id ?? SEM_CLASSIFICACAO;
      if (id !== filters.fluxo) return false;
    }
    if (filters.status !== "todos" && desafio.status !== filters.status) return false;
    if (filters.tipo !== "todos" && desafio.tipo !== filters.tipo) return false;
    if (filters.severidade !== "todas" && desafio.severidade !== filters.severidade) {
      return false;
    }
    if (!term) return true;

    // O código é o rótulo que circula em conversa, então a busca aceita as duas
    // formas: "des-014" e "14".
    const campos = [
      desafio.titulo,
      desafio.descricao,
      desafio.rota,
      codigoDesafio(desafio.codigo),
      String(desafio.codigo),
    ];
    return campos.some((campo) => (campo ?? "").toLowerCase().includes(term));
  });
}

function opcoesTaxonomia(
  linhas: TaxonomiaOption[],
  todos: { value: string; label: string },
  semLabel: string,
) {
  return [
    todos,
    ...linhas.map((linha) => ({ value: linha.id, label: linha.nome })),
    { value: SEM_CLASSIFICACAO, label: semLabel },
  ];
}

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos os status" },
  ...DESAFIO_STATUS_ORDER.map((status) => ({
    value: status,
    label: DESAFIO_STATUSES[status].label,
  })),
];

const TIPO_OPTIONS = [
  { value: "todos", label: "Todos os tipos" },
  ...DESAFIO_TIPO_ORDER.map((tipo) => ({ value: tipo, label: DESAFIO_TIPOS[tipo].label })),
];

const SEVERIDADE_OPTIONS = [
  { value: "todas", label: "Todas as severidades" },
  ...DESAFIO_SEVERIDADE_ORDER.map((severidade) => ({
    value: severidade,
    label: DESAFIO_SEVERIDADES[severidade].label,
  })),
];

export function DesafiosView({
  desafios,
  categorias,
  fluxos,
}: {
  desafios: DesafioRow[];
  categorias: TaxonomiaOption[];
  fluxos: TaxonomiaOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [fluxo, setFluxo] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [severidade, setSeveridade] = useState("todas");

  const filtered = useMemo(
    () => filterDesafios(desafios, { query, categoria, fluxo, status, tipo, severidade }),
    [desafios, query, categoria, fluxo, status, tipo, severidade],
  );

  const filtering =
    query !== "" ||
    categoria !== "todas" ||
    fluxo !== "todos" ||
    status !== "todos" ||
    tipo !== "todos" ||
    severidade !== "todas";

  /*
   * Uma linha por desafio, e cada célula em UMA linha só (§8.6: a linha da
   * tabela é `h-14`, e conteúdo que quebra estoura a régua). Quem absorve a
   * sobra é a coluna do título, com `w-full max-w-0` — é o que faz as outras
   * medirem o próprio conteúdo e o título truncar em vez de empurrar.
   *
   * O `tipo` saiu da linha: é filtro no topo e chip no detalhe, e como segundo
   * chip embaixo do título ele custava a altura da linha inteira. A severidade
   * fica, porque é o sinal de triagem — é por ela que se decide o que olhar.
   */
  const columns: Column<DesafioRow>[] = [
    {
      key: "desafio",
      header: "Desafio",
      className: "w-full max-w-0",
      render: (desafio) => <Identidade desafio={desafio} />,
    },
    {
      key: "severidade",
      header: "Severidade",
      render: (desafio) => <DesafioSeveridadeChip severidade={desafio.severidade} compact />,
    },
    {
      // O teto vai no WRAPPER, não no `<td>`: em `table-layout: auto` o
      // navegador dimensiona a coluna pelo conteúdo e um `max-width` na célula
      // não segura — um nome de categoria longo esmagaria o título.
      key: "categoria",
      header: "Categoria",
      render: (desafio) => (
        <span className="flex max-w-44">
          <TaxonomiaChip
            nome={desafio.categoria?.nome ?? null}
            cor={desafio.categoria?.cor}
            compact
          />
        </span>
      ),
    },
    {
      key: "fluxo",
      header: "Fluxo",
      render: (desafio) => (
        <span className="flex max-w-40">
          <TaxonomiaChip nome={desafio.fluxo?.nome ?? null} cor={desafio.fluxo?.cor} compact />
        </span>
      ),
    },
    {
      key: "recorrencia",
      header: "Recorrência",
      className: "whitespace-nowrap",
      render: (desafio) => <Recorrencia desafio={desafio} />,
    },
    {
      key: "status",
      header: "Status",
      render: (desafio) => <DesafioStatusChip status={desafio.status} compact />,
    },
    {
      key: "registrado",
      header: "Registrado",
      className: "whitespace-nowrap",
      render: (desafio) => (
        <RelativeTime iso={desafio.created_at} className="text-slate-600" />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {filtering ? `${filtered.length} de ${desafios.length}` : desafios.length}{" "}
            {desafios.length === 1 ? "desafio" : "desafios"}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {/* Exporta o recorte visível, não a base: o que está na tela é o
                que vai para o arquivo — e o envelope registra "N de M", para
                ninguém montar um dashboard sobre um recorte achando que é
                tudo. */}
            <Button
              icon={ArrowDownTrayIcon}
              disabled={filtered.length === 0}
              onClick={() => exportar(filtered, desafios.length, categorias, fluxos)}
            >
              Exportar JSON ({filtered.length})
            </Button>
            <NovoDesafioModal categorias={categorias} fluxos={fluxos} />
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por título, descrição, rota ou código"
            size="lg"
            className="lg:w-80"
          />
          <Select
            aria-label="Filtrar por categoria"
            options={opcoesTaxonomia(
              categorias,
              { value: "todas", label: "Todas as categorias" },
              "Sem categoria",
            )}
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            className="lg:w-52"
          />
          <Select
            aria-label="Filtrar por fluxo"
            options={opcoesTaxonomia(
              fluxos,
              { value: "todos", label: "Todos os fluxos" },
              "Sem fluxo",
            )}
            value={fluxo}
            onChange={(event) => setFluxo(event.target.value)}
            className="lg:w-48"
          />
          <Select
            aria-label="Filtrar por status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="lg:w-44"
          />
          <Select
            aria-label="Filtrar por tipo"
            options={TIPO_OPTIONS}
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
            className="lg:w-40"
          />
          <Select
            aria-label="Filtrar por severidade"
            options={SEVERIDADE_OPTIONS}
            value={severidade}
            onChange={(event) => setSeveridade(event.target.value)}
            className="lg:w-48"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(desafio) => desafio.id}
        rowHref={(desafio) => `/desafios/${desafio.id}`}
        empty={
          <EmptyState
            icon={BugAntIcon}
            title={filtering ? "Nenhum desafio encontrado" : "Nenhum desafio ainda"}
            description={
              filtering
                ? "Ajuste a busca ou os filtros e tente novamente."
                : "Registre o primeiro bug ou atrito para começar a medir recorrência."
            }
          />
        }
        mobileCard={(desafio) => (
          <div
            role="link"
            tabIndex={0}
            onClick={(event) => {
              const alvo = event.target as HTMLElement;
              if (alvo.closest("a,button,select,input,label")) return;
              router.push(`/desafios/${desafio.id}`);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") router.push(`/desafios/${desafio.id}`);
            }}
            className={cn(
              "flex cursor-pointer flex-col gap-3 rounded-sm border border-slate-200 bg-white p-4",
              "transition-colors hover:border-slate-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
          >
            <Identidade desafio={desafio} />
            <div className="flex flex-wrap items-center gap-2">
              <DesafioSeveridadeChip severidade={desafio.severidade} compact />
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] leading-4 text-slate-500">
                {DESAFIO_TIPOS[desafio.tipo].label}
              </span>
              <DesafioStatusChip status={desafio.status} compact />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TaxonomiaChip
                nome={desafio.categoria?.nome ?? null}
                cor={desafio.categoria?.cor}
                compact
              />
              <TaxonomiaChip
                nome={desafio.fluxo?.nome ?? null}
                cor={desafio.fluxo?.cor}
                compact
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Recorrencia desafio={desafio} />
              <RelativeTime iso={desafio.created_at} className="text-xs text-slate-500" />
            </div>
          </div>
        )}
      />
    </div>
  );
}

function Identidade({ desafio }: { desafio: DesafioRow }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="shrink-0 text-xs tabular-nums text-slate-400">
        {codigoDesafio(desafio.codigo)}
      </span>
      <span className="truncate text-sm font-medium text-slate-800" title={desafio.titulo}>
        {desafio.titulo}
      </span>
    </div>
  );
}

/*
 * Percentual e amostra na mesma linha, sem barra: a barra era um terceiro nível
 * dentro de uma célula de 56px, e a amostra é o que dá sentido ao percentual —
 * "100%" de 1 de 1 e de 7 de 10 não valem a mesma coisa. A barra continua onde
 * há altura para ela: no card do detalhe e no dashboard.
 */
function Recorrencia({ desafio }: { desafio: DesafioRow }) {
  const recorrencia = recorrenciaDoDesafio(desafio);

  if (recorrencia.status === "sem_dados") {
    return (
      <span className="text-sm text-slate-400" aria-label="Sem medição de recorrência">
        —
      </span>
    );
  }

  return (
    <span
      className="flex items-baseline gap-2 whitespace-nowrap"
      aria-label={`${formatarProporcao(recorrencia)} tentativas falharam`}
    >
      <span className="text-sm font-semibold tabular-nums text-slate-800">
        {formatarRecorrencia(recorrencia)}
      </span>
      <span aria-hidden className="text-xs tabular-nums text-slate-500">
        {formatarProporcao(recorrencia)}
      </span>
    </span>
  );
}

/*
 * O `resumo` do arquivo descreve o RECORTE exportado, não a base — senão o JSON
 * traria 23 desafios e um panorama de 300. É computado aqui e PASSADO a
 * `desafiosParaJson`, que só serializa: uma aritmética só.
 */
function exportar(
  recorte: DesafioRow[],
  deTotal: number,
  categorias: TaxonomiaOption[],
  fluxos: TaxonomiaOption[],
) {
  const geradoEm = new Date().toISOString();
  const resumo = computeDesafiosDashboard({
    desafios: recorte,
    categorias,
    fluxos,
  });
  const payload = desafiosParaJson({
    desafios: recorte,
    categorias,
    fluxos,
    resumo,
    deTotal,
    geradoEm,
  });

  // O terceiro argumento não é opcional na prática: o default de downloadText é
  // CSV, e sem ele o browser salvaria um .json rotulado como planilha.
  downloadText(
    jsonFilename("desafios", geradoEm),
    desafiosParaTexto(payload),
    "application/json;charset=utf-8",
  );
}

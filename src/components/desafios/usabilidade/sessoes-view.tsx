"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  ClipboardDocumentListIcon,
  ChartBarSquareIcon,
} from "@heroicons/react/24/outline";
import { ButtonLink } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  TESTE_FLUXO_ORDER,
  TESTE_FLUXOS,
  TESTE_ORIGENS,
  TESTE_PERFIL_ORDER,
  TESTE_PERFIS,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { codigoSessao } from "@/lib/usabilidade/sessao";
import { withAlpha } from "@/lib/constants";
import { NovaSessaoModal } from "./nova-sessao-modal";
import type { SessaoRow } from "./mapear-sessao";

export type SessaoFilters = {
  query: string;
  perfil: string;
  fluxo: string;
  origem: string;
};

// Pura e exportada para o teste, no padrão de `filterDesafios`/`filterLeads`:
// o ambiente do Vitest é `node`, então o que se testa de um componente é a
// função que dá para tirar dele.
export function filterSessoes(
  sessoes: SessaoRow[],
  filters: SessaoFilters,
): SessaoRow[] {
  const termo = filters.query.trim().toLowerCase();

  return sessoes.filter((sessao) => {
    if (filters.perfil !== "todos" && sessao.perfil !== filters.perfil) return false;
    if (filters.fluxo !== "todos" && sessao.fluxo !== filters.fluxo) return false;
    if (filters.origem !== "todas" && sessao.origem !== filters.origem) return false;
    if (!termo) return true;

    // O código casa nas duas formas, "tu-014" e "14" — mesma decisão da busca
    // de desafios.
    const campos = [
      codigoSessao(sessao.codigo),
      String(sessao.codigo),
      sessao.observacoes ?? "",
      ...Object.values(sessao.respostas).map((valor) => String(valor)),
    ];
    return campos.some((campo) => campo.toLowerCase().includes(termo));
  });
}

const PERFIL_OPTIONS = [
  { value: "todos", label: "Todos os perfis" },
  ...TESTE_PERFIL_ORDER.map((id) => ({ value: id, label: TESTE_PERFIS[id].label })),
];

const FLUXO_OPTIONS = [
  { value: "todos", label: "Todos os fluxos" },
  ...TESTE_FLUXO_ORDER.map((id) => ({ value: id, label: TESTE_FLUXOS[id].label })),
];

const ORIGEM_OPTIONS = [
  { value: "todas", label: "Todas as origens" },
  ...Object.entries(TESTE_ORIGENS).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

function Marcador({ label, cor }: { label: string; cor: string }) {
  return (
    <span
      className="inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: withAlpha(cor, 0.08),
        borderColor: withAlpha(cor, 0.35),
        color: cor,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cor }} />
      {label}
    </span>
  );
}

export function SessoesView({ sessoes }: { sessoes: SessaoRow[] }) {
  const [query, setQuery] = useState("");
  const [perfil, setPerfil] = useState("todos");
  const [fluxo, setFluxo] = useState("todos");
  const [origem, setOrigem] = useState("todas");

  const filtered = useMemo(
    () => filterSessoes(sessoes, { query, perfil, fluxo, origem }),
    [sessoes, query, perfil, fluxo, origem],
  );
  const filtrando =
    query !== "" || perfil !== "todos" || fluxo !== "todos" || origem !== "todas";

  // O recorte viaja para a leitura agregada: sem isso, os números descreveriam
  // um conjunto diferente do que a pessoa estava olhando.
  const recorte = new URLSearchParams();
  if (perfil !== "todos") recorte.set("perfil", perfil);
  if (fluxo !== "todos") recorte.set("fluxo", fluxo);
  if (origem !== "todas") recorte.set("origem", origem);
  const hrefResultados = `/desafios/usabilidade/resultados${
    recorte.size > 0 ? `?${recorte.toString()}` : ""
  }`;

  const columns: Column<SessaoRow>[] = [
    {
      key: "sessao",
      header: "Sessão",
      className: "w-full max-w-0",
      render: (sessao) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-slate-500">
            {codigoSessao(sessao.codigo)}
          </span>
          <span className="truncate text-slate-800">
            {sessao.observacoes?.trim() || "Sem observações"}
          </span>
        </div>
      ),
    },
    {
      key: "perfil",
      header: "Perfil",
      render: (sessao) => (
        <Marcador
          label={TESTE_PERFIS[sessao.perfil].label}
          cor={TESTE_PERFIS[sessao.perfil].color}
        />
      ),
    },
    {
      key: "fluxo",
      header: "Fluxo",
      render: (sessao) => (
        <Marcador
          label={TESTE_FLUXOS[sessao.fluxo].label}
          cor={TESTE_FLUXOS[sessao.fluxo].color}
        />
      ),
    },
    {
      key: "achados",
      header: "Achados",
      className: "whitespace-nowrap text-right tabular-nums",
      render: (sessao) => (
        <span className="text-slate-700">{sessao.achados || "—"}</span>
      ),
    },
    {
      key: "realizado",
      header: "Realizada",
      className: "whitespace-nowrap",
      render: (sessao) => (
        <span className="text-slate-600">{formatDate(sessao.realizado_em)}</span>
      ),
    },
    {
      key: "registrada",
      header: "Registrada",
      className: "whitespace-nowrap",
      render: (sessao) => (
        <RelativeTime iso={sessao.created_at} className="text-slate-600" />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {filtrando ? `${filtered.length} de ${sessoes.length}` : sessoes.length}{" "}
            {sessoes.length === 1 ? "sessão" : "sessões"}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink
              href={hrefResultados}
              variant="secondary"
              icon={ChartBarSquareIcon}
              disabled={sessoes.length === 0}
            >
              Ver resultados
            </ButtonLink>
            <ButtonLink
              href="/desafios/usabilidade/importar"
              variant="secondary"
              icon={ArrowDownTrayIcon}
            >
              Importar
            </ButtonLink>
            <NovaSessaoModal />
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por código, observação ou resposta"
            size="lg"
            className="lg:w-80"
          />
          <Select
            aria-label="Filtrar por perfil"
            options={PERFIL_OPTIONS}
            value={perfil}
            onChange={(event) => setPerfil(event.target.value)}
            className="lg:w-44"
          />
          <Select
            aria-label="Filtrar por fluxo"
            options={FLUXO_OPTIONS}
            value={fluxo}
            onChange={(event) => setFluxo(event.target.value)}
            className="lg:w-48"
          />
          <Select
            aria-label="Filtrar por origem"
            options={ORIGEM_OPTIONS}
            value={origem}
            onChange={(event) => setOrigem(event.target.value)}
            className="lg:w-44"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(sessao) => sessao.id}
        rowHref={(sessao) => `/desafios/usabilidade/${sessao.id}`}
        mobileCard={(sessao) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-slate-500">
                {codigoSessao(sessao.codigo)}
              </span>
              <span className="text-xs text-slate-500">
                {formatDate(sessao.realizado_em)}
              </span>
            </div>
            <span className="text-sm font-medium text-slate-800">
              {sessao.observacoes?.trim() || "Sem observações"}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Marcador
                label={TESTE_PERFIS[sessao.perfil].label}
                cor={TESTE_PERFIS[sessao.perfil].color}
              />
              <Marcador
                label={TESTE_FLUXOS[sessao.fluxo].label}
                cor={TESTE_FLUXOS[sessao.fluxo].color}
              />
            </div>
          </div>
        )}
        empty={
          <EmptyState
            icon={ClipboardDocumentListIcon}
            title={filtrando ? "Nenhuma sessão encontrada" : "Nenhuma sessão ainda"}
            description={
              filtrando
                ? "Ajuste a busca ou os filtros e tente novamente."
                : "Registre a primeira sessão de teste, ou importe o material de uma que já aconteceu."
            }
            action={filtrando ? undefined : <NovaSessaoModal />}
          />
        }
      />
    </div>
  );
}

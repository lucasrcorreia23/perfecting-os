"use client";

import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import {
  DESAFIO_SEVERIDADES,
  DESAFIO_SEVERIDADE_ORDER,
  DESAFIO_STATUSES,
  DESAFIO_STATUS_ORDER,
  TREND,
  withAlpha,
} from "@/lib/constants";
import {
  codigoDesafio,
  formatarProporcao,
  formatarRecorrencia,
  type Recorrencia,
} from "@/lib/desafios";
import type { DesafiosDashboard, LeituraTaxonomia } from "@/lib/desafios-dashboard";
import {
  desafiosParaJson,
  desafiosParaTexto,
  jsonFilename,
  type ExportableDesafio,
} from "@/lib/desafios-export";
import type { TaxonomiaLinha } from "@/lib/desafios-dashboard";
import { downloadText } from "@/lib/download";
import { Button } from "@/components/ui/button";
import { MatrizCategoriaFluxo } from "./matriz-categoria-fluxo";

export function DesafiosDashboardView({
  resumo,
  desafios,
  categorias,
  fluxos,
}: {
  resumo: DesafiosDashboard;
  desafios: ExportableDesafio[];
  categorias: TaxonomiaLinha[];
  fluxos: TaxonomiaLinha[];
}) {
  function exportar() {
    const geradoEm = new Date().toISOString();
    // O resumo vai como está na tela: `desafiosParaJson` recebe, nunca
    // recalcula — é o que impede o arquivo de divergir do que se está lendo.
    const payload = desafiosParaJson({
      desafios,
      categorias,
      fluxos,
      resumo,
      deTotal: desafios.length,
      geradoEm,
    });
    downloadText(
      jsonFilename("desafios", geradoEm),
      desafiosParaTexto(payload),
      "application/json;charset=utf-8",
    );
  }

  if (resumo.total === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-8">
        <h2 className="text-sm font-semibold text-slate-700">Ainda não há o que cruzar</h2>
        <p className="max-w-lg text-sm text-slate-500">
          Registre desafios em{" "}
          <Link href="/desafios" className="text-primary hover:underline">
            Desafios
          </Link>{" "}
          e classifique-os por categoria e fluxo. O cruzamento e a recorrência
          aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Panorama</h2>
        <Button icon={ArrowDownTrayIcon} onClick={exportar}>
          Exportar JSON ({resumo.total})
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tile label="Desafios registrados" valor={String(resumo.total)} nota={`${resumo.abertos} em aberto`} />
        <Tile
          label="Recorrência dos bugs"
          valor={formatarRecorrencia(resumo.recorrenciaGeral)}
          nota={
            resumo.recorrenciaGeral.status === "medido"
              ? `${formatarProporcao(resumo.recorrenciaGeral)} tentativas`
              : "Nenhum bug medido ainda"
          }
          barra={resumo.recorrenciaGeral}
        />
        <Tile
          label="Bugs sem medição"
          valor={String(resumo.bugsSemMedicao)}
          // O denominador honesto do KPI ao lado: sem esta linha, "70%" parece
          // falar de todos os bugs, e fala só dos que alguém contou.
          nota={`de ${resumo.bugs} bug(s) — fora da conta ao lado`}
        />
        <Tile
          label="Críticos em aberto"
          valor={String(resumo.criticosAbertos)}
          nota="Severidade crítica, ainda sem desfecho"
        />
      </div>

      <MatrizCategoriaFluxo matriz={resumo.matriz} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankingTaxonomia
          titulo="Por categoria"
          descricao="Que tipo de problema aparece mais."
          linhas={resumo.porCategoria}
        />
        <RankingTaxonomia
          titulo="Por fluxo"
          descricao="Onde na jornada o produto dói."
          linhas={resumo.porFluxo}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Distribuicao
          titulo="Por status"
          itens={DESAFIO_STATUS_ORDER.map((status) => ({
            chave: status,
            label: DESAFIO_STATUSES[status].label,
            cor: DESAFIO_STATUSES[status].color,
            valor: resumo.porStatus[status],
          }))}
        />
        <Distribuicao
          titulo="Por severidade"
          itens={DESAFIO_SEVERIDADE_ORDER.map((severidade) => ({
            chave: severidade,
            label: DESAFIO_SEVERIDADES[severidade].label,
            cor: DESAFIO_SEVERIDADES[severidade].color,
            valor: resumo.porSeveridade[severidade],
          }))}
        />
      </div>

      <Reincidentes resumo={resumo} />
    </div>
  );
}

// No molde do BigTile de poc-overview.tsx, e não do KpiCard: o valor aqui é
// string (a recorrência é "70%", não 70) e não há tendência reconstituível.
function Tile({
  label,
  valor,
  nota,
  barra,
}: {
  label: string;
  valor: string;
  nota: string;
  barra?: Recorrencia;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-4">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-(length:--text-score-md) font-semibold leading-none tabular-nums text-slate-900">
        {valor}
      </span>
      <span className="text-xs tabular-nums text-slate-500">{nota}</span>
      {barra ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-500"
            style={{
              width:
                barra.status === "medido" ? `${Math.max(2, barra.pct * 100)}%` : "0%",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function RankingTaxonomia({
  titulo,
  descricao,
  linhas,
}: {
  titulo: string;
  descricao: string;
  linhas: LeituraTaxonomia[];
}) {
  const max = Math.max(1, ...linhas.map((linha) => linha.total));

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-slate-700">{titulo}</h2>
        <p className="text-xs text-slate-500">{descricao}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {linhas.map((linha) => (
          <li key={linha.id ?? "sem"} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-sm text-slate-700">
              {linha.nome}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(linha.total / max) * 100}%`,
                  backgroundColor: linha.cor,
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm tabular-nums text-slate-700">
              {linha.total}
            </span>
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-slate-500">
              {formatarRecorrencia(linha.recorrencia)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Distribuicao({
  titulo,
  itens,
}: {
  titulo: string;
  itens: { chave: string; label: string; cor: string; valor: number }[];
}) {
  const max = Math.max(1, ...itens.map((item) => item.valor));

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-700">{titulo}</h2>
      <ul className="flex flex-col gap-3">
        {itens.map((item) => (
          <li key={item.chave} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm text-slate-700">{item.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(item.valor / max) * 100}%`,
                  backgroundColor: item.cor,
                }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-sm tabular-nums text-slate-700">
              {item.valor}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Reincidentes({ resumo }: { resumo: DesafiosDashboard }) {
  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-slate-700">Mais recorrentes</h2>
        <p className="max-w-2xl text-xs text-slate-500">
          Só entram desafios com pelo menos três tentativas medidas: 100% de uma
          tentativa não é 100% de nada.
        </p>
      </div>

      {resumo.reincidentes.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhum desafio tem amostra suficiente ainda. Registre ocorrências para
          medir recorrência.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {resumo.reincidentes.map((item) => {
            const pct =
              item.recorrencia.status === "medido" ? item.recorrencia.pct : 0;
            return (
              <li key={item.id} className="flex items-center gap-3">
                <Link
                  href={`/desafios/${item.id}`}
                  className="flex min-w-0 flex-1 items-baseline gap-2 hover:underline"
                >
                  <span className="shrink-0 text-xs tabular-nums text-slate-400">
                    {codigoDesafio(item.codigo)}
                  </span>
                  <span className="truncate text-sm text-slate-700">{item.titulo}</span>
                </Link>
                <div
                  className="hidden h-2 w-32 shrink-0 overflow-hidden rounded-full bg-slate-100 sm:block"
                  role="img"
                  aria-label={`${formatarProporcao(item.recorrencia)} tentativas falharam`}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, pct * 100)}%`,
                      backgroundColor: withAlpha(TREND.negativo, 0.75),
                    }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm tabular-nums text-slate-700">
                  {formatarRecorrencia(item.recorrencia)}
                </span>
                <span className="hidden w-20 shrink-0 text-right text-xs tabular-nums text-slate-500 sm:block">
                  {formatarProporcao(item.recorrencia)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

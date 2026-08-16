"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { CENARIOS } from "@/lib/calculadora/constants";
import {
  formatBRL,
  formatDias,
  formatMeses,
  formatPct,
  formatX,
} from "@/lib/calculadora/format";
import type { TimeModelo } from "@/lib/calculadora/modelo";
import type { ResultadoConsolidado } from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { HeroResultado } from "./resultado-time";

// Consolidado multi-time (§4.11): hero acima dos times, SEMPRE ponderado
// (Σ valor ÷ Σ preço) — nunca média dos ROIs.
export function ConsolidadoView({
  consolidado,
  times,
  timeAtivo,
  onSelecionarTime,
  onAddTime,
  podeAdicionar = false,
}: {
  consolidado: ResultadoConsolidado;
  times: TimeModelo[];
  timeAtivo: string;
  onSelecionarTime: (timeId: string) => void;
  onAddTime?: () => void;
  podeAdicionar?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {consolidado.status === "ok" ? (
        <HeroResultado
          titulo="Sua conta consolidada: todos os times"
          roi={consolidado.roi}
          paybackMeses={consolidado.paybackMeses}
          valorAno={consolidado.valorAno}
          precoAno={consolidado.precoAno}
          frase={`${consolidado.totalAssentos} assentos cobrindo ${consolidado.totalVendedores} vendedores em ${times.length} times. ROI ponderado pelo investimento de cada time, nunca a média simples, que distorceria a conta.`}
          tom="destaque"
        />
      ) : (
        <section className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-6">
          <span className="text-(length:--text-score-lg) font-semibold leading-12 tabular-nums text-slate-300">
            —
          </span>
          <p className="text-sm text-slate-500">
            O consolidado da conta aparece quando todos os times estiverem
            completos, nunca com resultado parcial.
          </p>
        </section>
      )}

      {consolidado.status === "ok" ? (
        <div className="flex flex-wrap gap-x-6 gap-y-1 px-1 text-xs text-slate-500">
          <span>
            Cobertura da conta:{" "}
            <span className="font-medium tabular-nums text-slate-700">
              {formatPct(consolidado.cobertura * 100, 0)}
            </span>
          </span>
          <span>
            Receita por vendedor:{" "}
            <span className="font-medium tabular-nums text-slate-700">
              {formatBRL(consolidado.receitaPorVendedor)}/mês
            </span>
          </span>
          <span>
            Conversão média:{" "}
            <span className="font-medium tabular-nums text-slate-700">
              {formatPct(consolidado.conversaoMediaPct, 1)}
            </span>
          </span>
          {consolidado.cicloMedioDias !== null ? (
            <span>
              Ciclo médio:{" "}
              <span className="font-medium tabular-nums text-slate-700">
                {formatDias(consolidado.cicloMedioDias)}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Times da conta">
        {times.map((time) => {
          const ativo = time.id === timeAtivo;
          const ok = time.resultado.status === "ok";
          return (
            <button
              key={time.id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => onSelecionarTime(time.id)}
              className={cn(
                "flex min-h-[44px] cursor-pointer flex-col justify-center gap-1 rounded-sm border px-4 py-2 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                ativo
                  ? "border-[#2E63CD]/50 bg-[#2E63CD]/[0.04]"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  ativo ? "text-[#2E63CD]" : "text-slate-800",
                )}
              >
                {time.nome}
              </span>
              <span className="text-xs tabular-nums text-slate-500">
                {ok && time.resultado.status === "ok"
                  ? `ROI ${formatX(time.resultado.roi)} · payback ${formatMeses(time.resultado.paybackMeses)} · ${
                      time.sel.modo === "preset"
                        ? CENARIOS[time.sel.cenario].label
                        : "personalizado"
                    }`
                  : `${13 - (time.resultado.status === "incompleto" ? time.resultado.faltando.length : 0)}/13 campos`}
              </span>
            </button>
          );
        })}
        {podeAdicionar && onAddTime ? (
          <button
            type="button"
            onClick={onAddTime}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-sm border border-dashed border-slate-300 bg-white px-4 text-sm font-medium text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            <PlusIcon className="h-4 w-4" aria-hidden />
            Adicionar time
          </button>
        ) : null}
      </div>
    </div>
  );
}

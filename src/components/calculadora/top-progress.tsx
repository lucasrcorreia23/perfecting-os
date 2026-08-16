"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// Detecção de hidratação sem setState em efeito: o snapshot do servidor diz
// `false`, o do cliente diz `true`, e nada nunca muda depois (subscribe vazio).
const semAssinatura = () => () => {};
const noServidor = () => false;
const noCliente = () => true;

export type ProgressoTime = {
  id: string;
  nome: string;
  etapas: number;
  totalEtapas: number;
};

// Linha de progresso colada no topo da viewport. Vai por portal no body
// porque o `main` da calculadora anima com transform (.page-fade-in) e um
// `fixed` lá dentro se ancoraria nele, rolando junto com a página.
export function TopProgress({
  preenchidos,
  total,
  times,
}: {
  preenchidos: number;
  total: number;
  times: ProgressoTime[];
}) {
  // Portal só DEPOIS de hidratar. `typeof document === "undefined"` parece
  // equivalente, mas devolve árvores diferentes no servidor (null) e na
  // primeira renderização do cliente (o portal), e a hidratação falha — é o
  // "server/client branch" que o React lista como causa.
  const hidratado = useSyncExternalStore(semAssinatura, noCliente, noServidor);
  if (!hidratado) return null;

  const pct = total > 0 ? Math.round((preenchidos / total) * 100) : 0;

  return createPortal(
    // A faixa de hover é mais alta que a barra: 4px seria alvo impossível de
    // acertar com o mouse.
    <div className="group fixed inset-x-0 top-0 z-(--z-header) h-3">
      <div
        role="progressbar"
        aria-label="Progresso do preenchimento"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1 bg-slate-200/70"
      >
        <div
          className="h-full rounded-r-full bg-[#2E63CD] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div
        className={cn(
          "pointer-events-none invisible absolute left-1/2 top-3 flex -translate-x-1/2 flex-col gap-2",
          "rounded-sm border border-slate-200 bg-white p-3 shadow-[var(--shadow-md)]",
          "opacity-0 transition-opacity group-hover:visible group-hover:opacity-100",
        )}
      >
        <span className="whitespace-nowrap text-xs font-semibold text-slate-900">
          {pct}% preenchido
          <span className="font-normal text-slate-400">
            {" "}
            · {preenchidos} de {total} campos
          </span>
        </span>
        <div className="flex flex-col gap-1">
          {times.map((time) => {
            const completo = time.etapas === time.totalEtapas;
            return (
              <div
                key={time.id}
                className="flex items-center justify-between gap-6 whitespace-nowrap text-xs"
              >
                <span className="text-slate-500">{time.nome}</span>
                <span
                  className={cn(
                    "tabular-nums",
                    completo ? "font-medium text-trend-positive-ink" : "text-slate-400",
                  )}
                >
                  {time.etapas} de {time.totalEtapas} etapas
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

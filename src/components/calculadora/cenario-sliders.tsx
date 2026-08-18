"use client";

import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { CICLO_DIAS_MINIMO, deltaConvMax, deltasEfetivos } from "@/lib/calculadora/calc";
import {
  CENARIOS,
  FINE_TUNE_RAMPA_MAX,
  FINE_TUNE_TICKET_MAX,
  REDUCAO_CICLO_MAX,
} from "@/lib/calculadora/constants";
import { formatNumero, formatPct } from "@/lib/calculadora/format";
import type {
  Cenario,
  CenarioSelecionado,
  Deltas,
  EntradasTime,
} from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { HintTooltip } from "@/components/ui/tooltip";
import { SeloEvidencia } from "./selo-evidencia";

// "De onde vem": presets de cenário (§4.8) + sliders de modelagem por
// alavanca. Mover um slider entra em "parâmetros personalizados"; os valores
// passam SEMPRE por deltasEfetivos — os tetos do modelo nunca são relaxados.

const ORDEM: Cenario[] = ["conservador", "realista", "otimista"];

function Slider({
  id,
  label,
  leitura,
  min,
  max,
  step,
  valor,
  faixaTexto,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  leitura: string;
  min: number;
  max: number;
  step: number;
  valor: number;
  faixaTexto: string;
  onChange: (valor: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{leitura}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={valor}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "h-11 w-full cursor-pointer accent-[#2E63CD]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 rounded-full",
        )}
      />
      <p className="text-sm leading-6 text-slate-600">
        {faixaTexto} · mover recalcula o ROI na hora
      </p>
    </div>
  );
}

export function CenarioSliders({
  sel,
  entradas,
  onChange,
}: {
  sel: CenarioSelecionado;
  entradas: EntradasTime;
  onChange: (sel: CenarioSelecionado) => void;
}) {
  const deltas = deltasEfetivos(sel, entradas);
  const conv = entradas.conversaoPct;
  const convMax = conv !== null && conv > 0 ? deltaConvMax(conv) : 0;
  const temCiclo = entradas.cicloDias !== null && entradas.cicloDias > 0;
  // Abaixo de 7 dias o ciclo opera no percentual do cenário (Excel
  // Engine!C53) — o slider de dias só existe no ramo de dias inteiros.
  const cicloEmDias = temCiclo && entradas.cicloDias! >= CICLO_DIAS_MINIMO;
  const cicloMax = cicloEmDias ? Math.round(entradas.cicloDias! * REDUCAO_CICLO_MAX) : 0;

  function aplicarDelta(patch: Partial<Deltas>) {
    // Persiste só o shape de Deltas — cicloPct é derivado, não estado.
    const { ticketPct, rampaPct, cicloDiasMenos, convPp } = deltas;
    onChange({
      modo: "personalizado",
      base: sel.modo === "preset" ? sel.cenario : sel.base,
      deltas: { ticketPct, rampaPct, cicloDiasMenos, convPp, ...patch },
    });
  }

  const convNova = conv !== null ? conv + deltas.convPp : null;
  const cicloNovo = cicloEmDias ? entradas.cicloDias! - deltas.cicloDiasMenos : null;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Não repetir o formato do eyebrow da seção ("De onde vem o
              número"): dois rótulos quase iguais, empilhados, é
              ruído. Aqui é título de card, como nos vizinhos. */}
          <h3 className="text-sm font-semibold text-slate-700">
            Cenário e parâmetros
          </h3>
          {sel.modo === "personalizado" ? <SeloEvidencia selo="personalizado" /> : null}
        </div>
        {sel.modo === "personalizado" ? (
          <button
            type="button"
            onClick={() => onChange({ modo: "preset", cenario: sel.base })}
            className={cn(
              "inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] font-medium leading-5 text-[#2E63CD] sm:min-h-8",
              "transition-colors hover:text-[#1e4a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
            )}
          >
            <ArrowUturnLeftIcon className="h-4 w-4" aria-hidden />
            Voltar ao cenário
          </button>
        ) : null}
      </div>

      {/* A descrição de cada cenário virou balão. Como texto no card, ela dava
          uma, duas ou três linhas conforme o cenário, e os três cartões de uma
          mesma escolha ficavam de alturas diferentes — o de maior descrição
          parecia o mais importante. Com o nome sozinho, os três pesam igual e
          a escolha volta a ser entre cenários, não entre parágrafos.

          O balão é IRMÃO do botão, nunca filho: `HintTooltip` é um <button>, e
          botão dentro de botão é HTML inválido. O wrapper `relative` ancora os
          dois e é onde o balão se posiciona. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {ORDEM.map((cenario) => {
          const ativo = sel.modo === "preset" && sel.cenario === cenario;
          const base = sel.modo === "personalizado" && sel.base === cenario;
          return (
            <div key={cenario} className="relative">
              <button
                type="button"
                onClick={() => onChange({ modo: "preset", cenario })}
                aria-pressed={ativo}
                className={cn(
                  "flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-sm border py-3 pl-4 pr-11 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  ativo
                    ? "border-[#2E63CD]/50 bg-[#2E63CD]/[0.04]"
                    : "border-slate-200 bg-white hover:border-slate-300",
                  base && "border-dashed",
                )}
              >
                <span
                  className={cn(
                    "text-base font-medium",
                    ativo ? "text-[#2E63CD]" : "text-slate-800",
                  )}
                >
                  {CENARIOS[cenario].label}
                </span>
                {cenario === "conservador" ? (
                  <span className="text-xs font-semibold text-slate-500">
                    Recomendado
                  </span>
                ) : null}
              </button>
              {/* Último card alinha o balão pela direita para não vazar da
                  coluna. */}
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <HintTooltip
                  text={CENARIOS[cenario].descricao}
                  align={cenario === "otimista" ? "right" : undefined}
                />
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        <Slider
          id="slider-conv"
          label="Ganho de taxa de conversão"
          leitura={`+${formatNumero(deltas.convPp, 1)} p.p.`}
          min={0}
          max={convMax}
          step={0.1}
          valor={deltas.convPp}
          faixaTexto={
            conv !== null && convNova !== null
              ? `${formatPct(conv, 1)} → ${formatPct(convNova, 1)} nas mesmas oportunidades trabalhadas · teto de +${formatNumero(convMax, 1)} p.p.`
              : "preencha a taxa de conversão para modelar"
          }
          onChange={(valor) => aplicarDelta({ convPp: valor })}
          disabled={convMax === 0}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Slider
            id="slider-ticket"
            label="Quanto o ticket pode subir"
            leitura={`+${formatNumero(deltas.ticketPct * 100, 0)}%`}
            min={0}
            max={FINE_TUNE_TICKET_MAX * 100}
            step={1}
            valor={Math.round(deltas.ticketPct * 100)}
            faixaTexto={`0% a ${FINE_TUNE_TICKET_MAX * 100}% · teto do modelo`}
            onChange={(valor) => aplicarDelta({ ticketPct: valor / 100 })}
          />
          <Slider
            id="slider-rampa"
            label="Quanto a rampa pode encurtar"
            leitura={`−${formatNumero(deltas.rampaPct * 100, 0)}%`}
            min={0}
            max={FINE_TUNE_RAMPA_MAX * 100}
            step={5}
            valor={Math.round(deltas.rampaPct * 100)}
            faixaTexto={`0% a ${FINE_TUNE_RAMPA_MAX * 100}% · teto do modelo`}
            onChange={(valor) => aplicarDelta({ rampaPct: valor / 100 })}
          />
        </div>
        {cicloEmDias ? (
          <Slider
            id="slider-ciclo"
            label="Quantos dias a menos no ciclo de venda"
            leitura={`−${deltas.cicloDiasMenos} ${deltas.cicloDiasMenos === 1 ? "dia" : "dias"} · −${formatNumero((deltas.cicloDiasMenos / entradas.cicloDias!) * 100, 0)}%`}
            min={0}
            max={cicloMax}
            step={1}
            valor={deltas.cicloDiasMenos}
            faixaTexto={`${cicloNovo} dias em vez de ${entradas.cicloDias} · redução máxima de 30%`}
            onChange={(valor) => aplicarDelta({ cicloDiasMenos: valor })}
          />
        ) : temCiclo ? (
          <p className="text-sm leading-6 text-slate-600">
            Com ciclo abaixo de {CICLO_DIAS_MINIMO} dias, a redução usa o percentual do
            cenário (até {REDUCAO_CICLO_MAX * 100}%) — dias inteiros seriam grossos demais.
          </p>
        ) : (
          <p className="text-sm leading-6 text-slate-600">
            A alavanca de ciclo aparece quando o passo de funil (ciclo + oportunidades)
            estiver preenchido.
          </p>
        )}
      </div>
    </section>
  );
}

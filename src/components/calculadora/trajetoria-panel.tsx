"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowUturnLeftIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { formatBRL, formatBRLCompacto, formatMeses } from "@/lib/calculadora/format";
import {
  painelA,
  painelB,
  pisoPonto,
  reconciliar,
  tetoPonto,
  trajetoriaBase,
} from "@/lib/calculadora/trajetoria";
import type { PontoMes } from "@/lib/calculadora/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SeloEvidencia } from "./selo-evidencia";

// Painéis A e B da trajetória (§4.12) em SVG próprio — zero dependências.
// Editar a trajetória NUNCA altera ROI/payback/valor do ano (invariante 4):
// os números vêm prontos do resultado; aqui só se redesenha a forma.

const VB_W = 640;
const VB_H = 260;
const PAD = { top: 18, right: 20, bottom: 30, left: 64 };

type Escala = {
  x: (mes: number) => number;
  y: (valor: number) => number;
  yInverso: (py: number) => number;
  yMin: number;
  yMax: number;
};

function escala(yMin: number, yMax: number): Escala {
  const spanY = yMax - yMin || 1;
  const plotW = VB_W - PAD.left - PAD.right;
  const plotH = VB_H - PAD.top - PAD.bottom;
  return {
    x: (mes) => PAD.left + (mes / 12) * plotW,
    y: (valor) => PAD.top + (1 - (valor - yMin) / spanY) * plotH,
    yInverso: (py) => yMin + (1 - (py - PAD.top) / plotH) * spanY,
    yMin,
    yMax,
  };
}

function caminho(pontos: PontoMes[], esc: Escala, comecoNoZero = true): string {
  const partes = pontos.map(
    (ponto, index) =>
      `${index === 0 && !comecoNoZero ? "M" : "L"}${esc.x(ponto.mes).toFixed(1)},${esc.y(ponto.valor).toFixed(1)}`,
  );
  return comecoNoZero
    ? `M${esc.x(0).toFixed(1)},${esc.y(0).toFixed(1)}${partes.join("")}`
    : partes.join("");
}

function EixoY({ esc }: { esc: Escala }) {
  const ticks = 4;
  return (
    <g aria-hidden>
      {Array.from({ length: ticks + 1 }, (_, index) => {
        const valor = esc.yMin + ((esc.yMax - esc.yMin) / ticks) * index;
        const py = esc.y(valor);
        return (
          <g key={index}>
            <line
              x1={PAD.left}
              x2={VB_W - PAD.right}
              y1={py}
              y2={py}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray={valor === 0 ? undefined : "3 4"}
            />
            <text
              x={PAD.left - 8}
              y={py + 3.5}
              textAnchor="end"
              fontSize={10}
              fill="#94a3b8"
            >
              {formatBRLCompacto(valor)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function EixoX({ esc }: { esc: Escala }) {
  return (
    <g aria-hidden>
      {Array.from({ length: 13 }, (_, mes) => (
        <text
          key={mes}
          x={esc.x(mes)}
          y={VB_H - 10}
          textAnchor="middle"
          fontSize={10}
          fill="#94a3b8"
        >
          {mes}
        </text>
      ))}
      <text x={VB_W - PAD.right} y={VB_H - 0.5} textAnchor="end" fontSize={9} fill="#cbd5e1">
        meses
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Painel A — margem acumulada, com edição por arrasto dos 12 checkpoints
// ---------------------------------------------------------------------------

export function PainelATrajetoria({
  margemMensalAtual,
  G,
  editada,
  onEditar,
  readOnly = false,
  nota,
  semCard = false,
}: {
  margemMensalAtual: number;
  G: number;
  editada: number[] | null;
  onEditar?: (g: number[] | null) => void;
  readOnly?: boolean;
  // Aviso da re-reconciliação (§8). Tem slot próprio: antes vinha de fora com
  // margem negativa, remendando a falta de lugar para ele.
  nota?: string | null;
  // Dentro do card de abas o painel é conteúdo, não superfície.
  semCard?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<number | null>(null);

  const margemAnual = margemMensalAtual * 12;
  const g = useMemo(() => editada ?? trajetoriaBase(G), [editada, G]);
  const series = useMemo(() => painelA(margemMensalAtual, g), [margemMensalAtual, g]);
  const referencia = useMemo(
    () => (editada ? painelA(margemMensalAtual, trajetoriaBase(G)) : null),
    [editada, margemMensalAtual, G],
  );

  const yMax = Math.max(series.comPrograma[11].valor, series.semPrograma[11].valor) * 1.05;
  const yMin = Math.min(0, ...series.comPrograma.map((ponto) => ponto.valor)) * 1.05;
  const esc = escala(yMin, yMax);

  // Arrastar o checkpoint k muda o acumulado no mês k; o delta vira g_k e a
  // reconciliação redistribui o resto preservando Σg = G.
  const aoArrastar = useCallback(
    (clientY: number) => {
      const index = dragRef.current;
      const svg = svgRef.current;
      if (index === null || !svg || !onEditar) return;
      const rect = svg.getBoundingClientRect();
      const py = ((clientY - rect.top) / rect.height) * VB_H;
      const acumAlvo = esc.yInverso(py);
      const acumAnterior = index === 0 ? 0 : series.comPrograma[index - 1].valor;
      const gAlvo = acumAlvo - acumAnterior - margemMensalAtual;
      const piso = pisoPonto(margemAnual);
      const teto = tetoPonto(margemAnual, G);
      const novo = [...g];
      novo[index] = Math.min(Math.max(gAlvo, piso), teto);
      const { pontos } = reconciliar(novo, G, margemAnual, index);
      onEditar(pontos);
    },
    [esc, series, g, G, margemAnual, margemMensalAtual, onEditar],
  );

  const editavel = editando && !readOnly && onEditar && G > 0;

  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        !semCard && "rounded-sm border border-slate-200 bg-white p-5 sm:p-6",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {semCard ? null : (
            <h3 className="text-sm font-semibold text-slate-900">Trajetória projetada</h3>
          )}
          <SeloEvidencia selo={editada ? "dado_do_cliente" : "projecao"} />
          {editada ? (
            <span className="text-xs text-slate-400">
              a reta original segue como média projetada, base do ROI
            </span>
          ) : null}
        </div>
        {!readOnly && onEditar ? (
          <div className="flex items-center gap-2">
            {editada ? (
              <Button
                variant="secondary"
                size="sm"
                icon={ArrowUturnLeftIcon}
                onClick={() => {
                  onEditar(null);
                  setEditando(false);
                }}
              >
                Restaurar reta
              </Button>
            ) : null}
            <Button
              variant={editando ? "primary" : "secondary"}
              size="sm"
              icon={PencilSquareIcon}
              onClick={() => setEditando((atual) => !atual)}
              disabled={G <= 0}
            >
              {editando ? "Concluir edição" : "Editar trajetória"}
            </Button>
          </div>
        ) : null}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label="Margem acumulada em 12 meses, sem e com o programa"
        className="w-full"
      >
        <EixoY esc={esc} />
        <EixoX esc={esc} />
        {referencia ? (
          <path
            d={caminho(referencia.comPrograma, esc)}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="2 5"
          />
        ) : null}
        <path
          d={caminho(series.semPrograma, esc)}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        <path
          d={caminho(series.comPrograma, esc)}
          fill="none"
          stroke="#0F9F2E"
          strokeWidth={2.25}
          strokeLinejoin="round"
        />
        {/* Gap do mês 12 === G */}
        <line
          x1={esc.x(12)}
          x2={esc.x(12)}
          y1={esc.y(series.semPrograma[11].valor)}
          y2={esc.y(series.comPrograma[11].valor)}
          stroke="#0F9F2E"
          strokeWidth={1}
          strokeDasharray="2 3"
          aria-hidden
        />
        {editavel
          ? series.comPrograma.map((ponto, index) => (
              <g key={ponto.mes}>
                <circle
                  cx={esc.x(ponto.mes)}
                  cy={esc.y(ponto.valor)}
                  r={5}
                  fill="#fff"
                  stroke="#0F9F2E"
                  strokeWidth={2}
                  aria-hidden
                />
                {/* Área de toque generosa; touch-action none SÓ aqui, para não
                    travar o scroll da página no mobile. */}
                <circle
                  cx={esc.x(ponto.mes)}
                  cy={esc.y(ponto.valor)}
                  r={16}
                  fill="transparent"
                  role="slider"
                  aria-label={`Checkpoint do mês ${ponto.mes}`}
                  aria-valuenow={Math.round(g[index])}
                  tabIndex={0}
                  style={{ touchAction: "none", cursor: "ns-resize" }}
                  onPointerDown={(event) => {
                    dragRef.current = index;
                    (event.target as Element).setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (dragRef.current !== null) aoArrastar(event.clientY);
                  }}
                  onPointerUp={() => {
                    dragRef.current = null;
                  }}
                  onKeyDown={(event) => {
                    if (!onEditar) return;
                    const passo = G / 48;
                    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                      event.preventDefault();
                      const delta = event.key === "ArrowUp" ? passo : -passo;
                      const novo = [...g];
                      novo[index] = Math.min(
                        Math.max(novo[index] + delta, pisoPonto(margemAnual)),
                        tetoPonto(margemAnual, G),
                      );
                      onEditar(reconciliar(novo, G, margemAnual, index).pontos);
                    }
                  }}
                />
              </g>
            ))
          : null}
      </svg>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full bg-[#0F9F2E]" aria-hidden />
          Com o programa
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-0 w-5 border-t-2 border-dashed border-slate-400"
            aria-hidden
          />
          Trajetória sem o programa (margem atual projetada)
        </span>
        <span className="ml-auto tabular-nums">
          Gap no mês 12: <span className="font-medium text-slate-700">{formatBRL(series.gapMes12)}</span>
        </span>
      </div>

      <p className="text-xs leading-relaxed text-slate-400">
        {editavel
          ? "Arraste os checkpoints para desenhar o ritmo que você espera. A soma dos ganhos é preservada, e editar a curva não muda ROI, payback nem o valor do ano."
          : "A projeção distribui o ganho uniformemente: nenhuma oscilação é inventada. Este ROI ainda não tem curva: a forma, quem dá é você."}
      </p>

      {nota ? <p className="text-xs leading-relaxed text-slate-400">{nota}</p> : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Painel B — em quanto tempo se paga (cruzamento === payback, invariante 7)
// ---------------------------------------------------------------------------

export function PainelBTrajetoria({
  valorAno,
  precoAno,
  eficienciaAno,
  gEditada,
  semCard = false,
}: {
  valorAno: number;
  precoAno: number;
  eficienciaAno: number;
  gEditada: number[] | null;
  semCard?: boolean;
}) {
  const series = useMemo(
    () => painelB({ valorAno, precoAno, eficienciaAno }, gEditada ?? undefined),
    [valorAno, precoAno, eficienciaAno, gEditada],
  );
  const valores = [
    ...series.base.map((ponto) => ponto.valor),
    ...(series.editado ?? []).map((ponto) => ponto.valor),
    series.custoAnual,
  ];
  const esc = escala(Math.min(0, ...valores) * 1.05, Math.max(...valores) * 1.1);
  const paybackVisivel = series.paybackMeses <= 12;

  return (
    <section
      className={cn(
        "flex flex-col gap-4",
        !semCard && "rounded-sm border border-slate-200 bg-white p-5 sm:p-6",
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {semCard ? null : (
          <h3 className="text-sm font-semibold text-slate-900">Em quanto tempo se paga</h3>
        )}
        <SeloEvidencia selo="projecao" />
      </div>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label="Valor acumulado contra o custo anual da assinatura"
        className="w-full"
      >
        <EixoY esc={esc} />
        <EixoX esc={esc} />
        <line
          x1={PAD.left}
          x2={VB_W - PAD.right}
          y1={esc.y(series.custoAnual)}
          y2={esc.y(series.custoAnual)}
          stroke="#64748b"
          strokeWidth={1.25}
          strokeDasharray="6 4"
          aria-hidden
        />
        <text
          x={VB_W - PAD.right}
          y={esc.y(series.custoAnual) - 6}
          textAnchor="end"
          fontSize={10}
          fill="#64748b"
        >
          Custo anual da assinatura
        </text>
        {series.editado ? (
          <path
            d={caminho(series.editado, esc)}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="2 4"
          />
        ) : null}
        <path
          d={caminho(series.base, esc)}
          fill="none"
          stroke="#2E63CD"
          strokeWidth={2.25}
          strokeLinejoin="round"
        />
        {paybackVisivel ? (
          <g aria-hidden>
            <circle
              cx={esc.x(series.paybackMeses)}
              cy={esc.y(series.custoAnual)}
              r={5}
              fill="#2E63CD"
              stroke="#fff"
              strokeWidth={2}
            />
            <text
              x={esc.x(series.paybackMeses)}
              y={esc.y(series.custoAnual) + 18}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="#2E63CD"
            >
              payback: mês {series.paybackMeses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            </text>
          </g>
        ) : null}
      </svg>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded-full bg-[#2E63CD]" aria-hidden />
          Valor acumulado (média projetada, base do ROI)
        </span>
        {series.editado ? (
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-5 border-t-2 border-dotted border-slate-400" aria-hidden />
            Com a trajetória que você desenhou
          </span>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-slate-400">
        {paybackVisivel
          ? `O cruzamento marca o payback: ${formatMeses(series.paybackMeses)} de valor gerado cobrem o custo anual total.`
          : `O payback projetado (${formatMeses(series.paybackMeses)}) fica além da janela de 12 meses do gráfico.`}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Os dois painéis num card só, alternados por controle segmentado. Empilhados
// eles somavam duas telas de rolagem logo depois do hero — muito peso visual
// para algo que, por construção, não muda número nenhum (invariante 4).
//
// Não usa `ui/tabs.tsx` de propósito: aquele sincroniza com `?tab=` pelo
// router, e esta é uma página pública tokenizada de estado local.
// ---------------------------------------------------------------------------

const ABAS = [
  { id: "margem", label: "Margem acumulada" },
  { id: "payback", label: "Em quanto tempo se paga" },
] as const;

type AbaId = (typeof ABAS)[number]["id"];

export function PaineisTrajetoria({
  margemMensalAtual,
  G,
  valorAno,
  precoAno,
  eficienciaAno,
  editada,
  onEditar,
  readOnly = false,
  nota,
}: {
  margemMensalAtual: number;
  G: number;
  valorAno: number;
  precoAno: number;
  eficienciaAno: number;
  editada: number[] | null;
  onEditar?: (g: number[] | null) => void;
  readOnly?: boolean;
  nota?: string | null;
}) {
  const [aba, setAba] = useState<AbaId>("margem");

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
      <div
        role="tablist"
        aria-label="Painéis da trajetória"
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-slate-200 bg-slate-50/70 p-1"
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const indice = ABAS.findIndex((item) => item.id === aba);
          const delta = event.key === "ArrowRight" ? 1 : -1;
          setAba(ABAS[(indice + delta + ABAS.length) % ABAS.length].id);
        }}
      >
        {ABAS.map((item) => {
          const ativa = item.id === aba;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              tabIndex={ativa ? 0 : -1}
              onClick={() => setAba(item.id)}
              className={cn(
                "min-h-[44px] cursor-pointer whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors sm:min-h-0 sm:py-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                ativa
                  ? "bg-white text-slate-900 shadow-[var(--shadow-sm)]"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {aba === "margem" ? (
        <PainelATrajetoria
          semCard
          margemMensalAtual={margemMensalAtual}
          G={G}
          editada={editada}
          onEditar={onEditar}
          readOnly={readOnly}
          nota={nota}
        />
      ) : (
        <PainelBTrajetoria
          semCard
          valorAno={valorAno}
          precoAno={precoAno}
          eficienciaAno={eficienciaAno}
          gEditada={editada}
        />
      )}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { ArrowUturnLeftIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { TRAJETORIA_MESES } from "@/lib/calculadora/constants";
import {
  formatBRL,
  formatBRLCompacto,
  formatMeses,
  formatNumero,
} from "@/lib/calculadora/format";
import {
  limitesMensais,
  painelA,
  painelB,
  painelMensal,
  pisoPonto,
  reReconciliar,
  somaRelativa,
  tetoPonto,
  trajetoriaBase,
} from "@/lib/calculadora/trajetoria";
import type { PontoMes } from "@/lib/calculadora/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SeloEvidencia } from "./selo-evidencia";

// Painéis da trajetória (§4.12) em SVG próprio — zero dependências.
// Editar a trajetória NUNCA altera ROI/payback/valor do ano (invariante 4):
// os números vêm prontos do resultado; aqui só se redesenha a forma.

const VB_W = 640;
const VB_H = 260;
const PAD = { top: 18, right: 20, bottom: 30, left: 64 };

// `stroke`/`fill` de SVG são atributos, não classes — não dá para usar
// `text-trend-positive` aqui. Uma constante única em vez de dez literais
// espalhados: o token de `globals.css` continua sendo a fonte, e este é o
// único ponto do arquivo que precisa acompanhá-lo.
const VERDE = "#0F9F2E";

// O painel acumulado começa no mês 0 (a origem faz parte da história: as duas
// retas partem do mesmo ponto). O mensal não tem mês 0 — cada mês é uma
// coluna de slider, e a primeira coluna precisa encostar na borda do plot.
type DominioX = "0a12" | "1a12";

type Escala = {
  x: (mes: number) => number;
  y: (valor: number) => number;
  yMin: number;
  yMax: number;
};

function escala(yMin: number, yMax: number, dominioX: DominioX = "0a12"): Escala {
  const spanY = yMax - yMin || 1;
  const plotW = VB_W - PAD.left - PAD.right;
  const plotH = VB_H - PAD.top - PAD.bottom;
  return {
    x: (mes) =>
      dominioX === "0a12"
        ? PAD.left + (mes / TRAJETORIA_MESES) * plotW
        : PAD.left + ((mes - 1) / (TRAJETORIA_MESES - 1)) * plotW,
    y: (valor) => PAD.top + (1 - (valor - yMin) / spanY) * plotH,
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

function EixoX({ esc, dominioX = "0a12" }: { esc: Escala; dominioX?: DominioX }) {
  const meses =
    dominioX === "0a12"
      ? Array.from({ length: TRAJETORIA_MESES + 1 }, (_, mes) => mes)
      : Array.from({ length: TRAJETORIA_MESES }, (_, index) => index + 1);
  return (
    <g aria-hidden>
      {meses.map((mes) => (
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

function ItemLegenda({
  cor,
  traco,
  children,
}: {
  cor: string;
  traco?: "solido" | "tracejado" | "pontilhado";
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className={cn(
          "w-5 shrink-0",
          traco === "tracejado"
            ? "h-0 border-t-2 border-dashed"
            : traco === "pontilhado"
              ? "h-0 border-t-2 border-dotted"
              : "h-0.5 rounded-full",
        )}
        style={traco && traco !== "solido" ? { borderColor: cor } : { backgroundColor: cor }}
      />
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Slider vertical de um mês. O trilho, o preenchimento e o thumb são marcação;
// o input nativo fica por cima, transparente, e continua dono do arrasto, do
// teclado e da semântica. O thumb tem tamanho fixo em `globals.css`, então o
// curso é `altura − THUMB` — a mesma conta usada aqui para posicionar o desenho.
//
// `THUMB` e o `.slider-trajetoria` do `globals.css` precisam bater: é o thumb
// nativo que define o curso real do controle, e um desenho de tamanho diferente
// descolaria dele nos extremos. Por isso a marcação desenhada tira largura e
// altura DESTA constante, em vez de repetir o número numa classe.
// ---------------------------------------------------------------------------

const THUMB = 20;

function SliderMes({
  mes,
  valor,
  min,
  max,
  onChange,
  onFoco,
}: {
  mes: number;
  valor: number;
  min: number;
  max: number;
  onChange: (valor: number) => void;
  onFoco: (ativo: boolean) => void;
}) {
  const fracao = max > min ? Math.min(Math.max((valor - min) / (max - min), 0), 1) : 0;
  // Base do thumb ao longo do curso; o preenchimento sobe até o centro dele.
  const baseThumb = `calc((100% - ${THUMB}px) * ${fracao})`;
  const centroThumb = `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${fracao})`;

  return (
    <div className="flex min-w-[44px] flex-1 flex-col items-center gap-2">
      <div className="relative h-36 w-6">
        <input
          type="range"
          min={min}
          max={max}
          step={(max - min) / 200}
          value={valor}
          aria-orientation="vertical"
          aria-label={`Margem do mês ${mes}`}
          aria-valuetext={formatBRL(valor)}
          onChange={(event) => onChange(Number(event.target.value))}
          onPointerEnter={() => onFoco(true)}
          onPointerLeave={() => onFoco(false)}
          onFocus={() => onFoco(true)}
          onBlur={() => onFoco(false)}
          className={cn(
            "peer absolute inset-0 z-10 h-full w-full cursor-ns-resize opacity-0",
            "slider-trajetoria [direction:rtl] [writing-mode:vertical-lr]",
          )}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 w-2 -translate-x-1/2 rounded-full bg-[#ECEAE4]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 w-2 -translate-x-1/2 rounded-full bg-trend-positive"
          style={{ height: centroThumb }}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-trend-positive",
            "peer-focus-visible:ring-4 peer-focus-visible:ring-primary/35",
          )}
          style={{ bottom: baseThumb, height: THUMB, width: THUMB }}
        />
      </div>
      <span className="text-xs tabular-nums text-slate-400">{mes}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel mensal — a leitura em que a curva desenhada aparece, e onde ela é
// editada. No acumulado a soma achata a oscilação: mover o mês 9 quase não
// muda o desenho. Aqui cada mês é uma coluna, e o slider é o próprio mês.
// ---------------------------------------------------------------------------

function PainelMensalTrajetoria({
  margemMensalAtual,
  G,
  g,
  editando,
  onChangeMes,
}: {
  margemMensalAtual: number;
  G: number;
  g: number[];
  editando: boolean;
  onChangeMes: (index: number, valorMensal: number) => void;
}) {
  const [mesAtivo, setMesAtivo] = useState<number | null>(null);
  const series = useMemo(
    () => painelMensal(margemMensalAtual, g, G),
    [margemMensalAtual, g, G],
  );
  const { min, max } = limitesMensais(margemMensalAtual, G);
  const editavel = editando && max > min;

  const topo = Math.max(
    ...series.suaExpectativa.map((ponto) => ponto.valor),
    ...series.mediaProjetada.map((ponto) => ponto.valor),
    margemMensalAtual,
  );
  const esc = escala(0, topo * 1.25 || 1, "1a12");
  const plotW = VB_W - PAD.left - PAD.right;
  const larguraFaixa = plotW / (TRAJETORIA_MESES - 1);

  const ativo =
    mesAtivo !== null
      ? {
          mes: mesAtivo,
          semPrograma: series.semPrograma[mesAtivo - 1].valor,
          mediaProjetada: series.mediaProjetada[mesAtivo - 1].valor,
          suaExpectativa: series.suaExpectativa[mesAtivo - 1].valor,
        }
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
        <ItemLegenda cor="#94a3b8" traco="tracejado">
          Margem mensal sem programa
        </ItemLegenda>
        <ItemLegenda cor={VERDE} traco="pontilhado">
          Média projetada com Perfecting
        </ItemLegenda>
        <ItemLegenda cor={VERDE}>Sua expectativa por mês</ItemLegenda>
      </div>

      {/* O balão é HTML, não foreignObject: texto em pt-BR com quebra e as
          mesmas classes do sistema, sem reimplementar tipografia em SVG. */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          role="img"
          aria-label="Margem mensal em 12 meses, sem o programa, na média projetada e na sua expectativa"
          className="w-full"
          onPointerLeave={() => setMesAtivo(null)}
        >
          <EixoY esc={esc} />
          <EixoX esc={esc} dominioX="1a12" />

          {ativo ? (
            <line
              x1={esc.x(ativo.mes)}
              x2={esc.x(ativo.mes)}
              y1={PAD.top}
              y2={VB_H - PAD.bottom}
              stroke="#cbd5e1"
              strokeWidth={1}
              aria-hidden
            />
          ) : null}

          <path
            d={caminho(series.semPrograma, esc, false)}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          <path
            d={caminho(series.mediaProjetada, esc, false)}
            fill="none"
            stroke={VERDE}
            strokeWidth={1.5}
            strokeDasharray="1 4"
            strokeLinecap="round"
          />
          <path
            d={caminho(series.suaExpectativa, esc, false)}
            fill="none"
            stroke={VERDE}
            strokeWidth={2.25}
            strokeLinejoin="round"
          />
          {series.suaExpectativa.map((ponto) => (
            <circle
              key={ponto.mes}
              cx={esc.x(ponto.mes)}
              cy={esc.y(ponto.valor)}
              r={ponto.mes === mesAtivo ? 5 : 3.5}
              fill={ponto.mes === mesAtivo ? "#fff" : VERDE}
              stroke={VERDE}
              strokeWidth={2}
              aria-hidden
            />
          ))}

          {/* Faixas de hover: uma por mês, cobrindo toda a altura do plot. */}
          {series.suaExpectativa.map((ponto) => (
            <rect
              key={ponto.mes}
              x={esc.x(ponto.mes) - larguraFaixa / 2}
              y={PAD.top}
              width={larguraFaixa}
              height={VB_H - PAD.top - PAD.bottom}
              fill="transparent"
              onPointerEnter={() => setMesAtivo(ponto.mes)}
              onPointerMove={() => setMesAtivo(ponto.mes)}
            />
          ))}
        </svg>

        {ativo ? (
          <div
            className="pointer-events-none absolute top-0 z-10 flex flex-col gap-1 rounded-md border border-slate-200 bg-white p-3 text-xs shadow-[var(--shadow-sm)]"
            style={{
              left: `${(esc.x(ativo.mes) / VB_W) * 100}%`,
              // Perto das bordas o balão vira para dentro em vez de vazar.
              transform: `translateX(${ativo.mes <= 3 ? "-8%" : ativo.mes >= 10 ? "-92%" : "-50%"})`,
            }}
          >
            <span className="font-semibold text-slate-900">Mês {ativo.mes}</span>
            <span className="whitespace-nowrap text-slate-500">
              Margem mensal sem programa:{" "}
              <span className="font-medium tabular-nums text-slate-700">
                {formatBRLCompacto(ativo.semPrograma)}
              </span>
            </span>
            <span className="whitespace-nowrap text-slate-500">
              Média projetada com Perfecting:{" "}
              <span className="font-medium tabular-nums text-slate-700">
                {formatBRLCompacto(ativo.mediaProjetada)}
              </span>
            </span>
            <span className="whitespace-nowrap text-slate-500">
              Sua expectativa por mês:{" "}
              <span className="font-medium tabular-nums text-trend-positive">
                {formatBRLCompacto(ativo.suaExpectativa)}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {editavel ? (
        <div className="rounded-sm bg-slate-50/60 p-4">
          <div className="rolagem-esvanecida-x flex items-end gap-1 overflow-x-auto">
            {series.suaExpectativa.map((ponto, index) => (
              <SliderMes
                key={ponto.mes}
                mes={ponto.mes}
                valor={ponto.valor}
                min={min}
                max={max}
                onChange={(valor) => onChangeMes(index, valor)}
                onFoco={(ativo) => setMesAtivo(ativo ? ponto.mes : null)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel acumulado — leitura, não edição. O gap no mês 12 é G por construção.
// ---------------------------------------------------------------------------

export function PainelATrajetoria({
  margemMensalAtual,
  G,
  g,
  editado,
}: {
  margemMensalAtual: number;
  G: number;
  g: number[];
  // A reta original vira referência tracejada assim que existe curva desenhada.
  editado: boolean;
}) {
  const series = useMemo(() => painelA(margemMensalAtual, g), [margemMensalAtual, g]);
  const referencia = useMemo(
    () => (editado ? painelA(margemMensalAtual, trajetoriaBase(G)) : null),
    [editado, margemMensalAtual, G],
  );

  const yMax = Math.max(series.comPrograma[11].valor, series.semPrograma[11].valor) * 1.05;
  const yMin = Math.min(0, ...series.comPrograma.map((ponto) => ponto.valor)) * 1.05;
  const esc = escala(yMin, yMax);

  return (
    <div className="flex flex-col gap-4">
      <svg
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
          stroke={VERDE}
          strokeWidth={2.25}
          strokeLinejoin="round"
        />
        {/* Gap do mês 12 === G */}
        <line
          x1={esc.x(12)}
          x2={esc.x(12)}
          y1={esc.y(series.semPrograma[11].valor)}
          y2={esc.y(series.comPrograma[11].valor)}
          stroke={VERDE}
          strokeWidth={1}
          strokeDasharray="2 3"
          aria-hidden
        />
      </svg>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
        <ItemLegenda cor={VERDE}>Com o programa</ItemLegenda>
        <ItemLegenda cor="#94a3b8" traco="tracejado">
          Trajetória sem o programa (margem atual projetada)
        </ItemLegenda>
        <span className="ml-auto tabular-nums">
          Gap no mês 12:{" "}
          <span className="font-medium text-slate-700">{formatBRL(series.gapMes12)}</span>
        </span>
      </div>
    </div>
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
}: {
  valorAno: number;
  precoAno: number;
  eficienciaAno: number;
  gEditada: number[] | null;
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
    <div className="flex flex-col gap-4">
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
              payback: mês{" "}
              {series.paybackMeses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            </text>
          </g>
        ) : null}
      </svg>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
        <ItemLegenda cor="#2E63CD">Valor acumulado (média projetada, base do ROI)</ItemLegenda>
        {series.editado ? (
          <ItemLegenda cor="#94a3b8" traco="pontilhado">
            Com a trajetória que você desenhou
          </ItemLegenda>
        ) : null}
      </div>

      <p className="text-xs leading-5 text-slate-400">
        {paybackVisivel
          ? `O cruzamento marca o payback: ${formatMeses(series.paybackMeses)} de valor gerado cobrem o custo anual total.`
          : `O payback projetado (${formatMeses(series.paybackMeses)}) fica além da janela de 12 meses do gráfico.`}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Os painéis num card só, alternados por controle segmentado. Empilhados eles
// somavam três telas de rolagem para algo que, por construção, não muda número
// nenhum (invariante 4).
//
// Não usa `ui/tabs.tsx` de propósito: aquele sincroniza com `?tab=` pelo
// router, e esta é uma página pública tokenizada de estado local.
// ---------------------------------------------------------------------------

const ABAS = [
  { id: "acumulada", label: "Margem acumulada" },
  { id: "mensal", label: "Margem mensal" },
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
  // Aviso da re-reconciliação (§8). Tem slot próprio: antes vinha de fora com
  // margem negativa, remendando a falta de lugar para ele.
  nota?: string | null;
}) {
  const [aba, setAba] = useState<AbaId>("acumulada");
  // O rascunho vive só aqui. Enquanto a pessoa arrasta, a soma anda livre e
  // nada é persistido: o autosave não grava soma inválida, e a página não
  // re-renderiza inteira a cada frame. `Σg = G` volta no "Concluir edição".
  const [rascunho, setRascunho] = useState<number[] | null>(null);

  const margemAnual = margemMensalAtual * TRAJETORIA_MESES;
  const editando = rascunho !== null;
  const podeEditar = !readOnly && onEditar !== undefined && G > 0;
  const g = rascunho ?? editada ?? trajetoriaBase(G);
  const pctSoma = rascunho ? somaRelativa(rascunho, G) : null;
  const somaExata = pctSoma !== null && Math.abs(pctSoma - 1) < 0.005;

  function abrirEdicao() {
    setRascunho(editada ?? trajetoriaBase(G));
    setAba("mensal");
  }

  function concluirEdicao() {
    if (!rascunho || !onEditar) return;
    // reReconciliar é exatamente o reajuste proporcional: escala por G/Σ
    // preservando a forma e depois reconcilia dentro dos clamps do §4.12.
    onEditar(reReconciliar(rascunho, G, margemAnual).pontos);
    setRascunho(null);
  }

  function alterarMes(index: number, valorMensal: number) {
    if (!rascunho) return;
    const alvo = valorMensal - margemMensalAtual;
    const novo = [...rascunho];
    novo[index] = Math.min(
      Math.max(alvo, pisoPonto(margemAnual)),
      tetoPonto(margemAnual, G),
    );
    setRascunho(novo);
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Trajetória projetada</h3>
          <SeloEvidencia selo={editada ? "dado_do_cliente" : "projecao"} />
          {editada && !editando ? (
            <span className="text-xs text-slate-400">
              a reta original segue como média projetada, base do ROI
            </span>
          ) : null}
        </div>
        {podeEditar ? (
          <div className="flex items-center gap-2">
            {editando ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setRascunho(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" onClick={concluirEdicao}>
                  Concluir edição
                </Button>
              </>
            ) : (
              <>
                {editada ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ArrowUturnLeftIcon}
                    onClick={() => onEditar?.(null)}
                  >
                    Restaurar reta
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={PencilSquareIcon}
                  onClick={abrirEdicao}
                >
                  Editar trajetória
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Painéis da trajetória"
        className="rolagem-limpa flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-slate-200 bg-slate-50/60 p-1"
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
                "flex h-11 cursor-pointer items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors sm:h-9",
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

      {aba === "acumulada" ? (
        <PainelATrajetoria
          margemMensalAtual={margemMensalAtual}
          G={G}
          g={g}
          editado={editada !== null || editando}
        />
      ) : aba === "mensal" ? (
        <PainelMensalTrajetoria
          margemMensalAtual={margemMensalAtual}
          G={G}
          g={g}
          editando={editando}
          onChangeMes={alterarMes}
        />
      ) : (
        <PainelBTrajetoria
          valorAno={valorAno}
          precoAno={precoAno}
          eficienciaAno={eficienciaAno}
          gEditada={rascunho ?? editada}
        />
      )}

      {editando ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-slate-800">
            {somaExata
              ? "Seus checkpoints somam exatamente o total projetado."
              : `Seus checkpoints somam ${formatNumero((pctSoma ?? 1) * 100, 0)}% do total projetado.`}
          </p>
          <p className="text-xs leading-5 text-slate-400">
            Editar a trajetória não altera o ROI nem o total projetado. Ao concluir,
            os meses são reajustados proporcionalmente, preservando a forma que você
            desenhou.
          </p>
        </div>
      ) : (
        <p className="text-xs leading-5 text-slate-400">
          {editada
            ? "Esta é a forma que você desenhou. O ROI, o payback e o valor do ano continuam vindo da média projetada."
            : "A projeção distribui o ganho uniformemente: nenhuma oscilação é inventada. Este ROI ainda não tem curva: a forma, quem dá é você."}
        </p>
      )}

      {nota ? <p className="text-xs leading-5 text-slate-400">{nota}</p> : null}
    </section>
  );
}

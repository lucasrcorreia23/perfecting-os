"use client";

import { CENARIOS, CHECAGEM_ALERTA, TAXA_MINIMA } from "@/lib/calculadora/constants";
import {
  formatBRL,
  formatBRLCompacto,
  formatMeses,
  formatNumero,
  formatPct,
  formatX,
} from "@/lib/calculadora/format";
import type { LinhaCenario } from "@/lib/calculadora/cenarios-comparacao";
import type { Cenario, PrecoConta, ResultadoTime } from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";

// Gráficos do resultado em SVG próprio — zero dependências, mesmas convenções
// dos painéis de trajetória (§8 das diretrizes): viewBox de 640 de largura
// escalando por `w-full`, grade `#e2e8f0` tracejada, legendas em HTML fora do
// SVG. Rótulos em 12–13px e cinzas um degrau mais escuros que a convenção
// original: quem lê esta tela costuma ter mais de 45 anos, e 10px em
// `#94a3b8` não sobrevive a isso.
//
// Nenhum destes componentes é dono da própria superfície: todos renderizam
// `flex flex-col gap-*` e quem dá moldura é a `SecaoResultado` em volta. É o
// que permite reusá-los na visão interna sem virar card aninhado.

type ResultadoOk = Extract<ResultadoTime, { status: "ok" }>;

// `stroke`/`fill` são atributos, não classes: uma constante por arquivo, como
// em `trajetoria-panel.tsx`. Os tokens de `globals.css` seguem sendo a fonte.
const VERDE = "#0F9F2E";
const AZUL = "#2E63CD";
const SLATE_300 = "#cbd5e1";
const SLATE_400 = "#64748b";
const SLATE_500 = "#475569";
const SLATE_700 = "#334155";
const GRADE = "#e2e8f0";

// ---------------------------------------------------------------------------
// Cascata do valor: eficiência + as quatro alavancas = valor do ano.
//
// Substitui a antiga faixa `EquacaoValor`, que dizia a mesma soma em texto. A
// cascata mostra o TAMANHO relativo de cada parcela — que é a pergunta que um
// CFO faz depois de ver o total ("o que aqui é economia de custo e o que é
// receita nova?"). A linha em prosa sobrevive abaixo do desenho, porque é ela
// que o leitor de tela recebe.
// ---------------------------------------------------------------------------

const CASCATA_VB_H = 236;
const CASCATA_PAD = { top: 26, right: 16, bottom: 46, left: 64 };
const VB_W = 640;

// Eixo sem a moeda: "R$" repetido em cinco ticks é ruído, e ainda estourava a
// calha de rótulos — o maior valor saía com o "R" cortado pela borda. A moeda
// aparece onde o número é lido de fato: no rótulo da barra e na frase abaixo.
function rotuloEixo(valor: number): string {
  return formatBRLCompacto(valor).replace("R$ ", "");
}

type Degrau = { rotulo: string; valor: number };

export function CascataValor({ resultado }: { resultado: ResultadoOk }) {
  const { parcelas } = resultado;
  const degraus: Degrau[] = [
    { rotulo: "Eficiência", valor: resultado.eficienciaAno },
    { rotulo: "Ticket", valor: parcelas.margemTicketAno },
    { rotulo: "Rampa", valor: parcelas.margemRampaAno },
    { rotulo: "Conversão", valor: parcelas.ganhoConversaoAno },
  ];
  if (parcelas.ganhoCicloAno !== null) {
    degraus.push({ rotulo: "Ciclo", valor: parcelas.ganhoCicloAno });
  }

  const total = resultado.valorAno;
  const colunas = degraus.length + 1; // + a coluna do total
  const plotW = VB_W - CASCATA_PAD.left - CASCATA_PAD.right;
  const plotH = CASCATA_VB_H - CASCATA_PAD.top - CASCATA_PAD.bottom;
  const passo = plotW / colunas;
  const larguraBarra = Math.min(64, passo * 0.62);
  const yMax = total > 0 ? total : 1;
  const y = (valor: number) => CASCATA_PAD.top + (1 - valor / yMax) * plotH;
  const centro = (index: number) => CASCATA_PAD.left + passo * (index + 0.5);

  // Base acumulada de cada degrau: a barra flutua entre o acumulado anterior
  // e o novo. A do total desce até a linha de base.
  let acumulado = 0;
  const barras = degraus.map((degrau) => {
    const de = acumulado;
    acumulado += degrau.valor;
    return { ...degrau, de, ate: acumulado };
  });

  const descricao = `Composição do valor anual de ${formatBRL(total)}: ${barras
    .map((barra) => `${barra.rotulo} ${formatBRL(barra.valor)}`)
    .join(", ")}.`;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VB_W} ${CASCATA_VB_H}`}
          className="w-full min-w-[520px]"
          role="img"
          aria-label={descricao}
        >
          {/* Grade e eixo de valor */}
          {Array.from({ length: 5 }, (_, index) => {
            const valor = (yMax / 4) * index;
            const py = y(valor);
            return (
              <g key={index} aria-hidden>
                <line
                  x1={CASCATA_PAD.left}
                  x2={VB_W - CASCATA_PAD.right}
                  y1={py}
                  y2={py}
                  stroke={GRADE}
                  strokeWidth={1}
                  strokeDasharray={index === 0 ? undefined : "3 4"}
                />
                <text
                  x={CASCATA_PAD.left - 8}
                  y={py + 3.5}
                  textAnchor="end"
                  fontSize={12}
                  fill={SLATE_400}
                >
                  {rotuloEixo(valor)}
                </text>
              </g>
            );
          })}

          {barras.map((barra, index) => {
            const topo = y(barra.ate);
            const base = y(barra.de);
            const altura = Math.max(2, base - topo);
            const x = centro(index) - larguraBarra / 2;
            const proximo = index < barras.length - 1 ? centro(index + 1) : centro(index + 1);
            return (
              <g key={barra.rotulo}>
                <rect
                  x={x}
                  y={topo}
                  width={larguraBarra}
                  height={altura}
                  rx={3}
                  fill={VERDE}
                  fillOpacity={0.92}
                />
                {/* Fio que carrega o acumulado para o próximo degrau: sem ele
                    as barras flutuantes viram colunas soltas. */}
                <line
                  x1={x + larguraBarra}
                  x2={proximo - larguraBarra / 2}
                  y1={topo}
                  y2={topo}
                  stroke={SLATE_300}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  aria-hidden
                />
                <text
                  x={centro(index)}
                  y={topo - 7}
                  textAnchor="middle"
                  fontSize={12}
                  fill={SLATE_500}
                >
                  {formatBRLCompacto(barra.valor)}
                </text>
                <text
                  x={centro(index)}
                  y={CASCATA_VB_H - 26}
                  textAnchor="middle"
                  fontSize={12}
                  fill={SLATE_400}
                >
                  {barra.rotulo}
                </text>
              </g>
            );
          })}

          {/* Total: desce até a base, com peso maior — é a resposta da soma. */}
          <g>
            <rect
              x={centro(barras.length) - larguraBarra / 2}
              y={y(total)}
              width={larguraBarra}
              height={Math.max(2, y(0) - y(total))}
              rx={3}
              fill={VERDE}
            />
            <text
              x={centro(barras.length)}
              y={y(total) - 7}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill={VERDE}
            >
              {formatBRLCompacto(total)}
            </text>
            <text
              x={centro(barras.length)}
              y={CASCATA_VB_H - 26}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill={SLATE_700}
            >
              Valor/ano
            </text>
          </g>
        </svg>
      </div>

      {/* Uma linha, não um parágrafo: o desenho já mostra os tamanhos, e o
          leitor de tela recebe a composição inteira pelo aria-label do SVG.
          A prosa que existia aqui recitava os mesmos cinco números. */}
      <p className="text-sm leading-6 text-slate-600">
        <span className="font-medium text-slate-700">Eficiência</span> é custo que deixa
        de existir; <span className="font-medium text-slate-700">performance</span> é
        margem nova.
        {parcelas.ganhoCicloAno === null
          ? " O ciclo entra quando o funil estiver preenchido."
          : ""}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparação dos três cenários (aba Scenario Comparison do Excel).
//
// O CFO não quer o número do cenário escolhido: quer a faixa. Aqui os três
// aparecem contra a MESMA linha de investimento — onde a barra cruza a linha,
// o ano se paga.
// ---------------------------------------------------------------------------

const COMP_VB_H = 176;
const COMP_PAD = { top: 24, right: 16, bottom: 30, left: 64 };

export function ComparacaoCenarios({
  linhas,
  precoAno,
  cenarioAtivo,
  personalizado = false,
}: {
  linhas: LinhaCenario[];
  precoAno: number;
  cenarioAtivo: Cenario;
  // Em "parâmetros personalizados" nenhum preset está ativo: o destaque vai
  // para a base, tracejada, como nos cards de cenário.
  personalizado?: boolean;
}) {
  const plotW = VB_W - COMP_PAD.left - COMP_PAD.right;
  const plotH = COMP_VB_H - COMP_PAD.top - COMP_PAD.bottom;
  const passo = plotW / linhas.length;
  const larguraBarra = Math.min(88, passo * 0.5);
  const yMax = Math.max(precoAno, ...linhas.map((linha) => linha.valorAno)) * 1.12 || 1;
  const y = (valor: number) => COMP_PAD.top + (1 - valor / yMax) * plotH;
  const centro = (index: number) => COMP_PAD.left + passo * (index + 0.5);

  const descricao = `Comparação de cenários contra o investimento anual de ${formatBRL(precoAno)}: ${linhas
    .map(
      (linha) =>
        `${CENARIOS[linha.cenario].label} ${formatBRL(linha.valorAno)}, ROI ${formatX(linha.roi)}, payback ${formatMeses(linha.paybackMeses)}`,
    )
    .join("; ")}.`;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${VB_W} ${COMP_VB_H}`}
          className="w-full min-w-[420px]"
          role="img"
          aria-label={descricao}
        >
          {Array.from({ length: 4 }, (_, index) => {
            const valor = (yMax / 3) * index;
            const py = y(valor);
            return (
              <g key={index} aria-hidden>
                <line
                  x1={COMP_PAD.left}
                  x2={VB_W - COMP_PAD.right}
                  y1={py}
                  y2={py}
                  stroke={GRADE}
                  strokeWidth={1}
                  strokeDasharray={index === 0 ? undefined : "3 4"}
                />
                <text
                  x={COMP_PAD.left - 8}
                  y={py + 3.5}
                  textAnchor="end"
                  fontSize={12}
                  fill={SLATE_400}
                >
                  {rotuloEixo(valor)}
                </text>
              </g>
            );
          })}

          {linhas.map((linha, index) => {
            const ativo = !personalizado && linha.cenario === cenarioAtivo;
            const topo = y(linha.valorAno);
            return (
              <g key={linha.cenario}>
                <rect
                  x={centro(index) - larguraBarra / 2}
                  y={topo}
                  width={larguraBarra}
                  height={Math.max(2, y(0) - topo)}
                  rx={3}
                  fill={VERDE}
                  fillOpacity={ativo ? 1 : 0.55}
                />
                <text
                  x={centro(index)}
                  y={topo - 7}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={ativo ? 600 : 400}
                  fill={ativo ? VERDE : SLATE_500}
                >
                  {formatBRLCompacto(linha.valorAno)}
                </text>
              </g>
            );
          })}

          {/* Investimento: a régua contra a qual os três se medem. Slate,
              porque custo não é "ruim" — é a outra metade da fração. O rótulo
              vive na legenda HTML abaixo: dentro do SVG ele cruzava a barra
              do cenário mais alto, que é justamente onde a linha importa. */}
          <line
            x1={COMP_PAD.left}
            x2={VB_W - COMP_PAD.right}
            y1={y(precoAno)}
            y2={y(precoAno)}
            stroke={SLATE_500}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
        <span className="flex items-center gap-2">
          <span className="h-2 w-4 rounded-full bg-trend-positive" aria-hidden />
          valor projetado no ano
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 border-t-2 border-dashed border-slate-500" aria-hidden />
          investimento no ano · {formatBRL(precoAno)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {linhas.map((linha) => {
          const ativo = !personalizado && linha.cenario === cenarioAtivo;
          const base = personalizado && linha.cenario === cenarioAtivo;
          return (
            <div
              key={linha.cenario}
              className={cn(
                "flex flex-col gap-1 rounded-sm border px-4 py-3",
                ativo ? "border-[#2E63CD]/50 bg-[#2E63CD]/[0.04]" : "border-slate-200",
                base && "border-dashed",
              )}
            >
              <span className="flex flex-wrap items-baseline gap-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    ativo ? "text-[#2E63CD]" : "text-slate-800",
                  )}
                >
                  {CENARIOS[linha.cenario].label}
                </span>
                {ativo ? (
                  <span className="text-xs font-semibold text-slate-500">
                    Seu cenário
                  </span>
                ) : null}
              </span>
              <span className="text-lg font-semibold leading-6 tabular-nums text-trend-positive">
                {formatX(linha.roi)}
              </span>
              <span className="text-sm text-slate-600">
                payback em{" "}
                <span className="font-medium tabular-nums text-slate-700">
                  {formatMeses(linha.paybackMeses)}
                </span>
              </span>
              {linha.paybackExcedeContrato ? (
                <span className="text-sm leading-6 text-[#973C00]">
                  passa do prazo escolhido
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-sm leading-6 text-slate-600">
        Mesmos dados nos três: só os deltas mudam. A eficiência é igual em todos — vem
        do caminho declarado, não do cenário.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Escada de preço: onde as horas da conta caem em cada faixa.
//
// Tudo slate de propósito — é a coluna do custo. Verde aqui leria como ganho.
// ---------------------------------------------------------------------------

const ESCADA_VB_H = 84;
const ESCADA_PAD = { left: 4, right: 4 };

export function EscadaPrecoGrafico({ preco }: { preco: PrecoConta }) {
  const faixas = preco.extrato.filter((faixa) => faixa.horasNaFaixa > 0);
  if (faixas.length === 0 || preco.horasMes <= 0) return null;

  const plotW = VB_W - ESCADA_PAD.left - ESCADA_PAD.right;
  const barraY = 26;
  const barraH = 26;
  // Tons de slate por faixa: a primeira é a mais escura (mais cara por hora),
  // e a escada clareia conforme a taxa cai — a cor conta a mesma história.
  const TONS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1"];

  // Offset acumulado por soma das faixas anteriores, não por variável mutada
  // durante o map: o React Compiler proíbe reatribuição no corpo do render, e
  // com no máximo quatro faixas o custo do slice é irrelevante.
  const segmentos = faixas.map((faixa, index) => {
    const horasAntes = faixas
      .slice(0, index)
      .reduce((total, anterior) => total + anterior.horasNaFaixa, 0);
    return {
      faixa,
      x: ESCADA_PAD.left + (horasAntes / preco.horasMes) * plotW,
      largura: (faixa.horasNaFaixa / preco.horasMes) * plotW,
      tom: TONS[index] ?? TONS[TONS.length - 1],
    };
  });

  const descricao = `${formatNumero(preco.horasMes, 0)} horas por mês distribuídas na escada: ${faixas
    .map(
      (faixa) =>
        `${formatNumero(faixa.horasNaFaixa, 0)} horas a ${formatBRL(faixa.taxaHora)} por hora`,
    )
    .join(", ")}.`;

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${VB_W} ${ESCADA_VB_H}`}
        className="w-full"
        role="img"
        aria-label={descricao}
      >
        {segmentos.map(({ faixa, x: sx, largura, tom }, index) => (
          <g key={index}>
            <rect
              x={sx}
              y={barraY}
              width={Math.max(1, largura - 2)}
              height={barraH}
              rx={3}
              fill={tom}
            />
            {/* Rótulo dentro do segmento só quando há espaço; senão vira
                travessão silencioso — melhor sem rótulo que rótulo cortado. */}
            {largura > 74 ? (
              <>
                <text
                  x={sx + largura / 2 - 1}
                  y={barraY + 17}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={600}
                  fill="#ffffff"
                >
                  {formatBRL(faixa.taxaHora)}/h
                </text>
                <text
                  x={sx + largura / 2 - 1}
                  y={barraY + barraH + 15}
                  textAnchor="middle"
                  fontSize={12}
                  fill={SLATE_400}
                >
                  {formatNumero(faixa.horasNaFaixa, 0)} h
                </text>
              </>
            ) : null}
            <text
              x={sx + largura / 2 - 1}
              y={barraY - 8}
              textAnchor="middle"
              fontSize={12}
              fill={SLATE_400}
            >
              {largura > 74 ? `Faixa ${index + 1}` : ""}
            </text>
          </g>
        ))}
      </svg>

      <p className="text-sm leading-6 text-slate-600">
        Cada faixa cobra a própria taxa, como imposto de renda:{" "}
        <span className="font-medium text-slate-700">
          {formatBRL(preco.taxaCombinada, 2)}/hora
        </span>{" "}
        na média, {formatBRL(faixas[faixas.length - 1].taxaHora)} na próxima hora.
        {preco.pisoAplicado
          ? ` Vale a cobrança mínima de ${formatBRL(TAXA_MINIMA)}/mês.`
          : ""}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Medidor da checagem de realidade: os ganhos de performance contra o limite
// de 25% da margem anual. Sempre slate — nunca verde (não é parcela que entra
// na conta, é um freio) e nunca âmbar: a régua só situa o número na escala, e
// quem diz se ele preocupa é a frase acima. Trocar de cor aqui era um segundo
// alerta para o mesmo fato, no mesmo bloco.
// ---------------------------------------------------------------------------

// Altura calculada a partir das caixas de texto, não chutada: 13px de fonte
// pede ~17px de faixa acima do trilho e ~19px abaixo. Com os 34px da versão
// anterior — dimensionados para rótulos de 10px — o "7,6%" saía cortado pela
// borda de cima e o "limite de 25%" pela de baixo.
const MEDIDOR_TRILHO_Y = 20;
const MEDIDOR_TRILHO_H = 10;
const MEDIDOR_VB_H = 52;

export function MedidorChecagem({ pct }: { pct: number }) {
  const limite = CHECAGEM_ALERTA * 100;
  const escalaMax = Math.max(limite * 1.4, pct * 1.15);
  const plotW = VB_W - 8;
  const x = (valor: number) => 4 + (Math.min(valor, escalaMax) / escalaMax) * plotW;
  const trilhoY = MEDIDOR_TRILHO_Y;
  const trilhoH = MEDIDOR_TRILHO_H;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${MEDIDOR_VB_H}`}
      className="w-full"
      role="img"
      aria-label={`Ganhos de performance em ${formatPct(pct, 1)} da margem anual, contra o limite de ${formatPct(limite, 0)}.`}
    >
      <rect x={4} y={trilhoY} width={plotW} height={trilhoH} rx={4} fill="#f1f5f9" />
      <rect
        x={4}
        y={trilhoY}
        width={Math.max(3, x(pct) - 4)}
        height={trilhoH}
        rx={4}
        fill={SLATE_500}
        fillOpacity={0.8}
      />
      {/* O limite de 25% como régua vertical: é o número que o CFO conhece. */}
      <line
        x1={x(limite)}
        x2={x(limite)}
        y1={trilhoY - 5}
        y2={trilhoY + trilhoH + 5}
        stroke={SLATE_400}
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      <text x={x(limite) + 6} y={trilhoY + trilhoH + 15} fontSize={13} fill={SLATE_400}>
        limite de {formatPct(limite, 0)}
      </text>
      <text x={4} y={trilhoY - 7} fontSize={13} fill={SLATE_400}>
        {formatPct(pct, 1)}
      </text>
    </svg>
  );
}

// Cor de apoio exportada para quem precisar casar uma legenda HTML com o
// traço azul do SVG (a trajetória usa o mesmo).
export const COR_INVESTIMENTO = AZUL;

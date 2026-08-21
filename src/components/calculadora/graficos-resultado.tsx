"use client";

import {
  formatBRL,
  formatBRLCompacto,
  formatFaixaTier,
  formatNumero,
  formatPct,
} from "@/lib/calculadora/format";
import type {
  PrecoConta,
  ResultadoTime,
} from "@/lib/calculadora/types";
import { LinhaBarra, ListaBarras } from "./linha-barra";
import { usePremissas } from "./premissas-context";

// Gráficos do resultado — a maioria em SVG próprio (zero dependências, mesmas
// convenções dos painéis de trajetória, §8 das diretrizes: viewBox de 640 de
// largura escalando por `w-full`, grade tracejada em `--pf-line`, legendas em
// HTML fora do SVG). Dois blocos (`InvestimentoVsRetorno` e
// `DecomposicaoValor`) viraram HTML puro em 20/08/2026: são listas de barras com
// rótulo/valor — texto real, sem nada que um `aria-label` precise recitar de
// novo. Rótulos em 12–13px e cinzas um degrau mais escuros que a convenção
// original: quem lê esta tela costuma ter mais de 45 anos, e 10px em `#94a3b8`
// não sobrevive a isso.
//
// A comparação de cenários mudou de arquivo no mesmo dia: virou controle
// (escolher o cenário, ajustar os deltas) e mora em `comparacao-cenarios.tsx`.
//
// Nenhum destes componentes é dono da própria superfície: todos renderizam
// `flex flex-col gap-*` e quem dá moldura é a `SecaoResultado` em volta. É o
// que permite reusá-los na visão interna sem virar card aninhado.

type ResultadoOk = Extract<ResultadoTime, { status: "ok" }>;

// Duas famílias de cor, e o mecanismo é diferente em cada uma.
//
// O CROMO (grade, trilho de fundo, rótulo de eixo) usa CLASSE Tailwind —
// `stroke-[var(--pf-line,#e2e8f0)]` e afins. `stroke`/`fill` como atributo de
// apresentação com `var()` não é confiável entre navegadores; a classe emite
// declaração CSS de verdade, e é ela que faz o desenho acompanhar a pele (§13)
// sem mudar nada em `link-detail`, onde o fallback devolve o cinza de sempre.
// Onde entrou classe, o atributo saiu junto: atributo de apresentação perde
// para qualquer regra CSS, e manter os dois só confunde quem lê.
//
// As SÉRIES DE DADO que continuam em SVG usam literal: verde é "entra na
// conta" (§1) e slate é a coluna do custo. Nos gráficos que viraram HTML, o
// mesmo papel é feito por classe (`text-trend-positive`, `bg-trend-positive`)
// — aqui não há atributo de apresentação para competir com ela.
const AZUL = "#2E63CD";
const SLATE_500 = "#475569";
const SLATE_700 = "#334155";

// ---------------------------------------------------------------------------
// O racional em uma imagem: o que você paga contra o que a operação devolve,
// lado a lado. Abre "De onde vem o número" — a primeira comparação de quem
// vai bancar a conta, antes de qualquer detalhe (20/08/2026).
// ---------------------------------------------------------------------------

const VB_W = 640;

export function InvestimentoVsRetorno({
  precoAno,
  valorAno,
}: {
  precoAno: number;
  valorAno: number;
}) {
  const maior = Math.max(precoAno, valorAno, 1);
  return (
    // Sem ícone de "de onde saiu" em nenhuma das duas: os mesmos dois números
    // estão na capa, quatro cards acima e com balão. Aqui eles são a IMAGEM da
    // comparação — repetir a afordância no desenho que a ilustra seria uma
    // segunda porta para a mesma pergunta.
    <ListaBarras>
      {/* O investimento fica SLATE, e não vermelho como no material de
          referência: "custo e preço não são verdes nem vermelhos" (§1) — custo
          não é ruim, é a outra metade da fração. O vermelho está reservado ao
          COI, que mede perda de verdade. */}
      <LinhaBarra
        rotulo="Investimento/ano"
        valor={formatBRL(precoAno)}
        pct={(precoAno / maior) * 100}
        tom="neutro"
      />
      <LinhaBarra
        rotulo="Retorno/ano"
        valor={formatBRL(valorAno)}
        pct={(valorAno / maior) * 100}
      />
    </ListaBarras>
  );
}

// ---------------------------------------------------------------------------
// Decomposição do valor: eficiência + as alavancas de performance, uma barra
// por parcela. Substituiu a cascata (barras flutuantes somando degrau a
// degrau) por pedido do decisor em 20/08/2026: o CFO quer comparar o TAMANHO
// de cada parcela lado a lado, não acompanhar a soma subindo. HTML em vez de
// SVG desta vez — rótulo, legenda e valor já são texto real, então não
// precisam de um `aria-label` recitando os cinco números de novo.
// ---------------------------------------------------------------------------

type Degrau = { rotulo: string; valor: number; legenda: string };

export function DecomposicaoValor({ resultado }: { resultado: ResultadoOk }) {
  const { parcelas } = resultado;
  const degraus: Degrau[] = [
    {
      rotulo: "Eficiência",
      valor: resultado.eficienciaAno,
      legenda: "custo de treino que você deixa de queimar",
    },
    {
      rotulo: "Ticket médio",
      valor: parcelas.margemTicketAno,
      legenda: "negócios maiores pelo mesmo funil",
    },
    {
      rotulo: "Rampa",
      valor: parcelas.margemRampaAno,
      legenda: "novos vendedores produtivos mais cedo",
    },
    {
      rotulo: "Conversão",
      valor: parcelas.ganhoConversaoAno,
      legenda: "mais fechamento sobre o mesmo pipeline",
    },
  ];
  if (parcelas.ganhoCicloAno !== null) {
    degraus.push({
      rotulo: "Ciclo de vendas",
      valor: parcelas.ganhoCicloAno,
      legenda: "pipeline girando mais rápido",
    });
  }

  const maior = Math.max(...degraus.map((degrau) => degrau.valor), 1);

  return (
    <ListaBarras>
      {degraus.map((degrau) => (
        <LinhaBarra
          key={degrau.rotulo}
          rotulo={degrau.rotulo}
          nota={degrau.legenda}
          valor={formatBRL(degrau.valor)}
          pct={(degrau.valor / maior) * 100}
        />
      ))}
    </ListaBarras>
  );
}

// ---------------------------------------------------------------------------
// Tabela de preços por tier: os quatro tiers ao longo do eixo de horas, e onde
// o volume da conta caiu.
//
// Substituiu a escada marginal em 21/08/2026, quando o preço passou a ser taxa
// cheia do tier (ver TABELA_TIERS). O desenho antigo mostrava as horas
// FATIADAS em faixas, que é exatamente o que deixou de acontecer: hoje a conta
// inteira mora num tier só, e o que a pessoa precisa ver é qual é ele e o que
// há de cada lado. Por isso o eixo é o volume — não a distribuição das horas —
// e o marcador é o único elemento que fala da conta desta pessoa.
//
// Tudo slate de propósito — é a coluna do custo. Verde aqui leria como ganho.
// ---------------------------------------------------------------------------

const TIERS_VB_H = 92;
const TIERS_PAD = { left: 4, right: 4 };

export function TabelaTiersGrafico({ preco }: { preco: PrecoConta }) {
  const p = usePremissas();
  const tabela = p.tabelaTiers;
  if (preco.horasMes <= 0) return null;

  const plotW = VB_W - TIERS_PAD.left - TIERS_PAD.right;
  const barraY = 34;
  const barraH = 26;

  // O eixo precisa de um fim, e o Tier 4 não tem. Ele ganha uma sobra do
  // tamanho do Tier 3, e o domínio só cresce além disso para caber uma conta
  // maior que a última fronteira — senão o marcador sairia do desenho.
  const ultimaFronteira = tabela[tabela.length - 2].ateHoras;
  const sobra = ultimaFronteira - tabela[tabela.length - 3].ateHoras;
  const dominio = Math.max(ultimaFronteira + sobra, preco.horasMes * 1.08);
  const x = (horas: number) => TIERS_PAD.left + (horas / dominio) * plotW;

  const segmentos = tabela.map((faixa, index) => {
    const de = index === 0 ? 0 : tabela[index - 1].ateHoras;
    const ate = Number.isFinite(faixa.ateHoras) ? faixa.ateHoras : dominio;
    return {
      faixa,
      de: index === 0 ? 0 : de + 1,
      x: x(de),
      largura: x(ate) - x(de),
      ativo: faixa.tier === preco.tier.tier,
    };
  });

  const marcadorX = x(preco.horasMes);
  // Perto das pontas o rótulo do marcador vira âncora lateral, senão ele sai
  // do viewBox — a mesma correção que o MedidorChecagem já carregava.
  const ancora =
    marcadorX < 60 ? "start" : marcadorX > VB_W - 60 ? "end" : "middle";

  const descricao = `${formatNumero(preco.horasMes, 0)} horas por mês caem no Tier ${
    preco.tier.tier
  } (${formatFaixaTier(preco.tier)}), a ${formatBRL(preco.tier.taxaHora)} por hora. Tabela completa: ${tabela.map(
    (faixa, index) =>
      `Tier ${faixa.tier}, ${formatFaixaTier({
        deHoras: index === 0 ? 0 : tabela[index - 1].ateHoras + 1,
        ateHoras: faixa.ateHoras,
      })}, ${formatBRL(faixa.taxaHora)} por hora`,
  ).join("; ")}.`;

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${VB_W} ${TIERS_VB_H}`}
        className="w-full"
        role="img"
        aria-label={descricao}
      >
        {segmentos.map(({ faixa, de, x: sx, largura, ativo }) => (
          <g key={faixa.tier}>
            <rect
              x={sx}
              y={barraY}
              width={Math.max(1, largura - 2)}
              height={barraH}
              rx={3}
              fill={ativo ? SLATE_700 : "#e2e8f0"}
            />
            {/* Rótulo dentro do segmento só quando há espaço; senão some, que
                é melhor que rótulo cortado. */}
            {largura > 62 ? (
              <>
                <text
                  x={sx + largura / 2 - 1}
                  y={barraY + 17}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={ativo ? 700 : 600}
                  fill={ativo ? "#ffffff" : SLATE_500}
                >
                  {formatBRL(faixa.taxaHora)}/h
                </text>
                <text
                  x={sx + largura / 2 - 1}
                  y={barraY + barraH + 15}
                  textAnchor="middle"
                  fontSize={12}
                  className="fill-[var(--pf-ink-faint,#64748b)]"
                >
                  {formatFaixaTier({ deHoras: de, ateHoras: faixa.ateHoras }, "h")}
                </text>
              </>
            ) : null}
          </g>
        ))}

        {/* O marcador da conta. Linha inteira, não tracejada: em 26px de altura
            o tracejado lê como sujeira (mesma razão do MedidorChecagem). */}
        <line
          x1={marcadorX}
          x2={marcadorX}
          y1={barraY - 10}
          y2={barraY + barraH + 4}
          stroke={SLATE_700}
          strokeWidth={2}
        />
        <text
          x={marcadorX}
          y={barraY - 16}
          textAnchor={ancora}
          fontSize={12}
          fontWeight={700}
          fill={SLATE_700}
        >
          {formatNumero(preco.horasMes, 0)} h/mês
        </text>
      </svg>

      <p className="text-sm leading-6 text-[var(--pf-ink-soft,#475569)]">
        A taxa do tier vale para a hora inteira, não só para as horas acima da
        fronteira:{" "}
        <span className="font-medium text-[var(--pf-ink-soft,#475569)]">
          {formatBRL(preco.taxaCombinada, 2)}/hora
        </span>
{" "}
        nas{" "}
        {formatNumero(preco.horasMes, 0)} h da conta.
        {preco.pisoAplicado
          ? ` Vale a cobrança mínima de ${formatBRL(p.taxaMinima)}/mês, acima do que a tabela cobraria neste volume.`
          : ""}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Medidor da checagem de realidade: os ganhos de performance contra o limite
// de 25% da margem anual. Sempre neutro — nunca verde (não é parcela que entra
// na conta, é um freio) e nunca âmbar: a régua só situa o número na escala, e
// quem diz se ele preocupa é a frase acima. Trocar de cor aqui era um segundo
// alerta para o mesmo fato, no mesmo bloco. O trilho e a régua do limite são
// cromo e seguem a pele; a barra e o valor ficam no slate literal do custo.
// ---------------------------------------------------------------------------

// Altura calculada a partir das caixas de texto, não chutada: 13px de fonte
// pede ~17px de faixa acima do trilho e ~19px abaixo. Com os 34px da versão
// anterior — dimensionados para rótulos de 10px — o "7,6%" saía cortado pela
// borda de cima e o "limite de 25%" pela de baixo.
const MEDIDOR_TRILHO_Y = 20;
const MEDIDOR_TRILHO_H = 10;
const MEDIDOR_VB_H = 52;

export function MedidorChecagem({ pct }: { pct: number }) {
  const limite = usePremissas().checagemAlerta * 100;
  const escalaMax = Math.max(limite * 1.4, pct * 1.15);
  const plotW = VB_W - 8;
  const x = (valor: number) => 4 + (Math.min(valor, escalaMax) / escalaMax) * plotW;
  const trilhoY = MEDIDOR_TRILHO_Y;
  const trilhoH = MEDIDOR_TRILHO_H;
  // O rótulo do valor mora onde o valor termina. Ancorado na origem do trilho
  // (x = 4) ele nomeava a ponta esquerda de uma barra que acaba lá na direita:
  // dois números na mesma régua, cada um numa extremidade, e nada dizendo qual
  // é qual. Perto da origem a âncora vira "start" para o texto não sair do
  // viewBox.
  const xPct = x(pct);
  const pctPertoDaOrigem = xPct < 40;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${MEDIDOR_VB_H}`}
      className="w-full"
      role="img"
      aria-label={`Ganhos de performance em ${formatPct(pct, 1)} da margem anual, contra o limite de ${formatPct(limite, 0)}.`}
    >
      <rect x={4} y={trilhoY} width={plotW} height={trilhoH} rx={4} className="fill-[var(--pf-bar,#f1f5f9)]" />
      <rect
        x={4}
        y={trilhoY}
        width={Math.max(3, x(pct) - 4)}
        height={trilhoH}
        rx={4}
        fill={SLATE_500}
        fillOpacity={0.8}
      />
      {/* O limite de 25% como régua vertical: é o número que o CFO conhece.
          Traço inteiro, não tracejado: sobre 20px de altura o dash virava três
          pontinhos soltos que liam como sujeira acima da barra, não como marca. */}
      <line
        x1={x(limite)}
        x2={x(limite)}
        y1={trilhoY - 6}
        y2={trilhoY + trilhoH + 6}
        className="stroke-[var(--pf-ink-faint,#64748b)]"
        strokeWidth={1.5}
      />
      <text x={x(limite) + 6} y={trilhoY + trilhoH + 16} fontSize={13} className="fill-[var(--pf-ink-faint,#64748b)]">
        limite de {formatPct(limite, 0)}
      </text>
      <text
        x={pctPertoDaOrigem ? 4 : xPct}
        y={trilhoY - 8}
        fontSize={13}
        fontWeight={600}
        textAnchor={pctPertoDaOrigem ? "start" : "end"}
        fill={SLATE_700}
      >
        {formatPct(pct, 1)}
      </text>
    </svg>
  );
}

// Cor de apoio exportada para quem precisar casar uma legenda HTML com o
// traço azul do SVG (a trajetória usa o mesmo).
export const COR_INVESTIMENTO = AZUL;

// ---------------------------------------------------------------------------
// Alocação do valor: uma barra 100% empilhada com as parcelas que somam ao ano.
//
// Irmã da `DecomposicaoValor` e não substituta dela: aquela responde "como se
// chega ao total", esta responde "de que o total é feito". É a que abre a capa
// do relatório, onde a pergunta é a segunda — quem está lendo a capa ainda não
// pediu a construção da conta.
//
// TUDO VERDE, em quatro degraus. O desenho aprovado pintava a eficiência de
// preto e o ciclo de âmbar; as quatro parcelas SOMAM ao ROI, e a §1 reserva o
// âmbar para alerta. Quatro tons de uma escala sequencial dizem "quatro fatias
// da mesma coisa", que é exatamente o caso — a diferença entre elas é de
// tamanho, não de natureza.
const VERDES = ["#0B7A22", "#0F9F2E", "#3DBB57", "#7FD293"];

const ALOCACAO_VB_H = 44;

export type FatiaValor = { id: string; rotulo: string; valor: number };

/** As parcelas do ano, da maior para a menor. Zeradas e nulas ficam de fora. */
export function fatiasDoValor(resultado: ResultadoOk): FatiaValor[] {
  return (
    [
      { id: "ticket", rotulo: "Ticket médio", valor: resultado.parcelas.margemTicketAno },
      { id: "eficiencia", rotulo: "Eficiência de gestão", valor: resultado.eficienciaAno },
      { id: "conversao", rotulo: "Conversão", valor: resultado.parcelas.ganhoConversaoAno },
      { id: "rampa", rotulo: "Rampa", valor: resultado.parcelas.margemRampaAno },
      {
        id: "ciclo",
        rotulo: "Ciclo de venda",
        valor: resultado.parcelas.ganhoCicloAno ?? 0,
      },
    ] satisfies FatiaValor[]
  )
    .filter((fatia) => fatia.valor > 0)
    .sort((a, b) => b.valor - a.valor);
}

/** Soma as fatias de vários times, para a capa consolidada. */
export function somarFatias(listas: FatiaValor[][]): FatiaValor[] {
  const mapa = new Map<string, FatiaValor>();
  for (const lista of listas) {
    for (const fatia of lista) {
      const atual = mapa.get(fatia.id);
      if (atual) atual.valor += fatia.valor;
      else mapa.set(fatia.id, { ...fatia });
    }
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}

export function AlocacaoValor({ fatias }: { fatias: FatiaValor[] }) {
  const total = fatias.reduce((soma, fatia) => soma + fatia.valor, 0);
  if (total <= 0) return null;

  // Offsets por soma prefixa em vez de acumulador reatribuído: com no máximo
  // cinco fatias o custo é irrelevante, e o `let` capturado dentro do `map`
  // é exatamente o padrão que o compilador do React acusa.
  const larguras = fatias.map((fatia) => (fatia.valor / total) * VB_W);
  const segmentos = fatias.map((fatia, indice) => ({
    ...fatia,
    largura: larguras[indice],
    x: larguras.slice(0, indice).reduce((soma, largura) => soma + largura, 0),
    cor: VERDES[indice % VERDES.length],
  }));

  const legenda = segmentos
    .map((s) => `${s.rotulo}: ${formatPct((s.valor / total) * 100, 0)}, ${formatBRL(s.valor)}`)
    .join("; ");

  return (
    <div className="flex flex-col gap-4">
      <svg
        viewBox={`0 0 ${VB_W} ${ALOCACAO_VB_H}`}
        className="w-full"
        role="img"
        aria-label={`Composição de ${formatBRL(total)} por ano. ${legenda}.`}
      >
        {segmentos.map((seg, indice) => (
          <rect
            key={seg.id}
            x={seg.x}
            y={0}
            width={Math.max(0, seg.largura - (indice === segmentos.length - 1 ? 0 : 2))}
            height={ALOCACAO_VB_H}
            rx={4}
            fill={seg.cor}
          />
        ))}
      </svg>
      {/* Legenda em HTML, nunca dentro do SVG: com cinco fatias, as menores não
          têm largura para um rótulo, e texto que some conforme o dado muda é
          pior que texto que sempre está no mesmo lugar. */}
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        {segmentos.map((seg) => (
          <div key={seg.id} className="flex items-center gap-2">
            <span
              className="h-2 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: seg.cor }}
              aria-hidden
            />
            <dt className="text-sm text-[var(--pf-ink-soft,#475569)]">{seg.rotulo}</dt>
            <dd className="ml-auto text-sm tabular-nums text-[var(--pf-ink,#0f172a)]">
              {formatPct((seg.valor / total) * 100, 0)} ·{" "}
              <span className="text-[var(--pf-ink-soft,#475569)]">
                {formatBRLCompacto(seg.valor)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

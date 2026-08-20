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
import { LinhaBarra, ListaBarras } from "./linha-barra";
import { LinhaCompacta } from "./linha-compacta";

// Gráficos do resultado — a maioria em SVG próprio (zero dependências, mesmas
// convenções dos painéis de trajetória, §8 das diretrizes: viewBox de 640 de
// largura escalando por `w-full`, grade tracejada em `--pf-line`, legendas em
// HTML fora do SVG). Três blocos (`InvestimentoVsRetorno`, `DecomposicaoValor`,
// `ComparacaoCenarios`) viraram HTML puro em 20/08/2026: são listas de barras
// e cards com rótulo/valor — texto real, sem nada que um `aria-label` precise
// recitar de novo. Rótulos em 12–13px e cinzas um degrau mais escuros que a
// convenção original: quem lê esta tela costuma ter mais de 45 anos, e 10px em
// `#94a3b8` não sobrevive a isso.
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

/**
 * A prosa que enquadra a decomposição, para a `SecaoResultado` a usar como
 * descrição. Ela era o parágrafo de FECHO do bloco e subiu para o cabeçalho na
 * passagem de 20/08/2026: no topo ela prepara a leitura das cinco barras; em
 * baixo, resumia o que a pessoa acabara de ler. É a mesma frase — o leitor de
 * tela continua recebendo o contraste eficiência↔performance antes da lista.
 */
export function descricaoDecomposicao(resultado: ResultadoOk): string {
  const semCiclo = resultado.parcelas.ganhoCicloAno === null;
  return (
    "Sem dupla contagem: cada alavanca tem teto próprio, e as de performance " +
    "carregam o desconto anti-otimismo — exceto o ticket, que é medido direto " +
    "no CRM. Eficiência é custo que deixa de existir; performance é margem nova." +
    (semCiclo ? " O ciclo entra quando o funil estiver preenchido." : "")
  );
}

// ---------------------------------------------------------------------------
// Comparação dos três cenários (aba Scenario Comparison do Excel), um card
// completo por cenário — substituiu o gráfico de barras + resumo por pedido
// do decisor em 20/08/2026: o CFO quer o detalhamento inteiro lado a lado,
// não só o múltiplo. Cada card repete as cinco alavancas, o valor anual e a
// mensalidade, na mesma pauta de `LinhaCompacta` usada no resto da tela.
// ---------------------------------------------------------------------------

export function ComparacaoCenarios({
  linhas,
  precoMes,
  cenarioAtivo,
  personalizado = false,
}: {
  linhas: LinhaCenario[];
  precoMes: number;
  cenarioAtivo: Cenario;
  // Em "parâmetros personalizados" nenhum preset está ativo: o destaque vai
  // para a base, tracejada, como antes.
  personalizado?: boolean;
}) {
  return (
    // pt-3: o selo do cenário ativo monta 10px acima da borda do card, e sem
    // esse ar ele seria cortado pelo bloco em volta.
    <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-3">
      {linhas.map((linha) => {
          const ativo = !personalizado && linha.cenario === cenarioAtivo;
          const base = personalizado && linha.cenario === cenarioAtivo;
          return (
          <div
            key={linha.cenario}
            className={cn(
              // `relative` porque o selo do ativo é SOBREPOSTO à borda: ele sai
              // do fluxo e monta na moldura em vez de empurrar o nome do
              // cenário para o lado. Dentro do fluxo, o par nome+pílula ocupava
              // a primeira linha inteira e a coluna ativa ficava um degrau mais
              // baixa que as outras duas.
              "relative flex flex-col gap-4 rounded-sm border p-6",
              ativo
                ? "border-[var(--pf-brand,#2e63cd)] bg-[var(--pf-surface-alt,#ffffff)]"
                : "border-[var(--pf-line,#e2e8f0)]",
              base && "border-dashed",
            )}
          >
            {ativo ? (
              <span className="pf-label absolute -top-2.5 left-6 inline-flex w-fit items-center whitespace-nowrap rounded-full bg-[var(--pf-brand,#2e63cd)] px-3 py-1 text-[var(--pf-on-brand,#ffffff)]">
                Cenário ativo
              </span>
            ) : null}
            <div className="flex flex-col gap-2">
              <span
                className={cn(
                  "pf-card-title",
                  ativo
                    ? "text-[var(--pf-brand-ink,#2e63cd)]"
                    : "text-[var(--pf-ink,#334155)]",
                )}
              >
                {CENARIOS[linha.cenario].label}
              </span>
              <span className="pf-num-hero text-trend-positive">
                {formatX(linha.roi)}
              </span>
              <span className="text-sm text-[var(--pf-ink-soft,#475569)]">
                payback em{" "}
                <span className="font-medium tabular-nums text-[var(--pf-ink-soft,#475569)]">
                  {formatMeses(linha.paybackMeses)}
                </span>{" "}
                · valor/ano {formatBRL(linha.valorAno)}
              </span>
              {linha.paybackExcedeContrato ? (
                <span className="text-sm leading-6 text-[var(--pf-warn-ink,#973c00)]">
                  passa do prazo escolhido
                </span>
              ) : null}
            </div>

            {/* Tracejado entre as parcelas, sólido acima do subtotal: a mesma
                distinção da `LinhaBarra` — régua de lista contra fio que fecha
                conta. Sem ela, sete linhas de mesma natureza empatavam com as
                duas que somam. */}
            <dl className="flex flex-col divide-y divide-dashed divide-[var(--pf-line,#e2e8f0)] border-t border-[var(--pf-line-soft,#f1f5f9)] pt-2 [&>*]:py-2">
              <LinhaCompacta
                rotulo="Eficiência (igual)"
                valor={formatBRL(linha.eficienciaAno)}
              />
              <LinhaCompacta
                rotulo="Ticket médio"
                valor={formatBRL(linha.parcelas.margemTicketAno)}
                tom="positivo"
              />
              <LinhaCompacta
                rotulo="Rampa"
                valor={formatBRL(linha.parcelas.margemRampaAno)}
                tom="positivo"
              />
              <LinhaCompacta
                rotulo="Conversão"
                valor={formatBRL(linha.parcelas.ganhoConversaoAno)}
                tom="positivo"
              />
              <LinhaCompacta
                rotulo="Ciclo de vendas"
                valor={
                  linha.parcelas.ganhoCicloAno === null
                    ? "—"
                    : formatBRL(linha.parcelas.ganhoCicloAno)
                }
                tom={linha.parcelas.ganhoCicloAno === null ? "neutro" : "positivo"}
              />
            </dl>

            <dl className="flex flex-col gap-2 border-t border-[var(--pf-line-strong,#cbd5e1)] pt-4">
              <LinhaCompacta
                rotulo="Valor anual"
                valor={formatBRL(linha.valorAno)}
                tom="positivo"
              />
              <LinhaCompacta rotulo="Mensalidade" valor={formatBRL(precoMes)} />
            </dl>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A ressalva dos três cenários, para a `SecaoResultado` a usar como descrição.
 * Era o parágrafo de FECHO do bloco e subiu para o cabeçalho junto com a da
 * decomposição (20/08/2026): a pessoa precisa saber que a eficiência é
 * invariante ANTES de comparar as três colunas — lida depois, "igual nos três"
 * já foi interpretada como erro de cálculo.
 */
export const DESCRICAO_CENARIOS =
  "Mesmos dados da sua operação nos três; só os deltas de melhoria mudam. " +
  "A eficiência é igual em todos — ela vem do caminho declarado, não do cenário.";

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
                  className="fill-[var(--pf-ink-faint,#64748b)]"
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
              className="fill-[var(--pf-ink-faint,#64748b)]"
            >
              {largura > 74 ? `Faixa ${index + 1}` : ""}
            </text>
          </g>
        ))}
      </svg>

      <p className="text-sm leading-6 text-[var(--pf-ink-soft,#475569)]">
        Cada faixa cobra a própria taxa, como imposto de renda:{" "}
        <span className="font-medium text-[var(--pf-ink-soft,#475569)]">
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
  const limite = CHECAGEM_ALERTA * 100;
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

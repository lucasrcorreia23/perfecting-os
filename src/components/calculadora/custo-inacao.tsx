"use client";

import {
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { COI_HORAS_COACHING_MIN } from "@/lib/calculadora/constants";
import {
  formatBRL,
  formatHoras,
  formatNumero,
  formatPct,
  formatX,
} from "@/lib/calculadora/format";
import type { DimensaoCoiId, PassoId, ResultadoCoi } from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { LinhaCompacta } from "./linha-compacta";
import { SeloEvidencia } from "./selo-evidencia";

// Custo da Inação — o que vaza hoje, medido com os números do próprio cliente.
//
// Dono de nenhuma superfície: só `flex flex-col gap-*`, como EficienciaCard e
// QuantoCusta. Quem dá a moldura é o SecaoResultado do chamador — é isso que
// permite a mesma peça servir a jornada pública e, um dia, o detalhe interno
// sem virar card aninhado.
//
// NUNCA VERDE — essa parte da regra original continua de pé: verde é "entra
// na conta" e o COI, por definição, não entra. Mas a lacuna É um alerta, e
// desde 20/08/2026 ela usa a paleta que o produto já reserva para isso:
// `trend-negative` (vermelho) nas cinco parcelas que vazam e o âmbar de
// `--pf-warn-*` no card que compara a lacuna ao investimento — o mesmo par
// que já pinta `AvisosCoerencia` e o alerta de checagem abaixo. Nenhuma cor
// nova: as duas já existiam no sistema para exatamente este papel (risco),
// só não tinham sido aplicadas aqui.

const ROTULOS: Record<DimensaoCoiId, { rotulo: string; nota: string }> = {
  subperformance: {
    rotulo: "Quota que não se bate sem prática",
    nota: "quem não pratica fecha menos",
  },
  rampa_estendida: {
    rotulo: "Rampa mais longa nas novas contratações",
    nota: "cada mês a mais rende metade",
  },
  turnover: {
    rotulo: "Reposição de quem sai por falta de coaching",
    nota: "limitado às contratações do ano",
  },
  no_decision: {
    rotulo: "Negócios que morrem sem decisão",
    nota: "só a fração que coaching destrava",
  },
  fila: {
    rotulo: "Espera por uma vaga na agenda do gestor",
    nota: "produtividade perdida na fila",
  },
};

// As duas dimensões que dependem de `salarioVendedor`, campo opcional do passo
// 3. Sem ele o valor é travessão, nunca zero (invariante 8) — e a tela diz o
// que preencher, em vez de deixar a pessoa adivinhar por que a linha está vazia.
const DEPENDEM_DO_SALARIO: DimensaoCoiId[] = ["turnover", "fila"];

// Três leituras da mesma lacuna, num posto que ela não tinha: anual (a soma
// das cinco parcelas), mensal/diária (a mesma soma noutra régua de tempo — o
// dia é calendário, não útil, porque a inação não para no fim de semana) e
// contra o investimento (o card âmbar, só quando o preço do time é conhecido).
function CardKpiCoi({
  titulo,
  valor,
  nota,
  alerta = false,
}: {
  titulo: string;
  valor: string;
  nota?: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-sm border p-4",
        alerta
          ? "border-(--pf-warn-line) bg-(--pf-warn-surface)"
          : "border-(--pf-line) bg-(--pf-surface)",
      )}
    >
      <span
        className={cn(
          "text-xs font-semibold",
          alerta ? "text-(--pf-warn-ink)" : "text-(--pf-ink-faint)",
        )}
      >
        {titulo}
      </span>
      <span
        className={cn(
          "text-2xl font-semibold tabular-nums",
          alerta ? "text-(--pf-warn-ink)" : "text-(--pf-ink)",
        )}
      >
        {valor}
      </span>
      {nota ? (
        <span className={cn("text-xs", alerta ? "text-(--pf-warn-ink)" : "text-(--pf-ink-faint)")}>
          {nota}
        </span>
      ) : null}
    </div>
  );
}

export function CustoInacao({
  coi,
  precoAno,
  onIrParaPasso,
}: {
  coi: ResultadoCoi;
  // Investimento anual do time. Só existe quando o resultado fechou (o COI
  // depende dele para o card "Inação × investimento") — `null` quando o
  // chamador não tem o número à mão, e o terceiro card simplesmente não nasce.
  precoAno: number | null;
  onIrParaPasso?: (passo: PassoId) => void;
}) {
  const { cobertura, capacidade } = coi;
  const faltaSalario = coi.dimensoes.some(
    (d) => DEPENDEM_DO_SALARIO.includes(d.id) && d.valorAno === null,
  );
  const lacunaDePratica = cobertura.pctAtendida < 1;
  const multiplo = precoAno && precoAno > 0 ? coi.totalAno / precoAno : null;
  const maiorDimensao = Math.max(...coi.dimensoes.map((d) => d.valorAno ?? 0), 1);

  return (
    <section className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CardKpiCoi titulo="Custo da inação, por ano" valor={formatBRL(coi.totalAno)} />
        <CardKpiCoi
          titulo="Por mês / por dia"
          valor={formatBRL(coi.totalAno / 12)}
          nota={`≈ ${formatBRL(coi.totalAno / 365)} por dia da inação`}
        />
        {multiplo !== null ? (
          <CardKpiCoi
            titulo="Inação × investimento"
            valor={formatX(multiplo)}
            nota={
              multiplo > 1
                ? ">1× — a inação custa mais que a Perfecting"
                : "abaixo do investimento anual"
            }
            alerta={multiplo > 1}
          />
        ) : null}
      </div>

      {/* Duas leituras, de propósito distintas: quanto da prática CHEGA ao
          vendedor, e se o gestor sequer TEM as horas. A planilha mistura as
          duas numa métrica só e se contradiz (E-31).

          gap-3, não gap-2: 8px é o degrau de "ícone ↔ texto", e com leading-7
          no primeiro parágrafo os dois colavam num bloco só com um soluço no
          meio. Prosa ao lado de prosa é linha ↔ linha. */}
      <div className="flex flex-col gap-3">
        <p className="pf-lead text-(--pf-ink-soft)">
          {lacunaDePratica ? (
            <>
              Hoje chegam <strong className="font-semibold text-(--pf-ink)">
                {formatHoras(cobertura.horasEntreguesMes)}
              </strong>{" "}
              de prática por mês ao time, contra as{" "}
              {formatHoras(cobertura.horasNecessariasMes)} que{" "}
              {formatNumero(cobertura.horasNecessariasMes / COI_HORAS_COACHING_MIN, 0)}{" "}
              vendedores precisariam — o equivalente a{" "}
              <strong className="font-semibold text-(--pf-ink)">
                {formatNumero(cobertura.vendedoresNaoAtendidos, 1)} vendedores
              </strong>{" "}
              sem a prática mínima.
            </>
          ) : (
            <>
              As {formatHoras(cobertura.horasEntreguesMes)} de prática que chegam ao
              time por mês já cobrem o mínimo de{" "}
              {formatHoras(cobertura.horasNecessariasMes)}. A lacuna abaixo não vem de
              cobertura.
            </>
          )}
        </p>
        {capacidade.gapHorasMes > 0 ? (
          <p className="text-sm leading-6 text-(--pf-ink-soft)">
            Seus gestores têm {formatHoras(capacidade.horasDisponiveisMes)}/mês para uma
            demanda de {formatHoras(capacidade.horasNecessariasMes)}:{" "}
            {formatPct(capacidade.pctNaoAtendida * 100)} da necessidade não cabe na
            agenda. Não é falta de vontade, é falta de capacidade.
          </p>
        ) : (
          <p className="text-sm leading-6 text-(--pf-ink-soft)">
            Seus gestores têm {formatHoras(capacidade.horasDisponiveisMes)}/mês, o
            bastante para a demanda de {formatHoras(capacidade.horasNecessariasMes)}. As
            horas existem — o que se perde é no caminho até o vendedor.
          </p>
        )}
      </div>

      {/* Um selo para o grupo inteiro, não um por linha: são cinco premissas de
          mesma natureza, e cinco pílulas empurrariam cada rótulo para duas
          linhas para dizer a mesma coisa (a passagem de 18/08 já fixou isso em
          EficienciaCard). */}
      {/* gap-4 do título para a lista contra gap-3 entre as linhas: o rótulo
          do grupo tem de pesar mais que o intervalo que separa duas parcelas,
          senão ele vira a primeira linha da lista. Mesma cadência do
          EficienciaCard. */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="pf-panel-title text-(--pf-ink-soft)">
            Onde o dinheiro vaza
          </h3>
          <SeloEvidencia selo="premissa" />
        </div>
        {/* Barra por dimensão, proporcional à maior — o mesmo desenho da
            decomposição do valor (`DecomposicaoValor`), espelhado em
            `trend-negative`: aqui a barra mede o que vaza, não o que entra.
            Zero é medição, não ausência — a linha fica, com barra vazia, para
            o leitor ver o conjunto inteiro e quais dimensões não se aplicam a
            ele. Travessão quando `valorAno` é `null` (depende do salário). */}
        <ul className="flex flex-col gap-5">
          {coi.dimensoes.map((d) => {
            const pct = d.valorAno ? Math.min(100, (d.valorAno / maiorDimensao) * 100) : 0;
            return (
              <li key={d.id} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-sm font-medium text-(--pf-ink)">
                    {ROTULOS[d.id].rotulo}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-trend-negative">
                    {d.valorAno === null ? "—" : `${formatBRL(d.valorAno)}/ano`}
                  </span>
                </div>
                {/* Nota sai quando zero: "quem não pratica fecha menos" ao
                    lado de R$ 0 contradiz o próprio número. */}
                {d.valorAno ? (
                  <p className="text-xs text-(--pf-ink-faint)">{ROTULOS[d.id].nota}</p>
                ) : null}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-(--pf-bar)">
                  <div
                    className="h-full rounded-full bg-trend-negative"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        {faltaSalario ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-(--pf-ink-soft)">
            Duas linhas dependem do salário mensal do vendedor, que ficou em branco.
            {onIrParaPasso ? (
              <button
                type="button"
                onClick={() => onIrParaPasso(3)}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full text-sm font-medium leading-5 text-(--pf-brand) transition-colors hover:text-(--pf-brand-deep) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35 sm:min-h-8"
              >
                <PencilSquareIcon className="h-4 w-4" aria-hidden />
                Preencher no passo 3
              </button>
            ) : null}
          </p>
        ) : null}
      </div>

      {/* O fecho põe o valor do programa CONTRA a lacuna, nunca ao lado dela: o
          COI é contrafactual e o ROI é atribuição, e o invariante 1 do V5 manda
          escolher um dos dois para o mesmo valor. Somar os números seria contar
          a mesma economia duas vezes — que é o que a nota ① da planilha pede
          (E-34) e nós recusamos. */}
      <div className="flex flex-col gap-4 border-t border-(--pf-line) pt-6">
        {/* A resposta do bloco, no posto que ela merece. Era a terceira linha
            de uma lista de três, em text-sm — o mesmo peso das cinco parcelas
            acima, e por isso o único bloco da etapa sem foco: o hero tem o
            número-manchete, Eficiência e Performance têm seus totais em
            text-lg, "Quanto custa" tem o preço. Aqui o olho não pousava em
            lugar nenhum.

            Tinta neutra, nunca verde: a lacuna não entra na conta, e é a mesma
            regra que mantém preço e payback neutros. O tom é o do CabecalhoParcela
            ao lado, um degrau abaixo no rótulo (text-sm, o posto de bloco das
            diretrizes) porque quem manda na seção continua sendo o título. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="pf-panel-title text-(--pf-ink-soft)">
            Lacuna estimada hoje
          </h3>
          {/* ml-auto, não só justify-between: em coluna estreita (a sidebar
              "Seus números" come 264px) o par quebra, e justify-between sozinho
              joga o valor para a ESQUERDA da segunda linha. Mesma correção que
              LinhaCompacta já levou. */}
          <span className="ml-auto text-lg font-semibold tabular-nums text-(--pf-ink)">
            {formatBRL(coi.totalAno)}/ano
          </span>
        </div>
        <dl className="flex flex-col gap-3">
          <LinhaCompacta
            rotulo="Quanto o programa recupera"
            valor={`${formatBRL(coi.recuperadoAno)}/ano`}
            delta={formatPct(coi.pctRecuperado * 100)}
          />
          <LinhaCompacta
            rotulo="O que continua vazando"
            valor={`${formatBRL(coi.residualAno)}/ano`}
            nota={coi.residualAno === 0 ? "a lacuna medida é coberta" : undefined}
          />
        </dl>
        <p className="text-sm leading-6 text-(--pf-ink-soft)">
          Esta lacuna não entra no ROI e não se soma a ele — é a outra pergunta,
          respondida com os mesmos números. Cada linha carrega um desconto de
          conservadorismo declarado.
        </p>
      </div>

      {coi.checagemAlerta ? (
        <p className="flex items-start gap-2 rounded-sm border border-(--pf-warn-line) bg-(--pf-warn-surface) px-4 py-3 text-sm leading-6 text-(--pf-warn-ink)">
          <ExclamationTriangleIcon className="mt-1 h-4 w-4 shrink-0" aria-hidden />
          A lacuna estimada chega a {formatPct(coi.checagemPct)} da margem anual do time.
          Acima de 25% vale conferir os dados de estrutura — gestores, vendedores cobertos
          e horas de prática de hoje.
        </p>
      ) : null}
    </section>
  );
}

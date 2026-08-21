"use client";

import {
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { COI_FONTES } from "@/lib/calculadora/constants";
import {
  formatBRL,
  formatHoras,
  formatNumero,
  formatPct,
  formatX,
} from "@/lib/calculadora/format";
import {
  explicarCoiTotal,
  explicarDimensaoCoi,
  type ExplicacaoValor,
} from "@/lib/calculadora/explicacoes";
import type {
  DimensaoCoiId,
  EntradasTime,
  PassoId,
  ResultadoCoi,
} from "@/lib/calculadora/types";
import { cn } from "@/lib/utils";
import { ExplicacaoInfo } from "./explicacao-info";
import { usePremissas } from "./premissas-context";
import { LinhaBarra, ListaBarras } from "./linha-barra";
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
  explicacao,
  alerta = false,
}: {
  titulo: string;
  valor: string;
  nota?: string;
  /**
   * Toda entrada do COI repete, na última linha da conta, que a lacuna NÃO se
   * soma ao ROI. É a afirmação mais fácil de perder nesta tela — cinco números
   * grandes em reais, um deles maior que o valor anual do programa — e o
   * invariante 1 do V5 depende de ela chegar junto com o número.
   */
  explicacao?: ExplicacaoValor;
  alerta?: boolean;
}) {
  return (
    <div
      className={cn(
        // rounded-md/p-5 e a escala `pf-*`: o mesmo card do `CardEscopo` da
        // capa. Eram `rounded-sm p-4 text-2xl` — um oitavo dialeto de número
        // numa etapa que já tinha sete.
        "flex flex-col gap-2 rounded-md border p-5",
        alerta
          ? "border-(--pf-warn-line) bg-(--pf-warn-surface)"
          : "border-(--pf-line) bg-(--pf-surface)",
      )}
    >
      <span
        className={cn(
          "pf-panel-title flex items-center gap-1.5",
          alerta ? "text-(--pf-warn-ink)" : "text-(--pf-ink-soft)",
        )}
      >
        {titulo}
        {explicacao ? <ExplicacaoInfo explicacao={explicacao} /> : null}
      </span>
      <span
        className={cn(
          "pf-num-kpi",
          alerta ? "text-(--pf-warn-ink)" : "text-(--pf-ink)",
        )}
      >
        {valor}
      </span>
      {nota ? (
        <span className={cn("pf-hint", alerta ? "text-(--pf-warn-ink)" : "text-(--pf-ink-soft)")}>
          {nota}
        </span>
      ) : null}
    </div>
  );
}

export function CustoInacao({
  coi,
  entradas,
  precoAno,
  onIrParaPasso,
}: {
  coi: ResultadoCoi;
  // As entradas do time, para as cinco dimensões poderem abrir a cadeia de
  // fatores que as produziu: o COI devolve o valor de cada uma, não os
  // operandos.
  entradas: EntradasTime;
  // Investimento anual do time. Só existe quando o resultado fechou (o COI
  // depende dele para o card "Inação × investimento") — `null` quando o
  // chamador não tem o número à mão, e o terceiro card simplesmente não nasce.
  precoAno: number | null;
  onIrParaPasso?: (passo: PassoId) => void;
}) {
  const p = usePremissas();
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
        <CardKpiCoi
          titulo="Custo da inação, por ano"
          valor={formatBRL(coi.totalAno)}
          explicacao={explicarCoiTotal(coi)}
        />
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

      {/* As fontes, ratificadas para a tela do visitante em 20/08/2026.
          Vinham só de `/calculadoras/referencia` (interno). Ficam em `pf-hint`
          e logo abaixo dos KPIs, não no cabeçalho: são a procedência dos
          benchmarks, e procedência se lê depois do número, quando a pergunta
          "de onde saiu isso?" já nasceu.

          "Benchmarks de mercado" e não "estudos mostram": nenhuma das seis foi
          verificada na origem, e as constantes seguem marcadas [H]. A
          atribuição do JOLT Effect foi corrigida na fonte (`COI_FONTES`) — a
          planilha a creditava a "HBR 2019", data que não confere. */}
      <p className="pf-hint text-(--pf-ink-faint)">
        Cada linha carrega um desconto de conservadorismo declarado. Benchmarks
        de mercado: {COI_FONTES.join(" · ")}.
      </p>

      {/* O DIAGNÓSTICO, em alerta e não em prosa.
          Era o segundo de dois parágrafos corridos, no mesmo cinza do resto —
          a frase mais dura do bloco ("não é falta de vontade, é falta de
          capacidade") lida com o peso de uma legenda. Vermelho e não âmbar
          porque o âmbar diz "confira isto"; aqui a leitura é de risco, a mesma
          família das cinco parcelas abaixo. Só nasce quando há déficit: sem
          gap, um alerta seria alarme falso, e a leitura vira uma linha do
          rodapé. */}
      {capacidade.gapHorasMes > 0 ? (
        <p className="flex items-start gap-3 rounded-sm border border-(--pf-danger-line) bg-(--pf-danger-surface) p-4 text-sm leading-6 text-trend-negative">
          <ExclamationTriangleIcon className="mt-1 h-5 w-5 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Falta de capacidade, não de vontade:</strong>{" "}
            seus gestores têm {formatHoras(capacidade.horasDisponiveisMes)}/mês para
            uma demanda de {formatHoras(capacidade.horasNecessariasMes)} —{" "}
            {formatPct(capacidade.pctNaoAtendida * 100)} da necessidade não cabe na
            agenda.
          </span>
        </p>
      ) : null}

      {/* Um selo para o grupo inteiro, não um por linha: são cinco premissas de
          mesma natureza, e cinco pílulas empurrariam cada rótulo para duas
          linhas para dizer a mesma coisa (a passagem de 18/08 já fixou isso em
          EficienciaCard). */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="pf-panel-title text-(--pf-ink-soft)">
            Onde o dinheiro vaza
          </h3>
          <SeloEvidencia selo="premissa" />
        </div>
        {/* Barra INLINE por dimensão, proporcional à maior — o mesmo desenho da
            decomposição do valor, espelhado em `trend-negative`: aqui a barra
            mede o que vaza, não o que entra. Zero é medição, não ausência: a
            linha fica, com barra vazia, para o leitor ver o conjunto inteiro e
            quais dimensões não se aplicam a ele. Travessão quando `valorAno` é
            `null` (depende do salário). */}
        <ListaBarras>
          {coi.dimensoes.map((d) => (
            <LinhaBarra
              key={d.id}
              rotulo={ROTULOS[d.id].rotulo}
              // SÓ onde há valor. Zero é medição e a linha fica — mas um balão
              // abrindo uma multiplicação que termina em R$ 0 não explica
              // nada, e travessão já tem afordância própria ("Preencher no
              // passo 3", logo abaixo da lista).
              explicacao={
                d.valorAno
                  ? explicarDimensaoCoi({
                      id: d.id,
                      valorAno: d.valorAno,
                      coi,
                      entradas,
                      premissas: p,
                    })
                  : undefined
              }
              // Nota sai quando zero: "quem não pratica fecha menos" ao lado de
              // R$ 0 contradiz o próprio número.
              nota={d.valorAno ? ROTULOS[d.id].nota : undefined}
              valor={d.valorAno === null ? "—" : `${formatBRL(d.valorAno)}/ano`}
              pct={d.valorAno ? (d.valorAno / maiorDimensao) * 100 : 0}
              tom="negativo"
            />
          ))}
        </ListaBarras>
        {/* A COBERTURA vira rodapé da lista. Era o parágrafo de ABERTURA do
            bloco, em `pf-lead`, e nesse posto ela adiava por quatro linhas os
            três números que respondem a pergunta do bloco. É contexto da
            medição, não a medição. */}
        <p className="pf-hint text-(--pf-ink-soft)">
          {lacunaDePratica ? (
            <>
              Cobertura de prática hoje:{" "}
              {formatHoras(cobertura.horasEntreguesMes)}/mês chegam ao time contra
              as {formatHoras(cobertura.horasNecessariasMes)} que{" "}
              {formatNumero(
                cobertura.horasNecessariasMes / p.coi.horasCoachingMin,
                0,
              )}{" "}
              vendedores precisariam — o equivalente a{" "}
              {formatNumero(cobertura.vendedoresNaoAtendidos, 1)} vendedores sem a
              prática mínima.
            </>
          ) : (
            <>
              Cobertura de prática hoje:{" "}
              {formatHoras(cobertura.horasEntreguesMes)}/mês chegam ao time e já
              cobrem o mínimo de {formatHoras(cobertura.horasNecessariasMes)}. A
              lacuna acima não vem de cobertura.
            </>
          )}
        </p>
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

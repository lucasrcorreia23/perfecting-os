"use client";

import {
  ArrowDownIcon,
  ArrowUturnLeftIcon,
  ClockIcon,
  PrinterIcon,
  UserMinusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { CENARIOS, PLANOS } from "@/lib/calculadora/constants";
import {
  formatBRL,
  formatBRLCompacto,
  formatHoras,
  formatMeses,
  formatNumero,
  formatPct,
  formatX,
} from "@/lib/calculadora/format";
import { horasGestorDevolvidas } from "@/lib/calculadora/business-case";
import { horasDoTime } from "@/lib/calculadora/preco";
import type { ModeloCalculadora, TimeModelo } from "@/lib/calculadora/modelo";
import type { ResultadoTime } from "@/lib/calculadora/types";
import { Button } from "@/components/ui/button";
import { AlocacaoValor, fatiasDoValor, somarFatias } from "./graficos-resultado";
import { cn } from "@/lib/utils";

// A capa do relatório: uma tela, uma resposta.
//
// Antes desta passagem a etapa de resultado abria direto na pilha de dez blocos
// — trajetória, as duas metades da soma, cascata, cenários, COI, preço, resumo.
// Tudo isso continua existindo, LOGO ABAIXO desta capa, na mesma rolagem. O que
// faltava era a dobra que responde antes de explicar: quem abre o link decide
// primeiro se o número interessa, e só então quer saber como ele foi construído.
//
// A capa e o cálculo já foram duas abas, e deixaram de ser em 20/08/2026: a
// segunda aba abria com um hero que repetia, noutro desenho, os quatro números
// que esta capa acabara de dar, e escolher entre as duas era uma decisão que a
// pessoa não tinha por que tomar. Por isso `onVerDetalhado` ROLA em vez de
// trocar de tela — o destino sempre esteve na mesma página.
//
// O painel do topo é a única superfície invertida da pele (§13, exceção de
// 20/08/2026): a capa é exclusiva da jornada pública e é o único bloco cuja
// função É ser dono da superfície. `link-detail` não a renderiza.
//
// Os quatro cards abaixo dele são todos SLATE, e nenhum é acaso: nenhum deles é
// parcela do ROI. Assentos e horas são escopo; gestor liberado e gestores não
// contratados são economia declarada que o motor mantém FORA da conta
// (`linhasNaoSomadas`). Pintá-los de verde diria que somam — e o card de
// headcount até traz o selo dizendo que não.

type ResultadoOk = Extract<ResultadoTime, { status: "ok" }>;

function CardEscopo({
  icone: Icone,
  rotulo,
  valor,
  nota,
}: {
  icone: typeof UsersIcon;
  rotulo: string;
  valor: string;
  nota: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-(--pf-line) bg-(--pf-surface) p-5">
      <span className="pf-panel-title flex items-center gap-2 text-(--pf-ink-soft)">
        <Icone className="h-4 w-4 shrink-0 text-(--pf-ink-faint)" aria-hidden />
        {rotulo}
      </span>
      <span className="pf-num-kpi text-(--pf-ink)">
        {valor}
      </span>
      <span className="pf-hint text-(--pf-ink-soft)">{nota}</span>
    </div>
  );
}

function Kpi({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="pf-panel-title text-(--pf-invert-soft)">
        {rotulo}
      </span>
      <span
        className={cn(
          // O ROI é o número-manchete do relatório inteiro: ele sobe para o
          // nível "número hero" do §3.2 (30→40px) e os outros três ficam no
          // "valor de KPI" (21→27). Quatro números do mesmo tamanho não têm
          // manchete — e a pessoa abriu o link para ver este.
          destaque ? "pf-num-hero" : "pf-num-kpi",
          // O verde de "entra na conta" sobrevive intacto sobre o escuro —
          // 4,9:1, acima do piso. É o que mantém o ROI verde na capa sem
          // inventar um segundo verde para o fundo invertido.
          destaque ? "text-trend-positive" : "text-(--pf-invert-ink)",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

export function CapaResultado({
  modelo,
  timeAtivo,
  dataCalculo,
  onVerDetalhado,
  onAjustarProposta,
}: {
  modelo: ModeloCalculadora;
  timeAtivo: TimeModelo;
  dataCalculo: string;
  onVerDetalhado: () => void;
  onAjustarProposta: () => void;
}) {
  const multiTime = modelo.times.length > 1;
  const consolidado = modelo.consolidado;
  const completos = modelo.times.filter(
    (time): time is TimeModelo & { resultado: ResultadoOk } =>
      time.resultado.status === "ok",
  );

  // Conta fechada = todos os times completos. Com um time só, o consolidado e o
  // time dizem a mesma coisa; com vários, é o consolidado que manda (ponderado
  // por investimento, nunca média de ROIs — invariante 11).
  const conta =
    consolidado.status === "ok"
      ? {
          roi: consolidado.roi,
          valorAno: consolidado.valorAno,
          paybackMeses: consolidado.paybackMeses,
          assentos: consolidado.totalAssentos,
          vendedores: consolidado.totalVendedores,
          cobertura: consolidado.cobertura,
        }
      : null;

  const cenarioLabel =
    timeAtivo.sel.modo === "preset"
      ? `cenário ${CENARIOS[timeAtivo.sel.cenario].label}`
      : "parâmetros personalizados";

  const meta = conta
    ? [
        `${modelo.times.length} ${modelo.times.length === 1 ? "time" : "times"}`,
        `${conta.assentos} assentos`,
        `${formatPct(conta.cobertura * 100, 0)} do time`,
        cenarioLabel,
        `cálculo de ${dataCalculo}`,
      ].join(" · ")
    : "Preencha os campos obrigatórios de um time para a conta fechar.";

  // ── As quatro leituras de escopo ──────────────────────────────────────────
  // Duas já existiam prontas no motor; duas são releitura de campos que o
  // gating já validou. Nenhuma inventa premissa.
  const horasPratica = completos.reduce(
    (soma, time) => soma + horasDoTime(time.proposta),
    0,
  );
  const gestorLiberado = completos.reduce(
    (soma, time) =>
      soma +
      horasGestorDevolvidas(
        time.entradas,
        time.proposta.plano,
        time.proposta.assentos,
        time.resultado.fatorEscopo.valor,
      ).horas,
    0,
  );
  const custoHoraGestor =
    completos[0]?.resultado.linhasNaoSomadas.find(
      (linha) => linha.id === "ancoragem_hora_roleplay",
    )?.detalhe?.custoHoraGestor ?? null;
  const headcount = completos.reduce(
    (acc, time) => {
      const linha = time.resultado.linhasNaoSomadas.find(
        (l) => l.id === "economia_headcount",
      );
      return {
        gestores: acc.gestores + (linha?.detalhe?.gestores ?? 0),
        valorAno: acc.valorAno + (linha?.valorAno ?? 0),
      };
    },
    { gestores: 0, valorAno: 0 },
  );

  const fatias = somarFatias(completos.map((time) => fatiasDoValor(time.resultado)));

  // A régua diária: o invariante 12 garante que retorno ÷ custo devolve o
  // mesmo ROI da conta, só noutra unidade.
  const gran = completos[0]?.resultado.granularidade ?? null;

  const timesOrdenados = [...completos].sort((a, b) => {
    const porVendedorA = a.resultado.valorAno / Math.max(1, a.entradas.numVendedores ?? 1);
    const porVendedorB = b.resultado.valorAno / Math.max(1, b.entradas.numVendedores ?? 1);
    return porVendedorB - porVendedorA;
  });
  const maiorValor = Math.max(1, ...timesOrdenados.map((t) => t.resultado.valorAno));

  return (
    <div className="flex flex-col gap-3">
      {/* ── O painel de resposta ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 rounded-md bg-(--pf-invert) p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span
              className="pf-panel-title text-(--pf-invert-soft)"
              aria-hidden
            >
              O resultado da conta
            </span>
            <p className="pf-lead text-(--pf-invert-soft)">{meta}</p>
          </div>
          <span data-no-print>
            <Button
              variant="secondary"
              size="sm"
              icon={PrinterIcon}
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
          <Kpi rotulo="ROI" valor={formatX(conta?.roi ?? null)} destaque />
          <Kpi rotulo="Retorno anual" valor={formatBRL(conta?.valorAno ?? null)} />
          <Kpi rotulo="Payback" valor={formatMeses(conta?.paybackMeses ?? null)} />
          <Kpi rotulo="Mensalidade" valor={formatBRL(modelo.preco.mensal)} />
        </dl>

        {conta !== null && conta.roi < 1 ? (
          <p className="border-t border-(--pf-invert-line) pt-5 text-sm leading-6 text-(--pf-invert-soft)">
            Com estes números a projeção fica abaixo de 1×. Recomendamos medir um
            baseline num piloto antes de contratar.
          </p>
        ) : null}
      </div>

      {/* ── Escopo: quatro leituras que NÃO somam ao ROI ─────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CardEscopo
          icone={UsersIcon}
          rotulo="Vendedores com assento"
          valor={conta ? formatNumero(conta.assentos, 0) : "—"}
          nota={conta ? `de ${formatNumero(conta.vendedores, 0)} no time` : "—"}
        />
        <CardEscopo
          icone={ClockIcon}
          rotulo="Prática por mês"
          valor={completos.length > 0 ? formatHoras(horasPratica) : "—"}
          nota="horas de treino entregues"
        />
        <CardEscopo
          icone={ArrowUturnLeftIcon}
          rotulo="Gestor liberado"
          valor={completos.length > 0 ? `${formatHoras(gestorLiberado)}/mês` : "—"}
          nota={
            custoHoraGestor !== null
              ? `${formatBRL(gestorLiberado * custoHoraGestor)} por mês`
              : "horas que saem da agenda dos gestores"
          }
        />
        <CardEscopo
          icone={UserMinusIcon}
          rotulo="Gestores não contratados"
          valor={completos.length > 0 ? formatNumero(headcount.gestores, 1) : "—"}
          nota={
            completos.length > 0
              ? `${formatBRLCompacto(headcount.valorAno)}/ano — fora do ROI`
              : "fora do ROI"
          }
        />
      </div>

      {/* ── De onde vem o valor + os times ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="pf-panel-title text-(--pf-ink)">
              De onde vem o valor
            </h2>
            <p className="pf-lead text-(--pf-ink-soft)">
              {conta ? `${formatBRL(conta.valorAno)} por ano` : "—"}
            </p>
          </div>
          {fatias.length > 0 ? (
            <AlocacaoValor fatias={fatias} />
          ) : (
            <p className="pf-lead text-(--pf-ink-soft)">
              As parcelas aparecem quando a conta de um time fecha.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="pf-panel-title text-(--pf-ink)">
              {multiTime ? "Times" : "Time"}
            </h2>
            <p className="pf-lead text-(--pf-ink-soft)">
              Ordenados por valor por vendedor/ano
            </p>
          </div>
          {timesOrdenados.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-(--pf-ink-faint)">
                  <th scope="col" className="pb-2 font-semibold">Time</th>
                  <th scope="col" className="pb-2 text-right font-semibold">Assentos</th>
                  <th scope="col" className="pb-2 text-right font-semibold">Valor/ano</th>
                  <th scope="col" className="pb-2 text-right font-semibold">ROI</th>
                </tr>
              </thead>
              <tbody>
                {timesOrdenados.map((time) => (
                  <tr key={time.id} className="align-top">
                    <td className="py-2 pr-3">
                      <span className="flex flex-col gap-1.5">
                        <span className="font-medium text-(--pf-ink)">{time.nome}</span>
                        <span
                          className="h-1 rounded-full bg-trend-positive"
                          style={{
                            width: `${(time.resultado.valorAno / maiorValor) * 100}%`,
                          }}
                          aria-hidden
                        />
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-(--pf-ink-soft)">
                      {time.proposta.assentos}
                    </td>
                    <td className="py-2 text-right tabular-nums text-(--pf-ink)">
                      {formatBRLCompacto(time.resultado.valorAno)}
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums font-medium text-(--pf-ink)">
                      {formatX(time.resultado.roi)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="pf-lead text-(--pf-ink-soft)">
              Nenhum time fechou a conta ainda.
            </p>
          )}
        </section>
      </div>

      {/* ── A régua diária ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CardEscopo
          icone={UsersIcon}
          rotulo="Custo por vendedor/dia"
          valor={gran ? formatBRL(gran.custoDiaPorVendedor, 2) : "—"}
          nota="dia útil, por assento"
        />
        <CardEscopo
          icone={UsersIcon}
          rotulo="Retorno por vendedor/dia"
          valor={gran ? formatBRL(gran.retornoDiaPorAssento, 2) : "—"}
          nota="dia útil, por assento"
        />
      </div>

      {/* ── Rodapé: a ressalva e as duas saídas ──────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-(--pf-line) bg-(--pf-surface) p-6 sm:p-8">
        <p className="max-w-xl text-sm leading-6 text-(--pf-ink-soft)">
          Estimativa · {cenarioLabel} · ganhos de rampa, ciclo e conversão já
          cortados em 30%. O plano contratado é{" "}
          {PLANOS[timeAtivo.proposta.plano].label}, com {modelo.prazoMeses} meses de
          contrato.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="tertiary" onClick={onAjustarProposta}>
            Ajustar proposta
          </Button>
          {/* Seta para BAIXO: o botão rola até o primeiro bloco do cálculo,
              e a seta para a direita prometia uma tela nova. */}
          <Button
            variant="primary"
            icon={ArrowDownIcon}
            iconPosition="right"
            onClick={onVerDetalhado}
          >
            Ver cálculo detalhado
          </Button>
        </div>
      </div>
    </div>
  );
}

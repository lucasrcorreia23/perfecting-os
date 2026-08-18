"use client";

import {
  NIVEL_COPY,
  PLANOS,
  PRAZO_COPY,
  PRAZOS_MESES,
} from "@/lib/calculadora/constants";
import { formatBRL, formatNumero, formatX } from "@/lib/calculadora/format";
import type { TimeModelo } from "@/lib/calculadora/modelo";
import type { PlanoId, PrecoConta } from "@/lib/calculadora/types";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CampoNumero } from "./campo-numero";
import { EscadaPrecoGrafico } from "./graficos-resultado";
import { BlocoRecolhivel } from "./secao-resultado";
import { SeloEvidencia } from "./selo-evidencia";

// "Quanto custa" — aqui o VISITANTE monta a proposta: plano e assentos por
// time, prazo da conta. Tudo recalcula na hora (escada, rateio, ROI). No
// detalhe interno o mesmo componente renderiza somente leitura: é a proposta
// que o cliente montou e enviou.

const PLANOS_IDS = Object.keys(PLANOS) as PlanoId[];

export function QuantoCusta({
  times,
  preco,
  prazoMeses,
  readOnly = false,
  onChangePlano,
  onChangeAssentos,
  onChangePrazo,
}: {
  times: TimeModelo[];
  preco: PrecoConta;
  prazoMeses: number;
  readOnly?: boolean;
  onChangePlano?: (timeId: string, plano: PlanoId) => void;
  onChangeAssentos?: (timeId: string, assentos: number | null) => void;
  onChangePrazo?: (prazoMeses: number) => void;
}) {
  const [extratoAberto, setExtratoAberto] = useState(false);
  const multiTime = times.length > 1;
  const nivel = NIVEL_COPY[preco.nivelServico];
  const interativo = !readOnly && onChangePlano && onChangeAssentos && onChangePrazo;

  // Granularidade por vendedor/dia (§4.10) — do primeiro time completo.
  const comResultado = times.find((time) => time.resultado.status === "ok");
  // Excel Account!C13: time incompleto não entrega horas à conta, então fica
  // fora do preço até o preenchimento fechar. O aviso só aparece quando a
  // exclusão pesa — sem nenhum time completo, o preço já é a prévia de todos
  // os assentos e não há nada a explicar.
  const foraDoPreco = times.filter(
    (time) => time.resultado.status !== "ok" && time.proposta.assentos > 0,
  );
  const precoParcial = comResultado !== undefined && foraDoPreco.length > 0;
  const gran =
    comResultado && comResultado.resultado.status === "ok"
      ? comResultado.resultado.granularidade
      : null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">
            {readOnly ? "A proposta que o cliente montou" : "Monte a sua proposta"}
          </h3>
          <SeloEvidencia selo="dado_do_cliente" />
        </div>
        <p className="text-sm leading-6 text-slate-600">
          {readOnly
            ? "Plano, assentos e prazo escolhidos por quem preencheu a calculadora."
            : "Planos definem consumo de prática, não preço: o preço vem do volume total de horas. Mexa à vontade: tudo recalcula na hora."}
        </p>
      </div>

      {/* Proposta por time: plano + assentos.

          Sem caixa tingida em volta. A seção já é um painel branco com borda, e
          os botões de plano trazem a própria borda: com o tingido no meio eram
          três superfícies encaixadas para dizer uma coisa só — que estes
          controles andam juntos. Isso a proximidade resolve de graça. Entre
          times o que separa é um fio, que ali significa "outro time", e não
          mais uma moldura. */}
      <div className="flex flex-col gap-6">
        {times.map((time) => {
          const horasTime = time.proposta.assentos * PLANOS[time.proposta.plano].horasMes;
          return (
            <div
              key={time.id}
              className={cn(
                "flex flex-col gap-4",
                multiTime && "border-t border-slate-100 pt-6 first:border-t-0 first:pt-0",
              )}
            >
              {multiTime ? (
                <span className="text-sm font-semibold text-slate-700">
                  {time.nome}
                </span>
              ) : null}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PLANOS_IDS.map((plano) => {
                  const ativo = time.proposta.plano === plano;
                  return (
                    <button
                      key={plano}
                      type="button"
                      disabled={!interativo}
                      aria-pressed={ativo}
                      onClick={() => onChangePlano?.(time.id, plano)}
                      className={cn(
                        "flex min-h-[44px] flex-col gap-1 rounded-sm border px-4 py-3 text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                        interativo ? "cursor-pointer" : "cursor-default",
                        ativo
                          ? "border-[#2E63CD]/50 bg-[#2E63CD]/[0.04]"
                          : "border-slate-200 bg-white",
                        interativo && !ativo && "hover:border-slate-300",
                        readOnly && !ativo && "opacity-50",
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-medium",
                          ativo ? "text-[#2E63CD]" : "text-slate-800",
                        )}
                      >
                        {PLANOS[plano].label}
                      </span>
                      <span className="text-sm text-slate-600">
                        {PLANOS[plano].horasMes} h de prática por vendedor/mês
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor={`assentos-${time.id}`}
                    className="text-sm font-medium text-slate-700"
                  >
                    Assentos
                  </label>
                  {interativo ? (
                    <CampoNumero
                      id={`assentos-${time.id}`}
                      valor={time.estadoTime.proposta.assentos}
                      formato="numero"
                      inteiro
                      placeholder="Ex.: 30"
                      onChange={(valor) => onChangeAssentos?.(time.id, valor)}
                    />
                  ) : (
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {time.proposta.assentos > 0 ? time.proposta.assentos : "—"}
                    </span>
                  )}
                  <p className="text-sm leading-6 text-slate-600">
                    {time.assentosLimitados
                      ? `Travado no tamanho do time (${time.proposta.assentos}): assento acima do time não é cobrado, porque não gera retorno.`
                      : time.assentosDefault && time.proposta.assentos > 0
                        ? `Vazio = o time inteiro (${time.proposta.assentos}). Você pode começar com um grupo menor e expandir.`
                        : "Você pode começar com um grupo menor e expandir."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:text-right">
                  <span className="text-sm font-medium text-slate-700">
                    Prática contratada
                  </span>
                  {/* Mesma caixa de linha do campo ao lado (h-11 / sm:h-10 em
                      `CampoNumero`), para o valor derivado assentar na altura do
                      valor digitado em vez de flutuar entre ele e a ajuda. */}
                  <span className="flex h-11 items-center text-sm font-semibold tabular-nums text-slate-900 sm:h-10 sm:justify-end">
                    {horasTime > 0 ? `${formatNumero(horasTime, 0)} h/mês` : "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Investimento */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Investimento</span>
          {/* Preço fica slate: custo nunca é verde nem vermelho. Com os ganhos
              em verde, o contraste já diz qual dos dois é qual. */}
          <span className="text-(length:--text-score-md) font-semibold leading-9 tabular-nums text-slate-900">
            {preco.horasMes > 0 ? `${formatBRL(preco.mensal)}/mês` : "—"}
          </span>
          {preco.pisoAplicado && preco.horasMes > 0 ? (
            <span className="text-sm text-slate-600">
              cobrança mínima por conta de {formatBRL(13_000)}
            </span>
          ) : null}
          {precoParcial ? (
            <span className="text-sm leading-6 text-slate-600">
              {foraDoPreco.length === 1
                ? `${foraDoPreco[0].nome} ainda está incompleto e entra no preço quando fechar o preenchimento.`
                : `${foraDoPreco.length} times ainda incompletos entram no preço quando fecharem o preenchimento.`}
            </span>
          ) : null}
        </div>
        {gran ? (
          <div className="flex flex-col gap-1 text-right">
            <span className="text-sm text-slate-600">Por vendedor, por dia útil</span>
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {formatBRL(gran.custoDiaPorVendedor, 2)} investidos ·{" "}
              <span className="text-trend-positive">
                {formatBRL(gran.retornoDiaPorAssento, 2)} de retorno projetado
              </span>
            </span>
            <span className="text-sm leading-6 text-slate-600">
              {formatX(gran.retornoDiaPorAssento / gran.custoDiaPorVendedor)} por dia, o
              mesmo ROI da conta, só muda a régua
            </span>
          </div>
        ) : null}
      </div>

      {/* Extrato da escada — detalhe sob demanda: o preço é a âncora, a
          decomposição fica a um clique de quem quiser conferir. */}
      {preco.horasMes > 0 ? (
        <div className="border-t border-slate-100 pt-6">
          <BlocoRecolhivel
            id="extrato-preco"
            titulo="De onde vem esse preço"
            aberto={extratoAberto}
            onToggle={() => setExtratoAberto((atual) => !atual)}
          >
            {/* Mesmo ritmo da tabela da oferta no Resumo: linha de conta pede
                ar, senão as faixas da escada leem como um bloco só de texto. */}
            <div className="flex flex-col gap-4 pt-1">
              {/* O desenho antes da conta: a escada é o conceito que a lista
                  de subtotais pressupõe, e ver a largura de cada faixa explica
                  "progressiva por faixa" mais rápido que a frase. */}
              <EscadaPrecoGrafico preco={preco} />
              <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 text-sm">
                {preco.extrato.map((faixa, index) => (
                  <div key={index} className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-600">
                      {formatNumero(faixa.horasNaFaixa, 0)} h × {formatBRL(faixa.taxaHora)}/h
                    </span>
                    <span className="tabular-nums text-slate-800">
                      {formatBRL(faixa.subtotal)}
                    </span>
                  </div>
                ))}
                {preco.pisoAplicado ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-600">Cobrança mínima da conta</span>
                    <span className="tabular-nums font-medium text-slate-900">
                      {formatBRL(preco.mensal)}
                    </span>
                  </div>
                ) : null}
              </div>
              <p className="text-sm leading-6 text-slate-600">
                {formatNumero(preco.horasMes, 0)} h de prática/mês · taxa efetiva de{" "}
                {formatBRL(preco.taxaCombinada, 2)}/hora. Quanto mais horas, menor a taxa:
                a escada é progressiva por faixa.
              </p>
            </div>
          </BlocoRecolhivel>
        </div>
      ) : null}

      {/* Prazo */}
      <div className="flex flex-col gap-3 border-t border-slate-100 pt-6">
        <h3 className="text-sm font-semibold text-slate-700">Prazo do contrato</h3>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {PRAZOS_MESES.map((prazo) => {
            const ativo = prazoMeses === prazo;
            return (
              <button
                key={prazo}
                type="button"
                disabled={!interativo}
                aria-pressed={ativo}
                onClick={() => onChangePrazo?.(prazo)}
                className={cn(
                  "flex min-h-[44px] flex-col gap-1 rounded-sm border px-4 py-3 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  interativo ? "cursor-pointer" : "cursor-default",
                  ativo
                    ? "border-[#2E63CD]/50 bg-[#2E63CD]/[0.04]"
                    : "border-slate-200 bg-white",
                  interativo && !ativo && "hover:border-slate-300",
                  readOnly && !ativo && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    ativo ? "text-[#2E63CD]" : "text-slate-800",
                  )}
                >
                  {prazo} meses
                </span>
                <span className="text-sm leading-6 text-slate-600">
                  {PRAZO_COPY[prazo]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Prazo não altera preço: compra trava de reajuste (12m+) e nível de serviço
          (24m).
        </p>
      </div>

      {/* Nível de serviço + total */}
      <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-slate-600">O que está incluído ({nivel.nome})</span>
          <span className="text-right text-slate-600">{nivel.incluso}</span>
        </div>
        {/* O degrau que o prazo de 24 meses compra (§4.9) — sem efeito sobre
            preço, mas a tela promete e agora entrega. */}
        {preco.nivelPorPrazo ? (
          <p className="text-sm leading-6 text-trend-positive">
            Um degrau acima do que os assentos dariam: incluído no contrato de 24 meses.
          </p>
        ) : null}
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-slate-600">Total de horas do contrato</span>
          <span className="tabular-nums text-slate-800">
            {preco.horasMes > 0 ? `${formatNumero(preco.horasMes * prazoMeses, 0)} h` : "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-slate-100 pt-4">
          <span className="font-medium text-slate-900">
            Total do contrato ({prazoMeses} meses)
          </span>
          <span className="tabular-nums font-semibold text-slate-900">
            {preco.horasMes > 0 ? formatBRL(preco.mensal * prazoMeses) : "—"}
          </span>
        </div>
      </div>
    </section>
  );
}

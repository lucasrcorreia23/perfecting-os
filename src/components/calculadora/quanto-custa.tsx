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
//
// FALLBACK OBRIGATÓRIO em cada `--pf-*`: este bloco é [AMBOS]. Dentro da pele
// (§13) ele veste as superfícies dela; em `link-detail`, fora dela, o `var()` cai no
// literal que a classe produzia antes e nada muda para o consultor. Nunca a
// forma curta `bg-(--pf-x)` aqui — sem fallback ela fica inválida lá e o bloco
// perde fundo e borda.

const PLANOS_IDS = Object.keys(PLANOS) as PlanoId[];

export function QuantoCusta({
  times,
  preco,
  prazoMeses,
  readOnly = false,
  cabecalho = true,
  onChangePlano,
  onChangeAssentos,
  onChangePrazo,
}: {
  times: TimeModelo[];
  preco: PrecoConta;
  prazoMeses: number;
  readOnly?: boolean;
  /**
   * Falso quando quem chama já nomeou o bloco. A jornada pública desde
   * 20/08/2026 põe este componente dentro de uma `SecaoResultado` com título e
   * descrição próprios — o cabeçalho interno viraria o segundo título do mesmo
   * bloco, e ainda dizia "a proposta que o CLIENTE montou", copy da tela
   * interna, para o próprio cliente.
   */
  cabecalho?: boolean;
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
      {cabecalho ? (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="pf-panel-title text-[var(--pf-ink-soft,#475569)]">
              {readOnly ? "A proposta que o cliente montou" : "Monte a sua proposta"}
            </h3>
            <SeloEvidencia selo="dado_do_cliente" />
          </div>
          <p className="text-sm leading-6 text-[var(--pf-ink-soft,#475569)]">
            {readOnly
              ? "Plano, assentos e prazo escolhidos por quem preencheu a calculadora."
              : "Planos definem consumo de prática, não preço: o preço vem do volume total de horas. Mexa à vontade: tudo recalcula na hora."}
          </p>
        </div>
      ) : null}

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
                multiTime && "border-t border-[var(--pf-line-soft,#f1f5f9)] pt-6 first:border-t-0 first:pt-0",
              )}
            >
              {multiTime ? (
                <span className="pf-label text-[var(--pf-ink-soft,#475569)]">
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
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-brand,#2e63cd)]/35",
                        interativo ? "cursor-pointer" : "cursor-default",
                        ativo
                          ? "border-[var(--pf-brand,#2e63cd)]/50 bg-[var(--pf-brand,#2e63cd)]/[0.04]"
                          : "border-[var(--pf-line,#e2e8f0)] bg-[var(--pf-surface-alt,#ffffff)]",
                        interativo && !ativo && "hover:border-[var(--pf-ink-faint,#cbd5e1)]/40",
                        // Sem `opacity-50` no não escolhido (saiu em
                        // 20/08/2026). Em `readOnly` esta é a proposta que vai
                        // à reunião: as opções recusadas precisam ser LIDAS —
                        // "por que não o Intensivo?" é a pergunta seguinte — e
                        // a 50% o texto caía abaixo do piso de contraste. Quem
                        // marca a escolha é a borda de marca, não o apagamento
                        // das outras. O fio de CONTROLE (`--pf-line-strong`)
                        // mantém os cards lendo como opção mesmo travados.
                        !ativo && "border-[var(--pf-line-strong,#cbd5e1)]",
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-medium",
                          ativo ? "text-[var(--pf-brand-ink,#2E63CD)]" : "text-[var(--pf-ink,#334155)]",
                        )}
                      >
                        {PLANOS[plano].label}
                      </span>
                      <span className="text-sm text-[var(--pf-ink-soft,#475569)]">
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
                    className="pf-label text-[var(--pf-ink-soft,#475569)]"
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
                    // Em leitura o número é o dado, não uma linha de
                    // formulário: sobe para `pf-num-kpi`, a mesma escala do
                    // "Prática contratada" ao lado e dos KPIs da capa.
                    <span className="pf-num-kpi text-[var(--pf-ink,#0f172a)]">
                      {time.proposta.assentos > 0 ? time.proposta.assentos : "—"}
                    </span>
                  )}
                  <p className="text-sm leading-6 text-[var(--pf-ink-soft,#475569)]">
                    {time.assentosLimitados
                      ? `Travado no tamanho do time (${time.proposta.assentos}): assento acima do time não é cobrado, porque não gera retorno.`
                      : time.assentosDefault && time.proposta.assentos > 0
                        ? `Vazio = o time inteiro (${time.proposta.assentos}). Você pode começar com um grupo menor e expandir.`
                        : "Você pode começar com um grupo menor e expandir."}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:text-right">
                  <span className="pf-label text-[var(--pf-ink-soft,#475569)]">
                    Prática contratada
                  </span>
                  {/* Mesma caixa de linha do campo ao lado (h-11 / sm:h-10 em
                      `CampoNumero`), para o valor derivado assentar na altura do
                      valor digitado em vez de flutuar entre ele e a ajuda. */}
                  <span className="pf-num-kpi flex items-center text-[var(--pf-ink,#0f172a)] sm:justify-end">
                    {horasTime > 0 ? `${formatNumero(horasTime, 0)} h/mês` : "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── O PAINEL do investimento ──────────────────────────────────────
          O preço era `text-(length:--text-score-md)` no meio de seis faixas de
          mesma altura, separadas por fios idênticos: o número que a pessoa
          rolou a página inteira para ver tinha o mesmo peso da linha "Total de
          horas do contrato". Agora é uma superfície própria — o único bloco
          desta seção que é dono da própria cor.

          `--pf-invert` e NÃO o `--pf-brand-deep` do painel da etapa 01, apesar
          de os dois mostrarem a mesma mensalidade. O motivo é contraste, não
          gosto: aqui o painel carrega o "retorno projetado" em verde, e
          `#0F9F2E` dá 2,38:1 sobre o azul contra 4,9:1 sobre o escuro. É a
          mesma razão documentada na §13 para a capa não poder ser azul — a
          etapa 01 pode porque nela ainda não existe nada que some ao ROI.

          As listras diagonais são as do material de referência, em branco a 4%:
          decoração de textura, sem papel semântico, e fracas o bastante para
          não competir com o número.

          Fallbacks: `link-detail` (tela interna) renderiza este mesmo bloco
          fora da pele, e lá os `--pf-invert-*` não existem. Slate-900 /
          slate-50 / slate-400 são o equivalente do design system, e o verde
          continua passando (4,8:1 sobre `#0f172a`). */}
      <div
        className="flex flex-wrap items-end justify-between gap-6 rounded-md bg-[var(--pf-invert,#0f172a)] p-6 sm:p-8"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 9px)",
        }}
      >
        <div className="flex flex-col gap-2">
          <span className="pf-panel-title text-[var(--pf-invert-soft,#94a3b8)]">
            Investimento
          </span>
          {/* Neutro (`--pf-invert-ink`), nunca verde: custo não é ganho nem
              perda, é a outra metade da fração. */}
          <span className="pf-num-hero text-[var(--pf-invert-ink,#f8fafc)]">
            {preco.horasMes > 0 ? `${formatBRL(preco.mensal)}/mês` : "—"}
          </span>
          {preco.pisoAplicado && preco.horasMes > 0 ? (
            <span className="pf-hint text-[var(--pf-invert-soft,#94a3b8)]">
              cobrança mínima por conta de {formatBRL(13_000)}
            </span>
          ) : null}
          {precoParcial ? (
            <span className="pf-hint max-w-md text-[var(--pf-invert-soft,#94a3b8)]">
              {foraDoPreco.length === 1
                ? `${foraDoPreco[0].nome} ainda está incompleto e entra no preço quando fechar o preenchimento.`
                : `${foraDoPreco.length} times ainda incompletos entram no preço quando fecharem o preenchimento.`}
            </span>
          ) : null}
        </div>
        {gran ? (
          <div className="flex flex-col gap-2 sm:text-right">
            <span className="pf-panel-title text-[var(--pf-invert-soft,#94a3b8)]">
              Por vendedor, por dia útil
            </span>
            <span className="pf-num text-sm font-semibold text-[var(--pf-invert-ink,#f8fafc)]">
              {formatBRL(gran.custoDiaPorVendedor, 2)} investidos ·{" "}
              <span className="text-trend-positive">
                {formatBRL(gran.retornoDiaPorAssento, 2)} de retorno projetado
              </span>
            </span>
            <span className="pf-hint text-[var(--pf-invert-soft,#94a3b8)]">
              {formatX(gran.retornoDiaPorAssento / gran.custoDiaPorVendedor)} por
              dia, o mesmo ROI da conta, só muda a régua
            </span>
          </div>
        ) : null}
      </div>

      {/* Extrato da escada — detalhe sob demanda: o preço é a âncora, a
          decomposição fica a um clique de quem quiser conferir. */}
      {preco.horasMes > 0 ? (
        <div className="border-t border-[var(--pf-line-soft,#f1f5f9)] pt-6">
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
              <div className="flex flex-col gap-4 border-t border-[var(--pf-line-soft,#f1f5f9)] pt-4 text-sm">
                {preco.extrato.map((faixa, index) => (
                  <div key={index} className="flex items-baseline justify-between gap-4">
                    <span className="text-[var(--pf-ink-soft,#475569)]">
                      {formatNumero(faixa.horasNaFaixa, 0)} h × {formatBRL(faixa.taxaHora)}/h
                    </span>
                    <span className="tabular-nums text-[var(--pf-ink,#334155)]">
                      {formatBRL(faixa.subtotal)}
                    </span>
                  </div>
                ))}
                {preco.pisoAplicado ? (
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[var(--pf-ink-soft,#475569)]">Cobrança mínima da conta</span>
                    <span className="tabular-nums font-medium text-[var(--pf-ink,#0f172a)]">
                      {formatBRL(preco.mensal)}
                    </span>
                  </div>
                ) : null}
              </div>
              <p className="text-sm leading-6 text-[var(--pf-ink-soft,#475569)]">
                {formatNumero(preco.horasMes, 0)} h de prática/mês · taxa efetiva de{" "}
                {formatBRL(preco.taxaCombinada, 2)}/hora. Quanto mais horas, menor a taxa:
                a escada é progressiva por faixa.
              </p>
            </div>
          </BlocoRecolhivel>
        </div>
      ) : null}

      {/* Prazo */}
      <div className="flex flex-col gap-3 border-t border-[var(--pf-line-soft,#f1f5f9)] pt-6">
        <h3 className="pf-panel-title text-[var(--pf-ink-soft,#475569)]">Prazo do contrato</h3>
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
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-brand,#2e63cd)]/35",
                  interativo ? "cursor-pointer" : "cursor-default",
                  ativo
                    ? "border-[var(--pf-brand,#2e63cd)]/50 bg-[var(--pf-brand,#2e63cd)]/[0.04]"
                    : "border-[var(--pf-line,#e2e8f0)] bg-[var(--pf-surface-alt,#ffffff)]",
                  interativo && !ativo && "hover:border-[var(--pf-ink-faint,#cbd5e1)]/40",
                  !ativo && "border-[var(--pf-line-strong,#cbd5e1)]",
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    ativo ? "text-[var(--pf-brand-ink,#2E63CD)]" : "text-[var(--pf-ink,#334155)]",
                  )}
                >
                  {prazo} meses
                </span>
                <span className="text-sm leading-6 text-[var(--pf-ink-soft,#475569)]">
                  {PRAZO_COPY[prazo]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-sm leading-6 text-[var(--pf-ink-soft,#475569)]">
          Prazo não altera preço: compra trava de reajuste (a partir de 12 meses) e
          nível de serviço acima (24 meses).
        </p>
      </div>

      {/* Nível de serviço + total */}
      <div className="flex flex-col gap-4 border-t border-[var(--pf-line-soft,#f1f5f9)] pt-6 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[var(--pf-ink-soft,#475569)]">O que está incluído ({nivel.nome})</span>
          <span className="text-right text-[var(--pf-ink-soft,#475569)]">{nivel.incluso}</span>
        </div>
        {/* O degrau que o prazo de 24 meses compra (§4.9) — sem efeito sobre
            preço, mas a tela promete e agora entrega. */}
        {preco.nivelPorPrazo ? (
          <p className="text-sm leading-6 text-trend-positive">
            Um degrau acima do que os assentos dariam: incluído no contrato de 24 meses.
          </p>
        ) : null}
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[var(--pf-ink-soft,#475569)]">Total de horas do contrato</span>
          <span className="tabular-nums text-[var(--pf-ink,#334155)]">
            {preco.horasMes > 0 ? `${formatNumero(preco.horasMes * prazoMeses, 0)} h` : "—"}
          </span>
        </div>
        {/* O fio FORTE, e só aqui: é a última linha da conta, e o degrau
            `--pf-line-soft` que separa as linhas acima não distinguia o total
            de mais uma parcela. "Fio = fecha conta" continua valendo — o que
            mudou é que existem dois pesos de fecho, e o do contrato inteiro é o
            de baixo. */}
        <div className="flex items-baseline justify-between gap-4 border-t border-[var(--pf-line-strong,#cbd5e1)] pt-4">
          <span className="font-medium text-[var(--pf-ink,#0f172a)]">
            Total do contrato ({prazoMeses} meses)
          </span>
          <span className="pf-num-kpi text-[var(--pf-ink,#0f172a)]">
            {preco.horasMes > 0 ? formatBRL(preco.mensal * prazoMeses) : "—"}
          </span>
        </div>
      </div>
    </section>
  );
}

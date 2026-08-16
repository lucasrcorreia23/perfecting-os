"use client";

import { PrinterIcon } from "@heroicons/react/24/outline";
import { CAMINHOS, CENARIOS, HAIRCUT, PLANOS } from "@/lib/calculadora/constants";
import {
  formatBRL,
  formatMeses,
  formatNumero,
  formatX,
} from "@/lib/calculadora/format";
import type { TimeModelo } from "@/lib/calculadora/modelo";
import type { PrecoConta, ResultadoConsolidado } from "@/lib/calculadora/types";
import { Button } from "@/components/ui/button";
import { SeloEvidencia } from "./selo-evidencia";

// Resumo verificável e imprimível: o parágrafo-síntese, os três números, o
// bloco "verificável nesta tela" (cada trava com o valor que a prova) e a
// tabela da conta que o visitante montou. É o artefato que sobrevive à reunião.

const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  #resumo-verificavel, #resumo-verificavel * { visibility: visible; }
  #resumo-verificavel { position: absolute; inset: 0; margin: 0; border: none; }
  #resumo-verificavel [data-no-print] { display: none; }
}
`;

export function ResumoVerificavel({
  preco,
  prazoMeses,
  times,
  consolidado,
}: {
  preco: PrecoConta;
  prazoMeses: number;
  times: TimeModelo[];
  consolidado: ResultadoConsolidado;
}) {
  if (consolidado.status !== "ok") return null;
  const multiTime = times.length > 1;
  const totalAssentos = consolidado.totalAssentos;
  const primeiro = times[0];
  const ok = primeiro.resultado.status === "ok" ? primeiro.resultado : null;

  const cenarioTexto = multiTime
    ? consolidado.mixCenarios
        .map(
          (mix) =>
            `${mix.nome}: ${mix.sel.modo === "preset" ? CENARIOS[mix.sel.cenario].label : "parâmetros personalizados"}`,
        )
        .join(" · ")
    : primeiro.sel.modo === "preset"
      ? `Cálculo no cenário ${CENARIOS[primeiro.sel.cenario].label}${primeiro.sel.cenario === "conservador" ? ", o mais defensável em comitê" : ""}.`
      : "Cálculo com parâmetros personalizados por você, dentro dos tetos do modelo.";

  const verificaveis: { titulo: string; texto: string }[] = [
    {
      titulo: "Proposta montada por você",
      texto:
        "Plano, assentos e prazo foram escolhidos por você nesta tela. Nada veio pré-definido.",
    },
    {
      titulo: "Alternativa declarada por você",
      texto: multiTime
        ? "A economia considera, em cada time, o caminho que você escolheu: um deles, nunca a soma de todos."
        : primeiro.entradas.caminho
          ? `A economia considera só o caminho que você escolheu (${CAMINHOS[primeiro.entradas.caminho].label.toLowerCase()}), nunca a soma de todas as alternativas.`
          : "",
    },
    {
      titulo: "Teto de funil",
      // Passo 5 é opcional: sem ciclo e volume não existe ganho de ciclo, e a
      // trava não tem o que travar.
      texto:
        primeiro.entradas.cicloDias !== null && primeiro.entradas.leadsMes !== null
          ? "O ganho de encurtar o ciclo fica limitado pelas oportunidades ociosas do seu funil: capacidade sem demanda não vira receita."
          : "",
    },
    {
      titulo: "Linhas não somadas",
      texto:
        "Salário do time em rampa e economia de headcount aparecem no detalhamento, mas não entram no ROI, porque seriam contagem dupla.",
    },
    {
      titulo: "Haircut anti-otimismo",
      texto: `Os ganhos de rampa, ciclo e conversão foram reduzidos em ${formatNumero((1 - HAIRCUT) * 100, 0)}% antes de entrar na conta.`,
    },
    {
      titulo: "Fator de escopo",
      texto: ok
        ? ok.fatorEscopo.origem === "declarado"
          ? `A comparação com o custo do gestor usa os seus próprios números: ${formatNumero(ok.fatorEscopo.valor, 1)} h de gestor por hora de prática entregue.`
          : "Seus números de treino ficaram fora da faixa de validade; usamos a premissa declarada de 2,1 h de gestor por hora de prática."
        : "",
    },
    { titulo: "Cenário", texto: cenarioTexto },
  ].filter((item) => item.texto !== "");

  return (
    <>
      <style>{PRINT_CSS}</style>
      <section
        id="resumo-verificavel"
        className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-5 sm:p-6"
      >
        {/* Sempre aberto: é o fecho da página e o artefato que sobrevive à
            reunião — quem chegou até aqui quer vê-lo, não abri-lo. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Resumo</h3>
            <SeloEvidencia selo="projecao" />
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

      <div className="flex flex-col gap-5">
        {/* Sem parágrafo-síntese: os três números vêm logo abaixo e a conta
            montada, na tabela — dizer tudo em prosa era a terceira repetição. */}
        <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
          {[
            { rotulo: "ROI", valor: formatX(consolidado.roi) },
            { rotulo: "Payback", valor: formatMeses(consolidado.paybackMeses) },
            { rotulo: "Valor/ano", valor: formatBRL(consolidado.valorAno) },
          ].map((item) => (
            <div key={item.rotulo} className="flex flex-col gap-0.5">
              <span className="text-xs uppercase tracking-wide text-slate-400">
                {item.rotulo}
              </span>
              <span className="text-lg font-semibold tabular-nums text-[#0F9F2E]">
                {item.valor}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Verificável nesta tela
          </span>
          <ul className="flex flex-col gap-2">
            {verificaveis.map((item) => (
              <li key={item.titulo} className="text-xs leading-relaxed text-slate-500">
                <span className="font-medium text-slate-700">{item.titulo}.</span>{" "}
                {item.texto}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4 text-sm">
          {[
            {
              rotulo: "Times e vendedores",
              valor: `${times.length} ${times.length === 1 ? "time" : "times"} · ${totalAssentos} assentos`,
            },
            {
              rotulo: "Prática",
              valor: times
                .map(
                  (time) =>
                    `${PLANOS[time.proposta.plano].label} ${PLANOS[time.proposta.plano].horasMes} h/vendedor/mês`,
                )
                .filter((valor, index, lista) => lista.indexOf(valor) === index)
                .join(" · "),
            },
            {
              rotulo: "Volume total",
              valor: `${formatNumero(preco.horasMes, 0)} h/mês · taxa efetiva ${formatBRL(preco.taxaCombinada, 2)}/h`,
            },
            {
              rotulo: "Investimento",
              valor: `${formatBRL(preco.mensal)}/mês · ${formatBRL(preco.mensal / Math.max(totalAssentos, 1), 0)} por assento`,
            },
            {
              rotulo: "Prazo",
              valor: `${prazoMeses} meses · total de ${formatBRL(preco.mensal * prazoMeses)}`,
            },
          ].map((linha) => (
            <div key={linha.rotulo} className="flex items-baseline justify-between gap-4">
              <span className="text-slate-500">{linha.rotulo}</span>
              <span className="text-right font-medium text-slate-800">{linha.valor}</span>
            </div>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-slate-400">
          Próximo passo: acordar o baseline dos indicadores que você quer mover e
          definir o escopo do piloto.
        </p>
      </div>
      </section>
    </>
  );
}

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
} from "@/lib/calculadora/format";
import type { DimensaoCoiId, ResultadoCoi } from "@/lib/calculadora/types";
import { LinhaCompacta } from "./resultado-time";
import { SeloEvidencia } from "./selo-evidencia";

// Custo da Inação — o que vaza hoje, medido com os números do próprio cliente.
//
// Dono de nenhuma superfície: só `flex flex-col gap-*`, como EficienciaCard e
// QuantoCusta. Quem dá a moldura é o SecaoResultado do chamador — é isso que
// permite a mesma peça servir a jornada pública e, um dia, o detalhe interno
// sem virar card aninhado.
//
// TUDO EM SLATE. Verde é "entra na conta" e o COI, por definição, não entra:
// pintar a lacuna de verde contradiria o selo que está no topo dela.

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

export function CustoInacao({
  coi,
  onIrParaPasso,
}: {
  coi: ResultadoCoi;
  onIrParaPasso?: (passo: 1 | 2 | 3 | 4 | 5) => void;
}) {
  const { cobertura, capacidade } = coi;
  const faltaSalario = coi.dimensoes.some(
    (d) => DEPENDEM_DO_SALARIO.includes(d.id) && d.valorAno === null,
  );
  const lacunaDePratica = cobertura.pctAtendida < 1;

  return (
    <section className="flex flex-col gap-6">
      {/* Duas leituras, de propósito distintas: quanto da prática CHEGA ao
          vendedor, e se o gestor sequer TEM as horas. A planilha mistura as
          duas numa métrica só e se contradiz (E-31). */}
      <div className="flex flex-col gap-2">
        <p className="text-base leading-7 text-slate-700">
          {lacunaDePratica ? (
            <>
              Hoje chegam <strong className="font-semibold text-slate-900">
                {formatHoras(cobertura.horasEntreguesMes)}
              </strong>{" "}
              de prática por mês ao time, contra as{" "}
              {formatHoras(cobertura.horasNecessariasMes)} que{" "}
              {formatNumero(cobertura.horasNecessariasMes / COI_HORAS_COACHING_MIN, 0)}{" "}
              vendedores precisariam — o equivalente a{" "}
              <strong className="font-semibold text-slate-900">
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
          <p className="text-sm leading-6 text-slate-600">
            Seus gestores têm {formatHoras(capacidade.horasDisponiveisMes)}/mês para uma
            demanda de {formatHoras(capacidade.horasNecessariasMes)}:{" "}
            {formatPct(capacidade.pctNaoAtendida * 100)} da necessidade não cabe na
            agenda. Não é falta de vontade, é falta de capacidade.
          </p>
        ) : (
          <p className="text-sm leading-6 text-slate-600">
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
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Onde o dinheiro vaza</h3>
          <SeloEvidencia selo="premissa" />
        </div>
        <dl className="flex flex-col gap-3">
          {coi.dimensoes.map((d) => (
            <LinhaCompacta
              key={d.id}
              rotulo={ROTULOS[d.id].rotulo}
              valor={
                d.valorAno === null ? "—" : `${formatBRL(d.valorAno)}/ano`
              }
              // Zero é medição, não ausência — a linha fica, para o leitor ver
              // o conjunto inteiro e quais dimensões não se aplicam a ele. Só a
              // nota sai: "quem não pratica fecha menos" ao lado de R$ 0
              // contradiz o próprio número.
              nota={d.valorAno ? ROTULOS[d.id].nota : undefined}
            />
          ))}
        </dl>
        {faltaSalario ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-slate-600">
            Duas linhas dependem do salário mensal do vendedor, que ficou em branco.
            {onIrParaPasso ? (
              <button
                type="button"
                onClick={() => onIrParaPasso(3)}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full text-[13px] font-medium leading-5 text-[#2E63CD] transition-colors hover:text-[#1e4a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:min-h-8"
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
      <div className="flex flex-col gap-3 border-t border-slate-200 pt-5">
        <dl className="flex flex-col gap-3">
          <LinhaCompacta
            rotulo="Lacuna estimada hoje"
            valor={`${formatBRL(coi.totalAno)}/ano`}
          />
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
        <p className="text-sm leading-6 text-slate-600">
          Esta lacuna não entra no ROI e não se soma a ele — é a outra pergunta,
          respondida com os mesmos números. Cada linha carrega um desconto de
          conservadorismo declarado.
        </p>
      </div>

      {coi.checagemAlerta ? (
        <p className="flex items-start gap-2 rounded-sm border border-[#973C00]/25 bg-[#FFFBEB] px-4 py-3 text-sm leading-6 text-[#973C00]">
          <ExclamationTriangleIcon className="mt-1 h-4 w-4 shrink-0" aria-hidden />
          A lacuna estimada chega a {formatPct(coi.checagemPct)} da margem anual do time.
          Acima de 25% vale conferir os dados de estrutura — gestores, vendedores cobertos
          e horas de prática de hoje.
        </p>
      ) : null}
    </section>
  );
}

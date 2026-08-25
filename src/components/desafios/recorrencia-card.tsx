"use client";

import { InformationCircleIcon } from "@heroicons/react/24/outline";
import {
  formatarProporcao,
  formatarRecorrencia,
  recorrenciaDoDesafio,
  type Medicao,
} from "@/lib/desafios";
import { Field, Input } from "@/components/ui/form";

/*
 * Onde a decisão "o log vence o contador" fica VISÍVEL.
 *
 * Com ocorrências registradas, editar o contador manual não mudaria número
 * nenhum na tela — e um campo que aceita digitação sem mexer em nada lê como
 * defeito. Por isso os dois campos ficam desabilitados e a frase diz de onde
 * vem a proporção. Nada é apagado: o contador continua guardado como histórico.
 */
export function RecorrenciaCard({
  tentativas,
  falhas,
  ocorrencias,
  onChange,
}: {
  tentativas: number;
  falhas: number;
  ocorrencias: Medicao[];
  onChange: (campo: "tentativas" | "falhas", valor: number) => void;
}) {
  const recorrencia = recorrenciaDoDesafio({ tentativas, falhas, ocorrencias });
  const pelaLista = ocorrencias.length > 0;
  const medido = recorrencia.status === "medido";

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold text-slate-500">Recorrência</h2>
        {pelaLista ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
            Pelas ocorrências
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-(length:--text-score-md) font-semibold leading-none tabular-nums text-slate-900">
          {formatarRecorrencia(recorrencia)}
        </span>
        <span className="text-xs tabular-nums text-slate-500">
          {medido
            ? `${formatarProporcao(recorrencia)} tentativas falharam`
            : "Ainda não foi medido"}
        </span>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-100"
          role="img"
          aria-label={
            medido
              ? `${formatarProporcao(recorrencia)} tentativas falharam`
              : "Sem medição de recorrência"
          }
        >
          <div
            className="h-full rounded-full bg-slate-500"
            style={{
              width: medido ? `${Math.max(2, recorrencia.pct * 100)}%` : "0%",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tentativas" htmlFor="desafio-tentativas">
          <Input
            id="desafio-tentativas"
            type="number"
            min={0}
            step={1}
            value={tentativas}
            disabled={pelaLista}
            onChange={(event) => onChange("tentativas", Number(event.target.value))}
          />
        </Field>
        <Field label="Falhas" htmlFor="desafio-falhas">
          <Input
            id="desafio-falhas"
            type="number"
            min={0}
            step={1}
            value={falhas}
            disabled={pelaLista}
            onChange={(event) => onChange("falhas", Number(event.target.value))}
          />
        </Field>
      </div>

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <InformationCircleIcon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        {pelaLista
          ? `Este desafio tem ${ocorrencias.length} ocorrência(s) registrada(s), e a proporção vem delas. O contador manual fica guardado como histórico — as duas fontes nunca se somam.`
          : "Placar rápido: de quantas tentativas, quantas falharam. Ao registrar a primeira ocorrência abaixo, a proporção passa a vir da lista."}
      </p>
    </section>
  );
}

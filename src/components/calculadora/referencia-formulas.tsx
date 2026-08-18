"use client";

import { useMemo, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  REFERENCIA,
  SECOES,
  buscarReferencia,
  type EntradaReferencia,
} from "@/lib/calculadora/referencia";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";

// Consulta interna: "de onde sai esse número". A busca é o caminho principal —
// quem abre esta tela quase sempre chega com uma célula da planilha ou um
// termo na mão ("C41", "haircut", "teto do funil"), não querendo ler as 12
// seções. Por isso o campo vem primeiro e filtra tudo de uma vez, e as seções
// existem para quem está explorando.
//
// Tela do app interno, então escala tipográfica normal (14px): §8.12b vale
// para a jornada pública da calculadora, que tem outro leitor e outro uso.

function Entrada({ entrada }: { entrada: EntradaReferencia }) {
  return (
    <article className="flex flex-col gap-3 border-t border-slate-100 pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold text-slate-900">{entrada.titulo}</h3>
        <span className="font-mono text-xs text-slate-500">{entrada.celula}</span>
      </div>

      {/* A fórmula é a única coisa desta tela que é notação, e notação pede
          largura previsível: mono, tabular e sem quebra automática. Quem rola
          é o bloco, nunca a página. */}
      <pre className="overflow-x-auto rounded-sm bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-800">
        {entrada.formula}
      </pre>

      <p className="text-sm leading-6 text-slate-600">{entrada.explicacao}</p>

      {entrada.divergencia ? (
        // Divergência é o que mais custa caro descobrir tarde: fica marcada,
        // não escondida num recolhível.
        <div className="flex items-start gap-2 rounded-sm bg-[#FFFBEB] p-4 text-sm leading-6 text-[#973C00]">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <span className="font-medium">Diverge da planilha de propósito: </span>
            {entrada.divergencia}
          </p>
        </div>
      ) : null}

      <p className="font-mono text-xs text-slate-500">{entrada.codigo}</p>
    </article>
  );
}

export function ReferenciaFormulas() {
  const [busca, setBusca] = useState("");
  const encontradas = useMemo(() => buscarReferencia(busca), [busca]);
  const filtrando = busca.trim() !== "";
  const ids = useMemo(() => new Set(encontradas.map((e) => e.id)), [encontradas]);

  const secoesVisiveis = SECOES.map((secao) => ({
    ...secao,
    entradas: REFERENCIA.filter((e) => e.secao === secao.id && ids.has(e.id)),
  })).filter((secao) => secao.entradas.length > 0);

  const comDivergencia = REFERENCIA.filter((e) => e.divergencia).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Referência de fórmulas
          </h2>
          <p className="text-sm text-slate-600">
            {REFERENCIA.length} fórmulas do motor, com a célula equivalente na
            planilha e a função onde a conta vive. {comDivergencia} divergem do
            Excel de propósito.
          </p>
        </div>
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar por célula, termo ou função"
          size="lg"
          className="sm:w-80"
        />
      </div>

      {filtrando ? (
        <p role="status" className="text-sm text-slate-600">
          {encontradas.length === 0
            ? "Nenhuma fórmula corresponde à busca."
            : `${encontradas.length} de ${REFERENCIA.length} fórmulas.`}
        </p>
      ) : null}

      {secoesVisiveis.map((secao) => (
        <section
          key={secao.id}
          className={cn(
            "flex flex-col gap-6 rounded-sm border border-slate-200 bg-white p-6",
          )}
        >
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-slate-700">{secao.titulo}</h3>
            <p className="text-sm text-slate-600">{secao.descricao}</p>
          </div>
          <div className="flex flex-col gap-6">
            {secao.entradas.map((entrada) => (
              <Entrada key={entrada.id} entrada={entrada} />
            ))}
          </div>
        </section>
      ))}

      <p className="text-sm leading-6 text-slate-600">
        Fonte documental: <span className="font-medium">Perfecting ROI Calculator
        Template</span> e a <span className="font-medium">Referência Completa de
        Fórmulas</span> (18/08/2026), arquivados em <span className="font-mono text-xs">docs/referencia/</span>.
        Os números acima não são transcritos de lá — saem de{" "}
        <span className="font-mono text-xs">constants.ts</span>, e um teste falha
        se algum se soltar da constante.
      </p>
    </div>
  );
}

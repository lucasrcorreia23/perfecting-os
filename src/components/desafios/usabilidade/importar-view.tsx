"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Field, Textarea } from "@/components/ui/form";
import { createSessao } from "@/lib/actions/usabilidade";
import {
  lerImportacao,
  type FormatoImportacao,
  type Leitura,
} from "@/lib/usabilidade/importar";
import type { RespostasMap } from "@/lib/usabilidade/respostas";
import { RespostasForm } from "./respostas-form";

const ROTULO_FORMATO: Record<FormatoImportacao, string> = {
  ficha: "Ficha preenchida",
  transcricao: "Transcrição da conversa",
  desconhecido: "Não reconhecido",
};

export function ImportarView() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [formato, setFormato] = useState<FormatoImportacao | null>(null);
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [respostas, setRespostas] = useState<RespostasMap>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const naoReconhecidos = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const campo of leitura?.campos ?? []) {
      if (campo.status === "nao_reconhecido") {
        mapa[campo.perguntaId] = `Não deu para ler "${campo.bruto}" — escolha aqui.`;
      }
    }
    return mapa;
  }, [leitura]);

  function ler(formatoForcado?: FormatoImportacao) {
    setError(null);
    const resultado = lerImportacao(texto, { formato: formatoForcado });
    setLeitura(resultado);
    setFormato(resultado.formato);
    setRespostas(resultado.respostas);
  }

  function salvar() {
    setError(null);
    startTransition(async () => {
      const result = await createSessao({
        respostas,
        observacoes: "",
        origem: formato === "ficha" ? "ficha" : "transcricao",
        // A transcrição é guardada INTEIRA, sempre: é a fonte de onde os
        // trechos dos achados vão ser citados, e é o que permite reler a sessão
        // quando o parser melhorar.
        transcricao: texto,
      });
      if (result.ok) router.push(`/desafios/usabilidade/${result.data.id}`);
      else setError(result.error);
    });
  }

  const lidos = leitura?.campos.filter((campo) => campo.status === "lido").length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-w-0 items-center gap-4">
        <BackButton href="/desafios/usabilidade" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">Importar sessão</h2>
          <p className="text-sm text-slate-600">
            Cole a ficha preenchida ou a transcrição da conversa. Nada é salvo
            antes de você revisar.
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
        <Field
          label="Material da sessão"
          help="Ficha no formato Rótulo: valor, ou transcrição como ela sai do Grain, do Meet ou do Zoom."
          htmlFor="importar-texto"
        >
          <Textarea
            id="importar-texto"
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            className="min-h-64 font-mono text-xs"
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => ler()} disabled={!texto.trim()}>
            Ler material
          </Button>
          {leitura ? (
            <p className="text-sm text-slate-600">
              {formato === "ficha"
                ? `${lidos} ${lidos === 1 ? "campo lido" : "campos lidos"}`
                : `${leitura.falas.length} ${
                    leitura.falas.length === 1 ? "fala" : "falas"
                  }`}
            </p>
          ) : null}
        </div>
      </section>

      {leitura ? (
        <>
          {/*
            O formato detectado aparece COM um jeito de trocar: a detecção é
            escore, e ela inverte nos dois sentidos — uma transcrição contém
            "Nome:", que é `Rótulo: valor`, e uma ficha pode conter "00:12 -
            Lucas" dentro de uma resposta aberta. Errar em silêncio aqui
            contamina tudo o que vem depois.
          */}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm text-slate-700">
              <DocumentTextIcon aria-hidden className="h-4 w-4 text-slate-400" />
              Lido como <strong className="font-semibold">
                {ROTULO_FORMATO[leitura.formato]}
              </strong>
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                ler(leitura.formato === "ficha" ? "transcricao" : "ficha")
              }
            >
              Ler como{" "}
              {leitura.formato === "ficha" ? "transcrição" : "ficha"}
            </Button>
          </section>

          {leitura.avisos.length > 0 ? (
            <section className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-[#FFFBEB] p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#973C00]">
                <ExclamationTriangleIcon aria-hidden className="h-4 w-4" />
                O que não deu para ler
              </h3>
              <ul className="flex flex-col gap-1">
                {leitura.avisos.map((aviso, indice) => (
                  <li key={`${aviso.codigo}-${indice}`} className="text-sm text-[#973C00]">
                    {aviso.mensagem}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {leitura.falas.length > 0 ? <Falas leitura={leitura} /> : null}

          <section className="flex flex-col gap-6 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-slate-700">Revisão</h3>
              <p className="text-xs text-slate-500">
                Confira o que foi lido e complete o resto. É este formulário que
                grava — nada entra sem passar por aqui.
              </p>
            </div>

            {/* O MESMO formulário do cadastro manual. Uma segunda tela para as
                mesmas 70 perguntas divergiria da primeira na terceira que
                mudasse. */}
            <RespostasForm
              respostas={respostas}
              onChange={setRespostas}
              camposDestacados={naoReconhecidos}
            />

            {error ? (
              <p role="alert" className="text-xs text-trend-negative">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-6 pt-2">
              <Button onClick={salvar} disabled={pending}>
                {pending ? "Salvando…" : "Salvar sessão"}
              </Button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

/*
 * As falas segmentadas. Elas NÃO preenchem resposta — numa transcrição real o
 * moderador parafraseia, a ASR erra números e a mesma fala se parte em três
 * turnos, então casar pergunta por texto teria precisão baixa. O que elas
 * servem é para a pessoa achar e copiar o trecho que vira citação de um achado.
 */
function Falas({ leitura }: { leitura: Leitura }) {
  const falantes = [...new Set(leitura.falas.map((fala) => fala.falante ?? "—"))];

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-700">
          Falas reconhecidas
        </h3>
        <p className="text-xs text-slate-500">
          {falantes.length} {falantes.length === 1 ? "participante" : "participantes"}:{" "}
          {falantes.join(", ")}. A transcrição é guardada inteira; as respostas
          você preenche na revisão abaixo.
        </p>
      </div>

      <ol className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {leitura.falas.map((fala, indice) => (
          <li key={indice} className="flex flex-col gap-1">
            <span className="font-mono text-xs text-slate-500">
              {fala.tempo ? `${fala.tempo} · ` : ""}
              {fala.falante ?? "sem identificação"}
            </span>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">
              {fala.texto}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

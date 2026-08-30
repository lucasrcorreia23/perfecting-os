"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ActionBar } from "@/components/ui/action-bar";
import { ActionMenu } from "@/components/ui/action-menu";
import { BackButton } from "@/components/ui/back-button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Field, Textarea } from "@/components/ui/form";
import { TESTE_FLUXOS, TESTE_ORIGENS, TESTE_PERFIS, withAlpha } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { deleteSessao, setTranscricao, updateSessao } from "@/lib/actions/usabilidade";
import { ROTEIRO_VERSAO } from "@/lib/usabilidade/roteiro";
import type { RespostasMap } from "@/lib/usabilidade/respostas";
import { codigoSessao } from "@/lib/usabilidade/sessao";
import { RespostasForm } from "./respostas-form";
import { AchadosCard, type AchadoRow, type DesafioOption } from "./achados-card";
import type { TaxonomiaOption } from "../desafios-view";
import type { SessaoRow } from "./mapear-sessao";

type Values = { respostas: RespostasMap; observacoes: string };

export function SessaoDetail({
  sessao,
  transcricao,
  achados,
  categorias,
  fluxos,
  desafios,
}: {
  sessao: SessaoRow;
  transcricao: string | null;
  achados: AchadoRow[];
  categorias: TaxonomiaOption[];
  fluxos: TaxonomiaOption[];
  desafios: DesafioOption[];
}) {
  const router = useRouter();

  // O formulário edita o mapa CRU, com perfil/fluxo/data de volta dentro dele:
  // é `prepararSessao` que os promove na gravação, e é assim que trocar o perfil
  // pela tela troca o roteiro inteiro.
  const inicial: Values = {
    respostas: {
      ...sessao.respostas,
      b0_perfil: sessao.perfil,
      b0_fluxo: sessao.fluxo,
      b0_varejo: sessao.varejo ? "sim" : "nao",
      b0_data: sessao.realizado_em,
    },
    observacoes: sessao.observacoes ?? "",
  };

  const [initial, setInitial] = useState(inicial);
  const [values, setValues] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [saving, startSaving] = useTransition();
  const [acting, startActing] = useTransition();

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  function salvar() {
    setError(null);
    startSaving(async () => {
      const result = await updateSessao(sessao.id, {
        respostas: values.respostas,
        observacoes: values.observacoes,
        origem: sessao.origem,
        transcricao: "",
      });
      if (result.ok) setInitial(values);
      else setError(result.error);
    });
  }

  function excluir() {
    startActing(async () => {
      const result = await deleteSessao(sessao.id);
      if (result.ok) router.push("/desafios/usabilidade");
      else {
        setConfirmandoExclusao(false);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {/*
          O botão de voltar é IRMÃO do bloco de texto, centrado nas duas linhas —
          não uma linha acima delas. É o padrão que `desafio-detail` e
          `lead-detail` já usam, e empilhá-lo custava uma faixa de 44px de altura
          para dizer a mesma coisa.
        */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <BackButton href="/desafios/usabilidade" />
            <div className="flex min-w-0 flex-col gap-2">
              <h2 className="font-mono text-sm text-slate-500">
                {codigoSessao(sessao.codigo)}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <Selo
                  label={TESTE_PERFIS[sessao.perfil].label}
                  cor={TESTE_PERFIS[sessao.perfil].color}
                />
                <Selo
                  label={TESTE_FLUXOS[sessao.fluxo].label}
                  cor={TESTE_FLUXOS[sessao.fluxo].color}
                />
                {sessao.varejo ? <Selo label="Varejo" cor="#7C3AED" /> : null}
                <span className="text-sm text-slate-500">
                  {formatDate(sessao.realizado_em)} ·{" "}
                  {TESTE_ORIGENS[sessao.origem].label}
                </span>
              </div>
            </div>
          </div>

          <ActionMenu
            items={[
              {
                label: "Excluir sessão",
                icon: TrashIcon,
                destructive: true,
                onSelect: () => setConfirmandoExclusao(true),
              },
            ]}
          />
        </div>

        {/*
          A versão do roteiro que ESTA sessão respondeu. Quando ela fica para
          trás, o aviso explica por que algumas respostas podem aparecer no
          bloco "Fora do roteiro atual" — sem ele, a pessoa leria como perda.
        */}
        {sessao.roteiro_versao !== ROTEIRO_VERSAO ? (
          <p className="rounded-sm border border-slate-200 bg-[#FFFBEB] px-4 py-3 text-sm text-[#973C00]">
            Esta sessão respondeu a versão {sessao.roteiro_versao} do roteiro; a atual é
            a {ROTEIRO_VERSAO}. As respostas de perguntas que mudaram continuam
            guardadas como estão.
          </p>
        ) : null}
      </div>

      <section className="flex flex-col gap-6 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
        <RespostasForm
          respostas={values.respostas}
          onChange={(respostas) => setValues((atual) => ({ ...atual, respostas }))}
        />

        <Field
          label="Observações do analista"
          help="Notas suas sobre a sessão. Não é resposta do roteiro."
          htmlFor="sessao-observacoes"
        >
          <Textarea
            id="sessao-observacoes"
            value={values.observacoes}
            onChange={(event) =>
              setValues((atual) => ({ ...atual, observacoes: event.target.value }))
            }
          />
        </Field>

        {error ? (
          <p role="alert" className="text-xs text-trend-negative">
            {error}
          </p>
        ) : null}

        <ActionBar
          dirty={dirty}
          saving={saving}
          onSave={salvar}
          onDiscard={() => setValues(initial)}
        />
      </section>

      <AchadosCard
        sessaoId={sessao.id}
        perfil={sessao.perfil}
        varejo={sessao.varejo}
        achados={achados}
        categorias={categorias}
        fluxos={fluxos}
        desafios={desafios}
      />

      <TranscricaoCard sessaoId={sessao.id} texto={transcricao} />

      <ConfirmModal
        open={confirmandoExclusao}
        onClose={() => setConfirmandoExclusao(false)}
        onConfirm={excluir}
        tone="danger"
        title="Excluir esta sessão?"
        description="A transcrição e os achados desta sessão são excluídos junto. Achados já vinculados a um desafio deixam o desafio intacto."
        confirmLabel="Excluir sessão"
        loading={acting}
      />
    </div>
  );
}

function Selo({ label, cor }: { label: string; cor: string }) {
  return (
    <span
      className="inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: withAlpha(cor, 0.08),
        borderColor: withAlpha(cor, 0.35),
        color: cor,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cor }} />
      {label}
    </span>
  );
}

/*
 * Disclosure LOCAL, e não o `BlocoRecolhivel` da calculadora: aquele é
 * território `.pf-calc`, e `design-tokens.test.ts` reprova token de pele em tela
 * interna.
 */
function TranscricaoCard({
  sessaoId,
  texto,
}: {
  sessaoId: string;
  texto: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(texto ?? "");
  const [salvo, setSalvo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar() {
    if (valor === (texto ?? "")) return;
    setError(null);
    startTransition(async () => {
      const result = await setTranscricao(sessaoId, valor);
      if (result.ok) {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2000);
      } else setError(result.error);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          aria-expanded={aberto}
          className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 sm:min-h-0"
        >
          <ChevronDownIcon
            aria-hidden
            className={`h-4 w-4 transition-transform ${aberto ? "rotate-180" : ""}`}
          />
          Transcrição
          <span className="font-normal text-slate-500">
            {texto ? `${texto.length.toLocaleString("pt-BR")} caracteres` : "não anexada"}
          </span>
        </button>
        {salvo ? (
          <span aria-live="polite" className="text-xs text-trend-positive">
            Salvo
          </span>
        ) : null}
      </div>

      {aberto ? (
        <div className="flex flex-col gap-3">
          <Field
            label="Texto da conversa"
            help="Cole a transcrição como ela sai da ferramenta de gravação. Ela é guardada inteira e serve de fonte para citar trechos."
            htmlFor="sessao-transcricao"
          >
            <Textarea
              id="sessao-transcricao"
              value={valor}
              disabled={pending}
              onChange={(event) => setValor(event.target.value)}
              onBlur={salvar}
              className="min-h-64 font-mono text-xs"
            />
          </Field>
          {error ? (
            <p role="alert" className="text-xs text-trend-negative">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { CodeBracketIcon, EyeIcon, PlusIcon } from "@heroicons/react/24/outline";
import {
  publishFunnel,
  setFunnelStatus,
  updateFunnel,
} from "@/lib/actions/marketing-funnels";
import { QUALIFICACOES, type FunnelStatus } from "@/lib/constants";
import {
  defaultQuestion,
  funnelMaxScore,
  validateFunnelSchema,
  type FunnelQuestion,
  type FunnelThresholds,
} from "@/lib/marketing-funnel";
import { ActionBar } from "@/components/ui/action-bar";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormSection, Input, Textarea } from "@/components/ui/form";
import { FunnelStatusChip } from "@/components/ui/funnel-status-chip";
import { Tabs } from "@/components/ui/tabs";
import { FunnelSchemaModal } from "./funnel-schema-modal";
import { QuestionCard } from "./question-card";

export type FunnelDraft = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: FunnelStatus;
  submitLabel: string;
  successMessage: string;
  redirectUrl: string;
  questions: FunnelQuestion[];
  thresholds: FunnelThresholds;
  publishedVersion: number | null;
};

// Puras e exportadas para o teste (padrão de client-card.test.ts).
export function moveQuestion(
  questions: FunnelQuestion[],
  index: number,
  direction: -1 | 1,
): FunnelQuestion[] {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= questions.length) return questions;
  const next = [...questions];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// A cópia recebe ids novos — reaproveitar ids quebraria o mapa de respostas.
export function duplicateQuestion(
  questions: FunnelQuestion[],
  index: number,
  newId: (prefix: string) => string,
): FunnelQuestion[] {
  const original = questions[index];
  if (!original) return questions;
  const copy: FunnelQuestion = {
    ...original,
    id: newId("q"),
    label: original.label ? `${original.label} (cópia)` : "",
    // maps_to é único por funil: a cópia nasce sem vínculo.
    maps_to: null,
    options: original.options.map((option) => ({ ...option, id: newId("o") })),
    scale: original.scale ? { ...original.scale } : null,
  };
  return [...questions.slice(0, index + 1), copy, ...questions.slice(index + 1)];
}

export function removeQuestion(
  questions: FunnelQuestion[],
  index: number,
): FunnelQuestion[] {
  return questions.filter((_, position) => position !== index);
}

const TABS = [
  { id: "perguntas", label: "Perguntas" },
  { id: "pontuacao", label: "Pontuação" },
  { id: "configuracoes", label: "Configurações" },
];

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function FunnelBuilder({
  funnel,
  endpointUrl,
}: {
  funnel: FunnelDraft;
  endpointUrl: string;
}) {
  const [initial, setInitial] = useState(funnel);
  const [values, setValues] = useState(funnel);
  const [status, setStatus] = useState(funnel.status);
  const [version, setVersion] = useState(funnel.publishedVersion);
  const [error, setError] = useState<string | null>(null);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [confirming, setConfirming] = useState<"publicar" | "arquivar" | null>(null);
  const [saving, startSaving] = useTransition();
  const [acting, startActing] = useTransition();

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const maxScore = funnelMaxScore(values.questions);
  const schemaError = validateFunnelSchema(values.questions);

  function set<K extends keyof FunnelDraft>(key: K, value: FunnelDraft[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await updateFunnel(funnel.id, {
        name: values.name,
        slug: values.slug,
        description: values.description,
        submit_label: values.submitLabel,
        success_message: values.successMessage,
        redirect_url: values.redirectUrl,
        questions: values.questions,
        thresholds: values.thresholds,
      });
      if (result.ok) setInitial(values);
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <BackButton href="/marketing/funis" />
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-slate-900">
              {values.name || "Funil sem nome"}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <FunnelStatusChip status={status} />
              <span className="text-xs text-slate-500">
                {version ? `Versão v${version} no ar` : "Nenhuma versão publicada"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Nova aba: o quiz lê o rascunho salvo do banco e navegar na mesma
              aba jogaria fora edições não salvas do builder. */}
          <Button
            variant="secondary"
            icon={EyeIcon}
            onClick={() =>
              window.open(`/marketing/funis/${funnel.id}/testar`, "_blank", "noopener")
            }
          >
            Pré-visualizar
          </Button>
          <Button
            variant="secondary"
            icon={CodeBracketIcon}
            onClick={() => setSchemaOpen(true)}
          >
            Ver JSON do site
          </Button>
          {status === "publicado" ? (
            <Button
              variant="secondary"
              onClick={() => setConfirming("arquivar")}
              disabled={acting}
            >
              Arquivar
            </Button>
          ) : null}
          <Button
            variant="primary"
            onClick={() => setConfirming("publicar")}
            disabled={acting || dirty || schemaError !== null}
          >
            {version ? `Publicar v${version + 1}` : "Publicar"}
          </Button>
        </div>
      </div>

      {dirty ? (
        <p className="text-xs text-slate-500">
          Salve as alterações antes de publicar ou testar — o site só recebe o
          que foi publicado, e o teste como lead usa o rascunho salvo.
        </p>
      ) : null}
      {!dirty && schemaError ? (
        <p className="text-xs text-slate-500">
          Para publicar, resolva: {schemaError}
        </p>
      ) : null}

      <Tabs tabs={TABS} panelClassName="p-4 sm:p-8">
        {(active) => (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            {active === "perguntas" ? (
              <div className="flex flex-col gap-4">
                {values.questions.length === 0 ? (
                  <EmptyState
                    icon={PlusIcon}
                    title="Nenhuma pergunta ainda"
                    description="Monte o questionário que o visitante vai responder no site."
                    discreet
                  />
                ) : (
                  values.questions.map((question, index) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      total={values.questions.length}
                      newId={newId}
                      onChange={(next) =>
                        set(
                          "questions",
                          values.questions.map((item, position) =>
                            position === index ? next : item,
                          ),
                        )
                      }
                      onMove={(direction) =>
                        set("questions", moveQuestion(values.questions, index, direction))
                      }
                      onDuplicate={() =>
                        set(
                          "questions",
                          duplicateQuestion(values.questions, index, newId),
                        )
                      }
                      onRemove={() =>
                        set("questions", removeQuestion(values.questions, index))
                      }
                    />
                  ))
                )}

                <Button
                  variant="secondary"
                  icon={PlusIcon}
                  className="self-start"
                  onClick={() =>
                    set("questions", [
                      ...values.questions,
                      defaultQuestion(newId("q")),
                    ])
                  }
                >
                  Adicionar pergunta
                </Button>
              </div>
            ) : null}

            {active === "pontuacao" ? (
              <FormSection
                title="Qualificação"
                description="Percentual da pontuação máxima a partir do qual o lead entra em cada faixa."
                first
              >
                <div className="rounded-sm border border-slate-200 bg-white p-4">
                  <span className="text-sm text-slate-700">
                    Pontuação máxima deste funil:{" "}
                    <span className="font-semibold tabular-nums">{maxScore}</span>{" "}
                    pontos
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Morno a partir de (%)" htmlFor="funnel-morno">
                    <Input
                      id="funnel-morno"
                      type="number"
                      min={0}
                      max={100}
                      value={values.thresholds.morno}
                      onChange={(event) =>
                        set("thresholds", {
                          ...values.thresholds,
                          morno: Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Quente a partir de (%)" htmlFor="funnel-quente">
                    <Input
                      id="funnel-quente"
                      type="number"
                      min={0}
                      max={100}
                      value={values.thresholds.quente}
                      onChange={(event) =>
                        set("thresholds", {
                          ...values.thresholds,
                          quente: Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-slate-700">
                    Faixas resultantes
                  </span>
                  <div className="flex h-8 overflow-hidden rounded-full border border-slate-200">
                    {(
                      [
                        { key: "frio" as const, span: values.thresholds.morno },
                        {
                          key: "morno" as const,
                          span: Math.max(
                            0,
                            values.thresholds.quente - values.thresholds.morno,
                          ),
                        },
                        {
                          key: "quente" as const,
                          span: Math.max(0, 100 - values.thresholds.quente),
                        },
                      ] as const
                    ).map(({ key, span }) => (
                      <span
                        key={key}
                        className="flex items-center justify-center text-[11px] font-medium text-white"
                        style={{
                          width: `${span}%`,
                          backgroundColor: QUALIFICACOES[key].color,
                        }}
                      >
                        {span >= 12 ? QUALIFICACOES[key].label : null}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Os limiares são inclusivos: bater exatamente no valor já entra
                    na faixa superior.
                  </p>
                </div>
              </FormSection>
            ) : null}

            {active === "configuracoes" ? (
              <>
                <FormSection title="Identificação" first>
                  <Field label="Nome" htmlFor="funnel-name">
                    <Input
                      id="funnel-name"
                      value={values.name}
                      onChange={(event) => set("name", event.target.value)}
                    />
                  </Field>
                  <Field
                    label="Slug"
                    help="É o que o site usa para buscar as perguntas no endpoint público."
                    htmlFor="funnel-slug"
                  >
                    <Input
                      id="funnel-slug"
                      value={values.slug}
                      onChange={(event) => set("slug", event.target.value)}
                    />
                  </Field>
                  <Field
                    label="Descrição"
                    help="Texto opcional que o site pode exibir acima do formulário."
                    htmlFor="funnel-description"
                  >
                    <Textarea
                      id="funnel-description"
                      value={values.description}
                      onChange={(event) => set("description", event.target.value)}
                      className="min-h-20"
                    />
                  </Field>
                </FormSection>

                <FormSection title="Envio">
                  <Field label="Texto do botão" htmlFor="funnel-submit">
                    <Input
                      id="funnel-submit"
                      value={values.submitLabel}
                      onChange={(event) => set("submitLabel", event.target.value)}
                    />
                  </Field>
                  <Field
                    label="Mensagem de sucesso"
                    help="Exibida no site depois do envio."
                    htmlFor="funnel-success"
                  >
                    <Textarea
                      id="funnel-success"
                      value={values.successMessage}
                      onChange={(event) => set("successMessage", event.target.value)}
                      className="min-h-20"
                    />
                  </Field>
                  <Field
                    label="URL de redirecionamento"
                    help="Opcional. Se preenchida, o site pode levar o visitante a esta página após o envio."
                    htmlFor="funnel-redirect"
                  >
                    <Input
                      id="funnel-redirect"
                      value={values.redirectUrl}
                      placeholder="https://…"
                      onChange={(event) => set("redirectUrl", event.target.value)}
                    />
                  </Field>
                </FormSection>
              </>
            ) : null}

            {error ? (
              <p role="alert" className="text-xs text-trend-negative">
                {error}
              </p>
            ) : null}

            <ActionBar
              dirty={dirty}
              saving={saving}
              onSave={save}
              onDiscard={() => setValues(initial)}
            />
          </div>
        )}
      </Tabs>

      <FunnelSchemaModal
        open={schemaOpen}
        onClose={() => setSchemaOpen(false)}
        funnel={values}
        version={version}
        endpointUrl={endpointUrl}
      />

      <ConfirmModal
        open={confirming === "publicar"}
        onClose={() => setConfirming(null)}
        tone="primary"
        title={version ? `Publicar a versão ${version + 1}?` : "Publicar o funil?"}
        description={`Gera uma versão congelada do questionário e o site passa a servir este schema. Leads já recebidos continuam ligados à versão que responderam.`}
        confirmLabel="Publicar"
        loading={acting}
        onConfirm={() => {
          setError(null);
          startActing(async () => {
            const result = await publishFunnel(funnel.id);
            if (result.ok) {
              setStatus("publicado");
              setVersion(result.data.version);
            } else {
              setError(result.error);
            }
            setConfirming(null);
          });
        }}
      />

      <ConfirmModal
        open={confirming === "arquivar"}
        onClose={() => setConfirming(null)}
        tone="warning"
        title="Arquivar funil?"
        description="O site deixa de receber o schema e novos envios passam a ser recusados. As versões e os leads já captados são preservados."
        confirmLabel="Arquivar"
        loading={acting}
        onConfirm={() => {
          setError(null);
          startActing(async () => {
            const result = await setFunnelStatus(funnel.id, "arquivado");
            if (result.ok) setStatus("arquivado");
            else setError(result.error);
            setConfirming(null);
          });
        }}
      />
    </div>
  );
}

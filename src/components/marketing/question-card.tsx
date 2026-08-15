"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  FUNNEL_FIELD_TYPES,
  FUNNEL_FIELD_TYPE_ORDER,
  MAPS_TO_LABELS,
  MAPS_TO_ORDER,
  maxScoreFor,
  type FunnelFieldType,
  type FunnelQuestion,
  type MapsTo,
} from "@/lib/marketing-funnel";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import type { HeroIcon } from "@/components/ui/types";

const TYPE_OPTIONS = FUNNEL_FIELD_TYPE_ORDER.map((type) => ({
  value: type,
  label: FUNNEL_FIELD_TYPES[type].label,
}));

const MAPS_TO_OPTIONS = [
  { value: "", label: "Não vincular" },
  ...MAPS_TO_ORDER.map((key) => ({ value: key, label: MAPS_TO_LABELS[key] })),
];

// Botão-ícone de 44px — reordenar por teclado sai de graça, ao contrário do
// dnd-kit (que o guideline mantém isolado no board do Workflow).
function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: HeroIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full sm:h-9 sm:w-9",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        destructive
          ? "text-red-600 hover:bg-red-50 hover:text-red-700"
          : "text-slate-500 hover:bg-slate-100/75 hover:text-slate-700",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

export function QuestionCard({
  question,
  index,
  total,
  newId,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
}: {
  question: FunnelQuestion;
  index: number;
  total: number;
  newId: (prefix: string) => string;
  onChange: (next: FunnelQuestion) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const hasOptions = FUNNEL_FIELD_TYPES[question.type].hasOptions;
  const isScale = question.type === "escala";
  const fieldId = `q-${question.id}`;

  function patch(changes: Partial<FunnelQuestion>) {
    onChange({ ...question, ...changes });
  }

  function changeType(type: FunnelFieldType) {
    patch({
      type,
      options: FUNNEL_FIELD_TYPES[type].hasOptions ? question.options : [],
      scale:
        type === "escala"
          ? (question.scale ?? { min: 1, max: 5, minLabel: null, maxLabel: null })
          : null,
      // maps_to: "email" só é válido em pergunta do tipo e-mail.
      maps_to:
        question.maps_to === "email" && type !== "email" ? null : question.maps_to,
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pergunta {index + 1}
          </span>
          <span className="text-xs text-slate-500">
            Vale até{" "}
            <span className="tabular-nums">{Math.round(maxScoreFor(question))}</span>{" "}
            pontos
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            icon={ChevronUpIcon}
            label="Mover para cima"
            onClick={() => onMove(-1)}
            disabled={index === 0}
          />
          <IconButton
            icon={ChevronDownIcon}
            label="Mover para baixo"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
          />
          <IconButton
            icon={DocumentDuplicateIcon}
            label="Duplicar pergunta"
            onClick={onDuplicate}
          />
          <IconButton
            icon={TrashIcon}
            label="Remover pergunta"
            onClick={onRemove}
            destructive
          />
        </div>
      </div>

      <Field label="Enunciado" htmlFor={`${fieldId}-label`}>
        <Input
          id={`${fieldId}-label`}
          value={question.label}
          onChange={(event) => patch({ label: event.target.value })}
          placeholder="Qual o tamanho do time comercial?"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Tipo de resposta" htmlFor={`${fieldId}-type`}>
          <Select
            id={`${fieldId}-type`}
            options={TYPE_OPTIONS}
            value={question.type}
            onChange={(event) => changeType(event.target.value as FunnelFieldType)}
          />
        </Field>
        <Field
          label="Vincular ao lead"
          help="Preenche o campo do lead e o formulário de conversão em cliente."
          htmlFor={`${fieldId}-maps-to`}
        >
          <Select
            id={`${fieldId}-maps-to`}
            options={MAPS_TO_OPTIONS}
            value={question.maps_to ?? ""}
            onChange={(event) =>
              patch({ maps_to: (event.target.value || null) as MapsTo | null })
            }
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Texto de ajuda"
          help="Aparece abaixo do enunciado no site."
          htmlFor={`${fieldId}-help`}
        >
          <Input
            id={`${fieldId}-help`}
            value={question.help ?? ""}
            onChange={(event) => patch({ help: event.target.value || null })}
          />
        </Field>
        <Field
          label="Peso"
          help="Multiplica os pontos desta pergunta na qualificação."
          htmlFor={`${fieldId}-weight`}
        >
          <Input
            id={`${fieldId}-weight`}
            type="number"
            min={0}
            step={0.5}
            value={question.weight}
            onChange={(event) => patch({ weight: Number(event.target.value) })}
          />
        </Field>
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
        <Checkbox
          checked={question.required}
          onChange={(event) => patch({ required: event.target.checked })}
        />
        <span className="text-sm font-medium text-slate-700">
          Resposta obrigatória
        </span>
      </label>

      {isScale && question.scale ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Valor mínimo" htmlFor={`${fieldId}-min`}>
            <Input
              id={`${fieldId}-min`}
              type="number"
              value={question.scale.min}
              onChange={(event) =>
                patch({
                  scale: { ...question.scale!, min: Number(event.target.value) },
                })
              }
            />
          </Field>
          <Field label="Valor máximo" htmlFor={`${fieldId}-max`}>
            <Input
              id={`${fieldId}-max`}
              type="number"
              value={question.scale.max}
              onChange={(event) =>
                patch({
                  scale: { ...question.scale!, max: Number(event.target.value) },
                })
              }
            />
          </Field>
          <Field label="Rótulo do mínimo" htmlFor={`${fieldId}-min-label`}>
            <Input
              id={`${fieldId}-min-label`}
              value={question.scale.minLabel ?? ""}
              placeholder="Inexistente"
              onChange={(event) =>
                patch({
                  scale: { ...question.scale!, minLabel: event.target.value || null },
                })
              }
            />
          </Field>
          <Field label="Rótulo do máximo" htmlFor={`${fieldId}-max-label`}>
            <Input
              id={`${fieldId}-max-label`}
              value={question.scale.maxLabel ?? ""}
              placeholder="Maduro"
              onChange={(event) =>
                patch({
                  scale: { ...question.scale!, maxLabel: event.target.value || null },
                })
              }
            />
          </Field>
        </div>
      ) : null}

      {hasOptions ? (
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Opções e pontos
            </span>
            <button
              type="button"
              onClick={() =>
                patch({
                  options: [
                    ...question.options,
                    { id: newId("o"), label: "", score: 0 },
                  ],
                })
              }
              className={cn(
                "inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-primary sm:min-h-9",
                "transition-colors hover:text-primary-link-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              )}
            >
              <PlusIcon className="h-4 w-4" aria-hidden />
              Adicionar opção
            </button>
          </div>

          {question.options.length === 0 ? (
            <p className="text-xs text-slate-500">
              Adicione ao menos uma opção para publicar o funil.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {question.options.map((option, optionIndex) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    aria-label={`Texto da opção ${optionIndex + 1}`}
                    value={option.label}
                    placeholder="11 a 50 pessoas"
                    onChange={(event) =>
                      patch({
                        options: question.options.map((item) =>
                          item.id === option.id
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                  <Input
                    aria-label={`Pontos da opção ${optionIndex + 1}`}
                    type="number"
                    value={option.score}
                    onChange={(event) =>
                      patch({
                        options: question.options.map((item) =>
                          item.id === option.id
                            ? { ...item, score: Number(event.target.value) }
                            : item,
                        ),
                      })
                    }
                    className="w-24 shrink-0"
                  />
                  <IconButton
                    icon={XMarkIcon}
                    label={`Remover opção ${optionIndex + 1}`}
                    destructive
                    onClick={() =>
                      patch({
                        options: question.options.filter(
                          (item) => item.id !== option.id,
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { updatePreferences, type Preferences } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";
import { ActionBar } from "@/components/ui/action-bar";
import { Field, FormSection } from "@/components/ui/form";
import { Select } from "@/components/ui/select";

function Toggle({
  checked,
  onChange,
  label,
  help,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  help?: string;
}) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {help ? <span className="text-xs text-slate-500">{help}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
          checked ? "bg-primary" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[var(--shadow-sm)] transition-[left]",
            checked ? "left-[22px]" : "left-0.5",
          )}
          aria-hidden
        />
      </button>
    </div>
  );
}

type Values = Required<Preferences>;

const DEFAULTS: Values = {
  idioma: "pt-BR",
  resumo_semanal: false,
  alertas_prazo: false,
};

export function PreferencesForm({
  preferences,
}: {
  preferences: Preferences | null;
}) {
  const [initial, setInitial] = useState<Values>({
    ...DEFAULTS,
    ...preferences,
  });
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updatePreferences(values);
      if (result.ok) {
        setInitial(values);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <FormSection title="Idioma" first>
        <Field label="Idioma da interface" htmlFor="pref-idioma">
          <Select
            id="pref-idioma"
            className="md:w-1/2"
            options={[{ value: "pt-BR", label: "Português (Brasil)" }]}
            value={values.idioma}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                idioma: event.target.value,
              }))
            }
          />
        </Field>
      </FormSection>

      <FormSection
        title="Notificações"
        description="Na v1 as preferências são apenas salvas; os envios chegam junto com os Alertas."
      >
        <Toggle
          label="Resumo semanal por e-mail"
          help="Um panorama dos seus clientes toda segunda-feira."
          checked={values.resumo_semanal}
          onChange={(value) =>
            setValues((current) => ({ ...current, resumo_semanal: value }))
          }
        />
        <Toggle
          label="Alertas de prazo por e-mail"
          help="Avisos quando um cliente estourar o prazo da etapa."
          checked={values.alertas_prazo}
          onChange={(value) =>
            setValues((current) => ({ ...current, alertas_prazo: value }))
          }
        />
      </FormSection>

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
  );
}

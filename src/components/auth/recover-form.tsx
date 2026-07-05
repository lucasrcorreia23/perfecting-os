"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  updatePassword,
  type AuthState,
} from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { TextLink } from "@/components/ui/text-link";

const initialState: AuthState = {};

// Duas etapas: solicitar o link por e-mail e, ao voltar pelo link
// (?etapa=redefinir), definir a nova senha.
export function RecoverForm({ redefinir }: { redefinir: boolean }) {
  const [requestState, requestAction, requestPending] = useActionState(
    requestPasswordReset,
    initialState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updatePassword,
    initialState,
  );

  if (redefinir) {
    return (
      <form action={updateAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-slate-900">
            Definir nova senha
          </h1>
          <p className="text-xs text-slate-500">
            Escolha uma nova senha para a sua conta.
          </p>
        </div>

        <Field
          label="Nova senha"
          help="Pelo menos 8 caracteres."
          htmlFor="new-password"
        >
          <Input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>

        {updateState.error ? (
          <p role="alert" className="text-xs text-trend-negative">
            {updateState.error}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={updatePending}
        >
          {updatePending ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    );
  }

  return (
    <form action={requestAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-slate-900">
          Recuperar senha
        </h1>
        <p className="text-xs text-slate-500">
          Enviaremos um link de redefinição para o seu e-mail.
        </p>
      </div>

      <Field label="E-mail" htmlFor="recover-email">
        <Input
          id="recover-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </Field>

      {requestState.error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {requestState.error}
        </p>
      ) : null}
      {requestState.message ? (
        <p role="status" className="text-xs text-trend-positive">
          {requestState.message}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={requestPending}
      >
        {requestPending ? "Enviando…" : "Enviar link"}
      </Button>

      <div className="flex items-center justify-center">
        <TextLink href="/login" tone="primary">
          Voltar para o login
        </TextLink>
      </div>
    </form>
  );
}

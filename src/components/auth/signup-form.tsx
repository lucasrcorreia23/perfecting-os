"use client";

import { useActionState } from "react";
import { signUp, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { TextLink } from "@/components/ui/text-link";

const initialState: AuthState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-slate-900">Criar conta</h1>
        <p className="text-xs text-slate-500">
          Cadastre-se para gerenciar seus clientes.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Field label="Nome completo" htmlFor="signup-name">
          <Input
            id="signup-name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
          />
        </Field>
        <Field label="E-mail" htmlFor="signup-email">
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field
          label="Senha"
          help="Pelo menos 8 caracteres."
          htmlFor="signup-password"
        >
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
      </div>

      {state.error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-xs text-trend-positive">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Criando conta…" : "Criar conta"}
      </Button>

      <div className="flex items-center justify-center">
        <TextLink href="/login" tone="primary">
          Já tenho conta — entrar
        </TextLink>
      </div>
    </form>
  );
}

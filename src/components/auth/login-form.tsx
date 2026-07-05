"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { TextLink } from "@/components/ui/text-link";

const initialState: AuthState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-slate-900">Entrar</h1>
        <p className="text-xs text-slate-500">
          Acesse sua conta para acompanhar seus clientes.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Field label="E-mail" htmlFor="login-email">
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Senha" htmlFor="login-password">
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
      </div>

      {state.error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>

      <div className="flex items-center justify-between">
        <TextLink href="/cadastro" tone="primary">
          Criar conta
        </TextLink>
        <TextLink href="/recuperar" tone="secondary">
          Esqueci a senha
        </TextLink>
      </div>
    </form>
  );
}

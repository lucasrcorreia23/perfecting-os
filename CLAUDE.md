@AGENTS.md

# Perfecting v1

Gestão de clientes com workflow de Customer Success. UI **100% pt-BR**.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict.
- Tailwind CSS 4 (CSS-first: tokens em `app/globals.css` via `@theme inline`; sem tailwind.config).
- Supabase (Postgres + Auth + Storage) via `@supabase/ssr`. Migrations em `supabase/migrations/`, seed em `supabase/seed.sql`.
- Ícones: somente Heroicons 2 (`@heroicons/react/24/outline` padrão).
- Kanban: `@dnd-kit/core` (isolado em `src/components/workflow/board.tsx`).
- Testes: **Vitest** (`vitest run`). Specs `*.test.ts(x)` co-localizadas em `src/`; alias `@/*` resolvido em `vitest.config.ts`.

## Testes antes do push (obrigatório)

- **Sempre rode `npm test` e garanta verde antes de qualquer `git push`.**
- Enforcement: hook `.githooks/pre-push` (versionado; `git config core.hooksPath .githooks` é aplicado pelo script `prepare` no `npm install`) roda `npm test` e cancela o push se falhar. Pular só em emergência com `git push --no-verify`.
- Ao mexer em lógica pura de `src/lib/*` (format, kpis, utils…), adicione/atualize as specs correspondentes.

## Design

**Leia `docs/design-guidelines.md` antes de escrever qualquer componente** — ele vence qualquer hábito. Regras inegociáveis:

- Empilhamento vertical sempre `flex flex-col gap-*` — **nunca** `space-y-*`.
- Superfície padrão `bg-white rounded-sm border border-slate-200`; estilo orgânico: raios 16/20/28 (tokens sobrescritos) em containers e **controles pill** (`rounded-full`: botões, inputs, selects, busca, itens de menu) — **nunca** `rounded` sem sufixo. Sem blur/glassmorphism.
- Primária `#2E63CD` com parcimônia; cinzas só Slate; foco visível em tudo; tap targets ≥ 44px no mobile; `min-h-[100dvh]`.
- Placeholders usam chip "Em breve" (`#FFFBEB` / `#973C00`).

## Estrutura

```
app/(auth)/…            login, cadastro, recuperar
app/(app)/…             páginas autenticadas (shell com header + sidebar)
src/lib/                supabase clients, auth gate, actions ('use server'), constants, format, kpis
src/components/ui/      primitivos do guideline (Button, Tabs, ActionMenu, modais…)
src/components/…        componentes por feature (clients, activities, files, workflow, dashboard, profile, shell)
proxy.ts                refresh de sessão + proteção de rotas
```

- Alias `@/*` → `./src/*`. Server Components por padrão; `"use client"` só onde há interatividade. Mutações via Server Actions em `src/lib/actions/*` (sempre revalidam sessão/role; RLS é o backstop).
- Roles: `interno` (acesso total) e `cliente` (só o próprio `/clientes/[id]` e `/perfil`) — gate server-side em `src/lib/auth.ts` (`getSessionProfile`/`requireInterno`), não só no proxy.

## Next 16 — diferenças que quebram build

- `middleware.ts` virou **`proxy.ts`** (função `proxy`; runtime Node; não exportar `runtime`).
- `cookies()`/`headers()`/`params`/`searchParams` são **async** — sempre `await`.
- `revalidateTag` exige 2º argumento — usamos só `revalidatePath`.
- Em dúvida, consulte `node_modules/next/dist/docs/`.

## Decisões registradas

- `@heroico/utilities` (do prompt original) não existe no npm — usamos `clsx` + `cn()` em `src/lib/utils.ts`.
- Kanban mostra **todos** os clientes (inclusive `encerrado`), com StatusChip compacto quando ≠ ativo.
- Matriz RLS exata do prompt: role `cliente` não tem insert em `events` → upload de arquivo por cliente não gera evento.
- Upload vai do browser direto ao Storage (policies protegem); a server action só registra metadados e revalida o limite de 20 MB.
- Sem evento de exclusão de cliente (events têm FK cascade). Tendência de "Atividades atrasadas" não é reconstituível pelo log → sempre "—".
- Seed não referencia `auth.users` (colunas de ator são NULL); o primeiro cadastro real vira profile `interno` via trigger.

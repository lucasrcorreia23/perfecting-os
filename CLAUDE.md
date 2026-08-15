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
app/api/publico/…       API REST consumida pelo site externo (ver "Módulo Marketing")
src/lib/                supabase clients, auth gate, actions ('use server'), constants, format, kpis
src/lib/api/            CORS, tokens, envelope de resposta e queries da API pública
src/components/ui/      primitivos do guideline (Button, Tabs, ActionMenu, modais…)
src/components/…        componentes por feature (clients, activities, files, workflow, dashboard, profile, marketing, shell)
proxy.ts                refresh de sessão + proteção de rotas
```

- Alias `@/*` → `./src/*`. Server Components por padrão; `"use client"` só onde há interatividade. Mutações via Server Actions em `src/lib/actions/*` (sempre revalidam sessão/role; RLS é o backstop).
- Roles: `interno` (acesso total) e `cliente` (só o próprio `/clientes/[id]` e `/perfil`) — gate server-side em `src/lib/auth.ts` (`getSessionProfile`/`requireInterno`), não só no proxy.

## Next 16 — diferenças que quebram build

- `middleware.ts` virou **`proxy.ts`** (função `proxy`; runtime Node; não exportar `runtime`).
- `cookies()`/`headers()`/`params`/`searchParams` são **async** — sempre `await`.
- `revalidateTag` exige 2º argumento — usamos só `revalidatePath`.
- Em dúvida, consulte `node_modules/next/dist/docs/`.

## Módulo Marketing

CMS de blog + funis de qualificação, 100% interno (`requireInterno` no layout). Três seções: `/marketing/blog`, `/marketing/funis`, `/marketing/leads`.

**Passo a passo de setup e integração com o site: `docs/marketing-integracao.md`.**

**API pública** (`app/api/publico/*`) — o site externo nunca fala com o PostgREST, só com estes handlers:

| Método | Rota | Auth |
|---|---|---|
| GET | `/api/publico/posts?limit&offset&tag` | `Authorization: Bearer <MARKETING_API_TOKEN>` |
| GET | `/api/publico/posts/[slug]` | idem |
| GET | `/api/publico/funis/[slug]` | idem |
| POST | `/api/publico/funis/[slug]/respostas` | idem **ou** `X-Perfecting-Token: <MARKETING_PUBLIC_TOKEN>` + `Origin` na allowlist |

- Envelope: `{ data, meta? }` / `{ error: { code, message, field? } }`. `Cache-Control: no-store` — **quem cacheia é o site** (`next: { revalidate: 60 }`, obrigatório: sem cron, é a revalidação periódica que faz o post agendado aparecer).
- `OPTIONS` exportado em cada `route.ts` (o automático do Next não manda headers de CORS) e `Vary: Origin` sempre.
- `src/lib/supabase/proxy.ts` faz **bypass de `/api/publico` antes de tudo** — sem isso o preflight vira `307 → /login` e o browser reporta falha de CORS opaca.
- Envs: `SUPABASE_SERVICE_ROLE_KEY`, `MARKETING_API_TOKEN`, `MARKETING_PUBLIC_TOKEN`, `MARKETING_ALLOWED_ORIGINS`, `MARKETING_IP_SALT`, `NEXT_PUBLIC_MARKETING_SITE_URL`.
- O site externo **precisa sanitizar** o `body_md` que recebe (`rehype-sanitize`/DOMPurify). Do nosso lado, `validatePostInput` já rejeita `<script>`, `<iframe>`, `javascript:` e `on*=` no save.

## Decisões registradas

- `@heroico/utilities` (do prompt original) não existe no npm — usamos `clsx` + `cn()` em `src/lib/utils.ts`.
- Kanban mostra **todos** os clientes (inclusive `encerrado`), com StatusChip compacto quando ≠ ativo.
- Matriz RLS exata do prompt: role `cliente` não tem insert em `events` → upload de arquivo por cliente não gera evento.
- Upload vai do browser direto ao Storage (policies protegem); a server action só registra metadados e revalida o limite de 20 MB.
- Sem evento de exclusão de cliente (events têm FK cascade). Tendência de "Atividades atrasadas" não é reconstituível pelo log → sempre "—".
- Seed não referencia `auth.users` (colunas de ator são NULL); o primeiro cadastro real vira profile `interno` via trigger.
- Marketing usa **service role** (`src/lib/supabase/service.ts`, importado só por `src/lib/api/marketing-queries.ts`). Policies `to anon` seriam piores: a anon key é `NEXT_PUBLIC_` e exporia as tabelas direto no PostgREST, sem token, CORS nem rate limit. As tabelas mantêm RLS `is_interno()` como backstop da UI.
- Post "agendado" **não é status no banco**: é derivado de `publicado` + `published_at` futuro (`postState`). Um predicado só na API e nenhum cron. `arquivado` é status real — despublica sem perder a data.
- Perguntas do funil ficam em **jsonb** (como `activities.subatividades`); o que é publicado vira linha imutável em `marketing_funnel_versions`, e o lead aponta para a versão via FK. Editar o rascunho não reescreve o significado de leads antigos.
- `publicQuestions()` remove `score`, `weight` e `maps_to` antes de entregar ao site — vazar pesos ensinaria o visitante a se auto-qualificar.
- Markdown tem **parser próprio** (`marketing-markdown.ts`) que devolve AST tipada, não HTML: zero deps, zero `dangerouslySetInnerHTML`, testável em `environment: "node"`.
- Anti-spam no envio: honeypot `hp` e `elapsed_ms < 1500` respondem `201` **sem gravar** (bot não recebe sinal). Rate limit em memória é por instância; o throttle que atravessa lambdas é a contagem por `ip_hash` no banco. LGPD: guardamos só o HMAC do IP.
- Excluir funil com leads é **recusado** (arquive); excluir cliente/post limpa o Storage à mão, porque o cascade não alcança o bucket.

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
app/(calculadora)/…     calculadora de ROI pública por token (ver "Calculadora de ROI")
app/api/publico/…       API REST sem sessão (site externo + autosave da calculadora)
src/lib/                supabase clients, auth gate, actions ('use server'), constants, format, kpis
src/lib/api/            CORS, tokens, envelope de resposta e queries da API pública
src/lib/calculadora/    motor puro da calculadora ROI (V5) + estado/preço/trajetória
src/components/ui/      primitivos do guideline (Button, Tabs, ActionMenu, modais…)
src/components/…        componentes por feature (clients, activities, files, workflow, dashboard, profile, marketing, calculadora, shell)
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

Duas telas fogem do shell/listagem padrão:

- `/marketing/funis/[id]/testar` — quiz em tela cheia (uma pergunta por vez) que simula o visitante. Vive em `app/(quiz)/`, um route group **sem `AppShell`** e com `requireInterno` próprio. Sem `?versao`, testa o rascunho salvo; com `?versao=publicada`, o snapshot que o site serve. Usa o mesmo `validateAnswers`/`scoreSubmission` da API pública e **não grava nada**.
- `/marketing/leads/[id]` — detalhe do lead (era modal). Respostas em `whitespace-pre-wrap`, pontuação, contato, UTM, status e notas. Exporta CSV pelo `leadsToCsv` de `src/lib/marketing-lead-export.ts`; a listagem exporta o **recorte filtrado** pela mesma função.

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

## Calculadora de ROI ("Encaminhar calculadora")

Fluxo comercial **self-service**: o interno gera um link público tokenizado definindo **só a validade** (+ identificação interna opcional); a pessoa acessa `/calculadora/[token]` **sem login**, cria os times que quiser, preenche o wizard de 5 passos por time, **monta a própria proposta** (plano, assentos, prazo, na seção "Quanto custa") e envia — é a proposta comercial que ela mesma montou. A aba **Calculadora** do cliente (só interno; `requireInterno` explícito também no detalhe) mostra links, progresso, a proposta montada, o resultado e a timeline.

Dois pontos de entrada: **"Encaminhar calculadora"** no perfil/listagem de clientes (link já atado ao cliente) e **"Gerar calculadora"** ao lado de "Novo cliente" em `/clientes` (link **avulso**, `client_id null`), listado na seção "Calculadoras avulsas" e importável depois para qualquer perfil (`linkCalculatorToClient`, evento `vinculado_a_cliente`; a mesma ação move um link entre clientes). Detalhe da avulsa antes de vincular: `/calculadoras/[linkId]` (redireciona ao detalhe do cliente se já vinculada).

- **Fonte da verdade do racional matemático**: `CALCULADORA_ROI_RACIONAL_CONSOLIDADO_V5.md` (documento externo, "ROI Clarity"). O motor em `src/lib/calculadora/` implementa §4.1–4.12 rigorosamente; o caso de referência §14 (ROI 1,951×, payback 6,15 meses) é teste golden em `calc.test.ts`/`modelo.test.ts`. Divergência código↔documento é incidente — não "corrigir" nenhum dos lados silenciosamente.
- **A proposta vive no `state`, não numa config do interno.** `EstadoCalculadora` (`{ v: 2, prazoMeses, estrutura?, times: [...] }`) é dono dos times (id, nome, proposta, entradas, cenário, trajetória). `assentosEfetivos()` resolve o default: assentos vazios = **os vendedores do time** (cobertura 1, como no §14). Sem `numVendedores` não há número — P6 preservado.
- **Gating por tipo**: `ResultadoTime` é união discriminada; incompleto ⇒ não existem números, o formatador devolve travessão. Nunca resultado parcial, nunca NaN/zero indevido.
- **Token derivado por HMAC** (`src/lib/api/calculator-token.ts`): `HMAC(CALCULATOR_LINK_SECRET, "calc-link:{id}:{versão}")`; o banco guarda só o sha256 do token. "Copiar link" rederiva a URL a qualquer momento; rotação = versão+1. Env nova: `CALCULATOR_LINK_SECRET`.
- **`src/lib/api/calculator-queries.ts` é o 2º consumidor autorizado do service role** (o gate do visitante é o token, não sessão). O proxy faz bypass de `/calculadora` antes do `getUser()`; o autosave (`POST /api/publico/calculadora/[token]/estado`) é same-origin — sem CORS/OPTIONS. Nomes de time são a **única string livre** do visitante: sanitizados em `sanitizarNomeTime` (controle + clamp 60).
- **Status do link é derivado** (`linkStatus`): revogado > expirado > concluído > ativo. Pós-envio o link continua editável até expirar; edições geram evento `editado_pos_envio` coalescido (10 min). Acesso é sessão deduplicada (30 min por link+ip_hash). O evento `enviado` carrega a proposta montada (plano/assentos/prazo/preço).
- **Cenários + sliders**: presets do §4.8 (Conservador default) + modo "parâmetros personalizados"; `deltasEfetivos()` é o único caminho de deltas para o cálculo e clampa tudo pelos tetos do V5 — sliders nunca relaxam travas. Ticket e rampa não têm teto próprio no §5, então `SLIDER_*_MAX` é **derivado de `CENARIOS.otimista`** (nunca literal): o slider não passa do que o documento registra. Ciclo e conversão mantêm os tetos do §5.
- **Consolidado multi-time é sempre ponderado** (Σvalor/Σpreço, invariante 11) — nunca média de ROIs. Editar a trajetória **não** altera ROI/payback (invariante 4: `calcResultadoTime` nem recebe a trajetória).
- **Estrutura de capacitação compartilhada** (§4.11): quando os mesmos gestores atendem vários times, declarar tudo por time contaria a mesma economia N vezes. `estrutura.ts` faz o rateio — **gestores e custos do contrafactual por peso de vendedores; horas por gestor, vendedores por gestor e salário passam inalterados** — como transformação pura ANTES do cálculo, em `computarModelo`. Assim `calc.ts` e `consolidado.ts` não mudam. O fator de escopo é invariante ao rateio (o nº de gestores cancela na fração). É campo **opcional** do estado, mantendo `v: 2`: bumpar a versão faria `parseEstado` descartar o preenchimento de todo link já salvo. Formulários editam o estado **cru** (`estadoTime.entradas`); resultado e gating leem o **derivado**.
- **Nível de serviço**: por assentos (30/100), com **um degrau a mais em contratos de 24 meses** (§4.9). Sem efeito sobre preço — `precoConta` devolve `nivelPorPrazo` para a tela declarar de onde veio o degrau.
- **Sem custo interno no código** (§9 do V5): `constants.ts` da calculadora só tem preço de venda (escada 98/82/70/60, piso R$ 13.000) e premissas declaradas. `PCT_EVENTO_SUBSTITUIVEL = 0,5` é hipótese [H] decidida em 15/08/2026, pendente de ratificação do decisor; faixas de margem (6 + "não sei"→30%) decididas na mesma data.
- Persistência server-side (autosave + eventos) **substitui, só neste fluxo**, a decisão "sem backend" do §8 do V5 (que valia para a ferramenta standalone). LGPD: sem login/e-mail do visitante; IP só como HMAC.
- **A etapa de resultado tem espinha de seções** (`secao-resultado.tsx`), não uma pilha de cards de peso igual: *O resultado → De onde vem o número → Quanto custa → Ao longo de 12 meses*, com `gap-10` entre seções e `gap-4` dentro. Os dois painéis de trajetória vivem num card só, em abas locais (não use `ui/tabs.tsx`: ele sincroniza com `?tab=` pelo router, e a página pública é de estado local). Blocos secundários — extrato do preço, resumo imprimível — usam `BlocoRecolhivel`, que colapsa por `grid-template-rows` e **mantém o conteúdo montado**: `display:none` não sai na impressão.
- **Erratas abertas no V5** (§1.6 da auditoria de 15/08/2026, a numerar E-12…E-14): o documento usa `PCT_EVENTO_SUBSTITUIVEL` sem definir o valor; define margem "por faixas" sem enumerar os valores centrais; e lista a folha de resumo PCO (§10) como especificada, sem que exista no código. Nada disso é divergência de cálculo — é o documento que precisa alcançar o código.

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
- CSV de leads usa `;` + BOM: é o único par que o Excel pt-BR abre em colunas e sem mojibake. Uma coluna por pergunta, deduplicada por id — exportar funis diferentes juntos gera matriz esparsa, mas nenhuma resposta troca de coluna.

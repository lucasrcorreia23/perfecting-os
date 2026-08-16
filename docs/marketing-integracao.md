# Integração do módulo Marketing

Guia prático do que precisa ser feito **no Perfecting OS** e **no site** para que o blog e o funil funcionem ponta a ponta.

O desenho é sempre o mesmo: o OS é a fonte da verdade e expõe uma API REST; o site só lê e escreve através dela. O site **nunca** fala com o Supabase diretamente.

```
┌───────────────────┐        GET  /api/publico/posts            ┌──────────────┐
│                   │  ───────────────────────────────────────▶ │              │
│   Site do blog    │        GET  /api/publico/funis/[slug]      │ Perfecting   │
│  (outro projeto)  │                                            │ OS + Supabase│
│                   │  ◀─────────────────────────────────────    │              │
└───────────────────┘        POST /api/publico/funis/…/respostas └──────────────┘
```

---

# Parte 1 — No produto (Perfecting OS)

## 1.1 Aplicar a migration

O módulo tem tabelas próprias. Sem isso nada funciona.

```bash
supabase db push
```

Ou, sem o CLI: abra o **SQL Editor** do dashboard do Supabase e cole o conteúdo de `supabase/migrations/0008_marketing.sql`.

O que ela cria:

| Objeto | Para quê |
|---|---|
| `marketing_posts` | posts do blog |
| `marketing_funnels` | funis (rascunho editável) |
| `marketing_funnel_versions` | schema congelado de cada publicação |
| `marketing_leads` | respostas recebidas do site |
| bucket `marketing-media` | imagens de capa e do corpo dos posts (público, 5 MB, só imagens) |

Todas com RLS ligada e acessíveis apenas ao papel `interno`. **Nenhuma policy para `anon`** — o site não acessa o banco.

**Conferir se deu certo:** no SQL Editor,

```sql
select count(*) from public.marketing_posts;              -- deve retornar 0, não erro
select id, public from storage.buckets where id = 'marketing-media';  -- deve retornar 1 linha, public = true
```

## 1.2 Preencher as variáveis de ambiente

Copie o bloco do `.env.local.example` para o seu `.env.local` (e para as variáveis do ambiente de produção, ex.: Vercel).

```bash
SUPABASE_SERVICE_ROLE_KEY=...
MARKETING_API_TOKEN=...
MARKETING_PUBLIC_TOKEN=...
MARKETING_ALLOWED_ORIGINS=https://perfecting.com.br,http://localhost:3001
MARKETING_IP_SALT=...
NEXT_PUBLIC_MARKETING_SITE_URL=https://perfecting.com.br
```

| Variável | Onde conseguir | Cuidado |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard Supabase → Settings → API → `service_role` | **Ignora RLS.** Nunca prefixe com `NEXT_PUBLIC_`, nunca mande para o site, nunca comite |
| `MARKETING_API_TOKEN` | você gera | Fica **só no servidor** do site |
| `MARKETING_PUBLIC_TOKEN` | você gera | Pode ir ao browser; só serve para enviar respostas, e só da origem permitida |
| `MARKETING_ALLOWED_ORIGINS` | origens do site, separadas por vírgula | Sem barra no final. Inclua o localhost do site em dev |
| `MARKETING_IP_SALT` | você gera | Anonimiza o IP de quem envia o formulário (LGPD) |
| `NEXT_PUBLIC_MARKETING_SITE_URL` | URL pública do site | Só monta prévias e links dentro do OS |

Gerando os três segredos:

```bash
openssl rand -hex 32   # rode uma vez para cada
```

> Enquanto `SUPABASE_SERVICE_ROLE_KEY` ou `MARKETING_API_TOKEN` faltarem, **todos os endpoints respondem `503`** de propósito — é a trava para não subir a API pela metade.

**Conferir se deu certo:**

```bash
curl -i http://localhost:3000/api/publico/posts
# esperado: 401 unauthorized (e NÃO 503)

curl -i -H "Authorization: Bearer $MARKETING_API_TOKEN" http://localhost:3000/api/publico/posts
# esperado: 200 com {"data":[],"meta":{"total":0,...}}
```

## 1.3 Publicar um post

`Marketing → Blog → Novo post`.

1. **Novo post** pede só o título; o post nasce **rascunho** e o slug é gerado a partir do título.
2. Aba **Conteúdo**: título, slug, resumo e o corpo em Markdown (alterne entre *Escrever* e *Visualizar*). Para inserir uma **imagem no meio do texto**, use o botão de foto da barra, cole do clipboard ou arraste o arquivo para dentro do editor: ela sobe para `marketing-media/posts/{id}/corpo/` e o editor escreve `![alt](url)` — a URL é pública e absoluta, então o site não precisa de nada além de saber renderizar a imagem do markdown. Edite o texto entre `![` e `]`: é o alternativo que vai para o leitor de tela. **Os títulos do corpo começam em `##`** — o `#` é do título do post, que o site renderiza como o `<h1>` da página; a barra do editor já insere `##`/`###` e avisa (com um botão de rebaixar) se sobrar algum `#`.
3. Aba **SEO e capa**: capa (arraste a imagem), texto alternativo, título e descrição de SEO com contador 60/160, URL canônica, `noindex` e tags.
4. Aba **Publicação**: data e hora, no horário de Brasília.
5. **Salvar** e depois **Publicar**.

Os quatro estados possíveis:

| Estado | Significa | Aparece no site? |
|---|---|---|
| Rascunho | ainda não publicado | não |
| Agendado | publicado com data **futura** | não, até a data chegar |
| Publicado | data já passou | sim |
| Arquivado | tirado do ar, mas preserva a data e o histórico | não |

Detalhes que importam:

- **Não existe cron.** Um post agendado entra no ar porque o site revalida o cache de tempos em tempos (ver §2.3). Se o site não revalidar, o post nunca aparece.
- **O slug trava depois de publicar.** Mudar quebra a URL e a SEO acumulada — dá para destravar, mas o modal avisa o custo.
- **HTML executável é recusado no salvamento** (`<script>`, `<iframe>`, `javascript:`, `on*=`). O corpo é Markdown puro.
- Para tirar um post do ar mantendo a data e a URL histórica, use **Arquivar**, não *Voltar a rascunho*.

## 1.4 Criar e publicar um funil

`Marketing → Funis → Novo funil`.

**Aba Perguntas.** Cada pergunta tem enunciado, tipo, ajuda, obrigatoriedade, peso e — se for de escolha — as opções com seus pontos.

| Tipo | Resposta esperada | Pontua? |
|---|---|---|
| Texto curto / Texto longo | texto livre | não |
| E-mail | e-mail válido | não |
| Telefone | telefone | não |
| Número | número | não |
| Escolha única | uma opção | sim — pontos da opção escolhida |
| Escolha múltipla | várias opções | sim — soma das opções escolhidas |
| Escala | inteiro entre mínimo e máximo | sim — o próprio valor |

O campo **Vincular ao lead** (`maps_to`) é o que faz a conversão em cliente funcionar sem adivinhação: marque qual pergunta é o nome, o e-mail, o telefone, a empresa e o cargo. Cada um só pode ser usado uma vez, e *E-mail* exige uma pergunta do tipo E-mail.

**Aba Pontuação.** Define a partir de qual percentual da pontuação máxima o lead vira *morno* e *quente*. Os limiares são inclusivos: bater exatamente no valor já entra na faixa de cima.

**Aba Configurações.** Slug (é o que o site usa na URL), descrição, texto do botão, mensagem de sucesso e URL de redirecionamento.

**Publicar** congela o questionário numa versão imutável (`v1`, `v2`, …). A partir daí:

- o site passa a receber **essa versão**;
- editar o rascunho **não** muda o que o site vê, até você publicar de novo;
- leads antigos continuam ligados à versão que responderam — a folha de respostas nunca muda de significado retroativamente.

Antes de integrar, abra **Ver JSON do site**: ele mostra a URL do endpoint e o JSON exato que o site vai receber. É o contrato para quem for implementar o formulário.

> Pesos, pontos e `maps_to` **nunca** saem do OS. Se saíssem, o visitante aprenderia a se auto-qualificar como "quente".

## 1.5 Trabalhar os leads

`Marketing → Leads`. Busca por nome/e-mail/empresa e filtros por funil, status e faixa de qualificação.

- **Ver respostas** abre a ficha com as perguntas na ordem da versão congelada, a resposta de cada uma e os pontos que ela rendeu.
- **Status** (novo, em contato, qualificado, descartado) é manual. *Convertido* é automático.
- **Converter em cliente** abre um formulário já preenchido pelos campos vinculados. Ao confirmar, cria o cliente no workflow **com o cronograma da etapa já semeado**, registra o evento `cliente_criado` e marca o lead como convertido com link para o cliente.

---

# Parte 2 — No site

## 2.1 Variáveis de ambiente do site

```bash
PERFECTING_API_URL=https://os.perfecting.com.br          # servidor apenas
PERFECTING_API_TOKEN=<mesmo valor de MARKETING_API_TOKEN> # servidor apenas — NUNCA no browser
NEXT_PUBLIC_PERFECTING_PUBLIC_TOKEN=<mesmo valor de MARKETING_PUBLIC_TOKEN>
NEXT_PUBLIC_PERFECTING_API_URL=https://os.perfecting.com.br
```

Por que dois tokens: as leituras acontecem no servidor do site (onde um segredo é seguro); o envio do formulário acontece no browser do visitante (onde nenhum segredo sobrevive). O token publicável só serve para enviar respostas, e só de uma origem que esteja em `MARKETING_ALLOWED_ORIGINS`.

E lembre de **adicionar a origem do site** em `MARKETING_ALLOWED_ORIGINS` no OS — inclusive o `http://localhost:PORTA` que você usa em desenvolvimento.

## 2.2 Endpoints

Todas as respostas usam o mesmo envelope:

```jsonc
{ "data": … , "meta": … }                                  // sucesso
{ "error": { "code": "…", "message": "…", "field": "…" } }  // erro (message em pt-BR)
```

### `GET /api/publico/posts`

Lista os posts publicados, do mais recente para o mais antigo.

- Header: `Authorization: Bearer <PERFECTING_API_TOKEN>`
- Query: `limit` (1–50, padrão 20) · `offset` (padrão 0) · `tag` (slug, opcional)

```json
{
  "data": [
    {
      "slug": "como-treinar-times-com-ia",
      "title": "Como treinar times com IA",
      "excerpt": "Um resumo curto…",
      "tags": ["ia", "treinamento"],
      "cover": { "url": "https://…/marketing-media/posts/…/capa.webp", "alt": "Equipe reunida" },
      "published_at": "2026-08-01T12:00:00.000Z",
      "updated_at": "2026-08-02T09:10:00.000Z",
      "reading_minutes": 6
    }
  ],
  "meta": { "total": 42, "limit": 20, "offset": 0 }
}
```

`cover` é `null` quando o post não tem capa. **`body_md` não vem na lista** — use o endpoint de detalhe.

### `GET /api/publico/posts/[slug]`

Os mesmos campos, mais:

```json
{
  "data": {
    "…": "…",
    "body_md": "## Título\n\nParágrafo…",
    "seo": {
      "title": "Como treinar times com IA",
      "description": "Um resumo curto…",
      "canonical_url": null,
      "noindex": false
    },
    "author": { "name": "Lucas" }
  }
}
```

`seo.title` e `seo.description` já vêm resolvidos e truncados (60/160): se o autor não preencheu os campos de SEO, caem para título/resumo/corpo. É só jogar nas meta tags.

Responde **`404` idêntico** para post inexistente, rascunho, arquivado ou agendado — de propósito, para não revelar a existência de conteúdo não publicado.

### `GET /api/publico/funis/[slug]`

```json
{
  "data": {
    "slug": "diagnostico-comercial",
    "name": "Diagnóstico comercial",
    "description": "Responda em 2 minutos.",
    "version": 3,
    "submit_label": "Quero meu diagnóstico",
    "success_message": "Recebemos suas respostas…",
    "redirect_url": null,
    "questions": [
      {
        "id": "q_8f2a1c",
        "type": "escolha_unica",
        "label": "Qual o tamanho do time comercial?",
        "help": null,
        "required": true,
        "placeholder": null,
        "options": [
          { "id": "o_11", "label": "1 a 10" },
          { "id": "o_12", "label": "11 a 50" }
        ],
        "scale": null
      },
      {
        "id": "q_c40b77",
        "type": "escala",
        "label": "Quão maduro é o processo hoje?",
        "help": "1 = inexistente, 10 = maduro",
        "required": true,
        "placeholder": null,
        "options": [],
        "scale": { "min": 1, "max": 10, "min_label": "Inexistente", "max_label": "Maduro" }
      }
    ]
  }
}
```

**Guarde o `version`** — ele precisa voltar no envio.

### `POST /api/publico/funis/[slug]/respostas`

Autenticação: `Authorization: Bearer <token secreto>` **ou** `X-Perfecting-Token: <token publicável>` com `Origin` na allowlist.

```json
{
  "version": 3,
  "answers": {
    "q_8f2a1c": "o_12",
    "q_c40b77": 7,
    "q_e19d02": "ana@empresa.com",
    "q_a71f55": ["o_31", "o_34"]
  },
  "source_url": "https://perfecting.com.br/diagnostico",
  "utm": { "source": "google", "medium": "cpc", "campaign": "poc-2026" },
  "elapsed_ms": 18400,
  "hp": ""
}
```

Formato de cada resposta, por tipo:

| `type` | Valor em `answers` |
|---|---|
| `texto_curto`, `texto_longo` | string, até 2000 caracteres |
| `email` | string com e-mail válido |
| `telefone` | string, 8–20 caracteres (dígitos, espaços, `+ ( ) . -`) |
| `numero` | número |
| `escolha_unica` | o **`id`** da opção (não o texto) |
| `escolha_multipla` | array de `id`s, sem repetição |
| `escala` | inteiro entre `scale.min` e `scale.max` |

Perguntas opcionais podem ser omitidas. Chaves desconhecidas são ignoradas em silêncio.

Resposta `201`:

```json
{ "data": { "id": "b1e…", "success_message": "Recebemos suas respostas…", "redirect_url": null } }
```

Use o `success_message` e o `redirect_url` que vieram na resposta — assim o marketing muda o texto no OS sem precisar de deploy do site. **Pontuação e qualificação nunca são devolvidas.**

### Erros

| HTTP | `code` | O que fazer |
|---|---|---|
| 400 | `invalid_query` | corrigir `limit`/`offset`/`tag` |
| 400 | `invalid_body` | JSON malformado, ou `version` ausente/inválida |
| 400 | `validation_failed` | mostrar `message` no campo indicado por `field` (é o `id` da pergunta) |
| 401 | `unauthorized` | token ausente ou errado |
| 403 | `origin_not_allowed` | a origem do site não está em `MARKETING_ALLOWED_ORIGINS` |
| 404 | `not_found` | funil/post inexistente ou não publicado |
| 409 | `version_mismatch` | o cache do site está velho — rebuscar o funil e reenviar |
| 429 | `rate_limited` | respeitar o header `Retry-After` |
| 503 | `service_unavailable` | falta env no OS |
| 500 | `internal_error` | tentar de novo |

## 2.3 Leitura do blog (server-side)

```ts
// site/lib/perfecting.ts — SERVER ONLY
const BASE = process.env.PERFECTING_API_URL!;
const TOKEN = process.env.PERFECTING_API_TOKEN!;

async function get(path: string, revalidate: number) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    next: { revalidate },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

export async function getPosts(limit = 20, offset = 0) {
  const json = await get(`/api/publico/posts?limit=${limit}&offset=${offset}`, 60);
  return json ?? { data: [], meta: { total: 0 } };
}

export async function getPost(slug: string) {
  const json = await get(`/api/publico/posts/${slug}`, 60);
  return json?.data ?? null;
}

export async function getFunnel(slug: string) {
  const json = await get(`/api/publico/funis/${slug}`, 300);
  return json?.data ?? null;
}
```

> ### `revalidate` não é opcional
>
> **Não existe cron no OS.** Um post agendado para as 15:00 não dispara nada às 15:00 — ele simplesmente passa a ser devolvido pela API a partir daquele instante. Se o site cachear para sempre e revalidar só sob demanda (webhook), o post agendado **nunca aparece**.
>
> Por isso a API responde `Cache-Control: no-store`: quem cacheia é o site. Use `revalidate: 60` no blog. O atraso máximo entre a hora agendada e o post no ar passa a ser o valor que você escolher aqui.

Página de post com metadados:

```tsx
// site/app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getPost } from "@/lib/perfecting";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.seo.title,
    description: post.seo.description,
    alternates: post.seo.canonical_url ? { canonical: post.seo.canonical_url } : undefined,
    robots: post.seo.noindex ? { index: false } : undefined,
    openGraph: {
      title: post.seo.title,
      description: post.seo.description,
      images: post.cover ? [{ url: post.cover.url, alt: post.cover.alt ?? "" }] : [],
      type: "article",
      publishedTime: post.published_at,
    },
  };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  // …renderizar post.body_md (ver §2.4)
}
```

## 2.4 Renderizar o Markdown — **sanitize obrigatório**

A API devolve `body_md` **cru**. O OS já recusa HTML executável no salvamento, mas essa é a segunda linha de defesa, não a primeira. Se o site fizer `dangerouslySetInnerHTML` sem sanitizar, qualquer conta interna comprometida vira XSS armazenado no site público.

```bash
npm install react-markdown remark-gfm rehype-sanitize
```

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
  {post.body_md}
</ReactMarkdown>
```

O subconjunto que o editor do OS suporta e pré-visualiza:

`# … ######` · parágrafos · `**negrito**` · `*itálico*` / `_itálico_` · `` `código` `` · cercas ``` com linguagem · listas `-` e `1.` · `> citação` · `[texto](url)` · `![alt](url)` · `---`

Não suportados na prévia do OS: HTML bruto (vira texto), tabelas, notas de rodapé e listas aninhadas. O renderizador do site pode ser um superconjunto — só saiba que o autor não vê a prévia desses casos.

`title`, `excerpt` e `cover.alt` vão para meta tags: **escape os atributos** (uma aspa dupla no texto quebra a tag `og:description`).

## 2.5 Formulário do funil (browser)

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

export function FunnelForm({ funnel }) {
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [sending, setSending] = useState(false);
  const mountedAt = useRef(Date.now());

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setError(null);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_PERFECTING_API_URL}/api/publico/funis/${funnel.slug}/respostas`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Perfecting-Token": process.env.NEXT_PUBLIC_PERFECTING_PUBLIC_TOKEN,
        },
        body: JSON.stringify({
          version: funnel.version,
          answers,
          source_url: window.location.href,
          utm: utmFromUrl(),
          elapsed_ms: Date.now() - mountedAt.current,
          hp: event.currentTarget.hp.value,   // honeypot
        }),
      },
    );

    const json = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(json.error.message);   // json.error.field aponta a pergunta
      return;
    }
    if (json.data.redirect_url) {
      window.location.href = json.data.redirect_url;
      return;
    }
    setDone(json.data.success_message);
  }

  if (done) return <p>{done}</p>;

  return (
    <form onSubmit={submit}>
      {funnel.questions.map((q) => (
        <Question
          key={q.id}
          question={q}
          value={answers[q.id]}
          onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
        />
      ))}

      {/* Honeypot: invisível para humanos, preenchido por bots. */}
      <input
        name="hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px" }}
      />

      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={sending}>
        {sending ? "Enviando…" : funnel.submit_label}
      </button>
    </form>
  );
}

function utmFromUrl() {
  const p = new URLSearchParams(window.location.search);
  const utm = {};
  for (const k of ["source", "medium", "campaign", "term", "content"]) {
    const v = p.get(`utm_${k}`);
    if (v) utm[k] = v;
  }
  return utm;
}
```

Três detalhes que fazem diferença:

1. **O honeypot precisa existir de verdade.** Um campo escondido chamado `hp`, vazio para humanos. Se vier preenchido, o OS responde `201` de sucesso e **não grava nada** — o bot não recebe sinal para calibrar.
2. **`elapsed_ms` é o tempo desde que o formulário montou.** Envios abaixo de 1,5 s recebem o mesmo `201` falso.
3. **`Content-Type: application/json` + header custom sempre gera preflight `OPTIONS`.** Já está tratado no OS, mas é por isso que a origem precisa estar na allowlist: sem ela o browser reporta um erro de CORS genérico.

Limites de envio por IP: **5 por minuto** e **20 por hora**. Ao receber `429`, respeite o `Retry-After`.

O `type` de cada pergunta mapeia direto para o controle:

| `type` | Controle sugerido | O que mandar |
|---|---|---|
| `texto_curto` | `<input type="text">` | string |
| `texto_longo` | `<textarea>` | string |
| `email` | `<input type="email">` | string |
| `telefone` | `<input type="tel">` | string |
| `numero` | `<input type="number">` | `Number(valor)` |
| `escolha_unica` | radios ou `<select>` | `option.id` |
| `escolha_multipla` | checkboxes | array de `option.id` |
| `escala` | radios de `scale.min` a `scale.max`, ou slider | inteiro |

Use `question.label`, `question.help`, `question.required` e `question.placeholder` como vieram — assim o marketing edita o texto no OS sem deploy do site.

---

# Checklist

**No OS, uma vez**

- [ ] `supabase db push` (ou colar a `0008_marketing.sql` no SQL Editor)
- [ ] Preencher as 6 variáveis em `.env.local` **e** no ambiente de produção
- [ ] `curl` no `/api/publico/posts` → `401` (e não `503`)
- [ ] Adicionar a origem do site — produção e localhost — em `MARKETING_ALLOWED_ORIGINS`

**No site, uma vez**

- [ ] Definir `PERFECTING_API_URL` e `PERFECTING_API_TOKEN` (só servidor)
- [ ] Definir `NEXT_PUBLIC_PERFECTING_API_URL` e `NEXT_PUBLIC_PERFECTING_PUBLIC_TOKEN`
- [ ] Criar o cliente de leitura com **`next: { revalidate: 60 }`**
- [ ] Rotas `/blog` e `/blog/[slug]`, com metadados vindos de `post.seo`
- [ ] Renderizar `body_md` **com sanitização**
- [ ] Rota do funil consumindo `GET /api/publico/funis/[slug]`
- [ ] Formulário com honeypot `hp` e `elapsed_ms`, enviando `version` de volta

**A cada post**

- [ ] Escrever, subir capa (e as imagens do corpo) e preencher SEO no OS
- [ ] Definir data e hora → **Publicar**
- [ ] Conferir no site depois de uma janela de revalidação

**A cada mudança no funil**

- [ ] Editar as perguntas → **Salvar** → **Publicar** (gera a próxima versão)
- [ ] Se você adicionou ou removeu perguntas, confirmar que o formulário do site continua renderizando todos os tipos
- [ ] Enviar um teste e conferir a pontuação em `Marketing → Leads`

---

# Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `503 service_unavailable` em tudo | falta `SUPABASE_SERVICE_ROLE_KEY` ou `MARKETING_API_TOKEN` no OS | preencher e reiniciar o servidor |
| `401` mesmo com token | token do site ≠ `MARKETING_API_TOKEN` do OS, ou header sem o prefixo `Bearer ` | comparar os valores |
| Erro de CORS genérico no browser | origem do site fora de `MARKETING_ALLOWED_ORIGINS` (o servidor responde `403 origin_not_allowed`) | incluir a origem exata, sem barra no final |
| Post publicado não aparece no site | cache do site ainda não revalidou, ou `revalidate` ausente | esperar a janela; garantir `next: { revalidate: 60 }` |
| Post agendado nunca aparece | site cacheando para sempre (`revalidate: false`) | **não existe cron** — o site precisa revalidar periodicamente |
| `404` num post que existe | está em rascunho, arquivado, ou agendado para o futuro | conferir o estado no OS |
| `404` no funil | funil em rascunho/arquivado, ou nunca publicado | publicar o funil |
| `409 version_mismatch` | o site está com um `version` de uma publicação que não existe | rebuscar o funil antes de enviar |
| Envio some sem erro (`201` mas nada em Leads) | honeypot preenchido, ou `elapsed_ms < 1500` | conferir se o campo `hp` está de fato escondido e vazio |
| `400 validation_failed` | resposta fora do formato — quase sempre mandar o **texto** da opção em vez do `id` | usar `option.id` |
| `429` | 5 envios/min ou 20/h do mesmo IP | respeitar o `Retry-After` |
| Lead chega sem nome/e-mail | nenhuma pergunta tem **Vincular ao lead** | marcar o `maps_to` das perguntas e **publicar** de novo |
| Imagem de capa não carrega no site | domínio do Supabase não está nas `images.remotePatterns` do site | liberar o host, ou usar `<img>` |
| Imagem do corpo aparece no OS e some no site | o renderizador de markdown do site descarta `![alt](url)`, ou a sanitização derruba a tag | tratar `image` no renderizador e manter `img` com `src`/`alt` na allowlist |

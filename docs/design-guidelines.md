# Diretrizes de Design — Sistema Perfecting

Guia portátil de design, iconografia e padrões de produto. Todos os valores são
concretos (hex, px, classes) para poderem ser reutilizados **em outro produto**
sem depender do código-fonte original. Stack de referência: **Tailwind CSS 4 +
HeroUI 2.8 + Heroicons 2**, mas os tokens (cores, raios, sombras, espaçamentos)
são agnósticos de framework.

> Filosofia visual: **flat, claro, sóbrio e orgânico**. Superfícies brancas,
> bordas finas cinza-slate, cantos generosos (16px) com controles em pill
> (`rounded-full`), uma única cor de marca azul usada com parcimônia, e
> movimento contido. Nada de "glass morphism" pesado ou sombras dramáticas —
> hierarquia vem de espaço, peso tipográfico e da cor de marca pontual.

---

## 1. Cor

### Marca

| Token | Hex | Uso |
|---|---|---|
| Primária | `#2E63CD` | Ações primárias, links, aba ativa, foco, dados da marca |
| Primária (hover) | `#3A71DB` | Hover de superfícies primárias |
| Primária (link hover) | `#1E4A9E` | Hover de links textuais primários |
| Primary glow | `rgba(46, 99, 205, 0.3)` | Halos/brilhos suaves da marca |

A cor de marca é **restrita e intencional**. A maior parte da UI é branco +
cinza; o azul aparece só onde importa (CTA principal, estado ativo, foco, número
de destaque). Nunca preencher blocos grandes de azul.

### Neutros (escala Slate)

O produto usa a escala **Slate** do Tailwind como neutro único (nunca gray/zinc):

| Papel | Cor |
|---|---|
| Fundo da app | `#f9f9f9` |
| Texto principal | `#0f172a` (slate-900) |
| Texto de corpo | slate-700 / slate-800 |
| Texto secundário/legenda | slate-500 / slate-400 |
| Bordas | slate-200 (padrão), slate-300 (hover/ênfase) |
| Fundo de header de tabela / hover sutil | slate-50 |
| Hover de item de menu | slate-100/75 |

### Semânticas — Tendência / evolução

Para variação (KPIs, deltas percentuais). **Não** usar `emerald`/`rose` ad-hoc:

| Token | Hex |
|---|---|
| Positivo | `#0F9F2E` |
| Negativo | `#9F0F0F` |
| Neutro/estável | `#94A3B8` |

### Semânticas — Estado

| Estado | Cor base | Uso |
|---|---|---|
| Destrutivo (sólido) | `#DC2626` (hover `#B91C1C`) | Botão perigo |
| Destrutivo (sutil) | `red-600` texto / `red-50` fundo | Item de menu "Excluir/Sair" |
| Alerta/aviso | fundo `#FFFBEB`, texto `#973C00` | Chips "Em breve", banners |

### Paleta categórica (buckets/etiquetas)

Paleta curada para categorizar itens (ex.: grupos, containers, tags). Escolher
por swatch, com fallback grafite (`#94A3B8`) quando ausente:

| Nome | Hex |
|---|---|
| Azul | `#2E63CD` |
| Violeta | `#7C3AED` |
| Verde | `#0F9F2E` |
| Âmbar | `#D97706` |
| Rosa | `#E11D48` |
| Ciano | `#0891B2` |
| Magenta | `#DB2777` |
| Grafite | `#475569` |

**Padrão de acento** a partir de uma cor categórica: barra/dot sólido na cor
cheia; fundo tingido a `alpha 0.08`; borda a `alpha 0.35`; wash em gradiente na
base do card a `alpha 0.22 → 0`. Isso mantém a cor legível sem "gritar".

---

## 2. Tipografia

- **Fonte de UI**: **Inter** (`--font-inter`), pesos 400/500/600. Base do body:
  **14px**.
- **Fonte de display** (opcional, momentos "hero"/marca): serifa condensada
  (ex.: *Libre Caslon Condensed*) em 400/600/700. Usar só em telas de celebração
  ou títulos de marca — não em UI corrente.
- **Números grandes (KPIs)** usam tipografia fluida com `clamp()`:
  - `--text-score-lg`: `clamp(2.25rem, 1.75rem + 2.5vw, 3rem)`
  - `--text-score-md`: `clamp(1.75rem, 1.5rem + 1.25vw, 2.25rem)`
- **Números em tabelas/deltas**: usar `tabular-nums` para alinhamento vertical.

### Escala de texto prática (Tailwind)

| Papel | Classe | Detalhe |
|---|---|---|
| Título de página | `text-xl`/`text-2xl font-semibold` | slate-900 |
| Corpo | `text-sm` | slate-700/800 |
| Label de campo | `text-sm font-medium text-slate-700` | |
| Ajuda/descrição | `text-xs text-slate-500` | logo abaixo do label |
| Título de seção (form) | `text-xs font-semibold uppercase tracking-wide text-slate-500` | |
| Header de tabela | `text-xs font-semibold uppercase tracking-wider text-slate-600` | |
| Link textual | 13px (`--link-font-size: 0.8125rem`) | |

---

## 3. Espaçamento & Layout

### Regra de ouro: nunca `space-y-*`

Empilhamento vertical usa **sempre** `flex flex-col gap-*`. Vale para qualquer
coluna. (`space-y` cria quirks de margem e quebra em telas condicionais.)

### Espaçamento fluido (escala com o viewport)

```
--space-xs: clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem);
--space-sm: clamp(0.5rem,  0.4rem + 0.5vw,  0.75rem);
--space-md: clamp(0.75rem, 0.6rem + 0.75vw, 1.25rem);
--space-lg: clamp(1rem,    0.8rem + 1vw,    1.5rem);
--space-xl: clamp(1.5rem,  1.2rem + 1.5vw,  2.5rem);
```

Gaps corriqueiros: `gap-4` (16px) entre cards/campos, `gap-6` (24px) entre
seções. Container de página de formulário: `max-w-3xl mx-auto flex flex-col gap-6`.

---

## 4. Cantos arredondados (raio)

Sobrescrever os defaults do Tailwind para este mapeamento. **Cuidado**: o
`rounded` sem sufixo continua 4px nativo — **evitar** e sempre usar o sufixo.

| Classe | Valor | Uso |
|---|---|---|
| `rounded-sm` | **16px** | Default de containers: cards, tabelas, zona de upload, textarea |
| `rounded-md` | **20px** | Containers médios (painel de abas, modais, popovers) |
| `rounded-lg` | **28px** | Só containers grandes |
| `rounded-full` | — | **Todos os controles** (botões, inputs, selects, busca, itens de menu, chips) + avatares, dots, círculos de ícone |

Config (Tailwind 4 `@theme inline`):
```css
--radius-sm: 16px;
--radius-md: 20px;
--radius-lg: 28px;
```

---

## 5. Bordas & Superfícies

### Card / superfície padrão (flat)

O bloco base de conteúdo. Substitui qualquer "glass/blur" legado:

```
bg-white rounded-sm border border-slate-200
```

Aplicar em tabelas, resumos, painéis, containers de conteúdo. Quando precisar
recortar cantos internos: adicionar `overflow-hidden`.

### Tokens de borda

```
--border-card:            rgba(226, 232, 240, 0.75);  /* slate-200 ~ */
--border-secondary:       rgba(226, 232, 240, 0.75);
--border-secondary-hover: rgba(203, 213, 225, 0.95);  /* slate-300 ~ */
```

---

## 6. Elevação (sombras)

Sombras discretas — hierarquia vem de borda + espaço, não de sombra pesada.

```
--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
--shadow-md: 0 6px 16px -4px rgba(15, 23, 42, 0.12), 0 2px 6px -2px rgba(15, 23, 42, 0.08);
--shadow-lg: 0 18px 36px -12px rgba(46, 99, 205, 0.18), 0 6px 14px -6px rgba(15, 23, 42, 0.10);
```

Consumir via `shadow-[var(--shadow-md)]`. `--shadow-lg` tem leve tint da primária
(para hover de elementos elevados, popovers).

---

## 7. Iconografia

- **Biblioteca**: **Heroicons 2** (24px). Estilos:
  - **`24/outline`** = padrão (≈78% do uso). Toda UI corrente, navegação, ações.
  - **`24/solid`** = acento/ênfase pontual (ícone preenchido em estados ativos,
    badges, destaques). Nunca misturar outline+solid no mesmo agrupamento.
- **Tamanhos** (largura = altura, sempre quadrado):
  - `w-4 h-4` (16px) — inline com texto, ícones de busca, chips, deltas.
  - `w-5 h-5` (20px) — botões, itens de menu, back button.
  - `w-6 h-6` (24px) — cabeçalhos, círculos de ícone maiores.
- **Cor**: herda `currentColor`. Ícone neutro `text-slate-400/500`; ativo/marca
  `text-[#2E63CD]`; sempre `aria-hidden` quando decorativo.
- **Traço**: outline em stroke ~1.5px (default do Heroicons). Não reescalar o
  stroke manualmente.

### Ícones canônicos por conceito (vocabulário do produto)

| Conceito | Ícone |
|---|---|
| Adicionar / criar | `PlusIcon` |
| Expandir / colapsar | `ChevronDown/Up/RightIcon` |
| Voltar / avançar | `ArrowLeft/RightIcon` |
| Excluir | `TrashIcon` |
| Editar | `PencilSquareIcon` |
| Buscar | `MagnifyingGlassIcon` |
| Fechar | `XMarkIcon` |
| Confirmar / sucesso | `CheckIcon` / `CheckCircleIcon` |
| Alerta / perigo | `ExclamationTriangleIcon` |
| Informação / ajuda | `InformationCircleIcon` |
| Métricas / analytics | `ChartBarIcon`, `PresentationChartLine/BarIcon` |
| IA / destaque / "mágica" | `SparklesIcon` |
| Conversa / diálogo | `ChatBubbleLeftRightIcon` |
| Aprendizado / trilha | `AcademicCapIcon` |
| Documento / conteúdo | `DocumentTextIcon` |
| Tempo / duração | `ClockIcon`, `CalendarDaysIcon` |
| Usuário | `UserCircleIcon` |
| Gamificação / ranking | `TrophyIcon` |
| Tendência ↑/↓ | `ArrowTrendingUp/DownIcon`, `MinusSmallIcon` (estável) |

> Consistência acima de variedade: reutilizar o ícone canônico de um conceito em
> vez de introduzir um novo símbolo para a mesma ideia.

---

## 8. Componentes & Padrões

### 8.1 Botões

Quatro variantes, todas **pill** (`rounded-full`), `font-medium`:

| Variante | Aparência | Uso |
|---|---|---|
| **Primary** | Gradiente azul `145deg #3d75dd → #2e63cd`, borda branca sutil, sheen inset. Hover = `brightness(1.07) saturate(1.04)` (brilho contido no botão, sem sombra externa cortável). | Ação principal única por vista |
| **Secondary** | `bg-white`, texto `#0f172a`, borda slate-200. Hover fundo `#f8fafc` + borda slate-300. | Ações secundárias |
| **Tertiary** | Texto azul `#2E63CD`, sem borda/fundo. Hover `#1e4a9e`. | Ação estilo link |
| **Danger** | Sólido `#DC2626` (hover `#B91C1C`), texto branco. | Confirmar destruição |

Estados: `:disabled` → fundo `#94A3B8` (primary/danger) ou `opacity-0.7`
(secondary), `cursor: not-allowed`. Transições ~160–200ms `ease`.

> **CTA de momento "aha"** (celebração/upgrade): variante especial com gradiente
> de 3 paradas e ângulo animável (167deg → 315deg no hover via `@property`), com
> glow azul mais forte. Reservar para momentos de conversão, não para UI diária.

### 8.2 Botão outline com "bloom" no ícone (hover)

Para **navegação secundária onde o ícone é protagonista** (ex.: card "Ver
todos"). Repouso outline branco, seta preta; o azul fica **restrito ao círculo do
ícone** — nunca preenche o botão inteiro. No hover, um gradiente radial azul
"floresce" do centro desfocado até ficar nítido, e a seta vira branca.

Estrutura (3 partes):
- **Container**: `group ... bg-white rounded-sm border border-slate-200 transition-colors hover:border-slate-300`
- **Círculo do ícone**: `relative w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-200 group-hover:border-transparent`
- **Overlay do bloom** (`<span aria-hidden>` dentro do círculo): `pointer-events-none absolute inset-0 scale-50 opacity-0 blur-[6px] bg-[radial-gradient(circle_at_center,#4a81eb_0%,#2e63cd_75%)] transition-all duration-[450ms] ease-out group-hover:scale-110 group-hover:opacity-100 group-hover:blur-0`. A seta acima (`relative z-[1]`) com `group-hover:text-white`.

### 8.3 Back button (voltar)

Padrão único: círculo **44×44**, `rounded-full`, `bg-white`, borda card, ícone
`ArrowLeftIcon` 20px slate-600 → hover slate-900 + `bg-slate-50`. Foco:
`focus-visible:ring-2 ring-primary/35`. Usar sempre em vez de `<Link>` + ícone
inline.

### 8.4 Link textual

13px, `font-medium`, sem sublinhado em repouso. Duas variantes:
- **Primary** (azul da marca): navegação entre fluxos principais (login↔signup).
- **Secondary** (grafite `#1e293b`): ações de recuperação ("Esqueci a senha").

Afordância de hover: `underline` (offset 3px, padrão) ou `opacity` (`hover:opacity-70`).
Foco: `focus-visible:ring-2 ring-primary`.

### 8.5 Cards / superfícies

Ver §5. Sempre `bg-white rounded-sm border border-slate-200`. Sem blur.

### 8.6 Tabelas / listas

Todas as listagens compartilham o mesmo visual:

- **Outer**: `bg-white rounded-sm border border-slate-200 overflow-hidden`.
- **Header row**: `bg-slate-50 border-b border-slate-200`.
- **Header text**: `text-xs font-semibold uppercase tracking-wider text-slate-600`, padding `px-4 py-2.5` (`px-5` em tabelas densas).
- **Linhas**: `px-4 py-4 h-14` (56px), `text-sm font-medium text-slate-800`, **sem** border-b entre linhas (a faixa do header + proximidade organizam).
- Tabelas com 4+ colunas precisam de alternativa mobile: cards (`md:hidden`) + tabela (`hidden md:block`).

### 8.7 Campos de busca (search input)

Fundo **branco**, borda slate-200, `rounded-full` (pill), foco `focus-within:border-[#2E63CD]/40`.
Composição: `<div box>` + `MagnifyingGlassIcon` (`w-4 h-4 text-slate-400`) + `<input>` transparente.
Largura é definida por contexto (não pelo token). Dois tamanhos:
- **Padrão** `h-11`: cabeçalhos de página com espaço.
- **Compacto** `h-9`: headers densos ou dentro de card de tabela.

```
/* caixa padrão */
flex h-11 items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 transition-colors focus-within:border-[#2E63CD]/40
/* input */
bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none w-full min-w-0
```

### 8.8 Selects / Dropdowns / Menus

Padrão único — **não** reaplicar `hover:bg-slate-X` ad-hoc:

- **Popover/conteúdo**: `p-1.5 min-w-[12rem] bg-white rounded-md border border-slate-200 shadow-lg`; itens internos `rounded-full`. Aplicar sempre, inclusive em triggers custom (avatar, sidebar).
- **Trigger de "ações" (⋯)**: hover sutil — `text-slate-500 hover:text-slate-700 hover:bg-slate-50`.
- **Item neutro**: `text-sm text-slate-700`, hover `bg-slate-100/75`.
- **Item destrutivo**: `text-red-600`, hover `bg-red-50 text-red-700`.
- **Select (form)**: trigger branco `h-10 rounded-full border-slate-200`, valor `text-[#314158] text-sm`, chevron `text-[#64748b]`, foco **sem** ring colorida.
- Menus de 3 pontos: usar um componente `ActionMenu` reutilizável que exige `icon` em cada item (todo item tem ícone à esquerda).

### 8.9 Abas (Tabs)

Estilo **underlined**, com as abas **flutuando fora do card**:

- O **painel É o card** (`rounded-md border border-slate-200/80`, fundo gradiente branco→slate-50 sutil, `shadow-sm`, padding `p-4 sm:p-6`). Não envolver as abas num card próprio.
- **Aba ativa**: sublinhado azul `border-b-2 #2E63CD` (`z-10`, por cima do brilho) + um "sol" radial branco sutil subindo de baixo. Texto ativo `text-[#2E63CD]`, inativo `text-slate-500`.
- **Strip**: `w-fit`, alinhado à esquerda, `overflow-x-auto` no mobile (nunca estica para preencher a linha).
- **Divider**: só entre um **header rico** (com back/avatar/filtros) e as abas — `border-t border-slate-200` num container `flex flex-col gap-6` (gap-6 acima / gap-4 abaixo). Em headers simples (só título), sem divider.

### 8.10 Formulários (páginas pequenas: perfil, edição, config)

- **Container**: `max-w-3xl mx-auto flex flex-col gap-6`; card flat; painel com abas usa `p-4 sm:p-8`.
- **Seção**: título `text-xs font-semibold uppercase tracking-wide text-slate-500` + descrição opcional; separar seções com `border-t border-slate-100`.
- **Campo**: `flex flex-col gap-2` → `<label>` (`text-sm font-medium text-slate-700`) **com a ajuda logo abaixo do label** (`text-xs text-slate-500`), e só então o input. Nunca a descrição depois do campo.
- **Grid 2 colunas**: `grid grid-cols-1 md:grid-cols-2 gap-4`. Campo largura-cheia fica fora do grid; meia-largura sem par usa `md:w-1/2`.
- **Inputs**: `h-12`, `rounded-full` (alinhados aos Selects); textarea usa `rounded-sm`.
- **Barra de ação**: rodapé `flex items-center justify-end gap-6 pt-2`; primário à direita (desabilitado vira "Sem alterações"); à esquerda, quando há mudanças, um link secundário "Descartar alterações". **Salvar e descartar passam por modal de confirmação.**

### 8.11 Modal de confirmação

Genérico cancelar/confirmar. `tone`:
- `danger`/`warning` → triângulo de alerta + botão danger.
- `primary` → check azul + botão primary.

Usar para qualquer confirmação fora de "excluir item nomeado" (essa tem um modal
dedicado que ecoa o nome do item).

### 8.12 Indicador de tendência (TrendInline)

Ícone + texto na **mesma cor**, sem chip. `ArrowTrendingUp/DownIcon` (ou
`MinusSmallIcon` para estável); cor via tokens de tendência (§1); texto
`font-medium tabular-nums`. Tamanhos `sm` (ícone 16px, texto `text-xs`) e `md`
(20px, `text-sm`). Derivar direção de um percentual: `>0 = up`, `<0 = down`,
`0/null = flat`. Convenção: por padrão ↑ é bom (verde); parametrizável quando ↑
for ruim (ex.: tempo, churn).

---

## 9. Movimento & Animação

Movimento **contido e curto**. Curva padrão de entrada: `cubic-bezier(0.22, 1,
0.36, 1)` (~200ms). Padrões existentes:

- **Fade de página**: `page-fade-in` 300ms `ease-out` (opacity + translateY 6px).
- **Fade-in-up** de conteúdo: 400ms `ease-out`, translateY 12px.
- **Shimmer/sheen** em barras de progresso: gradiente branco varrendo 1.8s loop.
- **Hover de botão primary**: filtro de brilho (interpola de verdade, ≠ trocar
  gradiente), 200ms.
- Celebração (confetti, glow-pulse, mic-pulse) reservada a momentos de sucesso.

Respeitar `prefers-reduced-motion` para animações não essenciais.

---

## 10. Camadas (z-index)

Escala global — não inventar valores avulsos:

```
--z-shell:   30   /* sidebar fixa */
--z-header:  40   /* header fixo */
--z-modal:   70
--z-overlay: 80
--z-tooltip: 90
```

Shell: header fixo `z-40`; sidebar esquerda `z-30` (60px colapsada / 220px
expandida).

---

## 11. Mobile-first (responsividade)

- **Tap targets ≥ 44×44px** no mobile: `min-h-[44px] sm:h-9`.
- Usar **`min-h-[100dvh]`** (não `100vh`/`min-h-screen`).
- Tipografia/espaçamento que escala → tokens fluidos (`--text-score-*`, `--space-*`).
- Padding de conteúdo abaixo do header fixo via `--page-content-pt-below-header`
  (1rem mobile → 2.5rem em `sm`).
- Tabelas com 4+ colunas → alternativa em cards no mobile.
- Grids: 1 coluna no mobile, expandir a partir de `md`.

---

## 12. Acessibilidade

- Foco visível **sempre**: `focus-visible:ring-2` na cor primária (`/35` de
  opacidade em botões-ícone). Nunca remover outline sem substituto.
- Contraste: texto de corpo slate-700+ sobre branco; evitar slate-400 para texto
  essencial.
- Ícones decorativos com `aria-hidden`; controles com `aria-label`.
- `cursor: pointer` em interativos habilitados; `not-allowed` em desabilitados.
- Cor **nunca** é o único sinal (tendência combina cor + ícone + seta).

---

## Resumo — checklist de portabilidade

Ao levar este sistema para outro produto, replicar primeiro:

1. **Cor primária** `#2E63CD` + hover `#3A71DB`, e a disciplina de usá-la com
   parcimônia.
2. **Neutro Slate** como única família de cinza.
3. **Raio 16/20/28** em containers + **controles pill** (`rounded-full`); evitar `rounded` puro de 4px.
4. **Superfície flat** `bg-white rounded-sm border border-slate-200` — sem blur.
5. **Inter 14px** base + fluid `clamp()` para números grandes.
6. **Heroicons 24 outline** como padrão, quadrados, `currentColor`.
7. **`flex flex-col gap-*`** para empilhar (nunca `space-y`).
8. Tokens de **tendência**, **sombra** e **z-index** como CSS vars centrais.
9. Um conjunto de **primitivos reutilizáveis** (botão, back, link, busca, select,
   abas, modal de confirmação) em vez de estilos ad-hoc por página.

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

Usar sempre as utilitárias do token (`text-trend-positive`, `bg-trend-positive`,
`text-trend-positive-ink`), nunca o hex literal. Exceção única: atributos de SVG
(`stroke`/`fill`), que não aceitam classe — ali, uma constante por arquivo.

**Superfície de destaque positiva.** `bg-surface-positive` (`#EAF6EC`) é o verde
claro que `--color-trend-positive-ink` (`#0B7A24`) sempre pressupôs: o par dá
~5:1 (AA). Reservada a **momentos de celebração** (o modal que aparece quando o
número passa a existir), não a blocos de leitura corrente — tingir um card que
se lê demoradamente força toda a paleta interna para `-ink` e o bloco destoa do
resto da página. Onde ela é usada, `-ink` substitui `text-trend-positive` (o
`#0F9F2E` não sustenta contraste em `text-xs`) e o neutro continua slate-900: a
regra do verde abaixo não muda com a superfície. Para destacar um bloco de
leitura, o caminho é o wash na diagonal sobre branco (§5).

**Verde marca valor que entra na conta.** Num demonstrativo (ROI, economia,
ganho projetado), o verde Positivo é reservado às parcelas que somam ao
resultado. Linha marcada como "não somada" nunca recebe verde — a cor
contradiria o selo ao lado. **Custo e preço não são verdes nem vermelhos: são
slate.** É o contraste com o verde ao lado que os identifica, sem precisar
pintar o custo de "ruim". Tempo (payback, prazo) também é slate: é medida, não
parcela.

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
| Título de seção (página de leitura) | `text-lg font-semibold` | slate-900; descrição `text-sm text-slate-500` |
| Título de card | `text-sm font-semibold text-slate-700` | |
| Corpo | `text-sm` | slate-700/800 |
| Label de campo | `text-sm font-medium text-slate-700` | |
| Ajuda/descrição | `text-xs text-slate-500` | logo abaixo do label |
| Título de sub-seção / eyebrow | `text-xs font-semibold text-slate-500` | seções de formulário, gatilho de bloco recolhível, sub-rótulo dentro de card |
| Header de tabela | `text-xs font-semibold text-slate-600` | |
| Link textual | 13px (`--link-font-size: 0.8125rem`) | |

**Um papel por degrau.** Dentro de uma página a ordem é **seção > card > sub-rótulo**, e dois papéis
nunca dividem a mesma classe. Quando a etapa de resultado da calculadora usava o eyebrow de formulário
como título de seção, o título de primeiro nível empatava com o gatilho de um bloco recolhível dois
níveis abaixo — a página inteira lia como uma pilha plana. Página de leitura longa usa `text-lg`;
`text-xs` de eyebrow é para seção de formulário e para o que vive dentro de um card.

### Caixa e espaçamento entre letras (inegociável)

- **Nenhum texto de UI é caixa alta.** Proibido `uppercase` em labels, títulos de seção,
  eyebrows, headers de tabela, chips e selos — a caixa vem escrita no próprio texto
  ("Resultado", não "RESULTADO"). Hierarquia se faz com peso, cor e tamanho.
- **Nenhum texto leva letter-spacing positivo.** Proibido `tracking-wide`/`tracking-wider`.
  `tracking-tight` continua permitido em títulos grandes e no logotipo.
- Vale para nomes vindos do usuário (nome de time, de cliente): nunca aplicar
  `toUpperCase()` nem `uppercase` — a única exceção são as iniciais do avatar.

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

### Grade: 8px em blocos, 4px em detalhes

A escala do Tailwind não é redefinida (`1` = 4px). **Bloco** — padding de card,
distância entre seções, largura de trilho de grid — anda de 8 em 8. **Detalhe** —
o que vive dentro de uma linha — pode cair em 4.

| Papel | Valor |
|---|---|
| Sub-tópico ↔ sub-tópico dentro de um bloco longo | `gap-10` (40) |
| Seção ↔ seção | `gap-8` (32) |
| Coluna ↔ coluna do grid | `gap-6` (24) |
| Card ↔ card, campo ↔ campo | `gap-4` (16) |
| Linha ↔ linha de lista | `gap-3` (12) |
| Ícone ↔ texto, chip ↔ chip | `gap-2` (8) |
| Rótulo ↔ valor (par colado) | `gap-1` (4) |

Padding de card em três degraus, **um valor por posto**: `p-8` (hero/página
inteira) → `p-6` (card de seção) → `p-4` (sub-bloco dentro de um card). `p-5` e
`p-3` não são postos de card.

Os 40px são o degrau que faltava, e existem por um caso: um bloco de leitura
que carrega vários assuntos. Quando o intervalo entre os sub-blocos é o mesmo
`gap-6` que separa o título do primeiro deles, os sub-blocos e o cabeçalho
passam a valer o mesmo, e um bloco de 1.700px vira uma pilha sem cadência —
nada diz onde um assunto acaba. Com 40 entre sub-tópicos e 24 do título para o
corpo, a seção volta a ter dentro dela a mesma hierarquia que tem fora. Vale só
para blocos com mais de um assunto: numa seção de assunto único não há o que
separar, e 40px ali é buraco. (`SecaoResultado` expõe isso como `ritmo="amplo"`
e mantém o corpo num filho só, para o cabeçalho continuar respirando mais em
cima que embaixo.)

**Nada de meio-passo** (`gap-1.5`, `py-2.5`, `px-3.5`, `mt-0.5` = 6/10/14/2px),
com três exceções que já são padrão de componente: `px-4 py-2.5` em header de
tabela (§8.6), `p-1.5` em popover (§8.8) e `gap-2.5` em campo de busca (§8.7).

**Line-height é o que mais quebra a grade**, e quase sempre em silêncio.
`text-xs` e `text-sm` já caem certo no default (16 e 20px); quem estraga é o
`leading-*` explícito — `text-sm leading-relaxed` dá **22,75px**, `text-xs
leading-relaxed` dá **19,5px**, `text-2xl leading-snug` dá **33px**. Para texto
corrido com mais ar, usar o degrau numérico (`leading-5`/`leading-6`), nunca o
nomeado. Fonte em `px` arbitrário (`text-[13px]`) **não traz line-height junto**:
declarar um.

Número de KPI com `clamp()` (`--text-score-*`) leva **caixa de linha fixa no
máximo do clamp** (`leading-12` para `--text-score-lg`, `leading-9` para o `md`),
não `leading-none`: o glifo continua fluido, mas a altura para de acompanhar o
viewport e a coluna inteira deixa de dançar ao redimensionar a janela.

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

### Página de leitura longa: blocos que quase se tocam

Quando uma página é uma sequência de seções que se leem em ordem — um resultado
detalhado, um dossiê, um relatório — cada seção é um bloco branco próprio
(`rounded-md border border-slate-200 bg-white p-6 sm:p-8`) e a pilha anda com
**`gap-2` (8px)**. Blocos que quase se tocam: o que separa é a quebra de
superfície, não a distância.

Duas tentativas erradas cercam esse ponto, e as duas parecem razoáveis no
papel:

1. **Cards com respiro normal** (`gap-4`/`gap-6`) — dez blocos de mesma borda e
   mesmo raio, todos com o mesmo peso, então nada é mais importante que nada. A
   página lê como lista de caixas soltas.
2. **Um container único** com as seções viradas faixas (`divide-y` + `py-10
   sm:py-12`) — corrige o excesso de molduras e cria outro problema: com padding
   nas duas pontas, **dois títulos vizinhos ficam a ~96px um do outro**. O
   respiro vira buraco e a página pede scroll para dizer o mesmo.

Os 8px ficam entre os dois: uma superfície por seção (o olho encontra as
divisões sem contar bordas) e nenhuma distância desperdiçada. Hierarquia sai da
ordem e de **um** bloco marcado — o bloco-resposta, com contorno em gradiente
(abaixo) —, não de dez pesos iguais.

Vale de todo jeito o alerta sobre aninhamento: card interno quase sempre atrai
outro dentro dele — o padrão que aparece é card › caixa tingida bordada › botão
bordado, três `border-slate-200` encaixadas, que é ruído puro.

Corolário: **um componente de conteúdo não é dono da própria superfície.** Ele
renderiza `flex flex-col gap-*` e nada mais; quem dá moldura é a seção que o
contém. É o que permite o mesmo bloco aparecer solto numa tela e dentro de outro
container noutra sem virar card aninhado. Superfície própria fica para o que é
de fato outra camada: controles, alertas, e zonas editáveis tingidas (aí **sem**
borda, só o fundo — a cor já delimita).

### Bloco-resposta: wash na diagonal, moldura igual às outras

O card que carrega o número pelo qual a pessoa abriu a página **não ganha
superfície nem moldura próprias**. Ele mantém `bg-white` e a mesma
`border-slate-200` de todos os blocos, e se separa por duas coisas: o número um
degrau acima de tudo na página (`--text-score-*` maior) e um **wash da primária
na diagonal**, forte no canto de entrada e morto antes do meio:

```
bg-white bg-linear-to-br from-primary/8 to-transparent to-60%
```

`bg-white` é a cor e o wash é a imagem por cima dela — propriedades diferentes,
então convivem sem depender da ordem das classes. O stop final em 60% importa:
passando disso o canto oposto perde o branco e o wash deixa de ser wash, vira
fundo tingido.

Dois caminhos foram tentados antes e vale saber por que saíram:

- **Superfície inteira tingida** (verde claro no bloco-resposta): obriga toda a
  paleta interna a migrar para a variante `-ink` por contraste, e o bloco passa
  a ler como peça de outro produto no meio da página.
- **Contorno em gradiente** (borda de 1px azul→verde, via dois backgrounds com
  `background-clip: padding-box, border-box`): funciona tecnicamente, mas as
  duas pontas do gradiente brigam com qualquer fundo que não seja neutro, e a
  moldura passa a competir com o conteúdo que deveria emoldurar.
- **Halo radial atrás do número** (oval da cor de tendência sob o glifo, via
  `bg-radial from-trend-positive/14`): é decoração, não profundidade — sem
  deslocamento e sem borrão que signifique alguma coisa, ele só pinta um oval em
  volta do maior número da página, que já era o maior sem ajuda. Chegou a
  substituir o wash no código e voltou atrás: o destaque tem de valer para o
  bloco, não para um caractere dele.

O wash resolve o mesmo problema — dizer "é aqui que está a resposta" — sem
cobrar nenhuma das duas coisas. **Um por página**: a regra do azul (§1,
"restrito e intencional") vale para o fundo também.

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
- **Header text**: `text-xs font-semibold text-slate-600`, padding `px-4 py-2.5` (`px-5` em tabelas densas).
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
- **Seção**: título `text-xs font-semibold text-slate-500` + descrição opcional; separar seções com `border-t border-slate-100`.
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

### 8.12b Calculadora de ROI: escala tipográfica ampliada

A jornada pública da calculadora (`app/(calculadora)/`) roda **um degrau acima**
da escala padrão do app, e isso é deliberado: quem lê a proposta e banca o
número é tipicamente uma pessoa de finanças com 45+ anos, muitas vezes já com
presbiopia. A escala de 14px com auxiliares em 12px `slate-400` — confortável
para o time interno, que usa o produto o dia inteiro numa tela grande — vira
obstáculo para quem abre o link uma vez e precisa decidir.

Nessa jornada:

- **Corpo de leitura** é `text-base` (16px) com `leading-7`, não `text-sm`.
- **Auxiliares** (rótulo de KPI, descrição de seção, nota de bloco) são
  `text-sm` (14px). `text-xs` fica reservado a selos e chips.
- **Cinzas de texto** param em `slate-600`; `slate-400` só para elementos
  decorativos, nunca para frase que precise ser lida.
- **Rótulos dentro de SVG** ficam em 12–13px com cinza `#64748b` ou mais
  escuro, não os 10px `#94a3b8` da convenção geral de §8.13.

O resto do app (telas internas) segue a escala de §2. Esta subseção existe para
que uma pessoa nova não "corrija" a calculadora de volta para a escala padrão
achando que é inconsistência.

### 8.13 Gráficos (SVG próprio, zero dependências)

Não há biblioteca de charts no projeto e não deve haver: os gráficos existentes
(`trajetoria-panel.tsx`, `graficos-resultado.tsx`) são SVG escrito à mão. As
convenções abaixo já eram praticadas nesses dois arquivos — ficam registradas
aqui para o próximo gráfico nascer igual.

**Caixa e escala.** `viewBox="0 0 640 N"` com `className="w-full"`: a escala é
do viewBox, nunca de medição de container. Padding interno padrão
`{ top: 18, right: 20, bottom: 30, left: 64 }` — os 64px da esquerda são para o
rótulo de valor. Gráfico que precisa de largura mínima para não achatar vive
dentro de um `overflow-x-auto` com `min-w-[Npx]` no SVG: **quem rola é o
container, nunca a página**.

**Grade e eixos.** Grade `#e2e8f0`, `strokeWidth 1`, `strokeDasharray="3 4"`; a
linha do zero fica sólida. Rótulos de eixo em `fontSize={10}` `fill="#94a3b8"`,
valores por `formatBRLCompacto`. Quatro a cinco ticks — mais que isso vira
papel milimetrado.

**Cor.** `stroke`/`fill` são atributos, não classes, então os tokens de
`globals.css` não alcançam o SVG: declare **uma constante por arquivo**
(`const VERDE = "#0F9F2E"`) e mantenha-a sincronizada com o token. A semântica
de §1 continua valendo dentro do gráfico: verde só para o que **entra na
conta**; custo, preço, payback e réguas de referência em slate; âmbar
(`#973C00`) só quando há alerta de verdade. Série de referência (o "sem o
programa", o investimento) é tracejada e slate, para o olho não a confundir com
resultado.

**Rótulos.** Texto dentro do SVG só onde couber com folga — rótulo que pode
cruzar uma barra alta (legenda de linha de referência, por exemplo) vai para
uma **legenda HTML abaixo do gráfico**, não para dentro do desenho. Legendas
são `div`s com um traço (`h-2 w-4 rounded-full` ou `border-t-2 border-dashed`),
nunca elementos SVG.

**Acessibilidade.** Todo gráfico leva `role="img"` e um `aria-label` que diz os
números por extenso — o desenho é ilustração de um dado que também precisa
existir em texto. Quando o gráfico substitui uma frase (uma soma, uma
equação), mantenha a frase em prosa logo abaixo: é ela que sobrevive no leitor
de tela, na impressão e no print de tela mandado por WhatsApp.

**Interação.** Tooltip é HTML posicionado por cima do SVG (não `foreignObject`),
com a área de hover captada por `<rect fill="transparent">` de altura inteira,
uma por categoria. Edição por sliders usa `<input type="range">` nativo
transparente sobre trilho desenhado — nunca arrasto customizado.

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

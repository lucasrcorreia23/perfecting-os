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

- **Fonte de UI**: **Inter** (`--font-inter`), pesos 400/500/600 — mais **900**,
  carregado só para os títulos de etapa da calculadora (§13). O peso precisa
  estar na lista de `next/font`: sem ele, `font-black` vira negrito sintético, e
  o navegador engorda o traço do 600 por conta própria justamente no tamanho
  grande, que é onde o peso deveria estar mais limpo. Base do body: **14px**.
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

### Caixa e espaçamento entre letras (uma exceção, nomeada)

- **Nenhum texto de UI é caixa alta.** Proibido `uppercase` em labels, títulos de seção,
  eyebrows, headers de tabela, chips e selos — a caixa vem escrita no próprio texto
  ("Resultado", não "RESULTADO"). Hierarquia se faz com peso, cor e tamanho.
- **Nenhum texto leva letter-spacing positivo.** Proibido `tracking-wide`/`tracking-wider`.
  `tracking-tight` continua permitido em títulos grandes e no logotipo.
- Vale para nomes vindos do usuário (nome de time, de cliente): nunca aplicar
  `toUpperCase()` nem `uppercase` — a única exceção são as iniciais do avatar.

**A exceção (decisão do decisor, 20/08/2026).** A jornada pública da calculadora
adotou o §3.2 do `DESIGN_SYSTEM.md`, que usa caixa alta com tracking positivo em
**dois** níveis: título de painel (13px, peso 800, `+0,12em`) e label de campo
(12px, peso 700, `+0,10em`). Nada mais. Fora de `.pf-calc` esta seção continua
valendo inteira.

A exceção é estreita **por construção**, não por disciplina:

- A caixa mora em duas regras CSS (`.pf-calc .pf-panel-title` e `.pf-calc
  .pf-label`) e é aplicada por classe. Nenhum componente escreve `uppercase` no
  `className` — um teste falha se escrever, e outro falha se aparecer um
  terceiro `text-transform: uppercase` no `globals.css`.
- A caixa é **apresentação**, nunca conteúdo. Escrever `"MENSALIDADE ESTIMADA"`
  na string continua proibido: era como a regra vinha sendo contornada, e custa
  a pronúncia no leitor de tela (que soletra a sigla) e a busca no texto.

Por que ela existe: a hierarquia que faltava não era de tamanho, era de papel.
Título de seção em 18px contra descrição em 16px são dois parágrafos com 2px de
diferença — o olho não separa. Uma etiqueta em caixa alta espaçada não é lida
como frase; ela encima o parágrafo em vez de disputar a leitura com ele. O
tracking positivo é o que torna a caixa alta legível no tamanho pequeno: sem
ele as contraformas fecham e a palavra vira um bloco cinza.

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
- **Campo**: `flex flex-col gap-2` → `<label>` (`text-sm font-medium text-slate-700`) → input → **ajuda** (`text-xs text-slate-500`) → erro. **A ordem foi invertida em 20/08/2026** (decisão do decisor): a descrição desceu para DEPOIS do campo. A razão original de pô-la antes era boa — quem lê a explicação antes de digitar erra menos —, mas o que mudou foi o peso relativo das duas coisas: com o rótulo em caixa alta e o campo editável em amarelo, rótulo e input viraram um par visual forte, e uma frase de duas ou três linhas ENTRE eles separava justamente o que a pessoa opera junto. A explicação continua ligada por `aria-describedby`, então o leitor de tela a anuncia no foco — antes de digitar —, independentemente da ordem no DOM.
- **Alinhamento superior em grade**: quem o garante é `grid-rows-subgrid` no `Field` (`alinhado`) com o pai declarando `grid-rows-[auto_auto_auto_auto]`. As quatro faixas são rótulo → input → ajuda → erro; a faixa do rótulo assume a altura do rótulo mais alto da linha, e é por isso que todos os campos começam na mesma altura mesmo quando um rótulo quebra em duas linhas.
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
- **Auxiliares** (rótulo de KPI, nota de bloco) são `text-sm` (14px).
- **Descrição de campo e de opção** é `text-xs` (12px) com `leading-5`
  (decisão do decisor, 20/08/2026). Vale para a ajuda sob o rótulo (`Field`
  com `escala="leitura"`) e para a nota que explica uma opção ou um slider.
  Com uma pergunta por tela a ajuda ficou longa, e em 14px ela competia com o
  rótulo em vez de apoiá-lo — a hierarquia dentro do campo passou a depender do
  tamanho, não só do peso. Os 20px de `leading-5` mantêm a grade: o default de
  `text-xs` são 16px, apertados assim que a frase vira duas linhas. **O erro
  continua em `text-sm`** — ele não é descrição, e encolher o aviso junto com a
  explicação apagaria a diferença entre "isto ajuda" e "isto bloqueia".
- **Cinzas de texto** param em `slate-600`; `slate-400` só para elementos
  decorativos, nunca para frase que precise ser lida. Este piso não muda com o
  tamanho: 12px em cinza fraco seria a soma de dois problemas, e é a cor que
  segura a legibilidade que o tamanho deixou de dar.
- **Rótulos dentro de SVG** ficam em 12–13px com cinza `#64748b` ou mais
  escuro, não os 10px `#94a3b8` da convenção geral de §8.13.

O resto do app (telas internas) segue a escala de §2. Esta subseção existe para
que uma pessoa nova não "corrija" a calculadora de volta para a escala padrão
achando que é inconsistência.

> **Superado dentro de `.pf-calc` em 20/08/2026.** A jornada passou a rodar a
> escala do `DESIGN_SYSTEM.md` §3.2, descrita na §13 — oito níveis em classe, com
> caixa alta em dois deles. O princípio desta subseção sobrevive intacto e é o
> que a nova escala executa melhor: o leitor tem 45+ anos, abre o link uma vez e
> precisa decidir. O que mudou é que a hierarquia deixou de depender de dois
> pixels de diferença entre título e descrição.

### 8.13 Gráficos (SVG próprio, zero dependências)

Não há biblioteca de charts no projeto e não deve haver: os gráficos existentes
(`trajetoria-panel.tsx`, `graficos-resultado.tsx`) são SVG escrito à mão. As
convenções abaixo já eram praticadas nesses dois arquivos — ficam registradas
aqui para o próximo gráfico nascer igual.

Nem toda leitura visual precisa de SVG: três blocos de `graficos-resultado.tsx`
(`InvestimentoVsRetorno`, `DecomposicaoValor`, `ComparacaoCenarios`) viraram
listas de barras em HTML/CSS puro em 20/08/2026 — rótulo, legenda e valor já
são texto real, e a barra é só um `div` com `width` proporcional. Quando o
gráfico É a leitura (linha temporal, cruzamento de duas séries, eixo com
escala), SVG continua a régua: é o que exige o desenho de verdade, não o
formato do arquivo.

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

---

## 13. Exceção declarada: a pele da calculadora pública (`.pf-calc`)

**Decisão do decisor, 19/08/2026.** A jornada pública da calculadora de ROI —
`app/(calculadora)/*` — não segue a paleta de superfícies deste documento. Ela
tem tokens próprios, definidos numa classe em `app/globals.css` e aplicados no
layout do route group. Tudo o mais no produto (clientes, workflow, marketing,
perfil, e os primitivos de `src/components/ui/`) **continua nas seções 1 a 12**,
sem alteração.

| Token | Hex | Papel |
|---|---|---|
| `--pf-canvas` | `#f2f6fd` | Fundo da página (azul quase branco) |
| `--pf-canvas-top` / `-deep` | `#f7faff` / `#e6edfa` | Paradas da rampa do fundo |
| `--pf-surface` | `#fbfcff` | Card |
| `--pf-surface-alt` | `#ffffff` | Card interno não selecionado |
| `--pf-bar` | `#eaf0fa` | Barra do topo |
| `--pf-brand` | `#2e63cd` | Primária: CTA, eyebrow, marca |
| `--pf-brand-deep` | `#1e4a9e` | Hover de link textual |
| `--pf-brand-tint` | `#e4edfb` | Opção selecionada |
| `--pf-brand-ink` | `#1e4a9e` | Texto sobre o tint |
| `--pf-ink` / `-soft` / `-faint` | `#1a1b1c` / `#4f5563` / `#5f6675` | Texto |
| `--pf-input` + `--pf-input-border` + `--pf-input-text` | `#fdf1ae` + `#e7d47a` + `#2e42bf` | Campo editável |
| `--pf-line` / `-soft` / `-strong` | `#dfe5f0` / `#eaeef7` / `#a9b4c8` | Fio externo / fio que fecha conta / fio de controle |
| `--pf-warn-ink` / `-surface` / `-line` | `#973c00` / `#fffbeb` / `#973c00` a 45% | Alerta |
| `--pf-mono` | IBM Plex Mono | **Numerais, e só eles** |

**O canvas era creme e virou azul quase branco, em gradiente** (decisão do
decisor, 20/08/2026). O fundo é uma rampa de três paradas (`-top` → `-canvas` →
`-deep`, 1,11:1 de ponta a ponta) que mora no **`body`** e não no wrapper: fundo
de body se propaga para o canvas do viewport, e com `background-attachment:
fixed` ele é a mesma luz de ambiente em qualquer ponto da rolagem — preso ao
documento, o degradê se esticaria pelos 6.000px da etapa 03 e chegaria à tela
como cor chapada. Por isso `calculadora-app` e `link-expirado` **não pintam mais
o próprio fundo**, e o rodapé termina em `transparent`: qualquer chapado ali
cobre a rampa ou emenda com ela num degrau.

Duas consequências que não são gosto. **A temperatura arrastou os neutros
junto** — superfície, barra, fios e os dois cinzas de texto: um card `#fbfaf5` ou
um fio `#e2ddd1` sobre fundo frio não lê como papel, lê como mancha amarelada,
que é o que a troca veio tirar da tela. E **o topo da rampa não é branco puro**:
ela inteira precisa ficar abaixo de `--pf-surface` em claridade, senão o card
fica mais escuro que a página onde o gradiente é mais claro. O campo amarelo
fica: sobre azul ele ganha contraste em vez de perder, e continua sendo a
legenda da planilha ("fonte azul sobre fundo amarelo = seu input").

O protótipo previa `--pf-brand-deep` como "painel do preço, única superfície
invertida". A linha saiu: `quanto-custa` é compartilhado com a tela interna e o
fallback não expressa inversão (`link-detail` ganharia texto claro sobre nada), a
§1 proíbe preencher blocos grandes de azul, e a §5 diz que os blocos de resultado
não são donos da própria superfície. O token sobrevive no papel que já exercia.

**A inversão voltou, com escopo estreito: a capa do relatório** (`--pf-invert`,
`-ink`, `-soft`, `-line`; decisão do decisor, 20/08/2026). Nenhuma das três razões
acima alcança este bloco: `capa-resultado.tsx` é **exclusivo** da jornada pública
— a tela interna segue com `HeroResultado` e nunca renderiza a capa —, o escuro
não é azul, e a capa é justamente o bloco cuja função É ser dono da superfície,
porque ela existe para dar UMA resposta antes de a página explicar a conta.

O escuro é o próprio `--pf-ink` (`#1a1b1c`): uma cor a menos na paleta, e o painel
lê como o texto da página levado a fundo, não como uma marca nova. Contrastes
sobre ele, contra o piso de 4,5:1 que esta seção declara preservado —
`--pf-invert-ink` `#f6f5f0` dá 16:1, `--pf-invert-soft` `#a8aaa2` dá 8,2:1, e o
verde `#0F9F2E` de *"entra na conta"* dá 4,9:1. É esse último número que decide o
resto: o verde sobrevive intacto sobre o escuro, então o ROI segue verde na capa
sem que ninguém precise inventar um segundo verde para fundo invertido. O mesmo
par de tokens veste o card destacado do bloco "Próximo passo" — e não deve sair
daí. (As pílulas do cabeçalho de etapas usavam o mesmo par e saíram em 20/08/2026:
das duas afordâncias para os mesmos quatro destinos, a pílula só repetia o
destino, enquanto a régua numerada repete o destino **e** lê progresso. Quem
carrega o `aria-label` da navegação agora é a régua.)

**E o painel do preço voltou também, em AZUL DA MARCA** (`--pf-on-brand`, `-soft`,
`-line` sobre `--pf-brand-deep`; decisão do decisor, 20/08/2026). Escopo estreito:
o painel da mensalidade da **etapa 01** (`etapa-mensalidade.tsx`), e nada além.
Das três razões acima, duas não o alcançam — o arquivo é exclusivo da jornada
pública, então nenhum fallback precisa expressar a inversão, e a etapa 01 não é
bloco de resultado, é o painel de resposta de um passo, o mesmo papel da capa. A
terceira alcança, e é a exceção que está sendo aberta: *"nunca preencher blocos
grandes de azul"* (§1) continua valendo em todo o resto do produto.

Duas coisas decidem o resto, e as duas são contraste:

- **É o `--pf-brand-deep` (`#1e4a9e`), não o `--pf-brand`.** Sobre o azul médio
  não existe tom secundário: `#b9c9e9` dá 3,33:1 e a primeira variante que passa
  do piso (`#e4ecfb`, 4,68:1) já é branco — a linha *"Volume / Taxa efetiva"*
  empataria com a mensalidade acima dela, e o painel perderia a hierarquia
  interna que justifica existir. Sobre `#1e4a9e`, `--pf-on-brand` `#f6f5f0` dá
  7,61:1 e `--pf-on-brand-soft` `#b9c9e9` dá 4,98:1.
- **É a etapa 01 e não a capa.** O verde `#0F9F2E` de *"entra na conta"* dá 2,38:1
  sobre o azul (contra 4,9:1 sobre o escuro). A capa tem o ROI em verde e por isso
  não pode vir para cá; a etapa 01 pode, porque nela ainda não existe nada que
  some ao ROI — só o preço.

**O alerta é fio e ícone, não superfície.** Sobre o canvas, o `#FFFBEB` da §1 dá
1,05:1 — e nenhuma areia mais escura resolve. A razão mudou com a pele e a
conclusão não: sobre o creme o problema era ser tinta quente sobre tinta quente
(1,12:1), sobre o azul quase branco é a claridade que empata. Escurecer até um
amarelo de verdade colidiria com
`--pf-input`, e dois amarelos com dois significados desfariam a coisa mais forte
da pele. Por isso o `--pf-warn-line` é mais forte que o `/25` do app interno: o
contorno e o triângulo carregam o sinal, e o preenchimento é sussurro.

**Por que a exceção existe, e por que ela não vaza.** A calculadora é a única
superfície que um cliente vê, e o §8.12b já reconhece que ela opera com outra
régua — leitor de 45+ anos, uma sessão só, decisão de compra. O amarelo com
texto azul é a legenda de cor da planilha que originou o produto ("fonte azul
sobre fundo amarelo = seu input"); no app interno ele não significaria nada.
Como os tokens vivem numa **classe** e não no `:root`, a fronteira é
verificável: se `.pf-calc` não está no ancestral, vale este documento. Um teste
falha se algum `--pf-*` for declarado em `:root` ou em `@theme`.

### A escala tipográfica do `DESIGN_SYSTEM.md` (§3), adotada em 20/08/2026

A jornada roda a escala do design system próprio da calculadora, que **substitui
o §8.12b** dentro de `.pf-calc`. Oito níveis, uma classe cada, todas em
`globals.css` com regra base (o degrau do §2, para os componentes que também
rodam em `link-detail`) e override dentro da pele:

| Classe | Dentro da pele | Papel |
|---|---|---|
| `.pf-display` | 900, `clamp(34–54px)`, `−0,035em`, line 1,02 | H1 de etapa |
| `.pf-title` | 900, `clamp(22–28px)`, `−0,025em` | Título de card de quiz |
| `.pf-panel-title` | 800, 13px, **caixa alta**, `+0,12em` | Etiqueta de painel, eyebrow |
| `.pf-card-title` | 800, `clamp(16–18px)`, sentence case | Título de card com conteúdo próprio |
| `.pf-label` | 700, 12px, **caixa alta**, `+0,10em` | Label de campo, rótulo de opção, rail |
| `.pf-lead` | 400, `clamp(15–17px)`, line 1,5 | Corpo e descrição |
| `.pf-hint` | 12,25px, line 20px | Microcopy sob campo e opção |
| `.pf-num-hero` | Mono 700, `clamp(30–40px)`, `−0,03em`, `nowrap` | Mensalidade, ROI, preço |
| `.pf-num-kpi` | Mono 700, `clamp(21–27px)`, `nowrap` | Valores de KPI |

**São nove níveis desde 20/08/2026, e o nono nasceu de um empate.** A passagem
de hierarquia do relatório encontrou o `h2` da `SecaoResultado`, os `h3` de
sub-bloco, o `CabecalhoParcela` e os títulos do COI TODOS em `.pf-panel-title`:
cinco níveis lógicos em 13px de caixa alta, distinguidos só pela tinta. Faltava
o degrau entre o capítulo e a etiqueta. `.pf-card-title` é sentence case de
propósito — é isso que o torna um degrau e não um tamanho: a etiqueta em caixa
alta ENCIMA o conteúdo, o título de card o NOMEIA e é lido como frase. Sem
`text-transform` e sem tracking positivo: a exceção da §2 continua valendo para
dois níveis, e só esses dois.

**Os dois níveis numéricos ganharam regra base na mesma passagem**, pelo mesmo
motivo dos outros sete: deixaram de ser exclusivos da capa. `pf-num-kpi` foi
para `resultado-time` (o total de Eficiência/Performance) e `quanto-custa`
(assentos, prática, total do contrato) — dois componentes que `link-detail`
também renderiza, FORA da pele, onde uma classe sem regra base não vale nada e o
número caía para os 14px herdados do body. **A base leva tamanho e
`tabular-nums`, nunca `--pf-mono`**: a família da tela interna é a Inter, e o
acesso à monoespaçada continua sendo só pela `.pf-calc .pf-num`.

São classes e não utilitárias porque cada nível carrega cinco propriedades que
só significam juntas — espalhadas em `className`, a primeira cópia sai com
quatro das cinco e a hierarquia se desfaz onde ninguém está olhando.

**As famílias mudaram junto (§3.1 do DESIGN_SYSTEM): Archivo + IBM Plex Mono.**
Só dentro da pele — o app interno segue na Inter. A troca acontece por uma
indireção: `--font-sans` no `@theme` aponta para `--font-app`, que vale
`var(--font-inter)` no `:root` e `var(--font-archivo)` em `.pf-calc`. Apontar
`--font-sans` direto para a Inter prenderia a utilitária `font-sans` a ela, e a
Archivo só alcançaria quem herdasse do `body`. A mono deixou de ser pilha de
sistema porque o §3.2 pede peso 700 em dois níveis, e pilha de sistema não tem
700 previsível nem métricas iguais entre macOS e Windows — o mesmo KPI mudava de
largura de coluna conforme a máquina.

**"Tudo que é clicável e editável é alto contraste com o restante"** (decisão do
decisor, 20/08/2026). Disso saem dois fios, não um:

- `--pf-line` continua sendo o fio **estrutural** — moldura de painel, divisória
  de conta. Discreto de propósito: dez blocos não podem ter dez molduras
  gritando.
- `--pf-line-strong` (`#b9b2a0`) é o fio de **controle** — borda de card de opção
  não escolhido, de botão secundário, de qualquer coisa que responda ao clique.
  Sem a segunda intensidade, controle e moldura dividiam a mesma borda e nada
  dizia onde se podia clicar.

**O ESTADO SELECIONADO segue a mesma escala** (mesma decisão, aplicada às abas e
à régua de etapas no fim do dia). Sobre o canvas azul quase branco, marcar a
escolha com uma borda de marca mais `--pf-brand-tint` deixou de funcionar: o que
fazia o chip escolhido saltar era o contraste de **temperatura** contra um fundo
creme, e num fundo frio ele se reduz a uma diferença de claridade quase nula. A
aba ativa de `AbasEscopo` é **chapada na primária** (`--pf-on-brand` por cima,
5,2:1), e as não escolhidas ficam no fio de controle. A régua de etapas fez o
mesmo movimento por outro caminho: os três estados passaram a se separar por
tinta **e** por espessura, e quem decide qual é o ativo é `ativo` — nunca o
preenchimento, que numa etapa em curso quase sempre já está em 100%.

O campo editável é o ponto mais alto dessa escala e ganhou a forma que o §5.1 do
DESIGN_SYSTEM descreve: amarelo `--pf-input`, borda de **1,5px**, sombra
**interna** (`--pf-input-inset`) e valor em mono **700 de 16px**. É o inset que
faz a célula parecer afundada em vez de pintada — a diferença entre "aqui você
digita" e "aqui tem um destaque colorido".

**A pele é o azul da marca, não o verde.** (Era creme + azul; o canvas virou azul
quase branco em 20/08/2026, acima — o que segue vale igual.) O protótipo aprovado
desenhava a primária em verde escuro (`#2a5d42`). Adotá-lo poria duas cores
próximas com significados diferentes na mesma tela: o verde de marca e o
`#0F9F2E` que a §1 reserva para *"entra na conta"*. A pele muda as superfícies —
o papel — e mantém a cor de marca do produto, que é o que o §1 chama de restrita
e intencional. Por isso os tokens se chamam `--pf-brand*`: nomear de *green* um
valor azul seria uma mentira no CSS.

**O verde foi recusado uma segunda vez em 20/08/2026**, ao adotar o
`DESIGN_SYSTEM.md`, que propõe `#0E5E3F` como primária. Decisão do decisor:
*"mantenha o azul atual, esqueça o verde desse DS"*. A razão é a mesma da
primeira recusa e não envelheceu — duas cores próximas com significados
diferentes na mesma tela desfazem a semântica da §1, e o `#0F9F2E` de "entra na
conta" é o significado que não pode ser diluído. **O que foi adotado do
DESIGN_SYSTEM é a tipografia (§3), a forma do campo editável (§5.1) e a regra
de contraste dos controles — não a paleta (§2.1).**

**Consumo — o mecanismo importa.** `app/globals.css` usa `@theme inline`, que
**inlina o hex** na utilitária: `.bg-primary` compila para
`background-color: #2e63cd`, não `var(--color-primary)`. Sobrescrever
`--color-primary` dentro de `.pf-calc` portanto não faz nada. A pele se consome
por valor arbitrário, em duas formas:

- Componente exclusivo da jornada → `bg-(--pf-canvas)`, `text-(--pf-ink)`.
- Componente **compartilhado** com a tela interna (`link-detail` e os blocos de
  resultado) → sempre com fallback: `bg-[var(--pf-surface,#ffffff)]`. Dentro da
  pele pega o token; fora, entrega o valor do design system. É o que permite os
  mesmos componentes servirem às duas telas sem duplicação.

Os tokens são declarados em `.pf-calc` **e** em `body:has(.pf-calc)`, porque
`Modal`, `SelectMenu`, `ActionMenu`, o Glossário e a barra de progresso fazem
`createPortal` para o `document.body` — fora do wrapper, a variável não herda, e
a utilitária resolveria para valor inválido.

**O que continua valendo dentro da pele:** empilhamento com `flex flex-col
gap-*` (nunca `space-y-*`), raios 16/20/28 (o 14px do protótipo não existe na
escala), grade 8/4 sem meio-passo, `leading-*` numérico e nunca o nomeado,
sombras só dos três tokens da §6, foco visível em todo controle, tap target
≥ 44px, contraste mínimo de 4,5:1 em texto, e travessão no lugar de número
quando o dado não existe.

**A §2 foi reaberta em 20/08/2026, e só em dois níveis.** Este parágrafo dizia
"nada de caixa alta e nada de `letter-spacing` positivo dentro da pele", e essa
regra caiu quando o decisor adotou o §3.2 do DESIGN_SYSTEM: `.pf-panel-title` e
`.pf-label` são caixa alta com tracking positivo. A exceção é estreita **por
construção**, não por promessa: a caixa mora em duas regras CSS, nenhum
componente escreve `uppercase` no `className`, e `design-tokens.test.ts` conta
as ocorrências — um terceiro `text-transform` no `globals.css` reprova. A
versão frouxa do teste ("existe pelo menos um") deixaria a caixa alta se
espalhar de novo. O verde `#0F9F2E` sobrevive intacto: a pele muda o papel, não
a semântica de quais parcelas entram na conta.

**A monoespaçada é só para número** (decisão do decisor, 20/08/2026). A parte
deste parágrafo que dizia "todo rótulo e título da jornada é Inter" está
superada — as famílias trocaram para Archivo + Plex Mono no mesmo dia, acima. O
que continua valendo, e é o que o teste guarda, é o resto: a mono entra apenas
em valores
— KPI, preço, hora, percentual, e o número da etapa na régua. A razão é o que a
mono faz: ela alinha dígito com dígito em coluna. Numa palavra ela não alinha
nada, e o que sobra é uma tipografia estranha ao resto da página, que numa tela
de decisão lê como peça de outro produto. O acesso é sempre pela classe
`pf-num` (definida como `.pf-calc .pf-num`, logo inerte fora da pele) — nunca
`font-[family-name:var(--pf-mono)]` solto no `className`, que é como a mono
vazava para os rótulos. Um teste falha se essa forma reaparecer.

**A ação principal da jornada é preta, não azul.** `Button variant="primary"`
lê as duas paradas do gradiente de `--pf-cta-from` / `--pf-cta-to`, com fallback
para o azul — fora da pele nada muda. Dentro dela o azul já marca link, opção
selecionada e anel de foco; um CTA azul empataria com tudo o que é apenas
navegação, e "Avançar" é a única coisa a fazer na página. O gradiente sobrevive
porque o `primary` tem sheen inset e hover por `brightness`: chapar em preto
apagaria os dois. O anel de foco continua azul — ele é afordância de teclado,
não hierarquia de ação.

**O título de cada etapa é `font-black`.** Vale para os três degraus de primeiro
nível da jornada — o título da entrada, o título do passo do wizard e os títulos
de seção do resultado —, sempre com `tracking-tight`, que é o que o 900 pede em
tamanho grande. É o contraste de peso, e não de tamanho, que separa o título da
etapa do resto: numa página que é toda leitura, subir o corpo para 16px (§8.12b)
aproximou os degraus, e o 900 devolve a distância sem inflar a tipografia. O
peso 900 tem de estar carregado em `app/layout.tsx` (§2).

**`--pf-ink-faint` é `#6b6d65`, não o `#7c7f75` do protótipo.** O valor original
dava 3,52:1 sobre o canvas, abaixo do piso de 4,5:1 que esta própria seção
declara preservado. O ajuste mantém o matiz e sobe para 4,54:1.

### A etapa de relatório em quatro capítulos (20/08/2026)

A etapa 03 tinha o conteúdo certo e nenhuma hierarquia: dez blocos de peso
idêntico, todos os títulos em `.pf-panel-title`, e sete dialetos diferentes de
número-manchete. A passagem trocou isso por **quatro capítulos** — *Ao longo de
12 meses*, *De onde vem o número*, *O que está em jogo hoje*, *Quanto custa* —
mais o case de sucesso, que mudou de etapa para fechar o relatório.

**`GrupoRelatorio` é título sem superfície.** O capítulo é um `.pf-display`
sobre o canvas, e os cards abaixo dele é que têm moldura. Essa ausência é o
mecanismo: uma moldura em volta de outras molduras daria aninhamento, não
capítulo — o corolário "conteúdo não é dono da própria superfície" da §5,
aplicado um nível acima. Dois ritmos, cada um com regra: **`gap-6` entre
capítulos** (troca de assunto), **`gap-2` entre os cards de um capítulo** (o
mesmo assunto, outro recorte). Antes eram `gap-3` na capa e `gap-2` na pilha,
sem nada que explicasse a diferença.

**`LinhaBarra` põe a barra na linha.** O desenho empilhado — rótulo e valor numa
linha, legenda noutra, barra full-width numa terceira — estava copiado em três
lugares (`InvestimentoVsRetorno`, `DecomposicaoValor`, as cinco dimensões do
COI) e tinha dois defeitos: cinco parcelas viravam quinze linhas de altura, e os
valores nunca formavam coluna, então comparar duas parcelas exigia procurar cada
número no seu próprio parágrafo. Grade de três trilhas no desktop, empilhada
abaixo de `sm:` — uma barra inline não cabe em 360px com um rótulo de três
palavras. **O separador é tracejado, e isso não fere o "fio = fecha conta"**: o
fio sólido continua exclusivo do subtotal e o tracejado é régua de lista, que é
a distinção que o §4 do DESIGN_SYSTEM já declarava.

**O amarelo deixou de ser exclusivo do campo editável** (decisão do decisor). O
card do ROI na capa adota o `--pf-input` do material de referência. A
consequência é declarada, e a mitigação é o que sobra: o card leva a borda fina
de sempre e **não** leva a sombra interna (`--pf-input-inset`) nem a borda de
1,5px. É o conjunto — amarelo + borda grossa + inset + mono azul — que
identifica "aqui você digita", e o card herda só o primeiro termo. O número fica
em `--pf-ink`, nunca em verde: `#0f9f2e` sobre `#fdf1ae` dá 2,4:1.

**O card 1 da capa mostra a MENSALIDADE, com a conta do ano escrita por
extenso** (decisão do decisor). É a inversão do que valeu até aqui: o card
mostrava o investimento ANUAL na manchete e o mensal em 12px de nota. A razão
da versão antiga não se perdeu — é `consolidado.precoAno` o denominador de
`consolidado.roi`, e com a mensalidade ao lado do valor anual quem confere
dividindo acha DOZE vezes o ROI real. A mitigação é escrever a multiplicação
inteira dentro do card: `R$ 13.000` **× 12 meses** na linha do número,
`R$ 156.000 no ano` na nota. O denominador do card 3 continua na tela, uma
linha abaixo, em vez de ter de ser deduzido — e a pergunta que a pessoa
trouxe ("quanto pago por mês") deixa de ser rodapé. O `× 12 meses` é o ano e
nunca o contrato: com prazo de 24 meses o total desembolsado é outro e não é
denominador de ROI nenhum; quem carrega o prazo é o card do payback.

**O painel do preço é `--pf-invert`, não o `--pf-brand-deep` da etapa 01**,
apesar de os dois mostrarem a mesma mensalidade. O motivo é contraste: o painel
carrega o "retorno projetado" em verde, e `#0F9F2E` dá 2,38:1 sobre o azul
contra 4,9:1 sobre o escuro — a mesma razão pela qual a capa não pode ser azul.
A etapa 01 pode porque nela ainda não existe nada que some ao ROI.

**As opções não escolhidas pararam de ser `opacity-50`.** Em `readOnly` aquela
é a proposta que vai à reunião: as opções recusadas precisam ser lidas — "por
que não o Intensivo?" é a pergunta seguinte — e a 50% o texto caía abaixo do
piso de contraste. Quem marca a escolha é a borda de marca; o fio de controle
(`--pf-line-strong`) mantém as outras lendo como opção mesmo travadas.

**`--pf-danger-surface` / `--pf-danger-line` são o alerta de RISCO**, e existem
porque o âmbar já significa outra coisa: "confira isto". O diagnóstico de
capacidade do COI ("não é falta de vontade, é falta de capacidade") é da mesma
família das cinco parcelas que vazam. A tinta **não** ganhou token — é o
`trend-negative` que já existe, a ~8:1 sobre o rosado. E a superfície é possível
aqui porque este alerta mora DENTRO de um card `--pf-surface`, não sobre o
canvas, que é o que obrigou o âmbar a virar fio-e-ícone.

**"Exportar / salvar PDF" leva à etapa 04 e o diálogo abre lá.** O CSS que
recorta a folha (`body * { visibility: hidden }` mais o recorte de
`#resumo-verificavel`) mora dentro do `ResumoVerificavel`, que só existe na
etapa 04: imprimir da etapa 03 saía como cópia crua da tela inteira, com régua
de etapas, cabeçalho e botões. O botão "Imprimir" que vivia no painel da capa
tinha esse mesmo defeito, calado por ser secundário.

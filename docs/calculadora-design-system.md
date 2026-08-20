# Perfecting ROI Calculator — Design System

**Versão 1.0 · referente à calculadora v4.2**
**Documento de referência para design, produto e engenharia**

---

> **Nota de adoção (20/08/2026).** Este documento chegou como referência do
> protótipo standalone (`perfecting-roi/index.html`). O que foi **adotado** no
> produto: a tipografia (§3), a forma do campo editável (§5.1) e a regra de
> contraste dos controles (§4/§5.3). O que foi **recusado**: a paleta do §2.1 —
> a primária continua o azul `#2E63CD` da marca, porque o verde `#0E5E3F`
> conviveria na mesma tela com o `#0F9F2E` que significa "entra na conta".
> A tradução dessas decisões para o código está em `docs/design-guidelines.md`
> §13; onde os dois discordarem, manda o design-guidelines.

---

## 1. Filosofia de design

### 1.1 O princípio norte: "a planilha, vestida para o cliente"

A calculadora não é uma landing page com um formulário — é a **interface de usuário de uma planilha auditada**. Toda decisão visual parte dessa premissa: o usuário precisa sentir que está operando um instrumento financeiro confiável, não respondendo a um quiz de marketing.

Três consequências diretas:

1. **Verdade numérica acima de estética.** Nenhum número é arredondado para "ficar bonito". Valores monetários usam tabular figures e formatação BRL completa.
2. **Ceticismo visível.** Os descontos anti-otimismo (haircut 0,7), tetos e a verificação de realismo são *mostrados*, não escondidos — a credibilidade é o argumento de venda.
3. **Rastreabilidade.** Cada resultado declara de onde veio ("motor v3.1 — o mesmo da planilha Perfecting_ROI_Calculator v4.1").

### 1.2 A assinatura: a célula amarela

O elemento pelo qual o produto é reconhecido: **todo input é renderizado como uma célula editável de Excel** — fundo amarelo-claro, texto azul monoespaçado, borda âmbar. Isso não é decoração:

- Na planilha original, a convenção documentada é "fonte azul sobre fundo amarelo = seu input (editável)". A interface torna essa convenção literal.
- O usuário que conhece a planilha reconhece instantaneamente onde pode mexer.
- O contraste amarelo/verde-papel cria um mapa visual imediato: **amarelo = você edita; verde = o sistema calcula**.

Regra dura: a célula amarela é *exclusiva* para inputs. Nunca usar amarelo em outputs, botões primários ou decoração — isso destruiria o significado.

---

## 2. Tokens de cor

### 2.1 Paleta canônica

| Token | Hex | Papel |
|---|---|---|
| `--paper` | `#F2EFE6` | Fundo global. "Papel de ledger" — quente, não-clínico |
| `--paper-2` | `#EAE6D9` | Fundo secundário (tracks de barras, áreas de repouso) |
| `--card` | `#FBFAF4` | Superfície de cards e painéis (quase-branco quente) |
| `--ink` | `#17211C` | Texto primário, botões escuros, divisórias fortes |
| `--ink-soft` | `#43514A` | Texto secundário, labels, hints |
| `--green` | `#0E5E3F` | **Primária.** Ação, resultados, progresso, seleção |
| `--green-deep` | `#093D2A` | Superfícies hero escuras (card de mensalidade, KPI principal) |
| `--green-bright` | `#1B9E6B` | Progresso em curso (estado "now" do rail) |
| `--cell` | `#FFF0A6` | **Fundo de inputs** (a célula amarela) |
| `--cell-edge` | `#E5C94F` | Borda de inputs |
| `--cell-blue` | `#2743C7` | **Texto de inputs** (azul planilha) |
| `--cost` | `#BE3E22` | Custos, investimento, alertas críticos, barras de COI |
| `--line` | `rgba(23,33,28,.16)` | Divisórias suaves |
| `--line-strong` | `rgba(23,33,28,.34)` | Divisórias estruturais, bordas de foco secundário |

### 2.2 Regras de uso

- **Verde = ganho, ação, confirmação.** Vermelho-tijolo (`--cost`) = custo, investimento, risco. Os dois nunca se invertem — no gráfico de 12 meses, a linha verde é sempre o valor gerado e a vermelha sempre o investimento.
- **Amarelo é sagrado** (ver 1.2). Exceção admitida: a caixa de alerta "warn" usa âmbar dessaturado (`#F4C95D` a 22% sobre branco) por convenção universal de warning — suficientemente distinta do amarelo-célula.
- **Escuros:** apenas `--ink` e `--green-deep`. O verde-profundo é reservado para os dois momentos de maior peso emocional: a mensalidade (Etapa 1) e o KPI-hero do relatório.
- Cores derivadas sempre via `color-mix()` sobre os tokens — nenhum hex avulso no código.

### 2.3 Acessibilidade e contraste

| Par | Ratio aprox. | Uso |
|---|---|---|
| `--ink` / `--paper` | ~13:1 | Texto corrente — AAA |
| `--ink-soft` / `--paper` | ~7,5:1 | Secundário — AAA |
| `--cell-blue` / `--cell` | ~6,5:1 | Inputs — AA Large/AAA para texto ≥14px |
| branco / `--green-deep` | ~9:1 | Cards hero — AAA |
| `--cost` / `#FFF` | ~5,5:1 | Alertas críticos — AA |

Placeholders de input usam `--cell-blue` a 68% (ratio ~4:1) — decisão intencional documentada: placeholder é affordance, não conteúdo; ao focar/digitar, o valor real assume contraste pleno.

---

## 3. Tipografia

### 3.1 Famílias e papéis

| Família | Pesos | Papel |
|---|---|---|
| **Archivo** | 400–900 | Voz do produto: títulos (800–900), corpo (400–600), labels em caixa alta (700–800) |
| **IBM Plex Mono** | 400–700 | **Todos os números**, tokens de código, metadados, badges de cenário |

Por que essa dupla: Archivo é um grotesco contemporâneo com personalidade em peso 900 sem virar "startup genérica"; Plex Mono traz o DNA de terminal/ledger e garante alinhamento tabular em tabelas financeiras. Números em mono são regra absoluta — um CFO lê colunas de cifras, e `tabular-nums` elimina o "jitter" durante as animações de contagem.

### 3.2 Escala

| Nível | Spec | Uso |
|---|---|---|
| Display | Archivo 900, clamp(34–54px), tracking −3,5%, line 1,02 | H1 de etapa |
| Título de painel | Archivo 800, 13px, caixa alta, tracking +12% | Seções do relatório |
| Título de card de quiz | Archivo 900, clamp(22–28px), tracking −2,5% | Perguntas |
| Corpo | Archivo 400–500, 15–17px, line 1,5 | Texto corrido |
| Label de campo | Archivo 700, 12px, caixa alta, tracking +10% | Acima de inputs |
| Número hero | Plex Mono 700, clamp(30–40px), tracking −3% | Mensalidade |
| Valor de KPI | Plex Mono 700, clamp(21–27px) | Cards do relatório |
| Hint/microcopy | Archivo 400–600, 11,5–12,5px | Abaixo de inputs |

Números grandes nunca usam caixa de texto com quebra: `white-space:nowrap` onde há risco de colisão (lição aprendida no fix do botão de confirmação).

---

## 4. Espaçamento, grid e forma

- **Raio base:** 14px (`--radius`). Escala: 8–10px (inputs), 12–14px (botões, opções), 16–20px (cards, painéis). Cantos grandes = containers; cantos pequenos = controles.
- **Sombra única:** `0 1px 0 rgba(tinta,.06), 0 12px 32px −16px rgba(tinta,.28)` — elevação sutil de "papel sobre mesa", sem glassmorphism.
- **Container:** 1120px max, gutters 28px. Quiz mais estreito (680px) — coluna de leitura focada. Modo avançado mais largo (980px) — densidade de formulário.
- **Grid do relatório:** KPIs em 4 colunas → 2 colunas ≤900px → 1 coluna mobile.
- **Divisórias:** tracejadas (`dashed`) dentro de listas de alavancas; sólidas e fortes para totais (convenção de demonstrativo financeiro).

---

## 5. Componentes

### 5.1 A célula-input (`.cell-input`)

Assinatura do sistema. Fundo `--cell`, borda 1,5px `--cell-edge`, texto Plex Mono 700 em `--cell-blue`, `inset 0 2px 0` simulando a sombra interna de célula selecionada.

- **Foco:** borda `--cell-blue` + anel `color-mix(cell-blue 22%)`.
- **Prefixo/sufixo** (`R$`, `%`): absoluto à direita/esquerda, 55% de opacidade, `pointer-events:none`.
- **Variante mini** (`.mini-input`): modo avançado — mesma linguagem, densidade maior (14,5px, padding 8×10).
- **Estado "a confirmar" → "confirmado":** campos pré-preenchidos carregam botão de aceite `✓ Confirmar`; ao confirmar, borda verde + anel verde a 18% + botão vira `✓ Confirmado` verde-sólido. Edição posterior reverte o estado — a confirmação é do *valor atual*, não do campo.

### 5.2 Botões

| Variante | Spec | Uso |
|---|---|---|
| `cta-main` | verde `--green`, branco, raio 14, sombra projetada + inset inferior | Ação principal da jornada ("Calcule o ROI…") |
| `q-next` | `--ink`, papel, raio 12 | Avançar no quiz |
| `q-next.final` | igual ao cta-main | Última pergunta / gerar relatório |
| `cta-ghost` / `btn-s` | transparente, borda 1,5 strong → ink no hover | Ações secundárias |
| `back` | texto sublinhado suave | Voltar/pular |

Estados: hover = `translateY(−2px)` + sombra cresce; active = retorna. Disabled = opacidade 45–50% + `cursor` bloqueado (o CTA da Etapa 1 só habilita com escopo válido).

### 5.3 Cards de opção (`.opt` / `.plan-opt`)

Radio visual: dot circular que preenche em verde; seleção = borda verde + anel 14–15% + fundo verde 6–7%. Planos de cadência mostram as horas em mono grande (2h/4h/8h) — o número *é* o diferenciador.

### 5.4 Rail de progresso (`.rail`)

4 stops (01 Mensalidade → 02 Quiz de ROI → 03 Relatório → 04 Exportar & FAQ). Barra de 3px: vazia (`--line`), cheia verde (done), meio-termo `--green-bright` (now). Labels em caixa alta 11px; mobile colapsa para barras puras. O modo avançado vive dentro do stop 02 — não merece stop próprio por ser opcional.

### 5.5 Alertas (`.alert`)

Três tons semânticos, sempre com glifo à esquerda:

- `ok` — verde 8%: verificações que passaram (reality check ≤ 25%)
- `warn` — âmbar: piso ativo, cobertura < 100%, teto de funil, fator de escopo em fallback
- `bad` — `--cost` 8%: reality check estourado, payback > contrato, déficit de bandwidth > 50%

Regra de copy: alerta explica *o que aconteceu e o que fazer* — nunca "erro genérico".

### 5.6 Painéis do relatório (`.panel`)

Card `--card`, raio 18, header de seção em caixa alta + linha de descrição que **explica o racional antes do número** ("Sem dupla contagem: cada alavanca tem teto próprio…"). Todo painel responde: o quê → de onde veio → o que fazer com isso.

### 5.7 Gráficos

- **Barras comparativas (investimento × retorno):** tracks `--paper-2`, fills verde/`--cost`, animação de largura 0,9–1s com `cubic-bezier(.22,1,.36,1)` disparada 60ms após render.
- **Série de 12 meses:** SVG inline gerado por código — grid tracejado, linha verde 3px (valor) vs vermelha 2,5px (investimento), marcador vertical tracejado de payback quando ≤ 12 meses. Eixos em mono 10px, valores em "k".
- **Decomposição (5 alavancas):** barras horizontais com label + sublabel descritivo ("custo de treino que você deixa de queimar") — o sublabel é obrigatório: nome técnico sozinho não comunica.
- **COI:** mesma gramática, fills em `--cost` — vermelho porque é dinheiro perdido, não ganho.

### 5.8 FAQ (`.faq-item`)

Acordeão de uma abertura por vez, chevron mono rotacionando 90°, respostas com `<b>` para números-chave e `.pill` (amarelo-célula em miniatura) para termos do modelo ("haircut 0,7") — reforço da linguagem ledger dentro do texto.

### 5.9 Toast

Canto inferior central, `--ink` sólido, 3,2s, entrada por translateY+fade. Usado para confirmações de sistema ("Simulação salva…") — nunca para erros de validação (esses ficam inline, no contexto do campo).

---

## 6. A jornada (arquitetura de 5 etapas)

| Etapa | Tela | Padrão de interação |
|---|---|---|
| 1 — Mensalidade | Hero 2 colunas + card de cálculo | **Resposta instantânea**: cada keystroke recalcula; preço anima por count-up |
| 2 — CTA | (mesmo card) | CTA só habilita com escopo válido — progressão conquistada |
| 3 — Quiz de ROI | 8 perguntas, uma por tela | Uma decisão por vez; Enter avança; voltar nunca perde dados |
| 3.5 — Modo avançado (opcional) | Cards multi-equipe + ajuste fino | Densidade propositalmente maior; saída "pular" sempre visível |
| 4 — Relatório | Scroll narrativo | KPIs → racional → alavancas → cenários → equipes → COI → série → business case |
| 5 — Exportar & FAQ | Ações no header do relatório + FAQ | `window.print()` com stylesheet dedicado; persistência local |

Princípios de UX aplicados:

- **Progressive disclosure:** ninguém vê "fator de escopo" antes de precisar. O quiz traduz jargão do modelo para linguagem de operação ("Como a prática acontece hoje?").
- **Pré-preenchimento com aceite:** valores herdados (assentos = vendedores) aparecem preenchidos *e* gravados, mas pedem confirmação explícita — autonomia sem surpresa.
- **Validação inline contextual:** mensagem no card, em `--cost`, nomeando o campo — nunca modal, nunca toast.
- **Undo implícito:** "Voltar" preserva todo o estado; "Refazer simulação" é sempre alcançável.
- **Persistência honesta:** "Salvar no navegador" declara onde os dados vivem (localStorage local) e o rodapé do relatório mostra o status "● progresso salvo neste navegador".

---

## 7. Motion

| Animação | Duração | Curva | Onde |
|---|---|---|---|
| Entrada de tela (`fadeUp`) | 450ms | `cubic-bezier(.22,1,.36,1)` | troca de etapa |
| Count-up de valores | 700ms | ease-out cúbico | mensalidade, KPIs, COI |
| Barras de progresso/alavancas | 900–1000ms | mesma curva | relatório |
| Hover de botões | 150ms | padrão | todos |

Filosofia: **um momento orquestrado vale mais que efeitos espalhados.** A animação hero é o count-up do dinheiro — é o que o usuário veio ver. Tudo mais é transição funcional sub-500ms. `prefers-reduced-motion` deve zerar count-ups e transições (backlog conhecido: respeitar a media query numa próxima revisão).

---

## 8. Copy e tom de voz

- **Voz:** consultor financeiro sênior — direto, numérico, sem hype. "Descubra a mensalidade", nunca "Desbloqueie o potencial".
- **Sentence case** em tudo; caixa alta apenas em labels de 11–13px com tracking.
- **Números sempre formatados pt-BR:** `R$ 1.234.567`, percentuais com vírgula (`18,8×`).
- **Erros não pedem desculpas, instruem:** "Preencha 'Ticket médio' para continuar."
- **Honestidade estrutural como copy:** "Leitura honesta:", "meta conservadora", "não constitui garantia de resultado" — o disclaimer é parte da voz, não letra miúda.
- **Glifos permitidos:** ✓ ⚠ ⓘ ● ▸ → — sem emojis coloridos em nenhuma superfície.

---

## 9. Responsividade e impressão

**Breakpoints:** 900px (grids de 4→2), 760px (topnav some, rail colapsa), 640px (barras com labels menores), 560px (formulários de 2→1 coluna). Mobile-first não foi o driver (ferramenta de CFO é desktop-first), mas nada quebra abaixo de 360px.

**Print (exportar PDF):** stylesheet `@media print` dedicado — esconde topnav/rail/ações/toast, fundo branco, painéis com `break-inside:avoid`. O relatório impresso é um documento de trabalho: a seção "Business Case sugerido para 3 meses" fecha a página como proposta acionável.

---

## 10. Invariantes (o que nunca quebrar)

1. Amarelo-célula = input. Sem exceções.
2. Verde = ganho/ação; vermelho-tijolo = custo/risco. Nunca inverter.
3. Números em Plex Mono tabular, BRL completo.
4. Toda métrica declarada mostra sua fonte ou seu racional em uma linha.
5. O reality check de 25% e os haircuts aparecem na UI — são features de credibilidade.
6. Nenhum cálculo novo entra na UI sem paridade validada contra a planilha (motor recalculado célula a célula).
7. Um valor exibido nunca difere do valor usado no cálculo (o bug do "assentos" nasceu disso — pré-preenchimento visual ≠ estado).

---

## Apêndice A — Mapa de arquivos

| Artefato | Conteúdo |
|---|---|
| `perfecting-roi/index.html` | Aplicação completa self-contained (CSS + HTML + motor JS) — única fonte de verdade deste design system |
| Decks `perfecting-precos-tier` e `perfecting-como-calculamos-roi` | One-pagers de apresentação na mesma identidade (papel/verde/amarelo/mono) |

## Apêndice B — Backlog de design conhecido

- Respeitar `prefers-reduced-motion` (count-ups e transições).
- Dark mode: a paleta ledger tem caminho natural (`--paper`→grafite, `--cell` mantida com texto claro), mas exige revisão de contrastes do amarelo.
- Internacionalização do formato numérico (hoje fixo pt-BR).

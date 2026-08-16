# Erratas do V5 — divergências doc↔código da calculadora de ROI

Registro das divergências entre `CALCULADORA_ROI_RACIONAL_CONSOLIDADO_V5.md` (documento
externo, fonte da verdade do racional) e a implementação em `src/lib/calculadora/` +
`src/components/calculadora/`.

**Por que este arquivo existe.** O §2 do V5 (regra de fonte R2) determina: *"o código vivo
é a verdade da implementação; este documento é a verdade do racional. Divergência é
incidente: reporta-se com errata, nunca se resolve silenciosamente por nenhum dos lados."*
Nenhum item aqui é código faltando — em todos, **o código está certo e o documento é que
não alcançou**. Implementar o texto do V5 ao pé da letra, em vários destes casos, seria
regressão.

**Numeração.** A série é única, a do `03_DELTAS.md`; os números abaixo são propostos e
precisam ser confirmados contra a última errata emitida. O §13 do V5 já reserva E-12 a
E-14 para outros três itens ("erratas propostas, números não confirmados"), então esta
lista começa em E-15 para não colidir. **Alterar o V5 é do decisor (§2)** — este arquivo
entrega o texto pronto, não aplica.

**Base da auditoria.** Leitura direta de 16/08/2026, suíte em 368 testes (29 arquivos),
143 deles em `src/lib/calculadora/`. Todas as fórmulas de §4.2–§4.12 conferem termo a
termo; o caso de referência do §14 fecha ao centavo como teste golden.

---

## E-15 · §8 — persistência descrita como local, implementada no servidor

**O que o V5 afirma.** §8: *"`localStorage`, chave `roiclarity:estado`, com estado completo
da conta e carimbo de versão. Compartilhamento entre dispositivos por fragmento de URL,
sem servidor. **Sem backend, sem login, sem coleta de e-mail [D 15/08]**."*

**O que o código faz.** O estado do visitante vive em `jsonb` no Postgres, com autosave
via `POST /api/publico/calculadora/[token]/estado`. O acesso é por link tokenizado
(`src/lib/api/calculator-token.ts`), com o token derivado por HMAC e só o sha256 guardado
no banco. Eventos de progresso são registrados em `calculator_link_events`.

**Por que o código está certo.** A decisão do §8 valia para a ferramenta standalone, em
que o gestor preenchia a própria conta no próprio dispositivo. Este fluxo é outro
produto: o interno gera um link, **outra pessoa** preenche sem login, e o interno precisa
ver progresso e a proposta montada. `localStorage` não atravessa essas duas pontas —
implementar o §8 aqui significaria deletar o autosave e o acompanhamento, ou seja,
remover a razão de o fluxo existir.

**O que o §8 preservou e continua valendo.** Sem login, sem e-mail, sem coleta de dado
pessoal do visitante; o IP entra só como HMAC (`MARKETING_IP_SALT`). A obrigação de
proteção que o §8 queria evitar continua evitada.

**Texto sugerido.** Acrescentar ao §8: *"A decisão 'sem backend' [D 15/08] vale para a
ferramenta standalone. O fluxo comercial de link tokenizado usa persistência
server-side — o estado é do link, não do dispositivo, porque quem preenche e quem
acompanha são pessoas diferentes. As garantias de LGPD do §8 são preservadas: sem login,
sem e-mail, IP apenas como HMAC."*

**Classificação.** Divergência de escopo, resolvida a favor da implementação. Maior
divergência doc↔código aberta.

---

## E-16 · §4.12 — a trajetória tem três painéis, não dois

**O que o V5 afirma.** §4.12: *"Dois painéis. **Painel A** compara margem acumulada sem e
com o programa… **Painel B** cruza valor acumulado com o custo anual da assinatura."*

**O que o código faz.** `trajetoria-panel.tsx` tem três abas: *Margem acumulada* (painel A,
padrão), *Margem mensal* e *Em quanto tempo se paga* (painel B).

**Por que o código está certo.** O painel mensal é onde a curva desenhada aparece e é
editada. No acumulado a soma achata a oscilação, então o gestor não vê o que acabou de
desenhar. O painel A do §4.12 continua sendo a leitura de referência e o gap no mês 12
continua sendo exatamente `G`.

**Texto sugerido.** Trocar "Dois painéis" por *"Três painéis"* e inserir: *"**Painel
mensal** mostra a margem mês a mês e é a superfície de edição — no acumulado a soma
achata a oscilação que o gestor acabou de desenhar."*

---

## E-17 · §4.12 — a edição é por sliders, e reconcilia no commit

**O que o V5 afirma.** §4.12: *"O gestor arrasta doze checkpoints mensais. **Reconciliação
iterativa** (até 50 passos, tolerância R$ 0,01), preservando `Σg = G`."* O texto descreve
a reconciliação acontecendo a cada movimento.

**O que o código faz.** Doze sliders verticais (`.slider-trajetoria`), um por mês, cada um
clampado por `pisoPonto`/`tetoPonto` via `limitesMensais`. O rascunho vive só no
componente e a soma anda livre durante a edição (a tela informa, p. ex., *"somam 149% do
total projetado"*). Nada é persistido até "Concluir edição", que chama `reReconciliar`.

**Por que o código está certo.** Reconciliar a cada frame faria o autosave gravar somas
inválidas e a página re-renderizar a cada movimento; e mexer num mês empurraria os outros
onze embaixo da mão do gestor. Reconciliar no commit preserva a forma desenhada. Os
parâmetros do §4.12 não mudaram: até 50 passos, tolerância R$ 0,01, `Σg = G` em **todo
estado persistido**, e a trajetória continua fora de `calcResultadoTime` (invariante 4,
com teste nomeado).

**Texto sugerido.** *"O gestor ajusta doze sliders mensais, cada um clampado por piso e
teto. A reconciliação iterativa (até 50 passos, tolerância R$ 0,01) roda **no commit da
edição**, não a cada movimento: durante o ajuste a soma anda livre e a tela a declara em
relação ao total projetado. `Σg = G` vale em todo estado persistido."*

**Nota.** O §4.12 já registra uma correção desta mesma natureza ("reconciliação iterativa
em vez de aditiva"). Este é o segundo passo do mesmo movimento.

---

## E-18 · §4.3 e §5 — `PCT_EVENTO_SUBSTITUIVEL` é usado sem valor definido

**O que o V5 afirma.** §4.3 usa a constante na fórmula do caminho `evento`
(`custo_evento_ano × PCT_EVENTO_SUBSTITUIVEL`) sem enunciar o valor em lugar nenhum do
documento.

**O que o código faz.** `constants.ts:52` — `PCT_EVENTO_SUBSTITUIVEL = 0.5`, com o
comentário registrando que é hipótese declarada decidida em 15/08/2026 e **pendente de
ratificação do decisor**.

**Por que é errata.** Uma fórmula do racional depende de um número que o racional não
declara. Enquanto o valor não estiver no documento, o §16 ("nenhuma premissa foi medida
em campo") não cobre esta lacuna, porque aqui nem declarada ela está.

**Texto sugerido.** Acrescentar à tabela do §5 e ao §4.3: *"`PCT_EVENTO_SUBSTITUIVEL` =
0,5 **[H]** — quanto do custo de um evento pontual é substituível por prática contínua.
Hipótese declarada, sem lastro de campo, pendente de ratificação."*

**Ação requerida do decisor.** Ratificar 0,5 ou definir outro valor.

---

## E-19 · §4.1 — margem "por faixas" sem enumeração dos valores centrais

**O que o V5 afirma.** §4.1, passo 2: *"margem de contribuição (faixas; 30% quando 'não
sei')"*. Só o caso "não sei" tem número.

**O que o código faz.** `constants.ts:115-123` enumera sete opções, e é o **valor central
da faixa** que entra no cálculo:

| Faixa | Rótulo | `pct` usado |
|---|---|---|
| `ate15` | Até 15% | 10 |
| `15a25` | 15% a 25% | 20 |
| `25a35` | 25% a 35% | 30 |
| `35a45` | 35% a 45% | 40 |
| `45a60` | 45% a 60% | 50 |
| `acima60` | Acima de 60% | 60 |
| `nao_sei` | Não sei | 30 |

**Por que é errata.** A escolha da faixa muda todas as quatro alavancas de performance e a
checagem de realidade. Sete números que movem o resultado inteiro não podem viver só no
código.

**Ponto que precisa de decisão.** `45a60 → 50` **não é o ponto médio** da faixa (52,5), e
`acima60 → 60` é o piso de uma faixa aberta. Ambos são conservadores — coerentes com P5 e
com o anti-padrão de "monetising benefits too aggressively" do §1 —, mas a regra "valor
central da faixa" não descreve os dois. Ou o documento enuncia a regra real ("ponto médio,
arredondado para baixo em dezena; faixa aberta usa o piso"), ou os valores mudam.

**Texto sugerido.** Inserir a tabela acima no §4.1 e enunciar a regra escolhida.

---

## E-20 · §10 e §16 — folha de resumo PCO listada como especificada

**O que o V5 afirma.** §10 lista *"folha de resumo PCO"* entre os itens **[E]**
(especificado e não verificado); §16 diz não cobrir a folha PCO como artefato.

**O que o código faz.** Não existe nada chamado PCO (grep em `src` e `app` → zero). Existe
`resumo-verificavel.tsx`: um bloco imprimível (`#resumo-verificavel`, único que sai na
impressão) com síntese em prosa, os 3 KPIs, a régua diária contra o gestor, as travas, a
tabela da oferta e o `Disclaimer` dentro dele.

**Por que é errata.** O item está registrado como especificado e pendente, quando na
prática o artefato equivalente foi construído com outro nome e outro recorte. Manter a
linha como está mantém uma pendência fantasma.

**Texto sugerido.** *"A folha de resumo PCO foi implementada como **Resumo verificável**
(`resumo-verificavel.tsx`): bloco imprimível com síntese, KPIs, régua diária, travas,
tabela da oferta e disclaimer. É o único bloco que a folha impressa contém — a
consequência disso é que o disclaimer precisa viver dentro dele (invariante 10)."*

---

## E-21 · §11 — os três defeitos abertos já estão corrigidos

**O que o V5 afirma.** §11 lista D-01, D-02 e D-03 como defeitos abertos [V 15/08].

**O que a auditoria de 16/08 encontrou.**

- **D-01** (curvas por time em escala errada — ganhos acumulados contra margem acumulada):
  **corrigido e coberto por teste nomeado**, `trajetoria.test.ts` → *"Painel A: séries
  acumulam margem na mesma grandeza (correção D-01)"*.
- **D-02** (`Area dataKey="gap"` com `stackId` assume gap não negativo, quebra em curva-J):
  **não se aplica mais**. Não há Recharts no projeto; os painéis são `<svg><path>`
  próprio, então a classe inteira de defeito deixou de existir junto com a biblioteca.
- **D-03** (copy *"trajetória provável sem o programa"* afirma probabilidade não
  calculada): **corrigido**. A palavra "provável" não existe na árvore da calculadora; a
  legenda é *"Trajetória sem o programa (margem atual projetada)"* — exatamente a redação
  que o próprio §11 sugeriu.

**Texto sugerido.** Fechar os três no §11, registrando D-02 como resolvido por mudança de
abordagem de renderização (não por correção pontual).

---

## E-22 · §10 — estado de implementação e contagem de testes vencidos

**O que o V5 afirma.** §10: *"**Testes:** 123 reportados pelo ambiente em 15/08, dos quais
43 cobrem a consolidação multi-time."* E: *"Verificado em 14/08, não relido em 15/08:
`calc.ts`"*.

**O que a auditoria de 16/08 mediu.** `npx vitest run` → **368 testes em 29 arquivos, todos
verdes**; **143** em `src/lib/calculadora/` (10 arquivos). `calc.ts` foi relido
integralmente em 16/08 e as fórmulas de §4.3–§4.6 conferem termo a termo — o rótulo
**[V 14/08]** dessas seções pode subir para **[V 16/08]**.

**Texto sugerido.** Atualizar os números e o rótulo de proveniência. Registrar que a
suíte **foi executada** nesta verificação, o que resolve uma das lacunas declaradas no
§16 (*"não cobre execução da suíte de testes pelos autores deste documento"*).

---

## E-23 · Selos de evidência — redação e caixa divergem do documento

**O que o V5 afirma.** §4.12 usa `PROJEÇÃO` e `DADO DO CLIENTE` em versal.

**O que o código faz.** `selo-evidencia.tsx` tem seis selos em sentence case: "Projeção",
"Dados fornecidos", "Premissa declarada", "Estimativa", "Parâmetros personalizados", "Não
somado ao ROI".

**Por que o código está certo.** O próprio arquivo registra a decisão (`:13-22`): versal é
notação de documento, não de interface, e "dado do cliente" descreve a origem do ponto de
vista de quem escreveu o racional, não de quem preenche a tela. O comentário no código já
diz, literalmente, *"divergência de redação a registrar no documento"* — esta errata é o
cumprimento daquele registro.

**Texto sugerido.** Nota no §4.12: *"Os rótulos em versal são notação deste documento. Na
interface os selos aparecem em sentence case, e `DADO DO CLIENTE` é rendido como 'Dados
fornecidos' — a origem é declarada do ponto de vista de quem preenche."*

---

## Pendências que precisam de decisão (§2 reserva ao decisor)

Achadas na auditoria de 16/08 e **deixadas sem código** por serem alteração no que o
racional declara exibido. Cada uma tem duas saídas legítimas.

### P-05 · Teto de eficiência não é linha exibida

O §7 lista o teto de eficiência entre as cinco *"linhas exibidas e não somadas"*, todas
com selo e racional. Na tela ele não é linha: `resultado-time.tsx` lê `teto_eficiencia`
só para derivar o booleano `tetoMordeu`, que anexa uma cláusula a "Economia declarada"
**apenas quando o teto morde**. Quando não morde, o número nunca aparece.

- **(a)** Exibir como linha permanente, com selo `nao_somado`, alinhando ao §7.
- **(b)** Errata tirando-a da lista do §7 e registrando que o teto se declara quando
  limita. *Recomendação da auditoria:* (b) — mostrar um teto que não está mordendo é ruído
  numa etapa que já tem dez blocos.

### P-06 · "Fila" não é exposta no consolidado

O §4.11 lista cinco métricas recalculadas a partir dos totais: *fila*, cobertura, receita
por vendedor, conversão e ciclo médios. `ResultadoConsolidado` expõe quatro —
`totalOportunidades` é calculado em `consolidado.ts` e descartado. Por time a fila existe
("Fila para treinar o time inteiro").

- **(a)** Expor `totalOportunidades` no tipo e na tela consolidada.
- **(b)** Errata tirando "fila" da lista do §4.11, se a intenção era a métrica por time.

### P-07 · Invariante 2 e o arredondamento do ROI

O invariante 2 diz *"ROI sempre exibido, sem supressão nem arredondamento para cima"*.
`formatX` usa `toLocaleString` com 2 casas, ou seja, arredondamento ao mais próximo:
1,996 vira `"2,00×"`. O caso do §14 (1,95115 → `"1,95×"`) arredonda para baixo e fecha, e a
intenção do invariante — não esconder, não inflar — está atendida.

- **(a)** Truncar em vez de arredondar, atendendo a leitura literal.
- **(b)** Reescrever o invariante como *"sem supressão e sem arredondamento que cruze a
  unidade"*. *Nota:* o risco real é estreito — só valores em `[x,995 ; x,999]` sobem de
  unidade na exibição.

---

## Verificado sem divergência

Registrado para que a próxima auditoria não refaça o trabalho. Conferido por leitura
direta em 16/08/2026, com os testes que sustentam cada item.

- **§4.2** fator de escopo: fórmula, faixa 0,25–6, fallback 2,1, origem declarada na tela,
  ressalva de treino em grupo abaixo de 1.
- **§4.3** eficiência: quatro caminhos excludentes, `(1 − SUPERVISAO)`, teto, `min()`.
- **§4.4** as quatro alavancas termo a termo, incluindo o ticket **sem** haircut (o §5 dá
  haircut só a rampa, ciclo e conversão — a assimetria é do documento e está correta);
  `Δconv_max = min(5; conv×0,4; 100−conv)`; ciclo em **dias** como fonte da verdade;
  interação descartada; redução de ciclo ≤ 30%.
- **§4.5** `cobertura = min(1; assentos/vendedores)`, aplicada às quatro parcelas e nunca
  à eficiência, com teste de monotonicidade varrendo 1→30 assentos.
- **§4.6** `valor_ano`, `roi`, `payback` e o gating de quatro parcelas sem resultado
  parcial (união discriminada — incompleto não tem números).
- **§4.7** checagem de realidade usa `G`, não `valorAno` (exclui a eficiência), alerta
  acima de 25%.
- **§4.8** os três cenários com os deltas exatos, Conservador default, cenário por time,
  mix declarado no consolidado. Os sliders clampam por `deltasEfetivos` e **nunca**
  relaxam: `SLIDER_TICKET_MAX`/`SLIDER_RAMPA_MAX` derivam de `CENARIOS.otimista` em vez de
  serem literais (invariante 15).
- **§4.9** escada marginal 98/82/70/60 nas fronteiras 262/573/1.243; piso de R$ 13.000
  **depois** do desconto, travando até 132 h/mês; `DESCONTO_PRAZO = 0`; degrau de serviço
  só a partir de 24 meses; níveis por assentos 30/100.
- **§4.10** as quatro métricas de granularidade, 22/264, extrato faixa a faixa com taxa
  combinada. `gap_gestores_hoje` **está** na tela, dentro da linha de headcount ("X
  gestores · R$ Y/ano"), que carrega o selo `nao_somado`.
- **§4.11** `Σvalor/Σpreço`, jamais média de ROIs; rateio por **horas** com ajuste de
  centavos no último time; estrutura compartilhada rateia gestores e custos do
  contrafactual por peso de vendedores e preserva horas por gestor, vendedores por gestor
  e salário.
- **§4.12** `piso = −margem/12`, `teto = 3(margem+G)/12 − margem/12`; `Σg = G`;
  re-reconciliação preserva a forma; oscilação nunca gerada automaticamente.
- **§5** os onze tetos e travas existem e são testados.
- **§6** invariantes 4, 7, 9, 11 e 12 têm teste nomeado. **Invariante 13 verificado**: grep
  por COGS, tier de voz, câmbio e USD retorna **zero** em `src` e `app` — nenhum dado de
  custo interno entrou no código, e a regra condicional do §9 segue não acionada.
- **§7** as cinco linhas não somadas existem no motor (`LinhaNaoSomada`).
- **§14** o caso de referência fecha inteiro como teste golden: fator 2,222 · eficiência
  56.700 · ticket 162.000 · rampa 40.320 · conversão 45.360 · G 247.680 · valor 304.380 ·
  piso 13.000 · ROI 1,951× · payback 6,15 · checagem 7,64% · R$ 19,70 e R$ 38,43 por
  assento/dia.
- **§15** gaveta e congelados corretamente **ausentes** do código: Modo Medição, ramp-in de
  benefícios, cenários lado a lado, atribuição percentual explícita.
- **P1–P6** manchete é margem; nenhum texto sugere redução de equipe; "Não é medição" na
  tela; os 18 campos do cliente nascem vazios; campo vazio produz travessão, nunca zero
  nem NaN. **P7 revogado**: ROI sempre exibido, com nota discreta abaixo de 1×.
- **§4.1** treze campos obrigatórios (com teste que trava o número) e a palavra
  "contrafactual" **não** aparece na interface — sobrevive só em comentários de `lib`.

---

## Correções de código aplicadas em 16/08/2026

Autorizadas pelo §2 (*"corrigir textos de UI que contradigam os invariantes de §6"*).
Nenhuma toca em fórmula, teto, haircut ou premissa; nenhum número mudou; suíte segue em
368 testes verdes.

1. **Invariante 10** — `celebracao-modal.tsx` passou a renderizar o `Disclaimer`. O modal
   exibe ROI, payback e valor/ano e é uma tela de resultado; a copy que já existia cobria
   P3 ("é projeção") mas não a metade contratual.
2. **Invariante 3** — a linha "Custo por hora de roleplay entregue" ganhou o selo
   `nao_somado` (era a única das cinco do §7 sem selo) e o racional anti-dupla-contagem.
3. **Invariante 3** — "Custo do time em rampa" ganhou o racional do §7: o vendedor é pago
   de qualquer forma, e a receita antecipada já está no total de performance.
4. **§4.7** — `fator_fora_faixa` passou a aparecer como aviso de coerência, junto dos
   outros dois. `fator_treino_grupo` segue fora de propósito: é ressalva metodológica, não
   incoerência de dado, e tem lugar próprio na linha de cobertura declarada.
5. **§4.7** — `AvisosCoerencia` passou a ser montado também em `link-detail.tsx`: o interno
   revisa o link antes de falar com o cliente e não via aviso nenhum.

**Lacuna de teste conhecida.** O item 1 não tem teste de regressão. O projeto roda Vitest
em `environment: "node"`, sem jsdom nem testing-library — os 368 testes são de lógica
pura. Cobrir um invariante de renderização exigiria adicionar essas dependências e mudar
o ambiente da suíte, decisão que excede uma correção de UI. Enquanto isso não for
decidido, o invariante 10 no modal está protegido só por revisão.

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
  (a fronteira do meio foi a 656 em 18/08/2026 no código e em 19/08 na planilha — E-24)
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
   P3 ("é projeção") mas não a metade contratual. *(O modal foi removido em 20/08/2026 e
   substituído por `ProcessandoResultado`, que não mostra número nenhum — não é tela de
   resultado, e por isso não carrega o `Disclaimer`. O invariante segue preservado.)*
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

---

## Incoerências do Template de 18/08/2026 (a corrigir na planilha)

Encontradas na auditoria do `Perfecting_ROI_Calculator_Template.xlsx` (SHA `1f17a03a…`)
contra o `Referencia-Completa-Formulas-ROI-Perfecting.pdf` (SHA `42d8f5f7…`), ambos
arquivados em `docs/referencia/`. São da planilha, não do nosso código — mas é a planilha
que o time lê.

**E-24 (FECHADA em 19/08/2026) — A aba comercial contradizia o motor da própria
planilha.** A "Tabela de Preços por Tier" trazia Tier 2 = 263–656 h e Tier 3 = 657–1.243 h;
a aba Premissas trazia `C31 = 573`, e é ela que o staircase de `Conta!C18` lê. Um cliente
entre 574 e 656 h/mês recebia um preço que a tabela ao lado desmentia. Decisão de 18/08:
vale a tabela comercial (656), e `ESCADA_PRECO` foi ajustada. Era a errata mais cara da
lista, porque enquanto durou **nenhuma planilha reproduzia a nossa escada** e o golden
FIESC tinha deixado de ser teste contra fonte externa para virar teste de regressão do
nosso próprio motor.

**Corrigido do lado da planilha em 19/08/2026** (decisão do decisor). No Template,
sete células: `Premissas!C31` 573 → **656**; os rótulos das faixas que o acompanham
(`Premissas!B31` "263 a 656 h", `B32` "657 a 1.243 h", `Conta!B18` "(263-656h)", `B19`
"(657-1243h)"); e, de quebra, `Motor!B52`/`B53`, que diziam "Novos vendedores/ano" e
"Meses efetivos de rampa" sobre fórmulas que leem o CICLO DE VENDAS — foi esse deslize que
induziu a regressão E-30 no arquivo derivado, e deixá-lo na FONTE armaria a mesma
armadilha para a próxima pessoa. Nada mais mudou: o diff célula a célula contra a versão
anterior acusa exatamente essas sete, e a contagem de células é idêntica (1.246).

O SHA do Template passa de `1f17a03a…` para **`96c88e20…`**. A escada da aba Conta volta a
reproduzir os dois goldens ao centavo: 800 h → 262×98 + 394×82 + 144×70 = **68.064**, taxa
combinada **85,08**; 120 h → 11.760, piso **13.000**. O golden FIESC volta a ser "o que o
Excel devolve". A divergência declarada saiu de `referencia.ts`, e `referencia.test.ts`
agora falha se alguém reabrir a contradição.

**E-25 — Rótulos da coluna B do Motor dessincronizados das fórmulas.** O PDF documenta as
fórmulas por célula e acerta; os rótulos da planilha deslizaram. `B71` diz "Valor anual
total da equipe" onde o PDF documenta `C72`; `B73`/`B74` dizem "ROI"/"Payback" onde o PDF
documenta `C81`/`C82`. Quem cruzar rótulo com fórmula erra por uma linha.

**E-26 — Duas linhas diferentes com o mesmo nome.** `B39` e `B41` são ambas "Eficiência
(R$/ano)". Pelo PDF, `C39` é a economia de coaching (bruta) e `C41` é ela limitada pelo
custo contratual (`=MIN(C40,C39)`). São a entrada e a saída do teto, com o mesmo rótulo.
Registre-se ainda que os nomes estão trocados em relação aos nossos: o que a planilha
chama de "economia de coaching" é o nosso `tetoEficienciaAno`, e o que ela chama de "custo
contratual (teto)" é o nosso `caminhoAno`. A conta (o `MIN` entre os dois) é idêntica.

**E-27 — Tradução incompleta no Motor.** Sobraram rótulos em inglês em `B21` ("Manager
cost per hour"), `B40`, `B42`, `B75`, `B76`, `B78`, `B83` e `B87`.

**E-28 — Três nomes para o plano de 2 h/assento.** "Essencial" em `Premissas!B37`, "Leve"
na aba comercial, e "Essencial" também era o nome de um NÍVEL DE SERVIÇO no nosso código.
Resolvido do nosso lado adotando Leve/Padrão/Intensivo (decisão de 18/08), o que liberou
"Essencial" para o nível de serviço. A planilha segue com os dois nomes.

**E-29 — O quirk `=C19` sobreviveu pela metade.** Na aba Comparação de Cenários, Realista
e Otimista agora recalculam o ganho de ciclo com o delta do próprio cenário, mas o
Conservador ainda herda o do cenário ativo (`=SUM(Motor!C68:L68)`). Nós recalculamos os
três; o teste anti-quirk continua em `cenarios-comparacao.test.ts`.

**Verificado sem divergência.** Toda a aba Premissas bate com `constants.ts`: encargos
1,75; jornada 200 h; supervisão residual 0,25; haircut 0,7 em rampa, ciclo e conversão (e
nenhum em ticket); `PCT_EVENTO_SUBSTITUIVEL` 0,5; fator de escopo 2,1 na faixa [0,25; 6];
piso R$ 13.000; 22 e 264 dias úteis; limite de realismo 0,25; tetos de ajuste fino
0,30/0,80/0,30 e conversão dinâmica `min(5; c×0,4; 100−c)`; os três presets de cenário; e
desconto 0 nos quatro prazos. As taxas da escada (98/82/70/60) e as fronteiras 262 e 1.243
também batem — só a do meio mudou.

**Nota sobre `PCT_EVENTO_SUBSTITUIVEL`.** Continua marcada `[H]` em `constants.ts`, mas
agora tem lastro documental: aparece em `Premissas!C15` sob o cabeçalho "Fonte: COGS V1
(ratificado 14/08)". Fica como pendência de decisão explícita se isso conta como a
ratificação que faltava — o bloco onde ela vive chama-se "PREMISSAS DECLARADAS —
EDITÁVEIS", o que sugere premissa ajustável, não constante ratificada.

## Auditoria de `ROI_Perfecting_Corrigido.xlsx` (19/08/2026)

Diff célula a célula contra o `Perfecting_ROI_Calculator_Template.xlsx` (SHA `1f17a03a…`),
ignorando valores em cache. O arquivo novo (SHA `40203d34…`, duas cópias idênticas em
`~/Downloads`) é **insumo, não fonte**: o Template e o PDF seguem mandando no motor, e o
arquivo não foi copiado para `docs/referencia/` — uma segunda planilha ali passaria a
competir com a fonte. O que ele traz de aproveitável é a aba **Custo da Inação**, absorvida
em `src/lib/calculadora/coi.ts` com cinco correções declaradas (abaixo, e em
`referencia.ts` seção `coi`).

**E-30 (FECHADA em 19/08/2026) — `Motor!C52` regrediu: o ciclo de vendas virou contagem
de contratações.** A
fórmula passou de `IF(N(Equipes!C45)>0,Equipes!C45,"")` (ciclo de vendas atual, em dias)
para `IF(N(Equipes!C36)>0,Equipes!C36,"")` (novos vendedores por ano). As células vizinhas
provam que `C52` é o ciclo: `C53 = N(C52)>=7` é a bifurcação dos sete dias, `C54 =
ROUND(C52*0,3)` é o teto de `REDUCAO_CICLO_MAX`, e `C56 = C55/C52` só significa alguma
coisa como fração de dias. A causa é E-25: o rótulo `B52` já dizia "Novos vendedores/ano"
por deslize, e a fórmula foi reescrita para casar com o rótulo errado em vez de o rótulo
ser corrigido. **Nosso `deltasEfetivos` não muda** — seguir a planilha aqui faria a
bifurcação de ciclo disparar pelo número de contratações.

**Corrigido do lado da planilha em 19/08/2026.** `Motor!C52:L52` voltaram a
`IF(N(Equipes!{col}45)>0,Equipes!{col}45,"")`, e os dois rótulos que armaram a regressão
foram com eles: `B52` → "Ciclo de vendas atual (dias)", `B53` → "Ciclo longo? (≥ 7 dias)".
Cuidado registrado: `B52` apontava para a string compartilhada 247, usada TAMBÉM por
`Custo da Inação!B29`, onde "Novos vendedores/ano" está correto — editá-la no lugar teria
corrompido o rótulo da aba nova, então entrou uma entrada nova (índice 524). O arquivo
ganhou `fullCalcOnLoad="1"` no `calcPr`, que não tinha: ele carrega valores em cache, e sem
isso as células dependentes abririam com o número velho. `Premissas!C31` também foi a 656
ali, com os mesmos quatro rótulos de faixa. SHA do arquivo: `c5f5afef…` (o original ficou
em `ROI_Perfecting_Corrigido.xlsx.bak`).

**E-31 — a aba COI mede a mesma lacuna em duas unidades incompatíveis.** A Dimensão 1 mede
cobertura em cabeças (`vendedores cobertos por gestor`); o Diagnóstico de bandwidth mede em
horas. Nos dois goldens elas se contradizem: no §14 dão 40% e 0% de lacuna, no FIESC dão
−2% e 40%. Uma das duas está sempre errada. Nós medimos em horas dos dois lados —
`horas_entregues = vendedores_por_gestor × gestores × prática_por_vendedor_hoje` contra
`vendedores × 2 h/mês` — e mantemos o bandwidth como leitura **separada e diferente**: se o
gestor sequer tem as horas. No §14 ele tem (o problema é escopo); no FIESC não tem.

**E-32 — `Custo da Inação!C9` tem um ramo dimensionalmente errado que encobre o certo.** O
primeiro ramo é `Motor!C23*Motor!C9` — horas de treino × gestores × gestores, que devolve
h·gestor onde o rótulo pede vendedores. O segundo ramo, `Equipes!C24*Motor!C9`, é o
correto, e por ser o segundo nunca é alcançado quando o Motor está preenchido. Descartado.

**E-33 — três dimensões do COI saem em receita, contra um motor inteiro em margem.** As
dimensões 2 (sub-performance), 3 (rampa estendida) e 5 (live-learning) devolvem receita;
todo o nosso racional trabalha em margem de contribuição. Lado a lado na mesma tela, é
comparação entre grandezas diferentes — e é o que faz o COI da planilha dar 5,88× (§14) e
2,62× (FIESC) o valor que o próprio motor promete. Multiplicamos as três pela margem.

**E-34 — a nota metodológica ① declara o COI "ADITIVO ao ROI".** Isso viola o invariante 1
do V5 (contrafactual ⊻ atribuição): as dimensões 3 e 5 medem exatamente os mecanismos que
as alavancas de rampa, conversão e ciclo já cobram, e somá-las conta a mesma economia duas
vezes. A tela põe o total **contra** o `valorAno` (`recuperado`/`residual`), nunca ao lado.
`faq.test.ts` e `referencia.test.ts` barram a palavra "somado" nessa copy.

**E-35 — a nota metodológica ② promete haircut de 50% "em cada dimensão"; só duas o
aplicam.** As dimensões 4 (turnover) e 6 (fila) passam inteiras. Aplicamos o haircut nas
duas. A dimensão 5 fica de fora dessa correção de propósito: ali quem faz o papel de
haircut é `COI_FRACAO_COACHAVEL = 0,2`, e empilhar outro por cima seria conservadorismo
duplo, que engana tanto quanto o otimismo.

**E-36 (fechada) — `Conta!C30`, `C31`, `C52` e `C53` estavam VAZIAS no Template.** Os
rótulos existiam ("ROI CONSOLIDADO", "PAYBACK (meses)", "G — ganhos de performance",
"Verificação") mas sem fórmula: a planilha não computava ROI nem payback. O arquivo novo as
preenche com `C29/C26`, `C26/C29*12`, `SUM(Motor!C73:L73)` e `C52/C51` — exatamente o que
`calc.ts` já fazia. Nenhuma linha de código. Vale como confirmação independente dos quatro
agregados centrais do motor.

**Correção sem efeito sobre nós.** `Premissas!C56–C59` ganharam `IFERROR(...;"")`: é defesa
contra `Equipes!C7` (cenário) em branco, que fazia o `MATCH` devolver `#N/A`. As colunas
`E`/`F` do bloco de cenários existem e batem com `CENARIOS` (ciclo 5/15/20%, conversão
0,5/2,5/3,5 p.p.). Nada a fazer.

**As demais erratas antigas seguem abertas.** E-24 foi fechada (acima). Esta rodada não
alcançou **E-26** (`B39` e `B41` continuam ambas
"Eficiência (R$/ano)"), **E-27** (doze rótulos do Motor continuam em inglês: `B15`, `B21`,
`B40`, `B42`, `B69`, `B76`, `B78`, `B79`, `B80`, `B81`, `B82`, `B84`), **E-28**
("Essencial" em `Premissas!B37` contra "Leve" na aba comercial) nem **E-29** (o Conservador
da Comparação de Cenários ainda herda o ciclo do cenário ativo). **E-25 continua aberta**:
a correção de 19/08 alinhou `B52`/`B53` nas duas planilhas, porque eram a causa direta da
E-30, mas os outros rótulos deslizados do Motor seguem como estavam.

**Verificação das fontes — pendente do decisor.** A aba cita MySalesCoach 2026, Ebsta 2024,
Gartner 2024, Dixon/McKenna HBR 2019, Deloitte 2023 e CareerTrainer.ai 2026. Nenhuma foi
confirmada. As constantes entram marcadas `[H]` e as fontes aparecem **só** em
`/calculadoras/referencia` (interno) — a tela do visitante não cita nome de pesquisa.
Confira de saída a atribuição dos 40–60% de "no decision" a "Dixon/McKenna HBR 2019": o par
de autores é o do *JOLT Effect* (2022), e a data não confere.

**Correção de código aplicada junto.** `referencia.ts` apontava
`estrutura.ts#ratearEstrutura`, símbolo inexistente (o certo é `aplicarEstrutura`). O teste
de integridade validava só o arquivo; agora valida o símbolo, importando os nove módulos
que a referência pode citar.

## Auditoria externa "OreateAI" de 20–21/08/2026

Quatro arquivos entregues em `~/Downloads`, com a pergunta "quais melhorias do motor
adotar". **Resposta: nenhuma.** Contra a planilha corrigida em 19/08
(`ROI_Perfecting_Corrigido.xlsx`, SHA `c5f5afef…`), a planilha auditada
(`Calculadora_ROI_Perfecting_Portugues_Auditada.xlsx`, SHA `1c9728e7…`) **não altera uma
única fórmula do Motor**. Altera rótulos, apaga quatro fórmulas da aba Conta e reverte a
fronteira de preço ratificada em 18/08.

O valor do material é outro e é real: **é a primeira verificação independente dos números
do motor**, e ela bate.

**O que é cada arquivo.**

| Arquivo | Veredito |
|---|---|
| `Relatorio-Problemas-Calculadora-ROI-Perfecting.pdf` | **Vazio.** 1.511 bytes, uma página em branco, sem recurso de fonte e sem operador de texto. Não é falha de extração — o PDF não tem conteúdo. |
| `Guia-Formulas-Calculadora-Perfecting.pdf` | **Duplicata.** Bytes diferentes, texto extraído **idêntico** ao `Referencia-Completa-Formulas-ROI-Perfecting.pdf` (SHA `42d8f5f7…`) já arquivado em `docs/referencia/`. Re-exportação, não documento novo. |
| `Checklist-Auditoria-Calculadora-ROI-Perfecting.pdf` | **Substantivo.** 15 páginas, 62 conferências. Único com conteúdo novo. Auditou o **FIESC inglês**, não o Template — o que explica as divergências de preço abaixo. |
| `Calculadora_ROI_..._Auditada.xlsx` | Fork da linhagem anterior a 19/08. Detalhe em E-37. |

**O que a auditoria confirma, e já estava pinado.** Todas as conferências numéricas do
checklist batem com `calc.test.ts`, dígito a dígito: teto de eficiência 370.588,24 (F-01);
as quatro alavancas 112.500 / 10.500 / 52.500 / 82.894,74 (LP-01…LP-04); eficiência 94.500
(LP-05); decomposição 352.894,74 (F-07); teste de realismo 11,5 % (F-05); 0,7895 vendas/mês
de capacidade liberada (F-02); e todas as premissas de P-01 a P-09. **A auditoria não abriu
lacuna de teste no golden FIESC — ela confirmou o que já tínhamos.** F-03, F-04 e F-08
(preço 67.068, ROI 0,4385, payback 27,37) divergem só pela fronteira do Tier 2, que é a
E-24 e está decidida: seguem valendo 68.064 / 0,4320624 / 27,7738.

**E-37 — a planilha auditada reverte a E-24.** `Premissas!C31` volta de 656 para 573, com
os quatro rótulos de faixa (`Premissas!B31`, `B32`, `Conta!B18`, `B19`) e mais
`Motor!B52`/`B53`. São **exatamente as sete células** que a correção de 19/08 tocou, no
estado exato anterior a ela: prova de que o arquivo nasceu antes da correção, não depois.
Não é decisão comercial nova — é linhagem desatualizada. **Decisão do decisor em 20/08:
vale 656.** `ESCADA_PRECO` não muda, e `referencia.test.ts` continua barrando a reabertura
da contradição.

**E-38 — `Conta!C30`, `C31`, `C52` e `C53` foram apagadas; reabre a E-36.** A versão de
19/08 as preenchia com `C29/C26`, `C26/C29*12`, `SUM(Motor!C73:L73)` e `C52/C51`. Na
auditada não existem. A planilha volta a **não computar o próprio número de capa**: o ROI
e o payback consolidados são rótulo sobre célula vazia. É por isso que o Guia de Fórmulas
precisa descrevê-los como "fórmulas implícitas de células mescladas" — não há fórmula a
documentar. Sem efeito sobre nós (`consolidado.ts` calcula os dois), mas destrói a
confirmação independente que a E-36 tinha registrado como ganho.

**E-39 — `Premissas!C56:C59` perderam o `IFERROR`.** Voltaram a
`INDEX(...MATCH(Equipes!$C$7...))` cru. Cenário em branco ou digitado errado faz o `MATCH`
devolver `#N/A`, e o erro propaga pelos quatro deltas até todo o Motor. A correção de
19/08 estava registrada aqui como "correção sem efeito sobre nós"; segue sem efeito sobre
nós e agora sem efeito nenhum, porque foi desfeita.

**E-40 — 31 rótulos do Motor foram revertidos; reabre E-25 e E-26.** A versão de 19/08
tinha o bloco `B71:B74` alinhado com as fórmulas (`B71` "RESULTADO ANUAL DA EQUIPE" como
cabeçalho, `B72` "Valor anual total", `B73` "Ganhos de performance", `B74` "Margem atual")
e `B45`/`B46` nomeando corretamente os deltas efetivos de ticket e rampa. A auditada volta
ao deslize de uma linha em `B71:B74`, e pior: joga "Delta ticket efetivo" e "Delta rampa
efetivo" em `B24`/`B25` — vinte e uma linhas acima de onde pertencem. Não é deslize de uma
linha ali, é um bloco inteiro colado no deslocamento errado. Agravante adicional: como
ela **traduziu** `B78:B85`, a planilha imprime "ROI da equipe" em `B73` **e** em `B81`, e
"Payback da equipe (meses)" em `B74` **e** em `B82` — dois pares de
rótulos idênticos sobre fórmulas diferentes, um de cada par errado. `B52`/`B53` voltam a
dizer "Novos vendedores/ano" e "Meses efetivos de rampa" sobre fórmulas que leem o ciclo de
vendas: é a armadilha exata que induziu a E-30. `B39` e `B41` continuam ambos "Eficiência
(R$/ano)" (E-26 nunca foi alcançada).

**E-41 — a tabela de cenários do checklist (§4.3) reproduz o quirk `=C19` nos TRÊS
cenários.** Ela publica Conservador 0,44 · Realista 1,00 · Otimista 1,28, e à primeira
vista é um golden pronto para `cenarios-comparacao.test.ts`. Não é. Invertendo a aritmética
a partir das parcelas que a própria auditoria publica, sobre o investimento de 804.816 que
ela usa:

```
Realista   base efic+ticket+rampa+conv = 720.750  →  ROI 1,00  ⇒  ciclo ≈ 84.066
Otimista   base                        = 946.125  →  ROI 1,28  ⇒  ciclo ≈ 84.039
Conservador (publicado)                                           ciclo   82.894,74
```

Os três usam o **mesmo** ganho de ciclo, dentro do arredondamento de duas casas do ROI
publicado. No FIESC o quirk é pior que no Template: lá só o Conservador herda; aqui
Realista e Otimista herdam também. Os nossos, recalculados por preset, são **82.894,74 /
277.941,18 / 315.000** — a diferença no Realista (193.875) explica exatamente a diferença
de ROI (0,24 × 804.816). Adotar a tabela como golden cravaria no teste o defeito que ele
existe para barrar. **Rejeitada como fonte, registrada como evidência da E-29.**

**E-42 (fechada) — SHA obsoleto em `constants.ts`.** O comentário do bloco COI citava o
Template como `1f17a03a…`; desde 19/08 o arquivo em `docs/referencia/` é `96c88e20…`, e a
própria E-24 registra a troca. Corrigido. É um dos dois lugares do código que fixam a fonte
da verdade — o outro (`referencia.ts`) não cita SHA, e é melhor que continue assim.

**E-27 é fechável, mas não por este arquivo.** Os doze rótulos em inglês do Motor estão
todos traduzidos na planilha auditada, e mais dez na aba COI. Mas ela **não é fonte**, e
portar os 30 rótulos exige carregar junto as reversões E-37 a E-40. O trabalho está
identificado: aplicar as 30 traduções sobre o Template de `docs/referencia/`, sem tocar
em `Premissas!C31` nem na coluna B das linhas 24, 25, 45, 46, 52, 53 e 71–74.
**E-26, E-28 e E-29 seguem abertas** (conferido no arquivo novo).

**A aba Custo da Inação não traz nada.** Diff contra a versão absorvida em 19/08: dez
rótulos traduzidos, zero fórmulas. **As cinco divergências declaradas (E-31…E-35) seguem
válidas sem um ajuste de vírgula** — e a auditoria não detectou nenhuma delas. O que ela
detectou na aba (COI-04, COI-06, A-02, R-07: "o salário do vendedor é opcional, a fórmula
retorna 0") é defeito real **da planilha**, e o código já resolve melhor: as dimensões 4 e
6 devolvem `null`, viram travessão com atalho ao passo 3, e nunca zero. A recomendação R-07
("tornar obrigatório ou usar default de R$ 5.000") é pior que o que temos — inventaria
custo de inação a partir de um salário que ninguém declarou.

**O bloco `Premissas!B68:E73` é constante morta.** Nasceu com a aba COI e guarda os cinco
benchmarks (0,29; 0,4; 1; 0,5; 2), mas a aba **hardcoda os mesmos valores localmente**
(`C15`, `C40`, `C46`, o `2` literal de `C65`, e a dupla `C35`/`C36` de onde `C37`
rederiva os 0,4) e nunca referencia o bloco. É
exatamente a falha que `referencia.test.ts` existe para impedir do nosso lado: um segundo
lugar onde o número mora, pronto para divergir no primeiro ajuste.

**Recomendações recusadas.**

- **R-04 (descontos progressivos por prazo: 3m=0 %, 6m=5 %, 12m=10 %, 24m=15 %)** —
  **recusada por decisão do decisor em 20/08.** `DESCONTO_PRAZO` segue 0 e prazo continua
  comprando garantias, não preço (`PRAZO_COPY`, `NIVEL_COPY`). É o mesmo motivo pelo qual
  o `Perfecting-CFO-QA-Guide.docx` foi recusado como fonte: descreve uma oferta que não
  existe. A dor que a recomendação endereça (payback de 27 meses contra contrato de 3) é
  real e já tem tratamento — o aviso `payback_excede_contrato`, que a própria auditoria
  valida em F-08/O-02.
- **R-05 / O-01 (vendedores cobertos 102 > total 100)** — avaliada, sem ação. A
  recomendação (`MAX(cobertos, total)`) está invertida; o que ela quer dizer é `MIN`. Onde
  a saturação importa nós já clampamos: `cobertura` em `calc.ts` (`min(1, assentos ÷
  vendedores)`) e `pctAtendida` em `coi.ts`. No fator de escopo o excedente é intencional —
  ali a conta é razão entre horas, não contagem de cabeças — e no FIESC não moveria a
  eficiência de qualquer forma, porque quem morde é `caminhoAno` (94.500), não o teto
  (370.588).
- **A-01 ("sem valores em cache no Template PT")** — não é defeito, é consequência de a
  planilha ser gerada por openpyxl. Fica como aviso de uso: qualquer conferência exige
  recalcular (Ctrl+Shift+F9). Vale para os quatro arquivos desta rodada.

**Testes acrescentados nesta rodada** (nenhuma linha de motor mudou):

- `cenarios-comparacao.test.ts` pinava o Conservador em absoluto e, para Realista e
  Otimista, só ordenação — e ordenação **não** detecta o quirk `=C19`, porque as outras
  três alavancas crescem sozinhas e mantêm a ordem intacta. Agora o ganho de ciclo dos três
  cenários está pinado em absoluto (E-41).
- O **teto do funil** (`Engine!C69`) não era exercido em lugar nenhum da suíte com
  `limitou === true`: no golden FIESC sobra capacidade. Ele só morde no cenário otimista,
  onde a capacidade liberada (3,75 vendas/mês) passa das oportunidades ociosas (20 × 15 % =
  3). Coberto agora nos três cenários.
- **Auditoria A-07 do Excel** (`Conta!C40`, soma dos cinco componentes = valor anual): é o
  único autoteste que a planilha faz sobre si mesma e que a nossa suíte não declarava por
  extenso. Agora está em `calc.test.ts`, nos dois goldens, junto da verificação de que
  existe valor sendo de fato excluído (`linhasNaoSomadas`) — sem isso a identidade seria
  vácua.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A §13 das diretrizes afirma que a fronteira entre a pele da calculadora e o
// app interno é "verificável: se `.pf-calc` não está no ancestral, vale este
// documento". Estes testes são o que torna a afirmação verdadeira — sem eles a
// frase é uma intenção, e o primeiro `--pf-*` que alguém mover para o `:root`
// repinta o app inteiro sem que nenhum teste reclame.
//
// No molde de `referencia.test.ts`: o valor mora num lugar só, e o teste falha
// quando ele se solta de lá.

const RAIZ = join(import.meta.dirname, "..", "..");
const CSS = readFileSync(join(RAIZ, "app", "globals.css"), "utf8");

// Comentários CITAM as regras — vários explicam por que a forma curta não serve
// num arquivo compartilhado, escrevendo-a por extenso. Citar não é violar, então
// toda asserção sobre código lê a fonte por aqui. Remover só encurta o texto:
// pode esconder uma violação, nunca inventar uma.
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function lerComponente(...caminho: string[]): string {
  return semComentarios(readFileSync(join(RAIZ, "src", "components", ...caminho), "utf8"));
}

// Devolve o corpo da primeira regra cujo seletor casa com `agulha`. Contador de
// chaves em vez de regex: `body:has(.pf-calc)` tem parênteses e um `.pf-calc`
// aninhado, e `@media` tem blocos dentro de blocos.
function corpoDaRegra(css: string, agulha: string): string {
  const inicioSeletor = css.indexOf(agulha);
  if (inicioSeletor === -1) throw new Error(`regra não encontrada: ${agulha}`);
  // A busca começa NO início da agulha, não depois dela. Procurando depois, uma
  // agulha que já traz a chave (`":root {"`) fazia o `indexOf` pular a própria
  // e casar com a do bloco seguinte: a checagem de vazamento lia o `@media` no
  // lugar do `:root`, e o `@theme inline` ficava sem guarda nenhuma — que é o
  // bloco onde um `--pf-*` repintaria o app inteiro.
  const abre = css.indexOf("{", inicioSeletor);
  if (abre === -1) throw new Error(`regra sem corpo: ${agulha}`);

  let profundidade = 0;
  for (let i = abre; i < css.length; i += 1) {
    if (css[i] === "{") profundidade += 1;
    else if (css[i] === "}") {
      profundidade -= 1;
      if (profundidade === 0) return css.slice(abre + 1, i);
    }
  }
  throw new Error(`chave não fechada: ${agulha}`);
}

describe("pele .pf-calc — a fronteira com o app interno", () => {
  it("declara os tokens da §13", () => {
    const corpo = corpoDaRegra(CSS, ".pf-calc,");
    const esperados = [
      // O canvas virou azul quase branco em 20/08/2026, e as duas paradas
      // extras são a rampa do body. Ela é rasa de propósito (1,17:1 de ponta a
      // ponta): fundo é luz de ambiente, não segunda superfície.
      ["--pf-canvas", "#f2f6fd"],
      // O topo NÃO é branco puro, e o teste guarda isso: a rampa inteira tem de
      // ficar abaixo de `--pf-surface` em claridade, senão o card fica mais
      // escuro que a página onde o gradiente é mais claro e lê como mancha.
      ["--pf-canvas-top", "#f7faff"],
      ["--pf-canvas-deep", "#e6edfa"],
      ["--pf-surface", "#fbfcff"],
      ["--pf-surface-alt", "#ffffff"],
      ["--pf-bar", "#eaf0fa"],
      ["--pf-brand", "#2e63cd"],
      ["--pf-brand-deep", "#1e4a9e"],
      // Um degrau mais fundo que o `#edf2fc` da pele creme: sobre fundo azul, o
      // tinte de "opção escolhida" perdeu o contraste de TEMPERATURA que o
      // fazia ler, e passou a se separar por claridade.
      ["--pf-brand-tint", "#e4edfb"],
      ["--pf-brand-ink", "#1e4a9e"],
      ["--pf-ink", "#1a1b1c"],
      // Frios, e não mais o oliva `#55584f`/`#6b6d65`: cinza quente sobre fundo
      // frio lê como tinta velha. 6,35:1 e 4,88:1 contra `--pf-canvas-deep`,
      // que é o pior ponto da rampa.
      ["--pf-ink-soft", "#4f5563"],
      ["--pf-ink-faint", "#5f6675"],
      ["--pf-input", "#fdf1ae"],
      ["--pf-input-border", "#e7d47a"],
      ["--pf-input-text", "#2e42bf"],
      ["--pf-line", "#dfe5f0"],
      // O painel da mensalidade (etapa 01). Os dois primeiros são o par que dá
      // 7,61:1 e 4,98:1 sobre `--pf-brand-deep`; sobre o `--pf-brand` médio o
      // segundo cairia para 3,33:1, e é esse número que escolheu o tom escuro.
      ["--pf-on-brand", "#f4f7fc"],
      ["--pf-on-brand-soft", "#b9c9e9"],
      ["--pf-on-brand-line", "#ffffff33"],
      // O fio de CONTROLE, separado do fio estrutural: é o que faz um card de
      // opção não escolhido ler como clicável em vez de como moldura. O frio
      // mantém a claridade do sépia que substituiu (2,09:1 contra 2,08:1 sobre
      // branco) — a distância entre os dois fios é que não podia mudar.
      ["--pf-line-strong", "#a9b4c8"],
      ["--pf-input-inset", "#00000014"],
      // O alerta de RISCO do COI. A tinta não entra aqui de propósito: é o
      // `trend-negative` que já existe — um segundo vermelho de texto seria a
      // divergência que a §1 existe para impedir.
      ["--pf-danger-surface", "#fdf0ec"],
      ["--pf-danger-line", "#9f0f0f40"],
    ] as const;

    for (const [token, valor] of esperados) {
      // `--pf-ink` não pode casar com `--pf-ink-soft`: exige o `:` logo depois.
      expect(corpo, `${token} deveria valer ${valor}`).toContain(`${token}: ${valor};`);
    }
  });

  // O caso que motivou o ajuste: #7c7f75 (protótipo) dá 3,52:1 sobre o canvas,
  // abaixo do piso de 4,5:1 que a própria §13 declara preservado.
  it("não usa o --pf-ink-faint reprovado do protótipo", () => {
    // Declaração, não menção: o comentário ao lado do token cita o hex
    // rejeitado de propósito, para explicar por que ele saiu.
    expect(CSS).not.toMatch(/--pf-ink-faint:\s*#7c7f75/);
  });

  it("não vaza nenhum --pf-* para o :root nem para o @theme", () => {
    // Sem comentários, pela mesma razão do resto do arquivo: o comentário que
    // explica a fronteira precisa poder escrever `--pf-*` para explicá-la.
    for (const agulha of [":root {", "@theme inline {"]) {
      expect(
        corpoDaRegra(semComentarios(CSS), agulha),
        `${agulha} não pode conter --pf-*`,
      ).not.toMatch(/--pf-/);
    }
  });

  // Modal/SelectMenu/ActionMenu/Glossário/TopProgress fazem createPortal para o
  // document.body. Sem este segundo seletor os tokens não herdam até lá e as
  // utilitárias resolvem para valor inválido — fundo transparente, não creme.
  it("declara os tokens também no body, por causa dos portais", () => {
    expect(CSS).toContain("body:has(.pf-calc)");
  });

  // A §2 proibia caixa alta e tracking positivo sem exceção. O decisor reabriu
  // os dois em 20/08/2026, para os dois níveis do §3.2 do DESIGN_SYSTEM — e a
  // exceção só vale enquanto for ESTREITA. Antes, este teste dizia "em lugar
  // nenhum"; a versão frouxa dele ("existe pelo menos um uppercase") teria
  // deixado a caixa alta voltar a se espalhar, que é exatamente o que a §2
  // existia para impedir. Por isso a asserção é de CONTAGEM: dois, e só esses
  // dois. Um terceiro seletor com caixa alta falha aqui.
  const SEM_COMENTARIOS = semComentarios(CSS);

  it("abre caixa alta só nos dois níveis do §3.2", () => {
    const ocorrencias = SEM_COMENTARIOS.match(/text-transform:\s*uppercase/g) ?? [];
    expect(ocorrencias, "só .pf-panel-title e .pf-label podem ter caixa alta").toHaveLength(2);

    for (const seletor of [".pf-calc .pf-panel-title", ".pf-calc .pf-label"]) {
      expect(corpoDaRegra(SEM_COMENTARIOS, seletor), `${seletor} deveria ter caixa alta`)
        .toMatch(/text-transform:\s*uppercase/);
    }
  });

  it("abre letter-spacing positivo só nos mesmos dois", () => {
    // `-0.035em` é tracking NEGATIVO, que a §2 sempre permitiu em título grande.
    // O que se conta aqui é só o positivo.
    const positivos = SEM_COMENTARIOS.match(/letter-spacing:\s*[^-\s][^;]*/g) ?? [];
    expect(positivos, "só os dois níveis em caixa alta levam tracking positivo").toHaveLength(2);

    expect(corpoDaRegra(SEM_COMENTARIOS, ".pf-calc .pf-panel-title")).toMatch(
      /letter-spacing:\s*0\.12em/,
    );
    expect(corpoDaRegra(SEM_COMENTARIOS, ".pf-calc .pf-label")).toMatch(
      /letter-spacing:\s*0\.1em/,
    );
  });

  // A escala do §3.2 mora numa regra CSS por nível, e não espalhada em
  // className: cada nível carrega cinco propriedades que só significam juntas,
  // e a primeira cópia à mão sairia com quatro das cinco. O teste pina que os
  // nove níveis existem e que cada um tem override DENTRO da pele — a regra
  // base é o degrau do §2, para os componentes que também rodam em link-detail.
  //
  // Nove e não oito desde 20/08/2026: `pf-card-title` é o degrau que faltava
  // entre o capítulo e a etiqueta de painel, e sem ele cinco títulos da etapa
  // 03 empatavam em 13px de caixa alta.
  it("declara os nove níveis do §3.2, com base e override", () => {
    const NIVEIS = [
      "pf-display",
      "pf-title",
      "pf-panel-title",
      "pf-card-title",
      "pf-label",
      "pf-lead",
      "pf-hint",
      // Os dois números-manchete ganharam base em 20/08/2026: saíram da capa
      // (exclusiva da jornada) para `resultado-time` e `quanto-custa`, que
      // `link-detail` renderiza fora da pele. Sem regra base a classe não vale
      // nada lá, e o número cai para os 14px herdados do body.
      "pf-num-hero",
      "pf-num-kpi",
    ];
    for (const nivel of NIVEIS) {
      expect(SEM_COMENTARIOS, `.${nivel} precisa de regra base (link-detail)`).toContain(
        `\n.${nivel} {`,
      );
      expect(SEM_COMENTARIOS, `.pf-calc .${nivel} precisa de override`).toContain(
        `.pf-calc .${nivel} {`,
      );
    }
    // A mono é EXCLUSIVA da pele: fora dela a família é a Inter, e o acesso à
    // monoespaçada continua sendo só pela `.pf-calc .pf-num` (§13). A base dos
    // dois níveis numéricos leva tamanho e tabular-nums, nunca `--pf-mono`.
    for (const nivel of ["pf-num-hero", "pf-num-kpi"]) {
      expect(
        corpoDaRegra(SEM_COMENTARIOS, `\n.${nivel} {`),
        `.${nivel} base não pode puxar a mono da pele`,
      ).not.toMatch(/--pf-mono/);
      expect(corpoDaRegra(SEM_COMENTARIOS, `.pf-calc .${nivel} {`)).toMatch(
        /--pf-mono/,
      );
    }
  });

  // §3.1: a mono da jornada é a Plex Mono, e a família da pele é a Archivo. A
  // troca acontece pela indireção `--font-app` — apontar `--font-sans` direto
  // para `--font-inter` prenderia a utilitária `font-sans` à Inter, e a Archivo
  // só chegaria a quem herdasse do body.
  it("troca a família pela indireção, não no @theme", () => {
    expect(corpoDaRegra(CSS, "@theme inline {")).toMatch(/--font-sans:\s*var\(--font-app\)/);
    expect(corpoDaRegra(CSS, ":root {")).toMatch(/--font-app:\s*var\(--font-inter\)/);
    expect(corpoDaRegra(CSS, ".pf-calc,")).toMatch(/--font-app:\s*var\(--font-archivo\)/);
    expect(corpoDaRegra(CSS, ".pf-calc,")).toMatch(/--pf-mono:\s*var\(--font-plex-mono\)/);
  });
});

describe("pele .pf-calc — componentes compartilhados com a tela interna", () => {
  const COMPONENTES = join(RAIZ, "src", "components", "calculadora");

  function importesLocais(modulo: string): string[] {
    let fonte: string;
    try {
      fonte = readFileSync(join(COMPONENTES, `${modulo}.tsx`), "utf8");
    } catch {
      return [];
    }
    return [...fonte.matchAll(/from "\.\/([a-z-]+)"/g)].map((m) => m[1]);
  }

  function alcancaveis(raizes: string[]): Set<string> {
    const vistos = new Set<string>();
    const pilha = [...raizes];
    while (pilha.length > 0) {
      const atual = pilha.pop() as string;
      if (vistos.has(atual)) continue;
      vistos.add(atual);
      pilha.push(...importesLocais(atual));
    }
    return vistos;
  }

  // A lista NÃO é escrita à mão: é o fecho transitivo dos imports a partir das
  // telas internas. Foi assim que `campo-numero` apareceu — chega ao consultor
  // por `link-detail → quanto-custa → campo-numero`, três níveis abaixo, e a
  // inspeção manual o tinha classificado como exclusivo do visitante.
  //
  // Derivar em vez de listar significa que criar um import novo que puxe um
  // componente da jornada para a tela interna faz este teste cobrá-lo sozinho.
  const RAIZES_INTERNAS = [
    "link-detail",
    "calculadora-tab",
    "links-table",
    "referencia-formulas",
    "encaminhar-modal",
    "vincular-modal",
  ];
  const COMPARTILHADOS = [...alcancaveis(RAIZES_INTERNAS)]
    .filter((m) => alcancaveis(["calculadora-app", "link-expirado"]).has(m))
    .sort();

  it("encontra os compartilhados a partir dos imports", () => {
    // Sanidade: se o fecho vier vazio (regex quebrada, pasta movida), os testes
    // abaixo passariam sem verificar nada.
    expect(COMPARTILHADOS).toContain("campo-numero");
    expect(COMPARTILHADOS.length).toBeGreaterThanOrEqual(7);
  });

  // Só valores do design system entram como fallback. O erro que este teste
  // pega não é esquecer o fallback — isso aparece na hora, o bloco fica sem
  // fundo. É pôr o valor DA PELE ali (`var(--pf-surface,#fbfaf5)`) e a tela do
  // consultor ir a creme em silêncio, num arquivo de 779 linhas.
  const FALLBACKS_PERMITIDOS = new Set([
    "#ffffff",
    "#0f172a",
    "#334155",
    "#475569",
    "#64748b",
    "#94a3b8",
    "#cbd5e1",
    "#e2e8f0",
    "#f1f5f9",
    "#f8fafc",
    "#2e63cd",
    "#3d75dd",
    "#1e4a9e",
    "#eff6ff",
    "#973c00",
    "#fffbeb",
    "#eceae4",
    "#0f9f2e",
  ]);

  it("todo fallback é um valor do design system", () => {
    // Duas formulações foram testadas antes desta. "O fallback não pode estar
    // no conjunto de valores da pele" acusa `var(--pf-input,#ffffff)`, porque
    // `#ffffff` também é `--pf-surface-alt`. "O fallback não pode ser o valor
    // do PRÓPRIO token" acusa `var(--pf-brand,#2e63cd)` — que é justamente o
    // arranjo certo: a pele e o design system compartilham a primária, e foi
    // essa coincidência que a escolha do azul sobre o verde comprou.
    //
    // A allowlist expressa a regra sem nenhum dos dois falsos positivos: o que
    // não pode entrar aqui é `#fbfaf5`, `#f2eee6`, `#e2ddd1`, `#fdf1ae` — os
    // valores que SÓ existem dentro da pele.
    for (const modulo of COMPARTILHADOS) {
      const fonte = lerComponente("calculadora", `${modulo}.tsx`);
      for (const [, token, valor] of fonte.matchAll(
        /var\((--pf-[a-z-]+),\s*(#[0-9a-f]{3,8})/gi,
      )) {
        expect(
          FALLBACKS_PERMITIDOS.has(valor.toLowerCase()),
          `${modulo}.tsx: o fallback ${valor} de ${token} não é valor do design system`,
        ).toBe(true);
      }
    }
  });

  // Um `--pf-ink-faded` num componente contra `--pf-ink-faint` no CSS não
  // quebra build nem lint: produz transparente em silêncio.
  it("não referencia token que não existe", () => {
    const declarados = new Set(
      [...corpoDaRegra(CSS, ".pf-calc,").matchAll(/(--pf-[a-z-]+):/g)].map((m) => m[1]),
    );
    const dir = join(RAIZ, "src", "components", "calculadora");
    for (const arquivo of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
      const fonte = semComentarios(readFileSync(join(dir, arquivo), "utf8"));
      for (const [, token] of fonte.matchAll(/[-(]\((--pf-[a-z-]+)[,)]/g)) {
        expect(declarados.has(token), `${arquivo}: ${token} não existe`).toBe(true);
      }
      for (const [, token] of fonte.matchAll(/var\((--pf-[a-z-]+)[,)]/g)) {
        expect(declarados.has(token), `${arquivo}: ${token} não existe`).toBe(true);
      }
    }
  });

  // Três regras do guia que a migração é justamente a hora de pinar: é durante
  // uma varredura de classes que elas voltariam sem ninguém notar.
  it("a jornada não viola §2 nem §3/§4", () => {
    const dir = join(RAIZ, "src", "components", "calculadora");
    for (const arquivo of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
      // Sem comentários: eles CITAM as regras, e citar não é violar.
      const codigo = semComentarios(readFileSync(join(dir, arquivo), "utf8"));

      // A mono é só para número, e o acesso é a classe `pf-num`. A forma solta
      // `font-[family-name:var(--pf-mono)]` era como ela vazava para rótulo,
      // eyebrow e cabeçalho de tabela — 12 ocorrências, todas em palavras.
      expect(codigo, `${arquivo}: mono só via pf-num (§13)`).not.toMatch(
        /font-\[family-name:var\(--pf-mono\)\]/,
      );
      expect(codigo, `${arquivo}: §3 manda flex flex-col gap-*`).not.toMatch(/space-y-/);
      expect(codigo, `${arquivo}: §2 proíbe caixa alta`).not.toMatch(/\buppercase\b/);
      expect(codigo, `${arquivo}: §2 proíbe tracking positivo`).not.toMatch(
        /tracking-(wide|wider|widest)/,
      );
      // §4: o `rounded` sem sufixo é o 4px nativo, fora da escala 16/20/28. E o
      // 14px do protótipo nunca existiu nela.
      expect(codigo, `${arquivo}: §4 exige sufixo no rounded`).not.toMatch(
        /\brounded(?![-\w])/,
      );
      expect(codigo, `${arquivo}: §4 não tem raio de 14px`).not.toMatch(/rounded-\[14px\]/);
    }
  });

  // As telas internas não conhecem a pele. Um `--pf-*` aparecendo aqui é o
  // sintoma mais direto de que a fronteira foi cruzada.
  it.each(RAIZES_INTERNAS)("%s não referencia a pele", (modulo) => {
    const fonte = lerComponente("calculadora", `${modulo}.tsx`);
    expect(fonte, `${modulo}.tsx é tela interna e não pode citar --pf-*`).not.toMatch(
      /pf-/,
    );
  });

  // `ui/` é compartilhado com o app inteiro, não só com a calculadora: um
  // `var()` sem fallback aqui apagaria fundo de botão e cor de rótulo em
  // clientes, workflow, marketing e perfil de uma vez.
  it("os primitivos de ui/ usam --pf-* só com fallback", () => {
    const dir = join(RAIZ, "src", "components", "ui");
    for (const arquivo of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
      const fonte = semComentarios(readFileSync(join(dir, arquivo), "utf8"));
      expect(fonte, `${arquivo}: forma curta não tem fallback`).not.toMatch(/-\(--pf-/);
      for (const uso of fonte.match(/var\(--pf-[^)]*\)/g) ?? []) {
        expect(uso, `${arquivo}: ${uso} está sem fallback`).toMatch(/,/);
      }
      for (const [, , valor] of fonte.matchAll(
        /var\((--pf-[a-z-]+),\s*(#[0-9a-f]{3,8})/gi,
      )) {
        expect(
          FALLBACKS_PERMITIDOS.has(valor.toLowerCase()),
          `${arquivo}: o fallback ${valor} não é valor do design system`,
        ).toBe(true);
      }
    }
  });

  it.each(COMPARTILHADOS)("%s usa --pf-* só com fallback", (modulo) => {
    const fonte = lerComponente("calculadora", `${modulo}.tsx`);
    const arquivo = `${modulo}.tsx`;

    // Forma curta do Tailwind 4: `bg-(--pf-surface)`, sem fallback possível.
    expect(fonte, `${arquivo}: use bg-[var(--pf-x,#fallback)]`).not.toMatch(
      /-\(--pf-/,
    );

    // E todo `var(--pf-…)` precisa de vírgula antes do fecha-parênteses.
    for (const uso of fonte.match(/var\(--pf-[^)]*\)/g) ?? []) {
      expect(uso, `${arquivo}: ${uso} está sem fallback`).toMatch(/,/);
    }
  });
});

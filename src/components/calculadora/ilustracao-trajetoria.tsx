// Ilustração de trajetória — a imagem que abre a etapa 01, acima da manchete.
//
// É a leitura que o produto inteiro pressupõe e que nenhuma tela dizia em
// imagem: capacitação não move um número isolado num mês, ela muda a INCLINAÇÃO
// da curva. O que a calculadora estima, das oito perguntas em diante, é o vão
// entre a trajetória com o programa e a que o time seguiria sem ele — e é esse
// vão que o desenho mostra antes de a pessoa digitar qualquer coisa.
//
// ILUSTRATIVA, e a palavra é literal: as três séries são valores inventados,
// não há eixo com escala e o motor não é consultado (nesta etapa ainda não
// existe resultado nenhum — o preço da mensalidade não depende de premissa de
// operação). A legenda declara isso em texto, porque um gráfico sem números
// numa tela que promete "premissas declaradas" precisa dizer que é desenho.
//
// Convenções da §8.13: SVG à mão, zero dependências, `viewBox` de 640 escalando
// por `w-full`, verde só para o que entra na conta, série de referência
// tracejada e slate, e TODO texto fora do desenho — em 358px de largura um
// rótulo de 13px dentro do viewBox chegaria à tela com 7px. As duas exceções à
// regra do texto são HTML por cima do SVG, não `<text>`: o selo do marco (que
// fica na faixa vazia do topo) e a legenda, que é `div` com traço, como a §8.13
// pede.
//
// Arquivo EXCLUSIVO da jornada pública (só `etapa-mensalidade` o importa), por
// isso a forma curta `stroke-(--pf-line)` sem fallback: `link-detail` não o
// renderiza, e o teste da fronteira em `design-tokens.test.ts` deriva essa
// classificação do fecho de imports em vez de uma lista à mão.

type Ponto = { x: number; y: number };

const VB_W = 640;
const VB_H = 202;

// A faixa vertical do desenho: `Y_TOPO` é v = 1 e `Y_BASE` é v = 0. Acima de
// `Y_TOPO` sobra a faixa em que o selo do marco flutua — no eixo do marco a
// série mais alta é a virada (v = 0,53), bem abaixo do selo, então ele não tem
// o que cobrir em largura nenhuma.
const Y_TOPO = 44;
const Y_BASE = 190;
const Y_EIXO = 194;
const X_EIXO = 8;
const X_INICIO = 20;
// O marco fica em 53% da largura, não na metade: o passado precisa de espaço
// para oscilar (é a oscilação que faz o "histórico" parecer medição), e o
// futuro só precisa mostrar duas retas se afastando.
const X_MARCO = 340;
const X_FIM = 606;
const X_CHAVE = 622;

// Uma constante por arquivo (§8.13), sincronizada com `--color-trend-positive`.
// Verde é "entra na conta" e aqui ele pinta exatamente isso: a curva com o
// programa e o vão que a calculadora vai converter em reais.
const VERDE = "#0F9F2E";

// As três séries, em fração da altura útil. O histórico oscila e não tem
// tendência; as duas projeções saem do MESMO ponto, que é o que torna o
// desenho uma comparação e não dois gráficos vizinhos.
const HISTORICO = [
  0.3, 0.44, 0.55, 0.46, 0.49, 0.35, 0.22, 0.4, 0.57, 0.44, 0.39, 0.56, 0.57, 0.53,
];
const COM_PROGRAMA = [0.53, 0.62, 0.69, 0.76, 0.81, 0.87, 0.92, 0.96];
const SEM_PROGRAMA = [0.53, 0.47, 0.42, 0.44, 0.39, 0.41, 0.37, 0.35];

const alturaDe = (v: number) => Y_BASE - v * (Y_BASE - Y_TOPO);

function serie(valores: number[], x0: number, x1: number): Ponto[] {
  const passo = (x1 - x0) / (valores.length - 1);
  return valores.map((v, indice) => ({ x: x0 + indice * passo, y: alturaDe(v) }));
}

const arred = (n: number) => Math.round(n * 10) / 10;
const par = (p: Ponto) => `${arred(p.x)} ${arred(p.y)}`;

/** Linha quebrada — o histórico, que é medição e não deve parecer tendência. */
function reta(pontos: Ponto[]): string {
  return pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${par(p)}`).join(" ");
}

/**
 * Catmull-Rom convertida em Bézier cúbica — as duas projeções.
 *
 * Suave de propósito, contra o histórico anguloso: a diferença de traço é o que
 * diz, sem legenda, que um lado é o que aconteceu e o outro é o que se projeta.
 */
const TENSAO = 0.9;

function curva(pontos: Ponto[]): string {
  const partes = [`M ${par(pontos[0])}`];
  for (let i = 0; i < pontos.length - 1; i += 1) {
    const p0 = pontos[i - 1] ?? pontos[i];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2] ?? p2;
    const c1 = {
      x: p1.x + ((p2.x - p0.x) / 6) * TENSAO,
      y: p1.y + ((p2.y - p0.y) / 6) * TENSAO,
    };
    const c2 = {
      x: p2.x - ((p3.x - p1.x) / 6) * TENSAO,
      y: p2.y - ((p3.y - p1.y) / 6) * TENSAO,
    };
    partes.push(`C ${par(c1)} ${par(c2)} ${par(p2)}`);
  }
  return partes.join(" ");
}

const PONTOS_HISTORICO = serie(HISTORICO, X_INICIO, X_MARCO);
const PONTOS_COM = serie(COM_PROGRAMA, X_MARCO, X_FIM);
const PONTOS_SEM = serie(SEM_PROGRAMA, X_MARCO, X_FIM);

const D_HISTORICO = reta(PONTOS_HISTORICO);
const D_COM = curva(PONTOS_COM);
const D_SEM = curva(PONTOS_SEM);
// O vão: a curva de cima, a descida pela borda direita e a de baixo ao
// contrário. `replace("M", "L")` troca só o primeiro comando — a volta precisa
// continuar o mesmo contorno, não começar um subcaminho novo.
const D_VAO = `${D_COM} ${curva([...PONTOS_SEM].reverse()).replace("M", "L")} Z`;

const VAO_TOPO = alturaDe(COM_PROGRAMA[COM_PROGRAMA.length - 1]);
const VAO_BASE = alturaDe(SEM_PROGRAMA[SEM_PROGRAMA.length - 1]);

const MARCO = PONTOS_COM[0];

const DESCRICAO =
  "Ilustração de trajetória: a performance do time oscila sem tendência até o " +
  "início do programa; a partir dali a curva com o programa sobe de forma " +
  "contínua, enquanto a trajetória provável sem ele segue estável. A área " +
  "entre as duas é o que esta calculadora estima em reais.";

export function IlustracaoTrajetoria() {
  return (
    <figure className="flex flex-col gap-4">
      <div className="relative">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full"
          role="img"
          aria-label={DESCRICAO}
        >
          <defs>
            {/* O vão desmaia para baixo: cheio em cima, quase nada na borda do
                slate. Sem a rampa, uma área verde chapada de 70px competiria em
                peso com a própria curva — e quem carrega o sinal é a curva. */}
            <linearGradient id="pf-vao-trajetoria" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VERDE} stopOpacity={0.24} />
              <stop offset="100%" stopColor={VERDE} stopOpacity={0.03} />
            </linearGradient>
          </defs>

          <line
            x1={X_EIXO}
            y1={Y_EIXO}
            x2={VB_W - X_EIXO}
            y2={Y_EIXO}
            className="stroke-(--pf-line)"
            strokeWidth={1.5}
          />
          <line
            x1={X_EIXO}
            y1={Y_TOPO - 8}
            x2={X_EIXO}
            y2={Y_EIXO}
            className="stroke-(--pf-line)"
            strokeWidth={1.5}
          />

          {/* O marco. Tracejado vertical é anotação em qualquer gráfico — nunca
              série —, então o azul da marca aqui amarra a linha ao selo que a
              encima sem virar uma terceira curva. Ele sobe até o topo do viewBox
              de propósito: o selo é opaco e cobre esse trecho, em qualquer
              largura, sem que nada precise ser calculado em pixel. */}
          <line
            x1={MARCO.x}
            y1={6}
            x2={MARCO.x}
            y2={Y_EIXO}
            className="stroke-(--pf-brand)"
            strokeOpacity={0.45}
            strokeWidth={1.25}
            strokeDasharray="4 5"
          />

          <path d={D_VAO} fill="url(#pf-vao-trajetoria)" />

          <path
            d={D_SEM}
            fill="none"
            className="stroke-(--pf-ink-faint)"
            strokeWidth={1.75}
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
          <path
            d={D_HISTORICO}
            fill="none"
            className="stroke-(--pf-ink-faint)"
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={D_COM}
            fill="none"
            stroke={VERDE}
            strokeWidth={2.75}
            strokeLinecap="round"
          />

          {PONTOS_HISTORICO.map((p) => (
            <circle
              key={`h-${p.x}`}
              cx={p.x}
              cy={p.y}
              r={2.4}
              className="fill-(--pf-ink-faint)"
              fillOpacity={0.65}
            />
          ))}
          {/* Marcadores vazados na série de referência: o furo diz "projeção"
              antes de a legenda dizer, e é o mesmo par cheio/vazado do material
              que originou o desenho. */}
          {PONTOS_SEM.slice(1).map((p) => (
            <circle
              key={`s-${p.x}`}
              cx={p.x}
              cy={p.y}
              r={3}
              className="fill-(--pf-surface) stroke-(--pf-ink-faint)"
              strokeWidth={1.5}
            />
          ))}
          {PONTOS_COM.slice(1).map((p) => (
            <circle key={`c-${p.x}`} cx={p.x} cy={p.y} r={3.4} fill={VERDE} />
          ))}

          {/* O ponto de virada, com anel da superfície para não se fundir com o
              tracejado que passa por trás dele. */}
          <circle
            cx={MARCO.x}
            cy={MARCO.y}
            r={6}
            fill={VERDE}
            className="stroke-(--pf-surface)"
            strokeWidth={2.5}
          />

          {/* A chave que mede o vão na ponta — sem rótulo dentro do desenho: em
              360px não há altura para texto ali, e quem nomeia a área é a
              legenda abaixo. As setas dizem "esta distância"; a cor já diz de
              que distância se trata. */}
          <g stroke={VERDE} fill={VERDE}>
            <line
              x1={X_CHAVE}
              y1={VAO_TOPO + 3}
              x2={X_CHAVE}
              y2={VAO_BASE - 3}
              strokeWidth={1.25}
            />
            <path d={`M ${X_CHAVE} ${VAO_TOPO} l -3.4 5.6 l 6.8 0 Z`} stroke="none" />
            <path d={`M ${X_CHAVE} ${VAO_BASE} l -3.4 -5.6 l 6.8 0 Z`} stroke="none" />
          </g>
        </svg>

        {/* O selo do marco. `.pf-label` é o que põe a caixa alta — a string
            continua em sentence case, porque caixa é apresentação e escrevê-la
            no texto custaria a pronúncia no leitor de tela (§13). */}
        <span className="pf-label absolute top-0 left-[53.125%] -translate-x-1/2 rounded-full bg-(--pf-brand) px-3 py-1.5 whitespace-nowrap text-(--pf-on-brand) shadow-[var(--shadow-sm)]">
        Performance Perfecting
        </span>
      </div>

      {/*
        Legenda em HTML, nunca dentro do SVG (§8.13): em 358px de largura um
        `<text>` de 13px chega à tela com 7px, e aqui os rótulos são longos.
        A ressalva é IRMÃ dos dois itens, não filha do segundo: dentro dele ela
        herdava o `flex` da linha e, no mobile, aparecia colada ao traço
        tracejado — lida como se fosse o nome daquela série.
      */}
      <figcaption className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 shrink-0 rounded-full bg-trend-positive" aria-hidden />
          <span className="pf-hint text-(--pf-ink-soft)">Com o programa</span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-0 w-5 shrink-0 border-t-2 border-dashed border-(--pf-ink-faint)"
            aria-hidden
          />
          <span className="pf-hint text-(--pf-ink-soft)">
            Trajetória provável sem o programa
          </span>
        </span>
        <span className="pf-hint text-(--pf-ink-faint)">
          *Imagem meramente ilustrativa.
        </span>
      </figcaption>
    </figure>
  );
}

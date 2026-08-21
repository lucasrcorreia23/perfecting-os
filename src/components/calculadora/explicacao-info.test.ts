import { describe, expect, it } from "vitest";
import { posicionarBalao } from "./explicacao-info";

// O balão de "de onde saiu este número" renderizava FORA DA VIEWPORT — foi um
// dos dois defeitos que reprovaram a primeira versão desta camada, em
// 22/08/2026. A causa: `medir` escolhia entre abrir acima ou abaixo do gatilho
// e parava aí. Quando nenhum dos dois cabia, o balão ficava abaixo e o rodapé
// dele saía pela dobra — e, sendo `position: fixed`, ele não rola para dentro
// com a página: o fim da conta ficava simplesmente inalcançável.
//
// A geometria virou função pura para poder ser exercitada aqui, com viewports
// que não existem nesta máquina. Os três casos que a versão anterior errava
// estão pinados abaixo, cada um com o nome do erro.

const LARGURA = 300;
const MARGEM = 12;

const DESKTOP = { largura: 1440, altura: 900 };
const CELULAR = { largura: 390, altura: 780 };

/** Um gatilho de 24px, como o ícone real. */
function gatilho(top: number, left: number) {
  return { top, bottom: top + 24, left, width: 24 };
}

function cabeNaJanela(
  pos: { top: number; left: number },
  altura: number,
  janela: { largura: number; altura: number },
) {
  const largura = Math.min(LARGURA, janela.largura - MARGEM * 2);
  return (
    pos.top >= 0 &&
    pos.left >= 0 &&
    pos.top + altura <= janela.altura &&
    pos.left + largura <= janela.largura
  );
}

describe("posição do balão — nunca sai da janela", () => {
  it("abre para BAIXO quando cabe (o caso comum)", () => {
    const g = gatilho(120, 700);
    const pos = posicionarBalao({ gatilho: g, altura: 220, janela: DESKTOP });
    expect(pos.top).toBe(g.bottom + 8);
  });

  it("sobe quando não cabe embaixo e cabe melhor em cima", () => {
    const g = gatilho(700, 700);
    const pos = posicionarBalao({ gatilho: g, altura: 220, janela: DESKTOP });
    expect(pos.top).toBe(g.top - 8 - 220);
    expect(cabeNaJanela(pos, 220, DESKTOP)).toBe(true);
  });

  // O DEFEITO 1: gatilho embaixo, balão alto, nenhum dos dois lados cabe. A
  // versão anterior devolvia `r.bottom + 8` e o rodapé saía pela dobra.
  it("prende à janela quando não cabe nem acima nem abaixo", () => {
    const altura = 700;
    const pos = posicionarBalao({ gatilho: gatilho(600, 700), altura, janela: DESKTOP });
    // O lado escolhido deixa de importar aqui — o que importa é que as duas
    // pontas fiquem dentro. A versão anterior devolvia 632, e os 432px de baixo
    // saíam pela dobra sem forma de rolar até eles.
    expect(pos.top).toBeGreaterThanOrEqual(MARGEM);
    expect(pos.top + altura).toBeLessThanOrEqual(DESKTOP.altura);
    expect(cabeNaJanela(pos, altura, DESKTOP)).toBe(true);
  });

  // O DEFEITO 2: o mesmo, pelo topo — um balão altíssimo virado para cima
  // devolvia `top` negativo, e o título ficava acima da janela.
  it("nunca devolve topo negativo", () => {
    const g = gatilho(40, 700);
    const pos = posicionarBalao({ gatilho: g, altura: 860, janela: DESKTOP });
    expect(pos.top).toBeGreaterThanOrEqual(MARGEM);
  });

  // O DEFEITO 3: gatilho encostado na borda direita. Centrar sem prender jogava
  // metade do balão para fora — e no celular isso vale para quase toda a tela.
  it.each([
    ["borda direita", 1420, DESKTOP],
    ["borda esquerda", 4, DESKTOP],
    ["celular, borda direita", 370, CELULAR],
    ["celular, borda esquerda", 8, CELULAR],
  ] as const)("prende ao eixo horizontal: %s", (_, left, janela) => {
    const pos = posicionarBalao({ gatilho: gatilho(300, left), altura: 220, janela });
    expect(cabeNaJanela(pos, 220, janela)).toBe(true);
  });

  it("no celular a largura cede para a janela, não o contrário", () => {
    const pos = posicionarBalao({ gatilho: gatilho(300, 200), altura: 220, janela: CELULAR });
    expect(pos.left).toBeGreaterThanOrEqual(MARGEM);
    expect(pos.left + Math.min(LARGURA, CELULAR.largura - MARGEM * 2)).toBeLessThanOrEqual(
      CELULAR.largura,
    );
  });

  // A rede de segurança do conteúdo: mesmo preso à janela, um balão mais alto
  // que ela precisa rolar por dentro em vez de cortar a última linha.
  it("devolve um teto de altura utilizável em janela curta", () => {
    const curta = { largura: 1440, altura: 420 };
    const pos = posicionarBalao({ gatilho: gatilho(200, 700), altura: 600, janela: curta });
    expect(pos.maxAltura).toBeGreaterThanOrEqual(160);
    expect(pos.top).toBeGreaterThanOrEqual(MARGEM);
  });

  // Varredura: o gatilho em qualquer ponto de uma tela, com o balão na altura
  // real (a conta tem no máximo quatro linhas, o que dá ~230px).
  it.each([DESKTOP, CELULAR])("cabe em qualquer posição de %o", (janela) => {
    for (let top = 0; top < janela.altura; top += 37) {
      for (let left = 0; left < janela.largura; left += 53) {
        const pos = posicionarBalao({ gatilho: gatilho(top, left), altura: 230, janela });
        expect(
          cabeNaJanela(pos, 230, janela),
          `gatilho em (${left}, ${top}) escapou para (${pos.left}, ${pos.top})`,
        ).toBe(true);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { detectarFormato, lerImportacao, segmentarFalas } from "./importar";
import { normalizarRotulo } from "./respostas";
import { perguntasDoPerfil } from "./roteiro";

/*
 * As fixtures sao material REAL: os dois formatos de transcricao saem das
 * ferramentas que a equipe usa (Grain via Meet, e a colagem direta do Meet), e
 * a ficha e o template do PDF do roteiro com as caixas marcadas.
 */

const FICHA = `BLOCO 0 - REGISTRO DO MODERADOR

Perfil: ( ) Gestor (x) Vendedor
Fluxo testado: ( ) Configuração ( ) Preparação (x) Chamada ( ) Feedback
Participante de loja física: ( ) Sim (x) Não
Dispositivo: (x) Celular ( ) Tablet ( ) Notebook ( ) Desktop
Sistema operacional: (x) Android ( ) iOS
Data: 28/08/2026
Duração: 45 min
Produto/serviço vendido: Painel solar residencial
Objeção ou situação escolhida: preço: está caro demais

BLOCO 1 - OBSERVAÇÃO DURANTE A TAREFA

Localizou o roleplay atribuído: (x) Sozinho ( ) Com ajuda ( ) Não encontrou
Iniciou a chamada: ( ) Sozinho (x) Com ajuda ( ) Não concluiu
Finalizou a chamada: (x) Sim ( ) Não
Acessou o feedback: ____
Erros técnicos (áudio, latência, corte, travamento): áudio cortou duas vezes

BLOCO 2 - PERGUNTAS FECHADAS AO PARTICIPANTE

1. O quão fácil ou difícil foi realizar essa tarefa?: 5
2. De 0 a 10, o quanto a conversa pareceu real?: 7
5. Você faria esse roleplay de novo por vontade própria essa semana?: ( ) Sim (x) Só se me pedissem ( ) Não
6. Se fosse treinar de verdade, quando você faria?: (x) Não faria

BLOCO 3A - PERGUNTAS ABERTAS - VENDEDOR

1. Descreva a sua experiência.: No começo me perdi procurando onde ficava o
briefing, mas depois que achei foi tranquilo.
Achei o feedback direto ao ponto.
7. O que te irritou, mesmo que pareça bobagem?: O botão de encerrar fica muito perto do de mudo.`;

const GRAIN = `# [Perfecting] Sessão de teste

## Transcript

**[00:01]** **Nádia Morgado:** Oi, tudo bem? Antes de começar, posso gravar?

**[00:35]** **Tércio:** Pode sim, sem problema.

**[12:04]** **Nádia Morgado:** De 0 a 10, o quanto a conversa pareceu real?

**[12:11]** **Tércio:** Olha, uns 7. Ele respondia rápido demais.
Cliente de verdade enrola mais que isso.`;

const MEET = `Alinhamento de teste
seg., 28 de ago. de 2026

0:00 - Lucas Correia
Bom, vamos começar. Você consegue achar o roleplay que te mandei?

0:12 - Participante
Deixa eu ver aqui. Acho que é esse aqui em cima, né?

0:20 - Lucas Correia
Isso mesmo.`;

describe("detectarFormato", () => {
  it("reconhece a ficha pelos cabeçalhos e rótulos", () => {
    expect(detectarFormato(FICHA)).toBe("ficha");
  });

  it("reconhece as duas transcrições", () => {
    expect(detectarFormato(GRAIN)).toBe("transcricao");
    expect(detectarFormato(MEET)).toBe("transcricao");
  });

  it("texto vazio é desconhecido", () => {
    expect(detectarFormato("   \n  ")).toBe("desconhecido");
  });

  /*
   * A detecção é escore e a palavra final é humana. Uma transcrição contém
   * "Nome:", que é literalmente `Rótulo: valor`, e uma ficha pode conter
   * "00:12 - Lucas" dentro de uma resposta aberta.
   */
  it("aceita o formato imposto pela pessoa", () => {
    const leitura = lerImportacao(GRAIN, { formato: "ficha" });
    expect(leitura.formato).toBe("ficha");
    expect(leitura.falas).toHaveLength(0);
  });
});

describe("segmentarFalas", () => {
  it("lê o formato do Grain com tempo e falante", () => {
    const falas = segmentarFalas(GRAIN);
    expect(falas).toHaveLength(4);
    expect(falas[0]).toMatchObject({ tempo: "00:01", falante: "Nádia Morgado" });
    expect(falas[3].texto).toContain("uns 7");
  });

  it("junta a continuação à fala anterior", () => {
    const falas = segmentarFalas(GRAIN);
    expect(falas[3].texto).toContain("Cliente de verdade enrola mais");
    expect(falas.some((fala) => fala.falante === null)).toBe(false);
  });

  it("lê o formato do Meet, com o texto na linha seguinte", () => {
    const falas = segmentarFalas(MEET);
    expect(falas).toHaveLength(3);
    expect(falas[0]).toMatchObject({ tempo: "0:00", falante: "Lucas Correia" });
    expect(falas[1].texto).toContain("Acho que é esse aqui em cima");
  });

  /*
   * FALLBACK HONESTO: nada casou, mas há texto. Devolver [] faria a tela dizer
   * "não há transcrição" sobre um texto que existe — e é dele que os trechos
   * vão ser citados.
   */
  it("texto sem padrão vira uma fala sem falante", () => {
    const falas = segmentarFalas("anotação corrida da sessão, sem marcação nenhuma");
    expect(falas).toHaveLength(1);
    expect(falas[0].falante).toBeNull();
    expect(falas[0].texto).toContain("anotação corrida");
  });

  it("texto vazio não vira fala nenhuma", () => {
    expect(segmentarFalas("  \n ")).toHaveLength(0);
  });
});

describe("lerImportacao - ficha", () => {
  const leitura = lerImportacao(FICHA);

  it("resolve perfil e varejo antes de casar o resto", () => {
    expect(leitura.perfil).toBe("vendedor");
    expect(leitura.varejo).toBe(false);
  });

  it("lê a opção marcada, ignorando as vazias", () => {
    expect(leitura.respostas.b0_fluxo).toBe("chamada");
    expect(leitura.respostas.b0_dispositivo).toBe("celular");
    expect(leitura.respostas.b1_iniciou_chamada).toBe("com_ajuda");
  });

  /*
   * O contraexemplo que proíbe casamento aproximado: "Só se me pedissem" (Q5) e
   * "Não faria" (Q6) convivem, e "Não" é opção da Q5. Qualquer includes trocaria
   * um pelo outro conforme a ordem de iteração.
   */
  it("não confunde 'Não' com 'Não faria'", () => {
    expect(leitura.respostas.b2_faria_de_novo).toBe("so_se_pedissem");
    expect(leitura.respostas.b2_quando_treinaria).toBe("nao_faria");
  });

  it("lê escala, data e duração", () => {
    expect(leitura.respostas.b2_facilidade).toBe(5);
    expect(leitura.respostas.b2_conversa_real).toBe(7);
    expect(leitura.respostas.b0_data).toBe("2026-08-28");
    expect(leitura.respostas.b0_duracao).toBe(45);
  });

  it("preserva dois-pontos dentro do valor", () => {
    expect(leitura.respostas.b0_objecao).toBe("preço: está caro demais");
  });

  /*
   * Os Blocos 3A e 3B são 21 perguntas abertas, e resposta aberta é parágrafo.
   * Sem a regra de continuação, tudo depois da primeira quebra viraria "linha
   * não reconhecida".
   */
  it("junta a resposta aberta que ocupa mais de uma linha", () => {
    const experiencia = String(leitura.respostas.b3a_experiencia);
    expect(experiencia).toContain("me perdi procurando");
    expect(experiencia).toContain("feedback direto ao ponto");
  });

  it("placeholder em branco não vira resposta nem aviso", () => {
    expect(leitura.respostas).not.toHaveProperty("b1_acessou_feedback");
    expect(
      leitura.avisos.some((aviso) => aviso.mensagem.includes("Acessou o feedback")),
    ).toBe(false);
  });

  it("não lê pergunta do outro perfil", () => {
    expect(leitura.respostas).not.toHaveProperty("b1_criou_roleplay");
    expect(leitura.respostas).not.toHaveProperty("b2_gestor_parecido");
  });

  it("não lê o Bloco 4 quando não é varejo", () => {
    expect(leitura.respostas).not.toHaveProperty("b4_internet");
  });
});

describe("lerImportacao - o que ele NUNCA faz", () => {
  it("nunca lança, em nenhuma entrada", () => {
    for (const entrada of ["", "   ", "{[}]", "Perfil:", "::::", " "]) {
      expect(() => lerImportacao(entrada)).not.toThrow();
    }
  });

  /*
   * INVARIANTE 12 - valor não reconhecido sai com o bruto ao lado. Nunca zero,
   * nunca string vazia, nunca a primeira opção.
   */
  it("valor ilegível vira campo não reconhecido, com o texto original", () => {
    const leitura = lerImportacao(
      "Perfil: Gestor\nFluxo testado: Chamada\nO quão fácil ou difícil foi realizar essa tarefa?: mais ou menos",
    );
    const campo = leitura.campos.find((c) => c.perguntaId === "b2_facilidade");
    expect(campo?.status).toBe("nao_reconhecido");
    expect(campo?.valor).toBeNull();
    expect(campo?.bruto).toBe("mais ou menos");
    expect(leitura.respostas).not.toHaveProperty("b2_facilidade");
  });

  it("escala fora da régua é recusada, não grampeada", () => {
    const leitura = lerImportacao(
      "Perfil: Gestor\nO quão fácil ou difícil foi realizar essa tarefa?: 9",
    );
    expect(leitura.respostas).not.toHaveProperty("b2_facilidade");
    expect(leitura.campos.find((c) => c.perguntaId === "b2_facilidade")?.status).toBe(
      "nao_reconhecido",
    );
  });

  it("data ambígua vira nada, jamais hoje", () => {
    const leitura = lerImportacao("Perfil: Gestor\nData: 12/08");
    expect(leitura.respostas).not.toHaveProperty("b0_data");
  });

  it("sem perfil, avisa e lê só o que vale para os dois", () => {
    const leitura = lerImportacao(
      "Fluxo testado: Chamada\nO quão fácil ou difícil foi realizar essa tarefa?: 5\nDe 0 a 10, o quanto o roleplay que você criou ficou parecido com o que você imaginou?: 8",
    );
    expect(leitura.perfil).toBeNull();
    expect(leitura.avisos.map((a) => a.codigo)).toContain("perfil_indefinido");
    expect(leitura.respostas.b2_facilidade).toBe(5);
    expect(leitura.respostas).not.toHaveProperty("b2_gestor_parecido");
  });

  it("aceita sinônimo de rótulo", () => {
    const leitura = lerImportacao("Perfil: Gestor\nSO: Windows");
    expect(leitura.respostas.b0_sistema).toBe("windows");
  });

  it("ignora acento e caixa no rótulo", () => {
    const leitura = lerImportacao("PERFIL: Gestor\nDURACAO: 30");
    expect(leitura.perfil).toBe("gestor");
    expect(leitura.respostas.b0_duracao).toBe(30);
  });

  it("aceita a resposta escrita sem as caixas do template", () => {
    const leitura = lerImportacao("Perfil: Vendedor\nDispositivo: Notebook");
    expect(leitura.respostas.b0_dispositivo).toBe("notebook");
  });

  it("caixas todas vazias não escolhem nada", () => {
    const leitura = lerImportacao(
      "Perfil: Gestor\nDispositivo: ( ) Celular ( ) Tablet ( ) Notebook",
    );
    expect(leitura.respostas).not.toHaveProperty("b0_dispositivo");
  });
});

/*
 * O bug que este bloco pina foi encontrado pelo teste acima, não pela inspeção.
 *
 * "Descreva a sua experiência." e "O que te irritou, mesmo que pareça bobagem?"
 * são rótulos IDÊNTICOS no Bloco 3A (vendedor) e no 3B (gestor). Com um índice
 * único de rótulo para id, um dos dois vencia e o outro sumia EM SILÊNCIO: a
 * resposta do vendedor ia para o id do gestor, era descartada por não estar no
 * roteiro dele, e não sobrava nem aviso.
 */
describe("rótulos que colidem entre os perfis", () => {
  const abertura = (perfil: string) =>
    `Perfil: ${perfil}\nDescreva a sua experiência.: foi tranquilo\nO que te irritou, mesmo que pareça bobagem?: o barulho`;

  it("a mesma frase cai no id do perfil que respondeu", () => {
    const vendedor = lerImportacao(abertura("Vendedor"));
    expect(vendedor.respostas.b3a_experiencia).toBe("foi tranquilo");
    expect(vendedor.respostas.b3a_irritou).toBe("o barulho");
    expect(vendedor.respostas).not.toHaveProperty("b3b_experiencia");

    const gestor = lerImportacao(abertura("Gestor"));
    expect(gestor.respostas.b3b_experiencia).toBe("foi tranquilo");
    expect(gestor.respostas.b3b_irritou).toBe("o barulho");
    expect(gestor.respostas).not.toHaveProperty("b3a_experiencia");
  });

  // A trava estrutural: dentro de UM perfil não pode haver rótulo repetido,
  // senão o índice volta a ter de escolher — e volta a perder resposta.
  it("dentro de um perfil não existe rótulo repetido", () => {
    for (const perfil of ["gestor", "vendedor"] as const) {
      for (const varejo of [false, true]) {
        const rotulos = perguntasDoPerfil(perfil, varejo).flatMap((pergunta) =>
          [pergunta.rotulo, ...(pergunta.sinonimos ?? [])].map(normalizarRotulo),
        );
        const repetidos = rotulos.filter(
          (rotulo, i) => rotulos.indexOf(rotulo) !== i,
        );
        expect(repetidos, `${perfil} varejo=${varejo}`).toEqual([]);
      }
    }
  });
});

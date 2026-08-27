// Revisão editorial do post — o que a validação NÃO cobre.
//
// `validatePostInput` cuida de integridade: título, slug, datas, URL canônica,
// HTML executável. Nada ali olha para a qualidade do que vai ao leitor, e o
// `cover_alt` atravessava o produto inteiro sem que ninguém o lesse: o campo é
// nullable no banco, a action só faz `trim()`, e a API serve o valor cru.
//
// Módulo puro no molde de `validacao-passo.ts`: não reimplementa
// obrigatoriedade nenhuma, só LÊ o que já existe e descreve o que está errado.
// Quem decide publicar continua sendo a pessoa — os achados são aviso, nunca
// bloqueio (mesma regra já escrita para o `#` duplicado do corpo).

import { parseMarkdown } from "@/lib/marketing-markdown";

// 125 é a convenção de leitor de tela: acima disso o software corta ou a
// pessoa perde o fio antes do fim da frase.
export const ALT_MAX_CHARS = 125;
// Piso baixo de propósito. Ele existe para pegar "capa", "img", "foto" — não
// para julgar redação curta. Um alt de 12 caracteres pode ser ótimo.
export const ALT_MIN_CHARS = 10;

// `defeito` é mecanicamente certo: a regra não erra. `suspeita` é heurística e
// PODE errar, então a tela precisa lê-la como pergunta, não como acusação.
// Empatar as duas é o caminho conhecido para o painel virar ruído — e quando
// ele vira ruído, o `defeito` de verdade some junto com o resto.
export type ReviewSeverity = "defeito" | "suspeita";

export type PostReviewFinding = {
  // Estável: é por ele que o teste fixa cada regra, então renomear um id é
  // mudar o contrato, não um detalhe de escrita.
  id: string;
  severity: ReviewSeverity;
  message: string;
  // Só existe quando o conserto é MECÂNICO — quando dá para gravar o valor
  // certo sem adivinhar intenção. Alt ruim não tem conserto de um clique:
  // ninguém além de quem escreveu o post sabe qual é o assunto dele.
  fix?: { label: string; value: string };
};

export type PostReviewInput = {
  title: string;
  cover_path?: string | null;
  cover_alt?: string | null;
  body_md?: string | null;
};

// Anúncio do ARTEFATO em vez do assunto. Leitor de tela já diz que o elemento
// é uma imagem, então "Imagem de…" é redundância falada. Só como PREFIXO: um
// "banner" no meio da frase costuma ser descrição legítima da cena, e a versão
// `contains` acenderia em cima dela.
const ANUNCIA_ARTEFATO =
  /^\s*(?:u[mn]a?\s+|[oa]\s+)?(?:capa|foto|imagem|ilustra[çc][ãa]o|banner|thumbnail|print|captura de tela|arte)\b/i;

// Acentos fora, caixa fora, espaço interno normalizado. NÃO usar `slugify`:
// ele corta em 80 caracteres e truncaria um título longo no meio da comparação.
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function reviewPost(input: PostReviewInput): PostReviewFinding[] {
  const achados: PostReviewFinding[] = [];
  const alt = input.cover_alt ?? "";
  const limpo = alt.trim();

  if (input.cover_path && !limpo) {
    // Sem capa não há alt a cobrar; com capa, alt em branco é o defeito que
    // deixa `og:image:alt` sair vazio no site.
    achados.push({
      id: "capa-sem-alt",
      severity: "defeito",
      message:
        "A capa está sem texto alternativo. Escreva o assunto do artigo — sem ele, o site publica a imagem sem descrição.",
    });
  } else if (limpo) {
    if (alt !== limpo) {
      achados.push({
        id: "alt-nao-trimado",
        severity: "defeito",
        message: "O texto alternativo tem espaço sobrando no começo ou no fim.",
        fix: { label: "Remover os espaços", value: limpo },
      });
    }

    if (ANUNCIA_ARTEFATO.test(limpo)) {
      achados.push({
        id: "alt-anuncia-artefato",
        severity: "defeito",
        message:
          "O texto alternativo começa anunciando que é uma imagem (“Capa do artigo…”, “Foto de…”). O leitor de tela já diz isso. Comece pelo assunto do post.",
      });
    }

    if (limpo.length > ALT_MAX_CHARS) {
      achados.push({
        id: "alt-longo-demais",
        severity: "defeito",
        message: `O texto alternativo tem ${limpo.length} caracteres. Acima de ${ALT_MAX_CHARS} o leitor de tela costuma cortar a frase.`,
      });
    }

    if (normalizar(limpo) === normalizar(input.title)) {
      achados.push({
        id: "alt-igual-ao-titulo",
        severity: "suspeita",
        message:
          "O texto alternativo repete o título. O site já cai para o título quando o alt está vazio, então assim ele não acrescenta nada.",
      });
    }

    if (limpo.length < ALT_MIN_CHARS) {
      achados.push({
        id: "alt-curto-demais",
        severity: "suspeita",
        message: `O texto alternativo tem ${limpo.length} caracteres. Confira se ele diz do que o post trata.`,
      });
    }
  }

  // O editor semeia o alt das imagens do corpo a partir do NOME DO ARQUIVO e
  // deixa o texto selecionado para ser sobrescrito — nada verifica se foi.
  // Um achado agregado, nunca um por imagem: dez imagens sem alt são um
  // problema só, e dez linhas iguais no painel afogariam o resto.
  const semAlt = parseMarkdown(input.body_md ?? "").filter(
    (bloco) => bloco.type === "image" && !bloco.alt.trim(),
  ).length;

  if (semAlt > 0) {
    achados.push({
      id: "corpo-imagem-sem-alt",
      severity: "suspeita",
      message:
        semAlt === 1
          ? "Uma imagem do corpo está sem texto alternativo."
          : `${semAlt} imagens do corpo estão sem texto alternativo.`,
    });
  }

  return achados;
}

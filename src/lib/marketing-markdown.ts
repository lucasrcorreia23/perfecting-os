// Parser de markdown mínimo que devolve uma AST tipada — nunca uma string de
// HTML. O preview do editor monta elementos React a partir dela, então não há
// dangerouslySetInnerHTML em lugar nenhum e XSS no OS é impossível por
// construção (HTML bruto vira texto; URLs perigosas deixam de ser link).
//
// O preview é auxílio de autoria: a fonte da verdade é o markdown guardado, e
// quem renderiza de verdade é o site externo. Por isso o subconjunto aqui é
// deliberadamente pequeno.
//
// Suporta: #..###### · parágrafos · **forte** · *ênfase*/_ênfase_ · `código`
//          · cercas ``` com linguagem · listas -/*/1. · > citação
//          · [texto](url) · ![alt](url) · ---
// Não suporta: HTML bruto, tabelas, notas de rodapé, listas aninhadas.

export type MdInline =
  | { type: "text"; text: string }
  | { type: "strong"; children: MdInline[] }
  | { type: "em"; children: MdInline[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; children: MdInline[] };

export type MdBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; inline: MdInline[] }
  | { type: "paragraph"; inline: MdInline[] }
  | { type: "list"; ordered: boolean; items: MdInline[][] }
  | { type: "quote"; inline: MdInline[] }
  | { type: "code"; lang: string | null; text: string }
  | { type: "image"; src: string; alt: string }
  | { type: "hr" };

const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];

// Só protocolos inofensivos ou caminhos relativos. Barra javascript:, data:,
// vbscript: e afins, inclusive com espaços/maiúsculas no meio.
export function isSafeUrl(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    try {
      return SAFE_PROTOCOLS.includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }
  // Relativo, âncora ou protocol-relative (//host) — este último herda o
  // protocolo da página, então é seguro.
  return !value.startsWith("\\");
}

export function parseMarkdown(src: string): MdBlock[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    // Cerca de código: consome até a cerca de fechamento (ou o fim do texto).
    const fence = /^```\s*([a-zA-Z0-9+#-]*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] || null;
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1; // pula a cerca de fechamento
      blocks.push({ type: "code", lang, text: body.join("\n") });
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        inline: parseInline(heading[2].trim()),
      });
      index += 1;
      continue;
    }

    // Imagem sozinha na linha vira bloco; dentro de texto continua inline.
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line.trim());
    if (image && isSafeUrl(image[2])) {
      blocks.push({ type: "image", src: image[2].trim(), alt: image[1] });
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const body: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", inline: parseInline(body.join(" ").trim()) });
      continue;
    }

    if (isListItem(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: MdInline[][] = [];
      while (
        index < lines.length &&
        isListItem(lines[index]) &&
        /^\s*\d+[.)]\s+/.test(lines[index]) === ordered
      ) {
        items.push(parseInline(stripListMarker(lines[index])));
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // Parágrafo: junta linhas até a próxima linha em branco ou início de bloco.
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !startsBlock(lines[index])
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", inline: parseInline(paragraph.join(" ")) });
    }
  }

  return blocks;
}

// Texto sem marcação, para resumo/SEO. Blocos de código ficam de fora: são
// ruído em og:description.
export function plainText(blocks: MdBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
      case "paragraph":
      case "quote":
        parts.push(inlineText(block.inline));
        break;
      case "list":
        parts.push(block.items.map(inlineText).join(" "));
        break;
      case "code":
      case "image":
      case "hr":
        break;
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function inlineText(nodes: MdInline[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.text;
        case "code":
          return node.text;
        case "strong":
        case "em":
        case "link":
          return inlineText(node.children);
      }
    })
    .join("");
}

function isListItem(line: string): boolean {
  return /^\s*([-*+]\s+|\d+[.)]\s+)/.test(line);
}

function stripListMarker(line: string): string {
  return line.replace(/^\s*([-*+]\s+|\d+[.)]\s+)/, "").trim();
}

function startsBlock(line: string): boolean {
  return (
    /^#{1,6}\s+/.test(line) ||
    /^```/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
    isListItem(line)
  );
}

// Ordem importa: código cru primeiro (o conteúdo dele não é remarcado),
// depois imagem/link, depois ênfases.
const INLINE_PATTERNS: {
  regex: RegExp;
  build: (match: RegExpExecArray) => MdInline | null;
}[] = [
  {
    regex: /`([^`]+)`/,
    build: (match) => ({ type: "code", text: match[1] }),
  },
  {
    regex: /!\[([^\]]*)\]\(([^)\s]+)\)/,
    build: (match) =>
      // Imagem inline não tem nó próprio: cai para o alt como texto.
      ({ type: "text", text: match[1] }),
  },
  {
    regex: /\[([^\]]+)\]\(([^)\s]+)\)/,
    build: (match) =>
      isSafeUrl(match[2])
        ? { type: "link", href: match[2].trim(), children: parseInline(match[1]) }
        : // URL perigosa: vira texto literal, jamais um <a>.
          { type: "text", text: `[${match[1]}](${match[2]})` },
  },
  {
    regex: /\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*/,
    build: (match) => ({ type: "strong", children: parseInline(match[1]) }),
  },
  {
    // Abertura não pode ser seguida de espaço nem o fechamento precedido por
    // um — é o que separa *ênfase* de uma multiplicação como "2 * 3".
    regex: /\*(?!\s)([^*]+?)(?<!\s)\*/,
    build: (match) => ({ type: "em", children: parseInline(match[1]) }),
  },
  {
    regex: /(?<![_\w])_([^_]+)_(?![_\w])/,
    build: (match) => ({ type: "em", children: parseInline(match[1]) }),
  },
];

function parseInline(src: string): MdInline[] {
  if (!src) return [];

  let earliest: { index: number; match: RegExpExecArray; build: (m: RegExpExecArray) => MdInline | null } | null =
    null;

  for (const pattern of INLINE_PATTERNS) {
    const match = pattern.regex.exec(src);
    if (match && (earliest === null || match.index < earliest.index)) {
      earliest = { index: match.index, match, build: pattern.build };
    }
  }

  if (!earliest) return [{ type: "text", text: src }];

  const { index, match, build } = earliest;
  const node = build(match);
  const nodes: MdInline[] = [];
  if (index > 0) nodes.push({ type: "text", text: src.slice(0, index) });
  if (node) nodes.push(node);
  const rest = src.slice(index + match[0].length);
  if (rest) nodes.push(...parseInline(rest));
  return nodes;
}

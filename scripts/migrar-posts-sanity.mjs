// Migração única: os 6 posts do blog no Sanity → marketing_posts + bucket
// marketing-media. Depois disso o site (lp-perfecting/frontend) passa a servir
// /blog a partir da API pública do OS, e o Sanity sai do projeto.
//
//   node --env-file=.env.local scripts/migrar-posts-sanity.mjs            # dry-run
//   node --env-file=.env.local scripts/migrar-posts-sanity.mjs --aplicar
//   node --env-file=.env.local scripts/migrar-posts-sanity.mjs --aplicar --forcar
//
// .mjs e não .ts de propósito: o Node 24 faz type stripping, mas os aliases
// "@/…" do tsconfig não resolvem fora do bundler. Por isso as funções abaixo
// espelham src/lib/* em vez de importar — cada uma diz qual é a sua origem.

import { createClient } from "@supabase/supabase-js";

// ── Configuração ────────────────────────────────────────────────────────────

// Dataset público: a leitura não precisa de token.
const SANITY_PROJECT = "vbd0t33h";
const SANITY_DATASET = "production";
const SANITY_API = "v2025-09-25";

// Espelham src/lib/constants.ts.
const MARKETING_MEDIA_BUCKET = "marketing-media";
const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024;

// Espelha o regex DANGEROUS_MARKUP de src/lib/marketing-post.ts. O corpo gerado
// aqui é markdown puro, mas a checagem é a rede de segurança contra HTML que
// tenha entrado no Portable Text.
const DANGEROUS_MARKUP =
  /(<\s*(script|iframe|object|embed|style|link|meta)\b)|(\bjavascript\s*:)|(\son\w+\s*=)/i;

const aplicar = process.argv.includes("--aplicar");
const forcar = process.argv.includes("--forcar");
// --corpo <slug>: imprime só o markdown convertido, para conferir a conversão
// antes de gravar. Não toca no banco.
const corpoDe = (() => {
  const i = process.argv.indexOf("--corpo");
  return i >= 0 ? process.argv[i + 1] : null;
})();

// ── Helpers espelhados de src/lib ───────────────────────────────────────────

// src/lib/marketing-slug.ts
function slugify(input) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function isValidSlug(slug) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

// src/lib/marketing-post.ts — readingMinutes()
function readingMinutes(markdown) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// src/lib/marketing-media.ts — coverPath()
function coverPath(postId, fileName) {
  return `posts/${postId}/${crypto.randomUUID()}-${fileName}`;
}

// ── Portable Text → Markdown ────────────────────────────────────────────────

// Escapa só o que reabriria como sintaxe de markdown. O conteúdo é prosa em
// português: o risco real é um "*" ou "_" literal no meio do texto e um "#" ou
// "-" abrindo linha, não construções exóticas.
function escapeInline(text) {
  return text.replace(/([\\`*_[\]])/g, "\\$1");
}

function escapeLineStart(text) {
  return text.replace(/^(\s*)([#>]|[-*+]\s|\d+\.\s)/, "$1\\$2");
}

// Um span vira **forte** ou texto cru. `marks` só contém "strong" em todo o
// dataset — qualquer outro valor é reportado para não sumir em silêncio.
function renderSpans(children, avisos, contexto) {
  return (children ?? [])
    .map((span) => {
      if (span._type !== "span") {
        avisos.push(`${contexto}: filho _type="${span._type}" ignorado`);
        return "";
      }
      const marks = span.marks ?? [];
      const desconhecidas = marks.filter((m) => m !== "strong" && m !== "em");
      if (desconhecidas.length > 0) {
        avisos.push(`${contexto}: marks não suportadas ${JSON.stringify(desconhecidas)}`);
      }
      let texto = escapeInline(span.text ?? "");
      if (!texto.trim()) return texto;
      if (marks.includes("em")) texto = `*${texto}*`;
      if (marks.includes("strong")) texto = `**${texto}**`;
      return texto;
    })
    .join("");
}

function portableTextToMarkdown(body, avisos) {
  const partes = [];
  let listaAberta = null; // "bullet" | "number" | null

  // A página do post já tem um <h1>: o título. Um "#" no corpo criaria um
  // segundo, competindo justamente com o que a página quer ranquear.
  //
  // Dois dos seis posts usam h1 como seção e h2 como subseção; os outros quatro
  // já usam h2 como seção. Achatar todo mundo em h2 destruiria a hierarquia
  // real desses dois, e rebaixar todo mundo empurraria os outros quatro para
  // h3 sem motivo. Por isso o deslocamento é decidido por post.
  const temH1 = (body ?? []).some((b) => b._type === "block" && b.style === "h1");
  if (temH1) avisos.push("corpo usa h1: todos os cabeçalhos rebaixados um nível");

  const fecharLista = () => {
    listaAberta = null;
  };

  for (const [i, bloco] of (body ?? []).entries()) {
    const contexto = `bloco ${i}`;

    if (bloco._type !== "block") {
      // Não existe nenhum hoje (0 imagens no corpo dos 6 posts). Se aparecer,
      // é conteúdo perdido — precisa gritar, não sumir.
      avisos.push(`${contexto}: _type="${bloco._type}" não convertido`);
      fecharLista();
      continue;
    }

    if ((bloco.markDefs ?? []).length > 0) {
      // markDefs é sempre [] no dataset atual. Um link aqui viraria texto sem a
      // URL — melhor avisar do que entregar um post com link perdido.
      avisos.push(`${contexto}: ${bloco.markDefs.length} markDefs (links) ignorados`);
    }

    const texto = renderSpans(bloco.children, avisos, contexto);
    if (!texto.trim()) {
      fecharLista();
      continue;
    }

    if (bloco.listItem === "bullet" || bloco.listItem === "number") {
      const marcador = bloco.listItem === "bullet" ? "-" : "1.";
      // Itens consecutivos ficam colados; a lista inteira é separada do resto
      // por uma linha em branco (o parser do OS quebra a lista se houver linha
      // em branco entre os itens).
      if (listaAberta === bloco.listItem) {
        partes[partes.length - 1] += `\n${marcador} ${texto}`;
      } else {
        partes.push(`${marcador} ${texto}`);
        listaAberta = bloco.listItem;
      }
      continue;
    }

    fecharLista();

    const original = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 }[bloco.style];
    if (original) {
      const nivel = Math.min(6, original + (temH1 ? 1 : 0));
      // Cabeçalhos vêm com o span inteiro em strong; o "#" já dá o peso e o
      // "**" dentro do heading seria ruído no markdown.
      partes.push(`${"#".repeat(nivel)} ${texto.replace(/\*\*/g, "")}`);
      continue;
    }

    if (bloco.style === "blockquote") {
      partes.push(`> ${texto}`);
      continue;
    }

    if (bloco.style && bloco.style !== "normal") {
      avisos.push(`${contexto}: style="${bloco.style}" tratado como parágrafo`);
    }

    partes.push(escapeLineStart(texto));
  }

  return partes.join("\n\n").trim();
}

// ── Mapeamento dos campos ───────────────────────────────────────────────────

// O layout do site já aplica o template "%s | Perfecting", e os metaTitle do
// Sanity terminam com o mesmo sufixo (um deles com o typo "Perfeting"). Sem
// isto a aba mostraria o nome da marca duas vezes.
function limparSeoTitle(titulo) {
  return (titulo ?? "").replace(/\s*\|\s*perfec?ting\s*$/i, "").trim();
}

// "Gestão Comercial | Performance de Vendas" → ["gestao-comercial", "performance-de-vendas"]
function converterTags(tag) {
  if (!tag) return [];
  return [...new Set(tag.split(/[|,;]/).map(slugify).filter(Boolean))].filter(isValidSlug);
}

// ── Sanity ──────────────────────────────────────────────────────────────────

const GROQ = `*[_type=="post" && defined(slug.current)]|order(publishedAt asc){
  _id, title, "slug": slug.current, publishedAt, tag, excerpt, body, author,
  "cover": coverImage{alt, asset->{url, originalFilename, mimeType}},
  "seo": seo{metaTitle, metaDescription}
}`;

async function lerPostsDoSanity() {
  const url = new URL(
    `https://${SANITY_PROJECT}.api.sanity.io/${SANITY_API}/data/query/${SANITY_DATASET}`,
  );
  url.searchParams.set("query", GROQ);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity respondeu ${res.status}`);
  const json = await res.json();
  return json.result ?? [];
}

// w=1600 + webp: os originais são PNG de ~3,5 MB a 1920×1080. Em webp caem para
// centenas de KB — bem abaixo do teto de 5 MB do bucket, e melhor de LCP.
async function baixarCapa(assetUrl) {
  const url = `${assetUrl}?w=1600&fm=webp&q=80`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`capa: CDN respondeu ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_COVER_SIZE_BYTES) {
    throw new Error(`capa: ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB acima do limite`);
  }
  return bytes;
}

// ── Execução ────────────────────────────────────────────────────────────────

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY. Rode com --env-file=.env.local.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function main() {
  if (corpoDe) {
    const posts = await lerPostsDoSanity();
    const post = posts.find((p) => p.slug === corpoDe);
    if (!post) throw new Error(`slug "${corpoDe}" não encontrado no Sanity`);
    const avisos = [];
    console.log(portableTextToMarkdown(post.body, avisos));
    for (const aviso of avisos) console.error(`! ${aviso}`);
    return;
  }

  const supabase = supabaseService();
  const posts = await lerPostsDoSanity();
  console.log(`\nSanity: ${posts.length} posts\n`);

  const { data: existentes, error: erroExistentes } = await supabase
    .from("marketing_posts")
    .select("slug");
  if (erroExistentes) throw erroExistentes;
  const jaNoOs = new Set((existentes ?? []).map((p) => p.slug));

  let migrados = 0;
  let pulados = 0;
  const falhas = [];

  for (const post of posts) {
    const avisos = [];
    const slug = post.slug;
    console.log(`── ${slug}`);

    if (!isValidSlug(slug)) {
      falhas.push(`${slug}: slug fora do formato aceito pelo banco`);
      console.log("   ✗ slug inválido\n");
      continue;
    }

    if (jaNoOs.has(slug) && !forcar) {
      pulados += 1;
      console.log("   • já existe no OS — pulando (use --forcar para sobrescrever)\n");
      continue;
    }

    const body_md = portableTextToMarkdown(post.body, avisos);
    if (!body_md) {
      falhas.push(`${slug}: corpo vazio após a conversão`);
      console.log("   ✗ corpo vazio\n");
      continue;
    }
    if (DANGEROUS_MARKUP.test(body_md)) {
      falhas.push(`${slug}: corpo contém HTML executável`);
      console.log("   ✗ HTML executável no corpo\n");
      continue;
    }

    const id = crypto.randomUUID();
    const tags = converterTags(post.tag);
    const minutos = readingMinutes(body_md);
    const seoTitle = limparSeoTitle(post.seo?.metaTitle) || null;
    const temCapa = !!post.cover?.asset?.url;
    const caminhoCapa = temCapa ? coverPath(id, "capa.webp") : null;

    console.log(`   título   ${post.title}`);
    console.log(`   data     ${post.publishedAt}`);
    console.log(`   tags     ${tags.length ? tags.join(", ") : "(nenhuma)"}`);
    console.log(`   corpo    ${body_md.length} caracteres · ${minutos} min`);
    console.log(`   seo      ${seoTitle ?? "(vazio)"}`);
    console.log(`   capa     ${temCapa ? caminhoCapa : "(sem capa)"}`);
    for (const aviso of avisos) console.log(`   ! ${aviso}`);

    if (!aplicar) {
      console.log("   (dry-run)\n");
      continue;
    }

    let capaEnviada = null;
    try {
      if (temCapa) {
        const bytes = await baixarCapa(post.cover.asset.url);
        const { error } = await supabase.storage
          .from(MARKETING_MEDIA_BUCKET)
          .upload(caminhoCapa, bytes, { contentType: "image/webp", upsert: true });
        if (error) throw error;
        capaEnviada = caminhoCapa;
        console.log(`   ↑ capa enviada (${(bytes.byteLength / 1024).toFixed(0)} KB)`);
      }

      const linha = {
        id,
        slug,
        title: post.title,
        excerpt: post.excerpt ?? null,
        body_md,
        status: "publicado",
        published_at: post.publishedAt,
        cover_path: capaEnviada,
        // `.trim()` porque o editor também trima: sem ele, um alt com espaço
        // à frente entra por aqui e chega intacto à meta tag do site.
        cover_alt: post.cover?.alt?.trim() || null,
        seo_title: seoTitle,
        seo_description: post.seo?.metaDescription ?? null,
        canonical_url: null,
        noindex: false,
        tags,
        reading_minutes: minutos,
        author_id: null,
      };

      // onConflict no slug: com --forcar, reimportar sobrescreve em vez de
      // estourar a constraint unique.
      const { error } = await supabase
        .from("marketing_posts")
        .upsert(linha, { onConflict: "slug" });
      if (error) throw error;

      migrados += 1;
      console.log("   ✓ migrado\n");
    } catch (erro) {
      // Não deixa objeto órfão no bucket — mesmo cuidado de uploadPostCover().
      if (capaEnviada) {
        await supabase.storage.from(MARKETING_MEDIA_BUCKET).remove([capaEnviada]);
      }
      falhas.push(`${slug}: ${erro.message ?? erro}`);
      console.log(`   ✗ ${erro.message ?? erro}\n`);
    }
  }

  console.log("─".repeat(60));
  if (aplicar) {
    console.log(`migrados: ${migrados} · pulados: ${pulados} · falhas: ${falhas.length}`);
  } else {
    console.log(`dry-run: ${posts.length - pulados} seriam migrados, ${pulados} pulados`);
    console.log("rode de novo com --aplicar para gravar");
  }
  for (const falha of falhas) console.log(`  ✗ ${falha}`);
  if (falhas.length > 0) process.exitCode = 1;
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});

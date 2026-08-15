import { seoDescriptionFor, seoTitleFor } from "@/lib/marketing-post";

// Como o post deve aparecer num resultado de busca — apenas apresentacional.
export function SeoPreview({
  siteUrl,
  slug,
  title,
  excerpt,
  bodyMd,
  seoTitle,
  seoDescription,
}: {
  siteUrl: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMd: string;
  seoTitle: string;
  seoDescription: string;
}) {
  const finalTitle = seoTitleFor({
    title,
    seo_title: seoTitle,
  });
  const finalDescription = seoDescriptionFor({
    title,
    excerpt,
    body_md: bodyMd,
    seo_description: seoDescription,
  });

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-slate-200 bg-white p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Prévia na busca
      </span>
      <div className="flex flex-col gap-1">
        <span className="truncate text-xs text-slate-500">
          {siteUrl}/blog/{slug || "slug-do-post"}
        </span>
        <span className="text-base font-medium text-[#1a0dab]">
          {finalTitle || "Título do post"}
        </span>
        <span className="text-sm leading-snug text-slate-600">
          {finalDescription || "A descrição será gerada a partir do resumo ou do corpo."}
        </span>
      </div>
    </div>
  );
}

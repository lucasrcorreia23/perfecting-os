import type { ReactNode } from "react";
import { requireInterno } from "@/lib/auth";
import { MarketingNav } from "@/components/marketing/marketing-nav";

// Marketing é 100% interno: o gate fica aqui, uma vez, para as três seções.
export default async function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireInterno();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">Marketing</h1>
          <p className="text-xs text-slate-500">
            Conteúdo do blog, funis de qualificação e leads captados no site.
          </p>
        </div>
        <MarketingNav />
      </div>
      {children}
    </div>
  );
}

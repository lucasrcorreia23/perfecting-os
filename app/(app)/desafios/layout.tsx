import type { ReactNode } from "react";
import { requireInterno } from "@/lib/auth";
import { DesafiosNav } from "@/components/desafios/desafios-nav";

// Desafios é 100% interno: o gate fica aqui, uma vez, para as três seções.
export default async function DesafiosLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireInterno();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">Desafios</h1>
          <p className="text-xs text-slate-500">
            Bugs, atritos e lacunas do produto — com recorrência, cruzamento por
            categoria e fluxo, e os testes de usabilidade que os originam.
          </p>
        </div>
        <DesafiosNav />
      </div>
      {children}
    </div>
  );
}

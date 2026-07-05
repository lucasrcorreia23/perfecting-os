import type { Metadata } from "next";
import { BellAlertIcon, ClockIcon } from "@heroicons/react/24/outline";
import { requireInterno } from "@/lib/auth";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = { title: "Alertas" };

// [placeholder] — tela estática; sem tabela no banco na v1.
export default async function AlertasPage() {
  await requireInterno();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <BackButton href="/workflow" />
        <h1 className="text-2xl font-semibold text-slate-900">Alertas</h1>
        <span className="inline-flex items-center rounded-full bg-[#FFFBEB] px-2.5 py-1 text-xs font-medium text-[#973C00]">
          Em breve
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-sm border border-slate-200 bg-white p-6 opacity-60">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
            <ClockIcon className="h-6 w-6 text-slate-400" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-slate-800">
              Intervalos
            </h2>
            <p className="text-xs text-slate-500">
              Defina a frequência de verificação dos prazos por etapa.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-sm border border-slate-200 bg-white p-6 opacity-60">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
            <BellAlertIcon className="h-6 w-6 text-slate-400" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-slate-800">
              Integrações
            </h2>
            <p className="text-xs text-slate-500">
              Receba alertas por e-mail e outras ferramentas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

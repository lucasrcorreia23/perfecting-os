import Image from "next/image";
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  NoSymbolIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { PERFECTING_WHATSAPP_LABEL, PERFECTING_WHATSAPP_URL } from "@/lib/constants";

const VARIANTES = {
  expirado: {
    icon: ClockIcon,
    titulo: "Este link expirou",
    texto:
      "A validade desta calculadora terminou. Peça um novo link para quem a enviou. Os dados preenchidos não se perderam.",
  },
  revogado: {
    icon: NoSymbolIcon,
    titulo: "Este link foi desativado",
    texto:
      "O acesso a esta calculadora foi encerrado. Se você acredita que é um engano, fale com quem enviou o link.",
  },
  indisponivel: {
    icon: WrenchScrewdriverIcon,
    titulo: "Calculadora indisponível",
    texto: "Não conseguimos carregar a calculadora agora. Tente novamente em instantes.",
  },
} as const;

export function LinkExpirado({ variante }: { variante: keyof typeof VARIANTES }) {
  const { icon: Icon, titulo, texto } = VARIANTES[variante];
  return (
    <main className="page-fade-in flex min-h-[100dvh] items-center justify-center bg-[#f3f6fc] p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-md border border-slate-200 bg-white p-10 text-center shadow-[var(--shadow-sm)]">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50">
          <Icon className="h-7 w-7 text-slate-400" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-slate-900">{titulo}</h1>
          <p className="text-sm leading-relaxed text-slate-500">{texto}</p>
        </div>
        <a
          href={PERFECTING_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Falar no WhatsApp ${PERFECTING_WHATSAPP_LABEL}`}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-slate-400" aria-hidden />
          Falar no WhatsApp
        </a>
        <div className="flex flex-col items-center gap-1 border-t border-slate-100 pt-4">
          <Image
            src="/logotipo.svg"
            alt="Perfecting"
            width={224}
            height={36}
            className="h-5 w-auto"
          />
          <span className="text-xs text-slate-400">Calculadora de ROI</span>
        </div>
      </div>
    </main>
  );
}

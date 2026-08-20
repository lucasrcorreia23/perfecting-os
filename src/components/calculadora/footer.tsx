import Image from "next/image";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { PERFECTING_WHATSAPP_LABEL, PERFECTING_WHATSAPP_URL } from "@/lib/constants";

// Rodapé da calculadora pública: faixa de ponta a ponta, sempre no fim da
// tela. Quem preenche não tem login nem canal aberto com o time, então o
// WhatsApp é a única saída para tirar dúvida.
export function CalculadoraFooter() {
  return (
    <footer className="mt-8 w-full border-t border-(--pf-line) bg-linear-to-t from-(--pf-bar) to-(--pf-canvas)">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between sm:px-6">
        <Image
          src="/logotipo.svg"
          alt="Perfecting"
          width={224}
          height={36}
          className="h-5 w-auto"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-(--pf-ink-soft)">
            Dúvida em algum campo? Chame a gente.
          </span>
          <a
            href={PERFECTING_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Falar no WhatsApp ${PERFECTING_WHATSAPP_LABEL}`}
            title={`WhatsApp ${PERFECTING_WHATSAPP_LABEL}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-(--pf-line) bg-(--pf-surface) text-(--pf-ink-soft) transition-colors hover:border-(--pf-ink-faint)/40 hover:text-(--pf-brand) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-brand)/35"
          >
            <ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden />
          </a>
        </div>
      </div>
    </footer>
  );
}

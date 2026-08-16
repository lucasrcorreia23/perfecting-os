"use client";

import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

// Boas-vindas do visitante: o que é, quanto tempo leva e que pode parar e
// voltar — o link guarda o preenchimento. Quantos times simular deixou de ser
// pergunta daqui: ninguém decide isso antes de ver o formulário, e o
// "Adicionar time" existe no stepper, no consolidado e na sidebar, com o
// contexto no balão de ajuda ao lado. A proposta (plano, assentos, prazo) é
// escolhida por ele no final.
export function IntroScreen({
  clientName,
  expiresAt,
  temProgresso,
  onComecar,
}: {
  clientName: string | null;
  expiresAt: string;
  temProgresso: boolean;
  onComecar: () => void;
}) {
  // O que antes era rodapé em letra miúda vira destaque: são as três respostas
  // que seguram a pessoa na tela (quanto demora, se perde o preenchimento, até
  // quando o link vale).
  const destaques = [
    {
      icone: ClockIcon,
      titulo: "~5 minutos",
      detalhe: "por time simulado",
    },
    {
      icone: CloudArrowUpIcon,
      titulo: "Salva sozinho",
      detalhe: "Volte quando quiser",
    },
    {
      icone: CalendarDaysIcon,
      titulo: "Link válido",
      detalhe: `até ${formatDate(expiresAt)}`,
    },
  ];

  return (
    // Largura medida, não arbitrada: a 672px o título fecha em 2 linhas e a
    // descrição em 3, com ~84 caracteres por linha — medida de leitura sadia,
    // que a 1024px (título em 1 linha) passava de 120.
    <div className="fade-in-up mx-auto flex w-full max-w-2xl flex-col items-center gap-8 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold leading-snug text-slate-900 sm:text-3xl">
          Quanto a prática estruturada devolve
          {clientName ? (
            <>
              {" "}
              para <span className="text-[#2E63CD]">{clientName}</span>
            </>
          ) : (
            " para a sua operação"
          )}
          ?
        </h1>
        <p className="text-sm leading-relaxed text-slate-500 sm:text-base">
          Você preenche os números da sua operação em 5 passos curtos, escolhe o
          plano e os assentos no final, e a calculadora projeta o retorno em duas
          frentes: o que você <span className="font-medium text-slate-700">deixa de gastar</span>{" "}
          e o que o time <span className="font-medium text-slate-700">passa a ganhar</span>.
          Toda premissa fica declarada na tela.
        </p>
      </div>

      <div className="grid w-full gap-2 sm:grid-cols-3">
        {destaques.map(({ icone: Icone, titulo, detalhe }) => (
          <div
            key={titulo}
            className="flex items-start gap-2.5 rounded-sm border border-slate-200 bg-white p-3 text-left sm:flex-col sm:items-center sm:gap-2 sm:p-4 sm:text-center"
          >
            <Icone className="h-5 w-5 shrink-0 text-[#2E63CD]" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold leading-tight text-slate-900">
                {titulo}
              </span>
              <span className="text-xs leading-relaxed text-slate-500">
                {detalhe}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Button variant="primary" icon={ArrowRightIcon} onClick={onComecar}>
        {temProgresso ? "Continuar de onde parei" : "Começar"}
      </Button>
    </div>
  );
}

"use client";

import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import type { PostReviewFinding } from "@/lib/marketing-post-review";
import { cn } from "@/lib/utils";

// Painel de revisão editorial. Aviso, nunca bloqueio — a mesma regra já escrita
// para o `#` duplicado do corpo, e o botão de publicar continua publicando.
//
// As duas severidades ficam em BLOCOS separados, e isso não é enfeite: um
// `defeito` é mecanicamente certo e uma `suspeita` pode errar. Empatados na
// mesma tinta, a pessoa aprende a passar o olho pelos dois — e o dia em que
// passar por cima de um defeito de verdade é o dia em que o painel deixou de
// servir para alguma coisa.

const TOM = {
  defeito: {
    Icon: ExclamationTriangleIcon,
    titulo: "Revisar antes de publicar",
    estilo: { backgroundColor: "#FFFBEB", color: "#973C00" },
    classe: "",
  },
  suspeita: {
    Icon: InformationCircleIcon,
    titulo: "Vale conferir",
    estilo: undefined,
    classe: "bg-slate-50 text-slate-600",
  },
} as const;

function Bloco({
  severity,
  findings,
  onFix,
  disabled,
}: {
  severity: keyof typeof TOM;
  findings: PostReviewFinding[];
  onFix?: (value: string) => void;
  disabled?: boolean;
}) {
  if (findings.length === 0) return null;
  const { Icon, titulo, estilo, classe } = TOM[severity];

  return (
    <div
      className={cn("flex flex-col gap-2 rounded-sm p-3 text-xs", classe)}
      style={estilo}
    >
      <p className="font-semibold">{titulo}</p>
      <ul className="flex flex-col gap-2">
        {findings.map((achado) => (
          <li key={achado.id} className="flex flex-col gap-1">
            <span className="flex items-start gap-2">
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{achado.message}</span>
            </span>
            {achado.fix && onFix ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onFix(achado.fix!.value)}
                className={cn(
                  "ml-6 min-h-[44px] w-fit cursor-pointer rounded-full px-3 font-medium underline underline-offset-2 sm:min-h-9",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                  "disabled:cursor-not-allowed disabled:opacity-70",
                )}
              >
                {achado.fix.label}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RevisaoEditorial({
  findings,
  onFix,
  disabled,
}: {
  findings: PostReviewFinding[];
  // Só chega onde o conserto é mecânico. O modal de publicar não passa nada:
  // consertar de dentro dele mudaria o post debaixo da confirmação.
  onFix?: (value: string) => void;
  disabled?: boolean;
}) {
  if (findings.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Bloco
        severity="defeito"
        findings={findings.filter((a) => a.severity === "defeito")}
        onFix={onFix}
        disabled={disabled}
      />
      <Bloco
        severity="suspeita"
        findings={findings.filter((a) => a.severity === "suspeita")}
        onFix={onFix}
        disabled={disabled}
      />
    </div>
  );
}

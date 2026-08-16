import { cn } from "@/lib/utils";

// Selo de evidência (invariante 5): todo campo e toda saída declaram a
// própria origem. Vocabulário fixo — nunca inventar variação por tela.
export type Selo =
  | "dado_do_cliente"
  | "premissa"
  | "projecao"
  | "estimativa"
  | "personalizado"
  | "nao_somado";

const SELOS: Record<Selo, { label: string; className: string }> = {
  dado_do_cliente: {
    // O V5 chama este selo de "DADO DO CLIENTE" (§4.12). Na tela pública quem
    // lê é o próprio cliente, para quem "do cliente" soa como terceiro — daí
    // "DADOS FORNECIDOS". Divergência de redação a registrar no documento; a
    // chave permanece, é o vocabulário interno do racional.
    label: "DADOS FORNECIDOS",
    className: "bg-blue-50 text-[#2E63CD] border-[#2E63CD]/25",
  },
  premissa: {
    label: "PREMISSA DECLARADA",
    className: "bg-amber-50 text-[#973C00] border-[#973C00]/25",
  },
  projecao: {
    label: "PROJEÇÃO",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
  estimativa: {
    label: "ESTIMATIVA",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
  personalizado: {
    label: "PARÂMETROS PERSONALIZADOS",
    className: "bg-violet-50 text-[#7C3AED] border-[#7C3AED]/25",
  },
  nao_somado: {
    label: "NÃO SOMADO AO ROI",
    className: "bg-slate-50 text-slate-500 border-slate-200",
  },
};

export function SeloEvidencia({ selo, className }: { selo: Selo; className?: string }) {
  const config = SELOS[selo];
  return (
    <span
      className={cn(
        // whitespace-nowrap: em coluna estreita o selo quebrava em três
        // linhas dentro da própria pílula. Ele vai inteiro para a linha de
        // baixo, nunca se desmonta.
        "inline-flex w-fit items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

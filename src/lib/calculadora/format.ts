// Formatação pt-BR da calculadora. Campo vazio produz travessão — nunca
// NaN, Infinity ou zero indevido (P6, invariante 8).

const TRAVESSAO = "—";

function invalido(valor: number | null): boolean {
  return valor === null || !Number.isFinite(valor);
}

export function formatBRL(valor: number | null, decimais = 0): string {
  if (invalido(valor)) return TRAVESSAO;
  return valor!.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  });
}

// "R$ 545 mil", "R$ 1,2 mi" — para manchetes.
export function formatBRLCompacto(valor: number | null): string {
  if (invalido(valor)) return TRAVESSAO;
  const absoluto = Math.abs(valor!);
  if (absoluto >= 1_000_000) {
    const milhoes = valor! / 1_000_000;
    return `R$ ${milhoes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (absoluto >= 1_000) {
    const milhares = valor! / 1_000;
    return `R$ ${milhares.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  }
  return formatBRL(valor);
}

// "1,95×" — ROI sempre exibido, sem arredondamento para cima (invariante 2):
// toLocaleString arredonda pelo padrão half-even/half-up do valor real.
export function formatX(valor: number | null): string {
  if (invalido(valor)) return TRAVESSAO;
  return `${valor!.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}×`;
}

export function formatPct(valor: number | null, decimais = 1): string {
  if (invalido(valor)) return TRAVESSAO;
  return `${valor!.toLocaleString("pt-BR", { maximumFractionDigits: decimais })}%`;
}

export function formatMeses(valor: number | null): string {
  if (invalido(valor)) return TRAVESSAO;
  const texto = valor!.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${texto} ${valor! === 1 ? "mês" : "meses"}`;
}

export function formatNumero(valor: number | null, decimais = 1): string {
  if (invalido(valor)) return TRAVESSAO;
  return valor!.toLocaleString("pt-BR", { maximumFractionDigits: decimais });
}

export function formatHoras(valor: number | null): string {
  if (invalido(valor)) return TRAVESSAO;
  return `${formatNumero(valor)} h`;
}

export function formatDias(valor: number | null): string {
  if (invalido(valor)) return TRAVESSAO;
  const texto = formatNumero(valor, 0);
  return `${texto} ${valor! === 1 ? "dia" : "dias"}`;
}

// "+1,0 p.p."
export function formatPp(valor: number | null): string {
  if (invalido(valor)) return TRAVESSAO;
  const texto = valor!.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${valor! >= 0 ? "+" : ""}${texto} p.p.`;
}

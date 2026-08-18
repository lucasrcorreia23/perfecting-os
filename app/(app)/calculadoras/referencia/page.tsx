import type { Metadata } from "next";
import { requireInterno } from "@/lib/auth";
import { ReferenciaFormulas } from "@/components/calculadora/referencia-formulas";

export const metadata: Metadata = { title: "Referência de fórmulas · Calculadora" };

// Consulta interna do motor da calculadora. Rota estática irmã de
// `calculadoras/[linkId]` — no App Router o segmento estático ganha do
// dinâmico, então `/calculadoras/referencia` nunca é lido como um linkId.
//
// `requireInterno` explícito, como no detalhe do link: o gate do layout já
// existe, mas o racional de precificação não depende de ninguém lembrar disso.
export default async function ReferenciaFormulasPage() {
  await requireInterno();
  return <ReferenciaFormulas />;
}

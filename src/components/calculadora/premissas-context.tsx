"use client";

import { createContext, useContext, type ReactNode } from "react";
import { PREMISSAS_PADRAO, type PremissasRacional } from "@/lib/calculadora/premissas";

const PremissasContext = createContext<PremissasRacional>(PREMISSAS_PADRAO);

export function PremissasProvider({
  value,
  children,
}: {
  value: PremissasRacional;
  children: ReactNode;
}) {
  return <PremissasContext.Provider value={value}>{children}</PremissasContext.Provider>;
}

export function usePremissas(): PremissasRacional {
  return useContext(PremissasContext);
}

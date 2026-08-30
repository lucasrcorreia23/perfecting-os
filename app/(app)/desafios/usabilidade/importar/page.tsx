import type { Metadata } from "next";
import { ImportarView } from "@/components/desafios/usabilidade/importar-view";

export const metadata: Metadata = { title: "Importar · Usabilidade" };

// O gate de role vem do layout de /desafios (requireInterno, uma vez para todas
// as seções). A leitura é toda no cliente: o parser é puro e não toca no banco.
export default function ImportarPage() {
  return <ImportarView />;
}

import type { ReactNode } from "react";

// Route group público da calculadora encaminhada: sem AppShell e SEM gate de
// sessão — o acesso é pelo token da URL, verificado por hash na própria página
// (o proxy faz bypass de /calculadora antes do getUser()).
export default function CalculadoraLayout({ children }: { children: ReactNode }) {
  return children;
}

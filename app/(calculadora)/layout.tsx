import type { ReactNode } from "react";

// Route group público da calculadora encaminhada: sem AppShell e SEM gate de
// sessão — o acesso é pelo token da URL, verificado por hash na própria página
// (o proxy faz bypass de /calculadora antes do getUser()).
//
// `pf-calc` é a pele da jornada do visitante (tokens em app/globals.css, §13
// das diretrizes). Ela vive aqui, no layout do route group, e não no `:root`:
// a classe é a fronteira exata entre o que o cliente vê e o app interno, que
// segue no azul/slate das §1–12. Nenhuma rota fora deste grupo a renderiza.
export default function CalculadoraLayout({ children }: { children: ReactNode }) {
  return <div className="pf-calc min-h-[100dvh]">{children}</div>;
}

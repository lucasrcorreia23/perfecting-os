import type { ReactNode } from "react";
import { requireInterno } from "@/lib/auth";

// Grupo sem o AppShell: o teste de funil é uma página imersiva em tela cheia
// (uma pergunta por vez), mas continua 100% interna — o gate fica aqui.
export default async function QuizLayout({ children }: { children: ReactNode }) {
  await requireInterno();
  return children;
}

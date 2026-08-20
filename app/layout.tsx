import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

// Inter continua sendo a voz do APP INTERNO (§2 das diretrizes). O 900 existe
// para os títulos de etapa da calculadora quando ela roda sem a Archivo — sem
// carregá-lo, `font-black` viraria negrito sintético, e o navegador engorda o
// traço do 600 por conta própria justamente no tamanho grande, que é onde o
// peso deveria estar mais limpo.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "900"],
});

// A dupla do DESIGN_SYSTEM da calculadora (§3.1), e SÓ dela: a jornada pública
// troca a família, o app interno não. Archivo é um grotesco com personalidade
// no peso 900 sem virar "startup genérica"; o 900 é o que sustenta o Display de
// 54px, e é por ele que o salto de hierarquia acontece.
//
// A lista de pesos é a que o §3.2 consome, e nada além: 400/500 corpo, 700
// label, 800 título de painel, 900 display e título de card. Cada peso a mais é
// um arquivo a mais no primeiro carregamento de um link que a pessoa abre uma
// vez — e o §3.2 não pede nenhum outro.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
});

// "Números em mono são regra absoluta" (§3.1): um CFO lê colunas de cifras, e a
// mono alinha dígito com dígito. Substitui a pilha de sistema que `--pf-mono`
// usava — pilha de sistema não tem peso 700 previsível nem métricas iguais
// entre macOS e Windows, e o §3.2 pede Plex Mono 700 nos dois números-manchete.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Perfecting",
    template: "%s · Perfecting",
  },
  description: "Gestão de clientes com workflow de Customer Success",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // As três variáveis ficam no `<html>`, mas quem ESCOLHE a família é a pele:
    // `--font-app` aponta para a Inter no `:root` e para a Archivo dentro de
    // `.pf-calc` (globals.css). Declarar aqui não aplica nada — só torna as
    // fontes alcançáveis por quem as pedir.
    <html
      lang="pt-BR"
      className={`${inter.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-[100dvh]">{children}</body>
    </html>
  );
}

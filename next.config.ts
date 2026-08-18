import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O PDF da referência de fórmulas é lido do disco em tempo de execução pela
  // rota `/api/publico/calculadora/[token]/formulas`, que o serve atrás do
  // token do link. Ele vive em `docs/referencia/` (junto da planilha que
  // descreve, versionado com SHA no CLAUDE.md) e não em `public/`, para não
  // existir em duas cópias nem ficar aberto na internet por URL adivinhável —
  // mas nada no código o importa, então o tracing não o encontraria sozinho e
  // ele não subiria no bundle de produção.
  outputFileTracingIncludes: {
    "/api/publico/calculadora/[token]/formulas": [
      "./docs/referencia/Referencia-Completa-Formulas-ROI-Perfecting.pdf",
    ],
  },
};

export default nextConfig;

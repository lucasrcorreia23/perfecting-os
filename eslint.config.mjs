import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Payload das skills de agente (impeccable): código de terceiro, versionado
    // junto mas não nosso. Sem isso o lint do projeto abre com 300 avisos que
    // ninguém vai corrigir e os nossos somem no meio.
    ".claude/skills/**",
    ".agents/**",
    ".codex/**",
  ]),
]);

export default eslintConfig;

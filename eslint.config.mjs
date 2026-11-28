import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // El copy crudo tiene marcadores ({envio}, {precioTaza}…): solo src/content/index.ts lo rellena.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/content/index.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [{ name: "@/content/copy.json", message: "Importa { copy } desde '@/content': el JSON crudo lleva marcadores sin rellenar." }], patterns: [{ group: ["**/copy.json"], message: "Importa { copy } desde '@/content'." }] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktrees de agentes (copias del repo con su propio .next/): no son código de este checkout.
    ".claude/**",
  ]),
]);

export default eslintConfig;

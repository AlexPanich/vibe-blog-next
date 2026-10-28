import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Ссылки — через @/components/general/Link: там prefetch выключен (см. комментарий в файле)
    files: [ "src/**/*.{ts,tsx}" ],
    ignores: [ "src/components/general/Link.tsx" ],
    rules: {
      "no-restricted-imports": [ "error", {
        paths: [ { name: "next/link", message: "Используйте @/components/general/Link: без prefetch по умолчанию" } ]
      } ]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Служебные скрипты скилов Claude (CommonJS)
    ".claude/**",
  ]),
]);

export default eslintConfig;

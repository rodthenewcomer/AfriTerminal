import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: directory });

export default [
  {
    ignores: [
      ".next/**",
      "next-env.d.ts",
      "out/**",
      "coverage/**",
      "apps/mobile/dist/**",
      "apps/mobile/.expo/**",
      "data/**",
      "supabase/.temp/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "import/no-anonymous-default-export": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];

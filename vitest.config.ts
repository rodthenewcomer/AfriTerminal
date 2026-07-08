import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Même alias que tsconfig.json ("@/*" -> racine) pour que les
      // modules qui importent "@/data/..." soient testables.
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});

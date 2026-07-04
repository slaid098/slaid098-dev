import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
      exclude: [
        "src/__tests__/**",
        "src/app/**/page.tsx",
        "src/app/**/layout.tsx",
        "src/app/**/not-found.tsx",
        "src/app/**/manifest.ts",
        "src/app/**/sitemap.ts",
        "src/app/**/robots.ts",
        "src/apps/app-components.ts",
        "src/apps/**/*.module.css",
        "next-env.d.ts",
      ],
    },
  },
});

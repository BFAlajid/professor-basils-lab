import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      include: ["src/utils/**", "src/hooks/**", "src/lib/**", "src/components/**", "src/app/api/**"],
      exclude: [
        "**/*.test.*",
        "**/test/**",
        "**/__tests__/**",
        "**/*Wasm.ts",
        "src/utils/wasmLoader.ts",
        "src/utils/createWasmWrapper.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

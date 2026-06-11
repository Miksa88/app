import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // FAZA 2.2 (PLAN_RADA_WHITELABEL.md) — coverage gate za biznis logiku.
    // Pragovi zaključani malo ispod izmerenog stanja (2026-06-11: lines 61%,
    // branches 85%) da spreče regresiju; cilj 80% lines. Podizati, ne spuštati.
    coverage: {
      provider: "v8",
      include: ["src/utils/**", "src/services/**"],
      exclude: ["src/utils/db/**", "**/*.test.*"],
      reporter: ["text-summary"],
      thresholds: {
        lines: 60,
        statements: 60,
        functions: 65,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});

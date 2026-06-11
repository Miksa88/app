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
    // Dummy Supabase env za testove — CI nema .env (gitignored), a supabase-js
    // createClient baca bez URL-a. Testovi mockuju sve mrežne pozive, pa su
    // vrednosti nebitne; bitno je da su deterministične svuda (lokal = CI).
    env: {
      VITE_SUPABASE_URL: "https://test-project.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_dummy",
      VITE_SUPABASE_PROJECT_ID: "test-project",
    },
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

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: {
    "@": path.resolve(import.meta.dirname, "src"),
    "server-only": path.resolve(import.meta.dirname, "tests/server-only.ts"),
  } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/domain/**/*.test.ts", "tests/components/**/*.test.tsx"],
    coverage: { reporter: ["text", "html"] },
  },
});

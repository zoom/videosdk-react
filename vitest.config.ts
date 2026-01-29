import react from "@vitejs/plugin-react";
import { defineConfig, UserConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      exclude: ["**/playground/**", "src/utils.ts"],
    },
    environment: "happy-dom",
    globals: true,
    setupFiles: "./tests/setup.ts",
  },
} as UserConfig);

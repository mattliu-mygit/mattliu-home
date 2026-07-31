/// <reference types="vitest/config" />

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { siteContentPlugin } from "./build/site-content-plugin";

export default defineConfig({
  plugins: [siteContentPlugin(), react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "build/**/*.test.ts"],
    setupFiles: "./src/test-setup.ts",
  },
});

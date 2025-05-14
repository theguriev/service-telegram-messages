import { resolve } from "pathe";
import Unimport from "unimport/unplugin";
import { defineConfig } from "vitest/config";
import { imports } from "./constants";
import { dirs } from "./mocks/constants";

export default defineConfig({
  plugins: [
    Unimport.vite({
      imports: [...imports, { name: "$fetch", from: "ofetch" }],
      dirs: ["./server/utils", ...dirs],
      dts: true,
    }),
  ],
  test: {
    include: ["./test-api/*.test.ts"],
    globalSetup: "./global-setup.ts",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});

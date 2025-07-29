import { resolve } from "pathe";
import Unimport from "unimport/unplugin";
import { defineConfig } from "vitest/config";
import { imports } from "./constants";

export default defineConfig({
  plugins: [
    Unimport.vite({
      imports: [
        ...imports,
        { name: "$fetch", from: "ofetch" },
        {
          name: "default",
          as: "ModelUser",
          from: "./db/model/user.ts",
        },
        {
          name: "default",
          as: "schemaUser",
          from: "./db/schema/user.ts",
        },
      ],
      dirs: ["./server/utils"],
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

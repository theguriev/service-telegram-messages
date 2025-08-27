import { listen, Listener } from "listhen";
import { fileURLToPath } from "mlly";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import type { Nitro } from "nitropack";
import {
    build,
    copyPublicAssets,
    createNitro,
    prepare,
    prerender,
} from "nitropack";
import { promises as fsp } from "node:fs";
import { tmpdir } from "node:os";
import type { FetchOptions } from "ofetch";
import { $fetch } from "ofetch";
import { join, resolve } from "pathe";
import { joinURL } from "ufo";
import { adminId, regularId } from "./constants";
import { clearTestData, seedTestData } from "./test-db-setup";

interface Context {
  preset: string;
  nitro?: Nitro;
  rootDir: string;
  outDir: string;
  mongo?: MongoMemoryServer;
  fetch: (url: string, opts?: FetchOptions) => Promise<any>;
  server?: Listener;
  env: Record<string, string>;
}

const fixtureDir = fileURLToPath(new URL(".", import.meta.url).href);

const getPresetTmpDir = (preset: string) =>
  resolve(
    process.env.NITRO_TEST_TMP_DIR || join(tmpdir(), "nitro-tests"),
    preset
  );
const preset = "node";

let teardownHappened = false;
const presetTmpDir = getPresetTmpDir(preset);

const ctx: Context = {
  preset,
  rootDir: fixtureDir,
  outDir: resolve(fixtureDir, presetTmpDir, ".output"),
  env: {
    NITRO_BOT_TOKEN: "some:token",
    NITRO_AUTHORIZATION_BASE: "http://localhost:4000",
    NITRO_APP_URL: "https://domain.ngrok-free.app",
    CUSTOM_HELLO_THERE: "general",
    SECRET: "gurievcreative",
    VALID_ADMIN_ACCESS_TOKEN: issueAccessToken(
      { userId: adminId, role: "admin", id: adminId },
      { secret: "gurievcreative" }
    ),
    VALID_REGULAR_ACCESS_TOKEN: issueAccessToken(
      { userId: regularId, role: "user", id: regularId },
      { secret: "gurievcreative" }
    ),
  },
  fetch: (url, opts): Promise<Response> =>
    $fetch(joinURL(ctx.server!.url, url.slice(1)), {
      redirect: "manual",
      ignoreResponseError: true,
      ...(opts as any),
    }),
};

export const setup = async () => {
  await fsp.rm(presetTmpDir, { recursive: true }).catch(() => {});
  await fsp.mkdir(presetTmpDir, { recursive: true });

  const mongod = await MongoMemoryServer.create();
  ctx.mongo = mongod;
  ctx.env.NITRO_MONGO_URI = mongod.getUri();

  await mongoose.connect(ctx.env.NITRO_MONGO_URI);

  await clearTestData();
  await seedTestData();

  // Set environment variables for process compatible presets
  for (const [name, value] of Object.entries(ctx.env)) {
    process.env[name] = value;
  }

  const nitro = (ctx.nitro = await createNitro({
    preset: ctx.preset,
    dev: false,
    rootDir: ctx.rootDir,
    runtimeConfig: {
      nitro: {
        envPrefix: "CUSTOM_",
      },
    },
    buildDir: resolve(fixtureDir, presetTmpDir, ".nitro"),
    serveStatic: true,
    output: {
      dir: ctx.outDir,
    },
    timing: true,
  }));

  await prepare(nitro);
  await copyPublicAssets(nitro);
  await prerender(nitro);
  await build(nitro);

  const entryPath = resolve(ctx.outDir, "server/index.mjs");
  const { listener } = await import(entryPath);
  ctx.server = await listen(listener);
  console.log(">", ctx.server!.url);
};

export const teardown = async () => {
  if (teardownHappened) {
    throw new Error("teardown called twice");
  }
  teardownHappened = true;

  if (ctx.server) {
    await ctx.server.close();
  }
  if (ctx.nitro) {
    await ctx.nitro.close();
  }
  if (ctx.mongo) {
    await ctx.mongo.stop();
  }
};

export default setup;

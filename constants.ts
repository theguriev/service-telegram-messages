import { addHours } from "date-fns";
import type Unimport from "unimport/unplugin";

export const imports: Parameters<typeof Unimport.vite>[0]["imports"] = [
  { name: "describe", from: "vitest" },
  { name: "it", from: "vitest" },
  { name: "expect", from: "vitest" },
  { name: "beforeAll", from: "vitest" },
  { name: "afterAll", from: "vitest" },
  { name: "v4", as: "uuidv4", from: "uuid" },
  { name: "parse", from: "set-cookie-parser" },
  { name: "useTelegram", from: "~/telegram" },
];

export const adminId = "6808bcfb77143eceb802c5a7";
export const regularId = "6808bcfb77143eceb802c5a8";
export const weekends = [6 /* Saturday */];
export const dateDifference = addHours(0, 3);

export const bllsBase = "https://api.blls.me";

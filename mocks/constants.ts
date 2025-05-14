import type Unimport from "unimport/unplugin";

export const dirs: Parameters<typeof Unimport.vite>[0]['dirs'] = [
  "./mocks",
  "!./server/utils/useTelegram.ts"
];

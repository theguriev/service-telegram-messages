import type Unimport from "unimport/unplugin";

export const imports: Parameters<typeof Unimport.vite>[0]['imports'] = [
  { name: 'describe', from: 'vitest' },
  { name: 'it', from: 'vitest' },
  { name: 'expect', from: 'vitest' },
  { name: 'beforeAll', from: 'vitest' },
  { name: 'afterAll', from: 'vitest' },
  { name: 'v4', as: 'uuidv4', from: 'uuid' },
  { name: 'parse', from: 'set-cookie-parser' },
];

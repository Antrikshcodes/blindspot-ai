import { readFileSync, writeFileSync } from 'node:fs';

// Orval appends this wildcard on each run, colliding with its Zod query schemas.
const barrel = new URL('../api-zod/src/index.ts', import.meta.url);
const content = readFileSync(barrel, 'utf8').replace(/^export \* from ['"]\.\/generated\/types['"];?\s*$/gm, '');
writeFileSync(barrel, content);

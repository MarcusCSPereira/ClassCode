// Fails when hidden judge cases reach the browser bundle; they must stay on the server.
// Usage: node scripts/check-bundle.mjs [assets-dir]   (default: dist/assets, after `vite build`)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG_TEST_CASES } from '../src/server/demoJudgeCases.ts';

const dir = process.argv[2] ?? 'dist/assets';
const bundle = readdirSync(dir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => readFileSync(join(dir, file), 'utf8'))
  .join('\n');
// Single numbers appear anywhere (even in library tables); hidden values with several tokens
// are distinctive. Minifiers may keep "\n" escaped or emit a real line break, so try both.
const leaks = Object.entries(CATALOG_TEST_CASES).flatMap(([id, cases]) =>
  cases
    .filter((testCase) => !testCase.isExample)
    .flatMap((testCase) => [testCase.stdin, testCase.expectedOutput])
    .map((value) => value.trimEnd())
    .filter((value) => value.length >= 8 && /\s/.test(value))
    .filter((value) => bundle.includes(value) || bundle.includes(value.replace(/\n/g, '\\n')))
    .map((value) => `${id}: ${JSON.stringify(value)}`),
);
if (leaks.length) {
  console.error(`Casos ocultos do judge no bundle do navegador:\n${leaks.join('\n')}`);
  process.exit(1);
}
console.log('Bundle sem casos ocultos do judge.');

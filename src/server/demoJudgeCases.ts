/**
 * Test cases of the catalog problems for the local dev server (vite.config.ts).
 * Server-side only: never import this file from the UI, or hidden cases reach the bundle
 * (`npm run check` fails if they do). Remote mode reads the same cases from the database,
 * seeded in supabase/seed.sql; a unit test keeps both copies equal.
 */
import type { TestCase } from '../../supabase/functions/_shared/judge0.ts';

export const CATALOG_TEST_CASES: Record<string, TestCase[]> = {
  sum: [
    { stdin: '12 8\n', expectedOutput: '20\n', isExample: true },
    { stdin: '0 0\n', expectedOutput: '0\n' },
    { stdin: '1000000 1000000\n', expectedOutput: '2000000\n' },
    { stdin: '42 58\n', expectedOutput: '100\n' },
  ],
  parity: [
    { stdin: '7\n', expectedOutput: 'IMPAR\n', isExample: true },
    { stdin: '0\n', expectedOutput: 'PAR\n' },
    { stdin: '2\n', expectedOutput: 'PAR\n' },
    { stdin: '1000000000\n', expectedOutput: 'PAR\n' },
    { stdin: '999999999\n', expectedOutput: 'IMPAR\n' },
  ],
  maximum: [
    { stdin: '4 9 6\n', expectedOutput: '9\n', isExample: true },
    { stdin: '10 2 5\n', expectedOutput: '10\n' },
    { stdin: '1 2 3\n', expectedOutput: '3\n' },
    { stdin: '0 0 0\n', expectedOutput: '0\n' },
    { stdin: '1000 999 1000\n', expectedOutput: '1000\n' },
  ],
  weird: [
    { stdin: '3\n', expectedOutput: '3 10 5 16 8 4 2 1\n', isExample: true },
    { stdin: '1\n', expectedOutput: '1\n' },
    { stdin: '6\n', expectedOutput: '6 3 10 5 16 8 4 2 1\n' },
    { stdin: '7\n', expectedOutput: '7 22 11 34 17 52 26 13 40 20 10 5 16 8 4 2 1\n' },
  ],
  missing: [
    { stdin: '5\n2 3 1 5\n', expectedOutput: '4\n', isExample: true },
    { stdin: '2\n1\n', expectedOutput: '2\n' },
    { stdin: '2\n2\n', expectedOutput: '1\n' },
    { stdin: '6\n1 2 3 4 5\n', expectedOutput: '6\n' },
  ],
  distinct: [
    { stdin: '5\n2 3 2 2 3\n', expectedOutput: '2\n', isExample: true },
    { stdin: '1\n42\n', expectedOutput: '1\n' },
    { stdin: '4\n10 10 10 10\n', expectedOutput: '1\n' },
    { stdin: '6\n1 2 3 4 5 6\n', expectedOutput: '6\n' },
  ],
  binary: [
    { stdin: '7 13\n2 5 8 13 19 24 31\n', expectedOutput: '3\n', isExample: true },
    { stdin: '7 2\n2 5 8 13 19 24 31\n', expectedOutput: '0\n' },
    { stdin: '7 31\n2 5 8 13 19 24 31\n', expectedOutput: '6\n' },
    { stdin: '7 10\n2 5 8 13 19 24 31\n', expectedOutput: '-1\n' },
    { stdin: '1 5\n5\n', expectedOutput: '0\n' },
  ],
};

/**
 * Catalog problems always use the server's cases, whatever the browser sends. Problems a
 * teacher created in the local demo live only in that browser, so their cases come with
 * the request; this is acceptable only because the demo has no other users.
 */
export async function demoJudgeCases(
  problemId: string,
  _userId: string | null,
  clientTests?: TestCase[],
): Promise<TestCase[]> {
  return CATALOG_TEST_CASES[problemId] ?? clientTests ?? [];
}

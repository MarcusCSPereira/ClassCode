import type { DemoState, Hint, Problem } from './types';
/** Key kept from the first release; the stored `version` field drives migration. */
export const STORAGE_KEY = 'classcode.demo.v1';
export function initialState(now = Date.now()): DemoState {
  return {
    version: 2,
    role: 'student',
    name: 'Alex',
    joinedClassIds: ['demo-class'],
    joinedAt: { 'demo-class': now },
    classes: [
      {
        id: 'demo-class',
        name: 'Algoritmos e programação I',
        code: 'CLASS26',
        teacher: 'Prof. Marina',
        term: '2026.2',
      },
    ],
    customProblems: [],
    startedAt: {},
    drafts: {},
    hintViews: {},
    reports: {},
  };
}
export function remainingHintSeconds(
  hint: Pick<Hint, 'afterSeconds'>,
  startedAt: number | undefined,
  now: number,
): number {
  return Math.max(0, hint.afterSeconds - Math.floor(Math.max(0, now - (startedAt ?? now)) / 1000));
}
export function normalizeClassCode(code: string) {
  return code.trim().toUpperCase();
}
export function safeExternalUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      [
        'cses.fi',
        'codeforces.com',
        'atcoder.jp',
        'leetcode.com',
        'www.beecrowd.com.br',
        'judge.beecrowd.com',
      ].includes(u.hostname)
    );
  } catch {
    return false;
  }
}
export function validateProblem(p: Omit<Problem, 'id' | 'source'>): string | null {
  if (
    ![
      p.title,
      p.objective,
      p.statement,
      p.input,
      p.output,
      p.constraints,
      p.exampleInput,
      p.exampleOutput,
    ].every((v) => v.trim())
  )
    return 'Preencha todos os campos do padrão de questão.';
  if (p.hints.length !== 3 || p.hints.some((h) => !h.text.trim()))
    return 'Escreva as três dicas progressivas.';
  if (p.externalUrl && !safeExternalUrl(p.externalUrl))
    return 'Use um link HTTPS de CSES, Codeforces, AtCoder, LeetCode ou beecrowd.';
  return null;
}
export function visibleProblems(catalog: Problem[], state: DemoState): Problem[] {
  return [
    ...catalog,
    ...state.customProblems.filter(
      (p) =>
        state.role === 'teacher' ||
        (p.authorClassId && state.joinedClassIds.includes(p.authorClassId)),
    ),
  ];
}
export function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

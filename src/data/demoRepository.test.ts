import { beforeEach, describe, expect, it } from 'vitest';
import { problems } from '../lib/catalog';
import { STORAGE_KEY } from '../lib/domain';
import type { DemoStateV1 } from '../lib/types';
import { createDemoRepository, DEMO_USER_ID } from './demoRepository';
import { createDemoStore, parseDemoState, type DemoStore } from './demoStore';
import { RepositoryError, type ClassCodeRepository, type NewProblem } from './repository';

const T0 = Date.parse('2026-11-02T15:00:00Z');
function memoryStorage(initial?: unknown) {
  const items = new Map<string, string>();
  if (initial !== undefined) items.set(STORAGE_KEY, JSON.stringify(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}
async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error instanceof RepositoryError ? error.code : error;
  }
  throw new Error('expected a rejection');
}
const v1: DemoStateV1 = {
  version: 1,
  role: 'student',
  name: 'Bia',
  joinedClassIds: ['demo-class'],
  classes: [],
  customProblems: [],
  solved: ['sum'],
  startedAt: { sum: T0 - 3_600_000, parity: T0 - 60_000 },
  drafts: { 'sum:python': 'print(1)' },
  revealedHints: { sum: [1, 0], parity: [] },
  evidence: { sum: 'Somei.' },
};

describe('armazenamento da demonstração', () => {
  it('migra a versão 1 sem perder rascunhos, conclusões e dicas', () => {
    const state = parseDemoState(v1, T0)!;
    expect(state.version).toBe(2);
    expect(state.drafts).toEqual(v1.drafts);
    expect(state.reports).toEqual({ sum: { evidence: 'Somei.', reportedAt: T0 } });
    expect(state.hintViews.sum).toEqual([
      { ordinal: 1, viewedAt: T0 - 3_600_000 + 180_000 },
      { ordinal: 2, viewedAt: T0 - 3_600_000 + 420_000 },
    ]);
    expect(state.joinedAt).toEqual({ 'demo-class': T0 });
  });
  it('descarta dados inválidos e salva a versão migrada', () => {
    expect(parseDemoState({ version: 3 }, T0)).toBeNull();
    expect(parseDemoState({ ...v1, solved: 'sum' }, T0)).toBeNull();
    const storage = memoryStorage(v1);
    createDemoStore(storage, () => T0);
    expect(JSON.parse(storage.items.get(STORAGE_KEY)!).version).toBe(2);
  });
  it('continua em memória quando o navegador bloqueia o armazenamento', () => {
    const store = createDemoStore(null, () => T0);
    expect(store.storageError()).toBe(true);
    store.update((s) => ({ ...s, name: 'Caio' }));
    expect(store.getSnapshot().name).toBe('Caio');
  });
});

describe('repositório da demonstração', () => {
  let now: number;
  let store: DemoStore;
  let repo: ClassCodeRepository;
  beforeEach(() => {
    now = T0;
    store = createDemoStore(memoryStorage(), () => now);
    repo = createDemoRepository(store, { now: () => now });
  });

  it('lista desafios sem o texto das dicas', async () => {
    const list = await repo.listProblems();
    expect(list).toHaveLength(problems.length);
    expect(JSON.stringify(list)).not.toContain(problems[0].hints[0].text);
    expect(list[0].hints).toEqual([
      { afterSeconds: 180 },
      { afterSeconds: 420 },
      { afterSeconds: 720 },
    ]);
  });

  it('inicia a tentativa uma única vez', async () => {
    const first = await repo.startAttempt('sum');
    now += 60_000;
    expect(await repo.startAttempt('sum')).toBe(first);
    expect(await rejection(repo.startAttempt('no-such-problem'))).toBe('problem_not_accessible');
  });

  it('libera dica só no tempo e registra a primeira leitura', async () => {
    expect(await rejection(repo.revealHint('sum', 1))).toBe('hint_locked');
    await repo.startAttempt('sum');
    now += 179_000;
    expect(await rejection(repo.revealHint('sum', 1))).toBe('hint_locked');
    now += 1_000;
    expect(await repo.revealHint('sum', 1)).toBe(problems[0].hints[0].text);
    now += 60_000;
    await repo.revealHint('sum', 1);
    expect(store.getSnapshot().hintViews.sum).toEqual([{ ordinal: 1, viewedAt: T0 + 180_000 }]);
    expect(await rejection(repo.revealHint('sum', 2))).toBe('hint_locked');
  });

  it('exige tentativa para concluir, mantém o horário original e permite reabrir', async () => {
    expect(await rejection(repo.reportProgress('sum', 'Somei.'))).toBe('attempt_required');
    await repo.startAttempt('sum');
    expect(await rejection(repo.reportProgress('sum', '   '))).toBe('invalid_evidence');
    now += 300_000;
    await repo.reportProgress('sum', 'Somei.');
    now += 60_000;
    await repo.reportProgress('sum', 'Somei e testei 0 0.');
    expect(store.getSnapshot().reports.sum).toEqual({
      evidence: 'Somei e testei 0 0.',
      reportedAt: T0 + 300_000,
    });
    await repo.reopenProblem('sum');
    expect(store.getSnapshot().reports.sum).toBeUndefined();
  });

  it('gera linhas de atividade com horários de dica e conclusão', async () => {
    await repo.startAttempt('sum');
    now += 200_000;
    await repo.revealHint('sum', 1);
    now += 100_000;
    await repo.reportProgress('sum', 'Somei.');
    await repo.startAttempt('parity');
    expect(await repo.myActivity()).toEqual([
      {
        studentId: DEMO_USER_ID,
        problemId: 'sum',
        startedAt: new Date(T0).toISOString(),
        hintViews: [{ ordinal: 1, viewedAt: new Date(T0 + 200_000).toISOString() }],
        reportedAt: new Date(T0 + 300_000).toISOString(),
        verification: 'self_reported',
      },
      {
        studentId: DEMO_USER_ID,
        problemId: 'parity',
        startedAt: new Date(T0 + 300_000).toISOString(),
        hintViews: [],
      },
    ]);
  });

  it('entra por código e recusa código inexistente', async () => {
    expect(await rejection(repo.joinClassroom('NOPE'))).toBe('invalid_invite');
    store.update((s) => ({ ...s, role: 'teacher' }));
    const { id, code } = await repo.createClassroom(' Turma B ', '2026.2');
    store.update((s) => ({ ...s, role: 'student' }));
    now += 1_000;
    expect(await repo.joinClassroom(` ${code.toLowerCase()} `)).toBe(id);
    expect(store.getSnapshot().joinedAt[id]).toBe(T0 + 1_000);
    expect((await repo.listClassrooms()).map((c) => c.name)).toContain('Turma B');
  });

  it('reserva turmas, questões e relatório à perspectiva do professor', async () => {
    const draft: NewProblem = { ...problems[0], authorClassId: 'demo-class' };
    expect(await rejection(repo.createClassroom('Turma', '2026.2'))).toBe('teacher_required');
    expect(await rejection(repo.publishProblem(draft))).toBe('teacher_required');
    expect(await rejection(repo.classroomActivity('demo-class'))).toBe('teacher_required');
    store.update((s) => ({ ...s, role: 'teacher' }));
    expect(await rejection(repo.publishProblem({ ...draft, objective: ' ' }))).toBe(
      'invalid_problem',
    );
    expect(await rejection(repo.publishProblem({ ...draft, authorClassId: 'other' }))).toBe(
      'owner_required',
    );
    const id = await repo.publishProblem(draft);
    expect((await repo.listProblems()).some((p) => p.id === id)).toBe(true);
  });

  it('relatório da turma traz só a atividade nos desafios dela', async () => {
    store.update((s) => ({ ...s, role: 'teacher' }));
    const { id: other } = await repo.createClassroom('Outra', '2026.2');
    const custom = await repo.publishProblem({ ...problems[0], authorClassId: other });
    await repo.startAttempt('sum');
    await repo.startAttempt(custom);
    const report = await repo.classroomActivity('demo-class');
    expect(report.roster).toEqual([
      { studentId: DEMO_USER_ID, displayName: 'Alex', joinedAt: new Date(T0).toISOString() },
    ]);
    expect(report.activity.map((row) => row.problemId)).toEqual(['sum']);
    expect(await repo.classroomActivity(other)).toEqual({ roster: [], activity: [] });
    expect(await rejection(repo.classroomActivity('unknown'))).toBe('owner_required');
  });
});

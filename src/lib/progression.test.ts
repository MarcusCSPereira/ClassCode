import { describe, expect, it } from 'vitest';
import type { ActivityRow, ProblemSummary } from '../data/repository';
import { modules, problems } from './catalog';
import {
  autonomy,
  currentModule,
  hintsBeforeCompletion,
  moduleStatuses,
  recommendNext,
} from './progression';
import type { HintOrdinal, Module, Problem } from './types';

const T0 = Date.parse('2026-11-02T15:00:00Z');
const at = (minute: number) => new Date(T0 + minute * 60_000).toISOString();
/** Attempt opened at `start`, hints viewed at the given minutes, reported at `end`. */
function attempt(
  problemId: string,
  { start = 0, end, hints = [] }: { start?: number; end?: number; hints?: number[] } = {},
): ActivityRow {
  return {
    studentId: 'aluno',
    problemId,
    startedAt: at(start),
    hintViews: hints.map((minute, i) => ({
      ordinal: (i + 1) as HintOrdinal,
      viewedAt: at(minute),
    })),
    ...(end !== undefined && { reportedAt: at(end), verification: 'self_reported' as const }),
  };
}
/** Completed at minute `end` after viewing the first `hints` hints. */
const solved = (problemId: string, end: number, hints = 0) =>
  attempt(problemId, {
    start: end - 20,
    end,
    hints: [3, 7, 12].slice(0, hints).map((m) => end - 20 + m),
  });
const mod = (id: string, prerequisites: string[] = []): Module => ({
  id,
  title: `Etapa ${id}`,
  description: '',
  level: 'Fundamentos',
  prerequisites,
  icon: '',
});
const prob = (id: string, moduleId: string, difficulty: Problem['difficulty'] = 'Básico') => ({
  ...problems[0],
  id,
  moduleId,
  difficulty,
});
const statuses = (list: Module[], probs: ProblemSummary[], rows: ActivityRow[]) =>
  Object.fromEntries(
    Object.entries(moduleStatuses(list, probs, rows)).map(([id, p]) => [id, p.status]),
  );

describe('autonomia', () => {
  it('vale 1, 0,75, 0,50 e 0,25 para 0 a 3 dicas', () => {
    expect([0, 1, 2, 3, 4].map(autonomy)).toEqual([1, 0.75, 0.5, 0.25, 0.25]);
  });
  it('dica aberta depois da conclusão não reduz a autonomia', () => {
    const row = attempt('sum', { end: 10, hints: [4, 15, 16] });
    expect(hintsBeforeCompletion(row)).toBe(1);
    const late = attempt('sum', { end: 10, hints: [11] });
    expect(hintsBeforeCompletion(late)).toBe(0);
    const progress = moduleStatuses(modules, problems, [late, solved('parity', 30)]);
    expect(progress.foundations).toMatchObject({ status: 'mastered', autonomy: 1 });
  });
});

describe('trilha do catálogo', () => {
  it('aluno novo recebe o primeiro desafio de Primeiros algoritmos', () => {
    expect(recommendNext(modules, problems, [])).toEqual({
      kind: 'advance',
      problemId: 'sum',
      moduleId: 'foundations',
      reason: 'Você está pronto para começar Primeiros algoritmos.',
    });
    const progress = moduleStatuses(modules, problems, []);
    expect(progress.foundations).toMatchObject({ status: 'available', required: 2, total: 3 });
    expect(progress.loops).toMatchObject({ status: 'waiting', blockedBy: ['foundations'] });
    expect(progress.pointers.status).toBe('preparing');
    expect(currentModule(modules, progress)).toBe('foundations');
  });

  it('duas conclusões sem dica em Fundamentos marcam Dominado e liberam Laços', () => {
    const rows = [solved('sum', 30), solved('parity', 60)];
    const progress = moduleStatuses(modules, problems, rows);
    expect(progress.foundations).toMatchObject({ status: 'mastered', completed: 2, autonomy: 1 });
    expect(progress.loops.status).toBe('available');
    expect(currentModule(modules, progress)).toBe('loops');
    expect(recommendNext(modules, problems, rows)).toMatchObject({
      problemId: 'weird',
      reason: 'Você resolveu os últimos desafios quase sem dicas.',
    });
  });

  it('uma conclusão sem dica ainda não conclui nem domina o módulo', () => {
    const progress = moduleStatuses(modules, problems, [solved('sum', 30)]);
    expect(progress.foundations).toMatchObject({ status: 'in_progress', completed: 1 });
    expect(progress.loops.status).toBe('waiting');
  });

  it('duas conclusões com 3 dicas liberam Laços sem marcar Dominado', () => {
    const rows = [solved('sum', 30, 3), solved('parity', 60, 3)];
    const progress = moduleStatuses(modules, problems, rows);
    expect(progress.foundations).toMatchObject({ status: 'completed', autonomy: 0.25 });
    expect(progress.loops.status).toBe('available');
    expect(recommendNext(modules, problems, rows)).toMatchObject({
      kind: 'advance',
      problemId: 'weird',
      reason: 'Vamos consolidar antes de subir o nível.',
    });
  });

  it('desafio em andamento tem prioridade sobre um novo', () => {
    const rows = [
      solved('sum', 30),
      attempt('parity', { start: 40 }),
      attempt('maximum', { start: 50 }),
    ];
    expect(recommendNext(modules, problems, rows)).toEqual({
      kind: 'continue',
      problemId: 'maximum',
      moduleId: 'foundations',
      reason: 'Você começou este desafio e ainda não registrou a conclusão.',
    });
  });

  it('tentativa em módulo aguardando pré-requisito não vira "continuar"', () => {
    const rows = [attempt('binary', { start: 5 })];
    expect(statuses(modules, problems, rows).search).toBe('waiting');
    expect(recommendNext(modules, problems, rows)).toMatchObject({ problemId: 'sum' });
  });

  it('módulo sem questões nunca é recomendado e a trilha completa não recomenda nada', () => {
    const all = problems.map((p, i) => solved(p.id, 30 * (i + 1)));
    const progress = moduleStatuses(modules, problems, all);
    expect(Object.values(progress).map((p) => p.status)).toEqual([
      ...Array(5).fill('mastered'),
      ...Array(7).fill('preparing'),
    ]);
    expect(currentModule(modules, progress)).toBeNull();
    expect(recommendNext(modules, problems, all)).toBeNull();
  });

  it('com a trilha concluída, sugere reforço onde houve mais ajuda', () => {
    const rows = [
      solved('sum', 30, 3),
      solved('parity', 60, 2),
      ...['weird', 'missing', 'distinct', 'binary'].map((id, i) => solved(id, 90 + 30 * i)),
    ];
    expect(recommendNext(modules, problems, rows)).toEqual({
      kind: 'reinforce',
      problemId: 'maximum',
      moduleId: 'foundations',
      reason:
        'Vale reforçar Primeiros algoritmos: você concluiu a etapa com bastante ajuda das dicas.',
    });
  });

  it('ignora atividade de desafios que não estão mais publicados', () => {
    const rows = [solved('removido', 10), solved('sum', 30), solved('parity', 60)];
    expect(moduleStatuses(modules, problems, rows).foundations.completed).toBe(2);
    expect(recommendNext(modules, problems, rows)?.problemId).toBe('weird');
  });
});

describe('dependências entre módulos', () => {
  it('Grafos só fica disponível com Estruturas e Recursão concluídos', () => {
    const list = [
      mod('base'),
      mod('structures', ['base']),
      mod('recursion', ['base']),
      mod('graphs', ['structures', 'recursion']),
    ];
    const probs = list.map((m) => prob(`p-${m.id}`, m.id));
    const partial = [solved('p-base', 10), solved('p-structures', 20)];
    expect(moduleStatuses(list, probs, partial).graphs).toMatchObject({
      status: 'waiting',
      blockedBy: ['recursion'],
    });
    expect(statuses(list, probs, [...partial, solved('p-recursion', 30)]).graphs).toBe('available');
  });

  it('pré-requisito ainda sem questões é transparente', () => {
    const list = [mod('a'), mod('empty', ['a']), mod('x', ['empty'])];
    const probs = [prob('pa', 'a'), prob('px', 'x')];
    expect(moduleStatuses(list, probs, []).x).toMatchObject({
      status: 'waiting',
      blockedBy: ['a'],
    });
    const rows = [solved('pa', 10)];
    expect(statuses(list, probs, rows)).toEqual({
      a: 'mastered',
      empty: 'preparing',
      x: 'available',
    });
    expect(recommendNext(list, probs, rows)?.problemId).toBe('px');
  });
});

describe('dificuldade adaptada à ajuda recente', () => {
  const list = [mod('m1'), mod('m2', ['m1'])];
  const probs = [
    prob('a1', 'm1'),
    prob('a2', 'm1'),
    prob('a3', 'm1'),
    prob('mid', 'm2', 'Intermediário'),
    prob('hard', 'm2', 'Avançado'),
    prob('easy', 'm2', 'Básico'),
    prob('hard-2', 'm2', 'Avançado'),
  ];
  it('sobe para o desafio mais difícil depois de duas conclusões sem dica', () => {
    const rec = recommendNext(list, probs, [solved('a1', 10), solved('a2', 40, 1)]);
    expect(rec).toMatchObject({ kind: 'advance', problemId: 'hard' });
  });
  it('fica no mais fácil depois de duas conclusões com muita ajuda', () => {
    const rec = recommendNext(list, probs, [solved('a1', 10, 2), solved('a2', 40, 3)]);
    expect(rec).toMatchObject({
      problemId: 'easy',
      reason: 'Vamos consolidar antes de subir o nível.',
    });
  });
  it('sem tendência clara, segue do mais fácil para o mais difícil', () => {
    const rows = [solved('a1', 10), solved('a2', 40, 3)];
    expect(recommendNext(list, probs, rows)).toMatchObject({
      problemId: 'easy',
      reason: 'Você está pronto para começar Etapa m2.',
    });
    expect(recommendNext(list, probs, [...rows, solved('easy', 70, 1)])).toMatchObject({
      problemId: 'mid',
      reason: 'Próximo passo em Etapa m2.',
    });
  });
  it('considera as duas conclusões mais recentes, não as primeiras', () => {
    // Oldest completion needed every hint; the two latest needed none.
    const rows = [solved('a1', 10, 3), solved('a3', 70), solved('a2', 40)];
    expect(recommendNext(list, probs, rows)?.problemId).toBe('hard');
    // Same completions, but the one with every hint is now among the two latest.
    const mixed = [solved('a1', 80, 3), solved('a3', 70), solved('a2', 40)];
    expect(recommendNext(list, probs, mixed)?.problemId).toBe('easy');
  });
});

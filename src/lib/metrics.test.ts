import { describe, expect, it } from 'vitest';
import type { ActivityRow, ClassroomActivity } from '../data/repository';
import { modules, problems } from './catalog';
import {
  classroomMetrics,
  describeCell,
  studentsCsv,
  type ClassroomMetrics,
  type StudentMetrics,
} from './metrics';
import type { HintOrdinal } from './types';

const NOW = Date.parse('2026-11-12T15:00:00Z');
const MIN = 60_000;
const DAY = 1440;
/** ISO time `minutes` before NOW. */
const ago = (minutes: number) => new Date(NOW - minutes * MIN).toISOString();
function row(
  studentId: string,
  problemId: string,
  { start, hints = [], end }: { start: number; hints?: number[]; end?: number },
): ActivityRow {
  return {
    studentId,
    problemId,
    startedAt: ago(start),
    hintViews: hints.map((m, i) => ({ ordinal: (i + 1) as HintOrdinal, viewedAt: ago(m) })),
    ...(end !== undefined && { reportedAt: ago(end), verification: 'self_reported' as const }),
  };
}
const student = (studentId: string, displayName: string) => ({
  studentId,
  displayName,
  joinedAt: ago(12 * DAY),
});

/** One fictitious student per situation in section 6 of docs/ENTREGA-2.md. */
const turma: ClassroomActivity = {
  roster: [
    student('eva', 'Eva'),
    student('ana', 'Ana'),
    student('bruno', 'Bruno'),
    student('carla', 'Carla'),
    student('davi', 'Davi'),
  ],
  activity: [
    // Ana: active, one completion without hints, one with a hint, one problem open.
    row('ana', 'sum', { start: 300, end: 280 }),
    row('ana', 'parity', { start: 240, hints: [230], end: 210 }),
    row('ana', 'weird', { start: 60 }),
    // Bruno never opened a problem.
    // Carla: last activity nine days ago.
    row('carla', 'sum', { start: 9 * DAY + 30, end: 9 * DAY }),
    // Davi: two problems open for three days with a hint revealed, no completion.
    row('davi', 'sum', { start: 3 * DAY, hints: [3 * DAY - 10] }),
    row('davi', 'parity', { start: 3 * DAY - 60, hints: [3 * DAY - 70] }),
    // Eva: three completions with many hints; the third hint of "maximum" came after reporting.
    row('eva', 'sum', {
      start: 2 * DAY,
      hints: [2 * DAY - 3, 2 * DAY - 7, 2 * DAY - 12],
      end: 2 * DAY - 40,
    }),
    row('eva', 'parity', { start: DAY, hints: [DAY - 3, DAY - 7, DAY - 12], end: DAY - 20 }),
    row('eva', 'maximum', { start: 200, hints: [197, 193, 100], end: 150 }),
    // Ignored: a student who left the class and a problem that is no longer published.
    row('saiu', 'sum', { start: 10, end: 5 }),
    row('ana', 'removido', { start: 10, hints: [5] }),
  ],
};
const report: ClassroomMetrics = classroomMetrics(modules, problems, turma, NOW);
const byName = (name: string) => report.students.find((s) => s.displayName === name)!;
const byProblem = (id: string) => report.problems.find((p) => p.problemId === id)!;
const kinds = (s: StudentMetrics) => s.signals.map((signal) => signal.kind);

describe('métricas da turma', () => {
  it('resume matrículas, atividade recente e etapa atual', () => {
    expect(report.enrolled).toBe(5);
    expect(report.activeLastWeek).toBe(3);
    expect(report.students.map((s) => s.displayName)).toEqual([
      'Ana',
      'Bruno',
      'Carla',
      'Davi',
      'Eva',
    ]);
    expect(report.moduleDistribution).toEqual([
      { moduleId: 'foundations', students: 3 },
      { moduleId: 'loops', students: 2 },
    ]);
  });

  it('calcula as métricas por aluno', () => {
    expect(byName('Ana')).toMatchObject({
      opened: 3,
      completed: 2,
      hintsPerCompletion: 0.5,
      noHintRate: 0.5,
      medianTimeToReportMs: 25 * MIN,
      lastActivity: ago(60),
      currentModule: 'loops',
      signals: [],
    });
    expect(byName('Ana').completionRate).toBeCloseTo(2 / 3);
    expect(byName('Bruno')).toMatchObject({
      opened: 0,
      completed: 0,
      completionRate: null,
      hintsPerCompletion: null,
      noHintRate: null,
      medianTimeToReportMs: null,
      lastActivity: null,
      currentModule: 'foundations',
    });
  });

  it('dica aberta depois da conclusão não conta como ajuda', () => {
    expect(byName('Eva').hintsPerCompletion).toBeCloseTo(8 / 3);
    expect(byProblem('maximum').hintFunnel).toEqual([1, 1, 0]);
    expect(report.map.eva.maximum).toEqual({ status: 'completed', hints: 2 });
  });

  it('aponta os sinais de atenção com o motivo', () => {
    expect(byName('Bruno').signals).toEqual([
      { kind: 'not_started', reason: 'Matriculado e ainda sem nenhum desafio aberto.' },
    ]);
    expect(byName('Carla').signals).toEqual([
      { kind: 'inactive', reason: 'Sem atividade há 9 dias.' },
    ]);
    expect(byName('Davi').signals).toEqual([
      { kind: 'stuck', reason: '2 desafios com dica aberta e sem conclusão há mais de 48 h.' },
    ]);
    expect(byName('Eva').signals).toEqual([
      { kind: 'hint_dependent', reason: 'Média de 2,7 dicas em 3 conclusões.' },
    ]);
    expect(kinds(byName('Ana'))).toEqual([]);
  });

  it('não marca como travado quem abriu dica há menos de 48 h ou sem dica', () => {
    const recent = classroomMetrics(
      modules,
      problems,
      {
        roster: [student('x', 'Xavier')],
        activity: [
          row('x', 'sum', { start: 47 * 60, hints: [46 * 60] }),
          row('x', 'parity', { start: 3 * DAY }),
          row('x', 'maximum', { start: 3 * DAY, hints: [3 * DAY - 5] }),
        ],
      },
      NOW,
    );
    expect(kinds(recent.students[0])).toEqual([]);
  });

  it('calcula métricas e funil por questão, ignorando atividade fora da turma', () => {
    expect(byProblem('sum')).toEqual({
      problemId: 'sum',
      opened: 4,
      completed: 3,
      completionRate: 0.75,
      hintFunnel: [0.5, 0.25, 0.25],
      medianTimeToReportMs: 30 * MIN,
    });
    expect(byProblem('binary')).toEqual({
      problemId: 'binary',
      opened: 0,
      completed: 0,
      completionRate: null,
      hintFunnel: null,
      medianTimeToReportMs: null,
    });
  });

  it('ordena as questões que mais exigiram ajuda', () => {
    expect(report.mostHelpNeeded.map((p) => p.problemId)).toEqual([
      'parity',
      'sum',
      'weird',
      'maximum',
    ]);
  });

  it('monta o mapa aluno × questão', () => {
    expect(describeCell(report.map.bruno.sum)).toBe('Não abriu');
    expect(describeCell(report.map.ana.weird)).toBe('Em andamento');
    expect(describeCell(report.map.davi.sum)).toBe('Viu 1 dica');
    expect(describeCell(report.map.ana.sum)).toBe('Concluiu sem dica');
    expect(describeCell(report.map.eva.sum)).toBe('Concluiu com 3 dicas');
    expect(Object.keys(report.map.ana)).toEqual(problems.map((p) => p.id));
  });

  it('lida com turma vazia', () => {
    const empty = classroomMetrics(modules, problems, { roster: [], activity: [] }, NOW);
    expect(empty).toMatchObject({
      enrolled: 0,
      activeLastWeek: 0,
      students: [],
      mostHelpNeeded: [],
      moduleDistribution: [],
      map: {},
    });
  });
});

describe('exportação CSV', () => {
  const csv = studentsCsv(report.students, modules, { timeZone: 'UTC' });
  const lines = csv.replace(/^﻿/, '').trimEnd().split('\r\n');
  it('usa BOM, ponto e vírgula, vírgula decimal e uma linha por aluno', () => {
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines).toHaveLength(6);
    expect(lines[0].split(';')).toContain('Conclusões autodeclaradas');
    expect(lines[0]).toContain('Sinais de atenção (não são nota)');
    expect(lines[1]).toBe(
      'Ana;31/10/2026, 15:00;3;2;67;0,5;50;25;12/11/2026, 14:00;Laços & simulação;',
    );
    expect(lines[5]).toContain(';2,7;0;');
    expect(lines[5].endsWith('Média de 2,7 dicas em 3 conclusões.')).toBe(true);
  });
  it('protege contra fórmulas e escapa separadores e aspas', () => {
    const [first] = report.students;
    const tricky = [
      { ...first, displayName: '=HYPERLINK("http://x")' },
      { ...first, displayName: 'Silva; Ana' },
      { ...first, displayName: '-1+2' },
    ];
    const [, a, b, c] = studentsCsv(tricky, modules, { timeZone: 'UTC' })
      .replace(/^﻿/, '')
      .split('\r\n');
    expect(a.startsWith(`"'=HYPERLINK(""http://x"")";`)).toBe(true);
    expect(b.startsWith('"Silva; Ana";')).toBe(true);
    expect(c.startsWith("'-1+2;")).toBe(true);
  });
});

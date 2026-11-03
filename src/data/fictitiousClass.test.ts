import { describe, expect, it } from 'vitest';
import { modules, problems } from '../lib/catalog';
import { classroomMetrics } from '../lib/metrics';
import { createDemoRepository } from './demoRepository';
import { createDemoStore } from './demoStore';
import { FICTITIOUS_CLASS, fictitiousActivity } from './fictitiousClass';

const NOW = Date.parse('2026-11-12T15:00:00Z');

describe('turma fictícia', () => {
  const data = fictitiousActivity(NOW);
  const report = classroomMetrics(modules, problems, data, NOW);
  const signalsOf = (name: string) =>
    report.students.find((s) => s.displayName === name)!.signals.map((s) => s.reason);

  it('é determinística, identificada e relativa ao momento de abertura', () => {
    expect(fictitiousActivity(NOW)).toEqual(data);
    expect(FICTITIOUS_CLASS).toMatchObject({ fictitious: true });
    expect(FICTITIOUS_CLASS.name).toContain('dados fictícios');
    expect(data.roster).toHaveLength(8);
    expect(new Set(data.roster.map((s) => s.studentId)).size).toBe(8);
    const later = Date.parse('2027-03-01T09:00:00Z');
    expect(classroomMetrics(modules, problems, fictitiousActivity(later), later).students).toEqual(
      report.students.map((s) => ({
        ...s,
        joinedAt: new Date(Date.parse(s.joinedAt) + later - NOW).toISOString(),
        lastActivity:
          s.lastActivity && new Date(Date.parse(s.lastActivity) + later - NOW).toISOString(),
      })),
    );
  });

  it('só usa desafios do catálogo e nunca registra eventos no futuro', () => {
    const ids = new Set(problems.map((p) => p.id));
    for (const row of data.activity) {
      expect(ids.has(row.problemId)).toBe(true);
      const times = [
        row.startedAt,
        ...row.hintViews.map((v) => v.viewedAt),
        row.reportedAt ?? row.startedAt,
      ];
      for (const t of times) expect(Date.parse(t)).toBeLessThanOrEqual(NOW);
      for (const v of row.hintViews)
        expect(Date.parse(v.viewedAt)).toBeGreaterThanOrEqual(Date.parse(row.startedAt));
    }
  });

  it('mostra cada sinal de atenção ao menos uma vez', () => {
    expect(signalsOf('Bruno S.')).toEqual(['Matriculado e ainda sem nenhum desafio aberto.']);
    expect(signalsOf('Camila R.')).toEqual(['Sem atividade há 10 dias.']);
    expect(signalsOf('Diego F.')).toEqual([
      '2 desafios com dica aberta e sem conclusão há mais de 48 h.',
    ]);
    expect(signalsOf('Elisa T.')).toEqual(['Média de 2,8 dicas em 4 conclusões.']);
    for (const name of ['Aline M.', 'Felipe N.', 'Gabriela P.', 'Heitor C.'])
      expect(signalsOf(name)).toEqual([]);
  });

  it('tem uma questão que claramente exigiu mais ajuda e alunos em várias etapas', () => {
    expect(report.mostHelpNeeded[0]).toMatchObject({
      problemId: 'distinct',
      hintFunnel: [1, 1, 1],
      completionRate: 0.5,
    });
    expect(report.moduleDistribution).toEqual([
      { moduleId: 'foundations', students: 3 },
      { moduleId: 'loops', students: 2 },
      { moduleId: 'arrays', students: 1 },
      { moduleId: 'complexity', students: 1 },
      { moduleId: null, students: 1 },
    ]);
    expect(report.activeLastWeek).toBe(6);
  });

  it('é servida pelo repositório da demonstração só ao professor', async () => {
    const store = createDemoStore(null, () => NOW);
    const repo = createDemoRepository(store, { now: () => NOW });
    await expect(repo.classroomActivity(FICTITIOUS_CLASS.id)).rejects.toMatchObject({
      code: 'teacher_required',
    });
    store.update((s) => ({ ...s, role: 'teacher' }));
    expect(await repo.classroomActivity(FICTITIOUS_CLASS.id)).toEqual(data);
  });
});

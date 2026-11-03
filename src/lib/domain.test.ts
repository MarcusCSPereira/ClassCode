import { describe, expect, it } from 'vitest';
import {
  belongsToClassroom,
  initialState,
  normalizeClassCode,
  remainingHintSeconds,
  safeExternalUrl,
  slug,
  validateProblem,
  visibleProblems,
} from './domain';
import { modules, problems } from './catalog';
import { binaryFrames, bubbleFrames } from './algorithms';

describe('dicas temporizadas', () => {
  const hint = { afterSeconds: 180, text: 'Uma direção' };
  it('bloqueia antes do limite e libera exatamente em 3 minutos', () => {
    expect(remainingHintSeconds(hint, 1000, 180999)).toBe(1);
    expect(remainingHintSeconds(hint, 1000, 181000)).toBe(0);
    expect(remainingHintSeconds(hint, 1000, 900000)).toBe(0);
  });
  it('não libera sem uma tentativa iniciada nem por relógio retrocedido', () => {
    expect(remainingHintSeconds(hint, undefined, 900000)).toBe(180);
    expect(remainingHintSeconds(hint, 10000, 100)).toBe(180);
  });
});
describe('contrato de conteúdo', () => {
  it('todo desafio tem o padrão pedagógico e três dicas em ordem', () => {
    for (const problem of problems) {
      expect(validateProblem(problem)).toBeNull();
      expect(problem.hints.map((h) => h.afterSeconds)).toEqual([180, 420, 720]);
      expect(modules.some((m) => m.id === problem.moduleId)).toBe(true);
    }
  });
  it('recusa questão incompleta', () => {
    expect(validateProblem({ ...problems[0], objective: '' })).not.toBeNull();
    expect(validateProblem({ ...problems[0], hints: [] })).not.toBeNull();
  });
  it('restringe links a judges conhecidos e HTTPS', () => {
    expect(safeExternalUrl('https://cses.fi/problemset/task/1068')).toBe(true);
    for (const url of [
      'javascript:alert(1)',
      'https://cses.fi.evil.test',
      'http://codeforces.com',
      'https://example.com',
      'https://codeforces.com@evil.test',
    ])
      expect(safeExternalUrl(url)).toBe(false);
  });
  it('mantém o grafo curricular acíclico', () => {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    function visit(id: string) {
      expect(visiting.has(id)).toBe(false);
      if (visited.has(id)) return;
      visiting.add(id);
      const m = modules.find((m) => m.id === id);
      expect(m).toBeDefined();
      m!.prerequisites.forEach(visit);
      visiting.delete(id);
      visited.add(id);
    }
    modules.forEach((m) => visit(m.id));
  });
});
describe('turmas da demonstração', () => {
  it('normaliza código', () => expect(normalizeClassCode(' class26 ')).toBe('CLASS26'));
  it('atribui o catálogo à turma inicial e questões autorais à turma de origem', () => {
    expect(belongsToClassroom(problems[0], 'demo-class')).toBe(true);
    expect(belongsToClassroom(problems[0], 'outra')).toBe(false);
    expect(belongsToClassroom({ authorClassId: 'outra' }, 'outra')).toBe(true);
    expect(belongsToClassroom({ authorClassId: 'outra' }, 'demo-class')).toBe(false);
  });
  it('gera nomes de arquivo sem acentos nem símbolos', () => {
    expect(slug('Algoritmos e programação I')).toBe('algoritmos-e-programacao-i');
    expect(slug('  Turma B · 2026/2 ')).toBe('turma-b-2026-2');
  });
  it('só lista conteúdo de turmas participantes para aluno', () => {
    const state = initialState();
    state.customProblems = [{ ...problems[0], id: 'custom', authorClassId: 'another-class' }];
    expect(visibleProblems(problems, state)).toHaveLength(problems.length);
    state.joinedClassIds.push('another-class');
    expect(visibleProblems(problems, state)).toHaveLength(problems.length + 1);
    state.joinedClassIds = [];
    state.role = 'teacher';
    expect(visibleProblems(problems, state)).toHaveLength(problems.length + 1);
  });
});
describe('visualização algorítmica', () => {
  it('busca binária encontra início, meio e fim e trata ausência', () => {
    const values = [2, 5, 8, 13, 19, 24, 31];
    for (const target of values)
      expect(binaryFrames(values, target).at(-1)?.found).toBe(values.indexOf(target));
    for (const target of [-1, 7, 50]) {
      const last = binaryFrames(values, target).at(-1)!;
      expect(last.found).toBeUndefined();
      expect(last.message).toContain('-1');
    }
    expect(binaryFrames([], 1).at(-1)?.message).toContain('-1');
  });
  it('bubble sort ordena sem alterar a entrada e preserva cada passo', () => {
    const input = [5, 1, 3, 1];
    const frames = bubbleFrames(input);
    expect(frames.at(-1)?.values).toEqual([1, 1, 3, 5]);
    expect(input).toEqual([5, 1, 3, 1]);
    expect(frames[0].values).toEqual(input);
    expect(bubbleFrames([]).at(-1)?.values).toEqual([]);
  });
});

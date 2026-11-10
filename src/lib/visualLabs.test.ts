import { describe, expect, it } from 'vitest';
import { modules, problems } from './catalog';
import { getVisualLab, visualLabIdFromProblem, visualLabs } from './visualLabs';

describe('visual labs', () => {
  it('associa cada visualização a um tópico e a um desafio válidos', () => {
    for (const lab of visualLabs) {
      expect(modules.some((module) => module.id === lab.moduleId)).toBe(true);
      expect(problems.some((problem) => problem.id === lab.problemId)).toBe(true);
    }
  });

  it('abre a visualização correspondente ao desafio quando houver associação', () => {
    expect(visualLabIdFromProblem('binary')).toBe('binary');
    expect(visualLabIdFromProblem('distinct')).toBe('bubble');
    expect(visualLabIdFromProblem('sum')).toBe('binary');
  });

  it('mantém o replay determinístico para a mesma entrada', () => {
    expect(getVisualLab('binary').buildFrames({ target: 13 })).toEqual(
      getVisualLab('binary').buildFrames({ target: 13 }),
    );
    expect(getVisualLab('bubble').buildFrames()).toEqual(getVisualLab('bubble').buildFrames());
  });
});

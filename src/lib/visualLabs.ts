import { binaryFrames, bubbleFrames, type Frame } from './algorithms';

export type VisualLabId = 'binary' | 'bubble';

export interface VisualLabDefinition {
  id: VisualLabId;
  title: string;
  complexity: string;
  moduleId: string;
  problemId: string;
  summary: string;
  predictionPrompt: string;
  explanationPrompt: string;
  helper: string;
  pseudocode: string[];
  buildFrames: (options?: { target?: number }) => Frame[];
}

export const visualLabs: VisualLabDefinition[] = [
  {
    id: 'binary',
    title: 'Busca binária',
    complexity: 'O(log n)',
    moduleId: 'search',
    problemId: 'binary',
    summary: 'Veja como cada comparação reduz o intervalo pela metade.',
    predictionPrompt: 'Antes de avançar, qual metade do vetor será descartada no próximo passo?',
    explanationPrompt: 'Depois do quadro atual, como você justificaria a atualização de l e r?',
    helper: 'Compare o alvo com o valor do meio e explique o invariante do intervalo.',
    pseudocode: [
      'l = 0; r = n - 1',
      'enquanto l ≤ r:',
      '    meio = (l + r) // 2',
      '    se vetor[meio] == alvo: retorne meio',
      '    se vetor[meio] < alvo: l = meio + 1',
      '    senão: r = meio - 1',
      'retorne -1',
    ],
    buildFrames: (options) => binaryFrames([2, 5, 8, 13, 19, 24, 31], options?.target ?? 19),
  },
  {
    id: 'bubble',
    title: 'Bubble sort',
    complexity: 'O(n²)',
    moduleId: 'complexity',
    problemId: 'distinct',
    summary: 'Acompanhe comparações locais até que os maiores valores cheguem ao fim.',
    predictionPrompt: 'Antes de avançar, quais dois valores serão comparados ou trocados agora?',
    explanationPrompt: 'Explique por que este passo aproxima o vetor de uma ordem crescente.',
    helper: 'Relacione a visualização com o custo de ordenar antes de contar distintos.',
    pseudocode: [
      'para i de 0 até n - 2:',
      '    para j de 0 até n - i - 2:',
      '        se vetor[j] > vetor[j + 1]:',
      '            troque(vetor[j], vetor[j + 1])',
      'retorne vetor',
    ],
    buildFrames: () => bubbleFrames([24, 8, 19, 5, 31, 13, 2]),
  },
];

export function getVisualLab(id: VisualLabId): VisualLabDefinition {
  const lab = visualLabs.find((candidate) => candidate.id === id);
  if (!lab) throw new Error(`Visual lab not found: ${id}`);
  return lab;
}

export function findVisualLabByProblemId(problemId: string): VisualLabDefinition | undefined {
  return visualLabs.find((lab) => lab.problemId === problemId);
}

export function visualLabIdFromProblem(problemId?: string | null): VisualLabId {
  return findVisualLabByProblemId(problemId ?? '')?.id ?? 'binary';
}

import { describe, expect, it, vi } from 'vitest';
import { problems } from './catalog';
import {
  createHttpJudgeGateway,
  executeJudge0Submission,
  JUDGE0_LANGUAGE_IDS,
  mapJudge0Status,
  PROBLEM_TEST_CASES,
  resolveProblemTestCases,
  verdictLabel,
} from './judge';

describe('judge e casos de teste dos exercícios', () => {
  it('inclui casos de teste para todos os 7 exercícios do catálogo com exemplo consistente', () => {
    for (const problem of problems) {
      const cases = PROBLEM_TEST_CASES[problem.id];
      expect(cases, `Casos ausentes para ${problem.id}`).toBeDefined();
      expect(cases.length).toBeGreaterThanOrEqual(3);
      expect(cases[0].stdin.trim()).toBe(problem.exampleInput.trim());
      expect(cases[0].expectedOutput.trim()).toBe(problem.exampleOutput.trim());
      expect(cases[0].isExample).toBe(true);
    }
  });

  it('resolve casos por id, por título (trilha importada com UUID) e para questão customizada', () => {
    const byId = resolveProblemTestCases({ problemId: 'sum' });
    expect(byId).toHaveLength(4);

    const byTitle = resolveProblemTestCases({
      problemId: 'uuid-importado-da-turma',
      problemTitle: 'Encontre o alvo',
    });
    expect(byTitle).toEqual(PROBLEM_TEST_CASES.binary);

    const custom = resolveProblemTestCases({
      problemId: 'custom-uuid',
      problemTitle: 'Dobro de um número',
      stdin: '21',
      expectedOutput: '42',
    });
    expect(custom).toEqual([{ stdin: '21\n', expectedOutput: '42\n', isExample: true }]);
  });

  it('mapeia IDs de status do Judge0 para vereditos do ClassCode', () => {
    expect(mapJudge0Status(1)).toBe('queued');
    expect(mapJudge0Status(2)).toBe('running');
    expect(mapJudge0Status(3)).toBe('accepted');
    expect(mapJudge0Status(4)).toBe('wrong_answer');
    expect(mapJudge0Status(5)).toBe('time_limit');
    expect(mapJudge0Status(6)).toBe('compile_error');
    expect(mapJudge0Status(7)).toBe('runtime_error');
    expect(mapJudge0Status(11)).toBe('runtime_error');
    expect(mapJudge0Status(13)).toBe('internal_error');
    expect(mapJudge0Status(3, 200000, 128000)).toBe('memory_limit');
    expect(verdictLabel('accepted')).toContain('Accepted');
  });

  it('executa todos os casos de teste de um exercício no Judge0 e retorna accepted', async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const fakeFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      calls.push({ url: String(input), body });
      return new Response(
        JSON.stringify({
          stdout: body.expected_output,
          time: '0.024',
          memory: 4096,
          status: { id: 3, description: 'Accepted' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as unknown as typeof fetch;

    const result = await executeJudge0Submission(
      {
        problemId: 'sum',
        language: 'python',
        sourceCode: 'print(sum(map(int, input().split())))',
        idempotencyKey: 'sub-1',
      },
      { baseUrl: 'https://judge0.example.com', fetchFn: fakeFetch },
    );

    expect(calls).toHaveLength(PROBLEM_TEST_CASES.sum.length);
    expect(calls[0].url).toBe(
      'https://judge0.example.com/submissions?base64_encoded=false&wait=true',
    );
    expect(calls[0].body).toMatchObject({
      language_id: JUDGE0_LANGUAGE_IDS.python,
      stdin: '12 8\n',
      expected_output: '20\n',
    });
    expect(result.verdict).toBe('accepted');
    expect(result.passedCases).toBe(4);
    expect(result.totalCases).toBe(4);
    expect(result.timeMs).toBe(24);
    expect(result.memoryKb).toBe(4096);
  });

  it('interrompe no primeiro caso com erro e não vaza stdout de caso de teste privado', async () => {
    let callIndex = 0;
    const fakeFetch = vi.fn(async () => {
      callIndex += 1;
      if (callIndex === 1) {
        return new Response(
          JSON.stringify({
            stdout: '20\n',
            time: '0.010',
            memory: 3200,
            status: { id: 3, description: 'Accepted' },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          stdout: 'saida-secreta-errada\n',
          time: '0.015',
          memory: 3500,
          status: { id: 4, description: 'Wrong Answer' },
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const result = await executeJudge0Submission(
      {
        problemId: 'sum',
        language: 'cpp',
        sourceCode: 'int main() { return 0; }',
        idempotencyKey: 'sub-2',
      },
      { fetchFn: fakeFetch },
    );

    expect(result.verdict).toBe('wrong_answer');
    expect(result.passedCases).toBe(1);
    expect(result.totalCases).toBe(4);
    expect(result.stdout).toBe('20\n');
  });

  it('faz polling por token quando o Judge0 responde com status em fila', async () => {
    const fakeFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/submissions?')) {
        return new Response(
          JSON.stringify({
            token: 'tok-123',
            status: { id: 1, description: 'In Queue' },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          token: 'tok-123',
          stdout: '42\n',
          time: '0.012',
          memory: 3000,
          status: { id: 3, description: 'Accepted' },
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const result = await executeJudge0Submission(
      {
        problemId: 'custom-1',
        language: 'java',
        sourceCode: 'public class Main {}',
        stdin: '21',
        expectedOutput: '42',
        idempotencyKey: 'sub-poll',
      },
      { fetchFn: fakeFetch },
    );

    expect(result.verdict).toBe('accepted');
    expect(result.passedCases).toBe(1);
  });

  it('gateway HTTP envia submissão e consulta resultado pelo endpoint da API', async () => {
    const fakeFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            id: 'sub-http-1',
            verdict: 'accepted',
            createdAt: '2026-11-16T00:00:00.000Z',
            passedCases: 4,
            totalCases: 4,
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          id: String(input).split('/').pop(),
          verdict: 'accepted',
          createdAt: '2026-11-16T00:00:00.000Z',
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const gateway = createHttpJudgeGateway('/api/judge/submit', fakeFetch);
    const submitted = await gateway.submit({
      problemId: 'sum',
      language: 'python',
      sourceCode: 'print(20)',
      idempotencyKey: 'sub-http-1',
    });
    expect(submitted.verdict).toBe('accepted');

    const fetched = await gateway.getResult('sub-http-1');
    expect(fetched.id).toBe('sub-http-1');
  });
});

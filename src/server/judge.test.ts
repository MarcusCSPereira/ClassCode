import { describe, expect, it, vi } from 'vitest';
import {
  JUDGE0_LANGUAGE_IDS,
  mapJudge0Status,
  runJudge0,
  type TestCase,
} from '../../supabase/functions/_shared/judge0.ts';
import {
  handleJudgeRequest,
  parseJudgeRequest,
} from '../../supabase/functions/_shared/judgeHandler.ts';
import { problems } from '../lib/catalog';
import { CATALOG_TEST_CASES, demoJudgeCases } from './demoJudgeCases';
import seed from '../../supabase/seed.sql?raw';

const judge0Response = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
const valid = {
  problemId: 'sum',
  language: 'python',
  sourceCode: 'print(20)',
  idempotencyKey: 'k1',
};

describe('casos de teste da trilha', () => {
  it('cobrem os 7 desafios do catálogo com o exemplo público primeiro', () => {
    for (const problem of problems) {
      const cases = CATALOG_TEST_CASES[problem.id];
      expect(cases, `casos ausentes para ${problem.id}`).toBeDefined();
      expect(cases.length).toBeGreaterThanOrEqual(3);
      expect(cases[0]).toMatchObject({
        stdin: `${problem.exampleInput}\n`,
        expectedOutput: `${problem.exampleOutput}\n`,
        isExample: true,
      });
      expect(cases.slice(1).every((c) => !c.isExample)).toBe(true);
    }
  });

  it('são os mesmos no seed do banco (modo remoto)', () => {
    const unescape = (s: string) => s.replace(/\\n/g, '\n').replace(/''/g, "'");
    const rows = [
      ...seed.matchAll(
        /\('(\w+)',(\d+),E'((?:[^'\\]|\\.|'')*)',E'((?:[^'\\]|\\.|'')*)',(true|false)\)/g,
      ),
    ];
    const fromSeed: Record<string, TestCase[]> = {};
    for (const [, key, ordinal, stdin, expected, example] of rows) {
      (fromSeed[key] ??= [])[Number(ordinal) - 1] = {
        stdin: unescape(stdin),
        expectedOutput: unescape(expected),
        ...(example === 'true' && { isExample: true }),
      };
    }
    expect(fromSeed).toEqual(CATALOG_TEST_CASES);
  });

  it('na demo, desafios do catálogo ignoram casos enviados pelo navegador', async () => {
    const forged = [{ stdin: '1', expectedOutput: '1' }];
    expect(await demoJudgeCases('sum', null, forged)).toBe(CATALOG_TEST_CASES.sum);
    expect(await demoJudgeCases('questao-local', null, forged)).toBe(forged);
    expect(await demoJudgeCases('questao-local', null)).toEqual([]);
  });
});

describe('execução no Judge0', () => {
  it('roda todos os casos e retorna accepted', async () => {
    const calls: Record<string, unknown>[] = [];
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      calls.push(body);
      return judge0Response({
        stdout: body.expected_output,
        time: '0.024',
        memory: 4096,
        status: { id: 3 },
      });
    }) as unknown as typeof fetch;
    const result = await runJudge0(
      { id: 's1', language: 'python', sourceCode: 'print(1)' },
      CATALOG_TEST_CASES.sum,
      { baseUrl: 'https://judge0.test/', fetchFn },
    );
    expect(calls).toHaveLength(4);
    expect(calls[0]).toMatchObject({
      language_id: JUDGE0_LANGUAGE_IDS.python,
      stdin: '12 8\n',
      expected_output: '20\n',
    });
    expect(result).toMatchObject({
      id: 's1',
      verdict: 'accepted',
      passedCases: 4,
      totalCases: 4,
      timeMs: 24,
      memoryKb: 4096,
      stdout: '20\n',
    });
  });

  it('para no primeiro erro e nunca devolve a saída de um caso oculto', async () => {
    let call = 0;
    const fetchFn = vi.fn(async () =>
      ++call === 1
        ? judge0Response({ stdout: '20\n', status: { id: 3 } })
        : judge0Response({ stdout: 'saida-secreta\n', status: { id: 4 } }),
    ) as unknown as typeof fetch;
    const result = await runJudge0(
      { id: 's2', language: 'cpp', sourceCode: 'int main(){}' },
      CATALOG_TEST_CASES.sum,
      { fetchFn },
    );
    expect(result).toMatchObject({ verdict: 'wrong_answer', passedCases: 1, stdout: '20\n' });
    expect(JSON.stringify(result)).not.toContain('saida-secreta');
  });

  it('consulta pelo token quando o Judge0 enfileira', async () => {
    const fetchFn = vi.fn(async (url: RequestInfo | URL) =>
      String(url).includes('/submissions?')
        ? judge0Response({ token: 't1', status: { id: 1 } })
        : judge0Response({ token: 't1', stdout: '42\n', status: { id: 3 } }),
    ) as unknown as typeof fetch;
    const result = await runJudge0(
      { id: 's3', language: 'java', sourceCode: 'class Main {}' },
      [{ stdin: '21', expectedOutput: '42', isExample: true }],
      { fetchFn },
    );
    expect(result).toMatchObject({ verdict: 'accepted', passedCases: 1 });
  });

  it('mapeia os status do Judge0', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 11, 13].map((id) => mapJudge0Status(id))).toEqual([
      'queued',
      'running',
      'accepted',
      'wrong_answer',
      'time_limit',
      'compile_error',
      'runtime_error',
      'runtime_error',
      'internal_error',
    ]);
    expect(mapJudge0Status(3, 200000, 128000)).toBe('memory_limit');
  });
});

describe('tratamento da requisição', () => {
  const run = vi.fn(async (submission: { id: string }) => ({
    id: submission.id,
    verdict: 'accepted' as const,
    createdAt: 'agora',
  }));

  it('valida o corpo recebido', () => {
    expect(parseJudgeRequest(valid)).toEqual(valid);
    for (const invalid of [
      null,
      { ...valid, language: 'ruby' },
      { ...valid, sourceCode: '   ' },
      { ...valid, sourceCode: 'x'.repeat(64 * 1024 + 1) },
      { ...valid, problemId: '' },
      { ...valid, tests: 'nada' },
      { ...valid, tests: Array(21).fill({ stdin: '1', expectedOutput: '1' }) },
    ])
      expect(parseJudgeRequest(invalid)).toBeNull();
  });

  it('exige sessão quando a publicação autentica', async () => {
    const deps = { authenticate: async () => null, loadCases: async () => [], run };
    expect(await handleJudgeRequest(valid, null, deps)).toEqual({
      status: 401,
      body: { error: 'authentication_required' },
    });
  });

  it('nega quem não pode rodar o desafio e avisa quando faltam casos', async () => {
    const denied = await handleJudgeRequest(valid, 'Bearer t', {
      authenticate: async () => 'aluno',
      loadCases: async () => {
        throw new Error('problem_not_accessible');
      },
      run,
    });
    expect(denied).toEqual({ status: 403, body: { error: 'problem_not_accessible' } });
    const broken = await handleJudgeRequest(valid, null, {
      loadCases: async () => {
        throw new Error('timeout');
      },
      run,
    });
    expect(broken.status).toBe(502);
    expect((await handleJudgeRequest(valid, null, { loadCases: async () => [], run })).status).toBe(
      422,
    );
  });

  it('roda com os casos do servidor e o usuário autenticado', async () => {
    const loadCases = vi.fn(async () => CATALOG_TEST_CASES.sum);
    const response = await handleJudgeRequest(
      { ...valid, tests: [{ stdin: '1', expectedOutput: '1' }] },
      'Bearer t',
      { authenticate: async () => 'aluno-1', loadCases, run },
    );
    expect(response).toMatchObject({ status: 200, body: { id: 'k1', verdict: 'accepted' } });
    expect(loadCases).toHaveBeenCalledWith('sum', 'aluno-1', [
      { stdin: '1', expectedOutput: '1', isExample: false },
    ]);
    expect(run).toHaveBeenLastCalledWith(
      { id: 'k1', language: 'python', sourceCode: 'print(20)' },
      CATALOG_TEST_CASES.sum,
      undefined,
    );
  });
});

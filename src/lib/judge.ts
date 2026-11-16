/** Server-side integration contract. The demo never executes untrusted source. */
import { problems as catalogProblems } from './catalog.ts';
import type { Language } from './types.ts';

export type Verdict =
  | 'queued'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit'
  | 'memory_limit'
  | 'compile_error'
  | 'runtime_error'
  | 'internal_error';

export interface TestCase {
  stdin: string;
  expectedOutput: string;
  isExample?: boolean;
}

export interface SubmissionRequest {
  problemId: string;
  language: Language;
  sourceCode: string;
  idempotencyKey: string;
  problemTitle?: string;
  stdin?: string;
  expectedOutput?: string;
}

export interface SubmissionResult {
  id: string;
  verdict: Verdict;
  createdAt: string;
  timeMs?: number;
  memoryKb?: number;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  passedCases?: number;
  totalCases?: number;
}

export interface JudgeGateway {
  submit(request: SubmissionRequest): Promise<SubmissionResult>;
  getResult(submissionId: string): Promise<SubmissionResult>;
}

/** Standard Judge0 CE language IDs (Python 3, OpenJDK Java, GCC C++17). */
export const JUDGE0_LANGUAGE_IDS: Record<Language, number> = {
  python: 71,
  java: 62,
  cpp: 54,
};

/**
 * Test cases for the 7 exercises already created in the base trail.
 * Includes the public example from the statement plus edge cases.
 */
export const PROBLEM_TEST_CASES: Record<string, TestCase[]> = {
  sum: [
    { stdin: '12 8\n', expectedOutput: '20\n', isExample: true },
    { stdin: '0 0\n', expectedOutput: '0\n' },
    { stdin: '1000000 1000000\n', expectedOutput: '2000000\n' },
    { stdin: '42 58\n', expectedOutput: '100\n' },
  ],
  parity: [
    { stdin: '7\n', expectedOutput: 'IMPAR\n', isExample: true },
    { stdin: '0\n', expectedOutput: 'PAR\n' },
    { stdin: '2\n', expectedOutput: 'PAR\n' },
    { stdin: '1000000000\n', expectedOutput: 'PAR\n' },
    { stdin: '999999999\n', expectedOutput: 'IMPAR\n' },
  ],
  maximum: [
    { stdin: '4 9 6\n', expectedOutput: '9\n', isExample: true },
    { stdin: '10 2 5\n', expectedOutput: '10\n' },
    { stdin: '1 2 3\n', expectedOutput: '3\n' },
    { stdin: '0 0 0\n', expectedOutput: '0\n' },
    { stdin: '1000 999 1000\n', expectedOutput: '1000\n' },
  ],
  weird: [
    { stdin: '3\n', expectedOutput: '3 10 5 16 8 4 2 1\n', isExample: true },
    { stdin: '1\n', expectedOutput: '1\n' },
    { stdin: '6\n', expectedOutput: '6 3 10 5 16 8 4 2 1\n' },
    { stdin: '7\n', expectedOutput: '7 22 11 34 17 52 26 13 40 20 10 5 16 8 4 2 1\n' },
  ],
  missing: [
    { stdin: '5\n2 3 1 5\n', expectedOutput: '4\n', isExample: true },
    { stdin: '2\n1\n', expectedOutput: '2\n' },
    { stdin: '2\n2\n', expectedOutput: '1\n' },
    { stdin: '6\n1 2 3 4 5\n', expectedOutput: '6\n' },
  ],
  distinct: [
    { stdin: '5\n2 3 2 2 3\n', expectedOutput: '2\n', isExample: true },
    { stdin: '1\n42\n', expectedOutput: '1\n' },
    { stdin: '4\n10 10 10 10\n', expectedOutput: '1\n' },
    { stdin: '6\n1 2 3 4 5 6\n', expectedOutput: '6\n' },
  ],
  binary: [
    { stdin: '7 13\n2 5 8 13 19 24 31\n', expectedOutput: '3\n', isExample: true },
    { stdin: '7 2\n2 5 8 13 19 24 31\n', expectedOutput: '0\n' },
    { stdin: '7 31\n2 5 8 13 19 24 31\n', expectedOutput: '6\n' },
    { stdin: '7 10\n2 5 8 13 19 24 31\n', expectedOutput: '-1\n' },
    { stdin: '1 5\n5\n', expectedOutput: '0\n' },
  ],
};

function ensureTrailingNewline(value: string): string {
  return value.endsWith('\n') ? value : `${value}\n`;
}

/**
 * Resolves the test suite for any exercise (either one of the 7 catalog problems
 * by id/title, or a custom teacher problem using its exampleInput/exampleOutput).
 */
export function resolveProblemTestCases(ref: {
  problemId: string;
  problemTitle?: string;
  stdin?: string;
  expectedOutput?: string;
}): TestCase[] {
  const byId = PROBLEM_TEST_CASES[ref.problemId];
  if (byId) return byId;

  if (ref.problemTitle) {
    const matched = catalogProblems.find(
      (p) => p.title.toLowerCase() === ref.problemTitle?.trim().toLowerCase(),
    );
    if (matched && PROBLEM_TEST_CASES[matched.id]) {
      return PROBLEM_TEST_CASES[matched.id];
    }
  }

  const catalogMatch = catalogProblems.find((p) => p.id === ref.problemId);
  if (catalogMatch) {
    return [
      {
        stdin: ensureTrailingNewline(catalogMatch.exampleInput),
        expectedOutput: ensureTrailingNewline(catalogMatch.exampleOutput),
        isExample: true,
      },
    ];
  }

  if (ref.stdin !== undefined && ref.expectedOutput !== undefined) {
    return [
      {
        stdin: ensureTrailingNewline(ref.stdin),
        expectedOutput: ensureTrailingNewline(ref.expectedOutput),
        isExample: true,
      },
    ];
  }

  return [];
}

/** Maps Judge0 numeric status IDs to ClassCode Verdict values. */
export function mapJudge0Status(
  statusId: number | undefined,
  memoryKb?: number,
  memoryLimitKb = 128000,
): Verdict {
  if (memoryKb !== undefined && memoryKb > memoryLimitKb) return 'memory_limit';
  switch (statusId) {
    case 1:
      return 'queued';
    case 2:
      return 'running';
    case 3:
      return 'accepted';
    case 4:
      return 'wrong_answer';
    case 5:
      return 'time_limit';
    case 6:
      return 'compile_error';
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
    case 12:
      return 'runtime_error';
    default:
      return 'internal_error';
  }
}

export function verdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case 'queued':
      return 'Na fila';
    case 'running':
      return 'Executando…';
    case 'accepted':
      return 'Aceito (Accepted)';
    case 'wrong_answer':
      return 'Resposta incorreta';
    case 'time_limit':
      return 'Limite de tempo excedido';
    case 'memory_limit':
      return 'Limite de memória excedido';
    case 'compile_error':
      return 'Erro de compilação';
    case 'runtime_error':
      return 'Erro de execução';
    case 'internal_error':
      return 'Erro interno no judge';
  }
}

export interface Judge0Config {
  baseUrl?: string;
  apiKey?: string;
  authToken?: string;
  cpuTimeLimitSeconds?: number;
  memoryLimitKb?: number;
  fetchFn?: typeof fetch;
}

interface Judge0SubmissionResponse {
  token?: string;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | number | null;
  memory?: number | null;
  status?: {
    id?: number;
    description?: string;
  };
}

function buildJudge0Headers(baseUrl: string, apiKey?: string, authToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['X-RapidAPI-Key'] = apiKey;
    try {
      headers['X-RapidAPI-Host'] = new URL(baseUrl).host;
    } catch {
      // ignore invalid URL host extraction
    }
  }
  if (authToken) {
    headers['X-Auth-Token'] = authToken;
  }
  return headers;
}

/**
 * Executes a submission against a Judge0 instance across all test cases of the problem.
 * Designed to run in the server/gateway layer so secrets and private test cases stay off the client.
 */
export async function executeJudge0Submission(
  request: SubmissionRequest,
  config: Judge0Config = {},
): Promise<SubmissionResult> {
  const baseUrl = (config.baseUrl || 'https://ce.judge0.com').replace(/\/+$/, '');
  const fetchFn = config.fetchFn ?? fetch;
  const cpuTimeLimit = config.cpuTimeLimitSeconds ?? 2.0;
  const memoryLimit = config.memoryLimitKb ?? 128000;
  const languageId = JUDGE0_LANGUAGE_IDS[request.language];
  const createdAt = new Date().toISOString();
  const submissionId = request.idempotencyKey || crypto.randomUUID();

  if (!languageId || !request.sourceCode?.trim()) {
    return {
      id: submissionId,
      verdict: 'internal_error',
      createdAt,
      stderr: 'Código-fonte ou linguagem inválida.',
    };
  }

  const testCases = resolveProblemTestCases({
    problemId: request.problemId,
    problemTitle: request.problemTitle,
    stdin: request.stdin,
    expectedOutput: request.expectedOutput,
  });

  if (testCases.length === 0) {
    return {
      id: submissionId,
      verdict: 'internal_error',
      createdAt,
      stderr: 'Nenhum caso de teste encontrado para este desafio.',
    };
  }

  const headers = buildJudge0Headers(baseUrl, config.apiKey, config.authToken);
  let maxTimeMs = 0;
  let maxMemoryKb = 0;
  let passedCases = 0;
  let firstExampleStdout: string | undefined;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const payload = {
      source_code: request.sourceCode,
      language_id: languageId,
      stdin: tc.stdin,
      expected_output: tc.expectedOutput,
      cpu_time_limit: cpuTimeLimit,
      memory_limit: memoryLimit,
    };

    let data: Judge0SubmissionResponse;
    try {
      const response = await fetchFn(`${baseUrl}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return {
          id: submissionId,
          verdict: 'internal_error',
          createdAt,
          passedCases,
          totalCases: testCases.length,
          stderr: `Judge0 retornou HTTP ${response.status}.`,
        };
      }

      data = (await response.json()) as Judge0SubmissionResponse;

      // If the Judge0 instance queued the submission instead of waiting, poll by token.
      let polls = 0;
      while (data.status?.id && data.status.id <= 2 && data.token && polls < 10) {
        polls += 1;
        await new Promise((r) => setTimeout(r, 300));
        const pollRes = await fetchFn(
          `${baseUrl}/submissions/${encodeURIComponent(data.token)}?base64_encoded=false`,
          { method: 'GET', headers },
        );
        if (!pollRes.ok) break;
        data = (await pollRes.json()) as Judge0SubmissionResponse;
      }
    } catch (error) {
      return {
        id: submissionId,
        verdict: 'internal_error',
        createdAt,
        passedCases,
        totalCases: testCases.length,
        stderr:
          error instanceof Error
            ? `Não foi possível conectar ao Judge0: ${error.message}`
            : 'Não foi possível conectar ao Judge0.',
      };
    }

    const timeMs =
      data.time !== null && data.time !== undefined
        ? Math.round(Number(data.time) * 1000)
        : undefined;
    const memoryKb = data.memory ?? undefined;
    if (timeMs !== undefined && !Number.isNaN(timeMs)) maxTimeMs = Math.max(maxTimeMs, timeMs);
    if (memoryKb !== undefined) maxMemoryKb = Math.max(maxMemoryKb, memoryKb);
    if (i === 0 && data.stdout) firstExampleStdout = data.stdout;

    const verdict = mapJudge0Status(data.status?.id, memoryKb, memoryLimit);
    if (verdict !== 'accepted') {
      return {
        id: submissionId,
        verdict,
        createdAt,
        timeMs: maxTimeMs,
        memoryKb: maxMemoryKb,
        // Only expose stdout on the public example case to avoid leaking hidden test outputs.
        stdout: tc.isExample ? (data.stdout ?? undefined) : firstExampleStdout,
        stderr: data.stderr ?? data.message ?? undefined,
        compileOutput: data.compile_output ?? undefined,
        passedCases,
        totalCases: testCases.length,
      };
    }

    passedCases += 1;
  }

  return {
    id: submissionId,
    verdict: 'accepted',
    createdAt,
    timeMs: maxTimeMs,
    memoryKb: maxMemoryKb,
    stdout: firstExampleStdout,
    passedCases,
    totalCases: testCases.length,
  };
}

/**
 * Browser-side gateway that talks to the ClassCode Judge API endpoint (`/api/judge/submit`),
 * which proxies requests to Judge0 on the server.
 */
export function createHttpJudgeGateway(
  endpoint = '/api/judge/submit',
  fetchFn: typeof fetch = fetch,
): JudgeGateway {
  const baseEndpoint = endpoint.replace(/\/+$/, '');
  return {
    async submit(request: SubmissionRequest): Promise<SubmissionResult> {
      const response = await fetchFn(baseEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        throw new Error(`Falha ao submeter código (HTTP ${response.status}).`);
      }
      return (await response.json()) as SubmissionResult;
    },
    async getResult(submissionId: string): Promise<SubmissionResult> {
      const response = await fetchFn(`${baseEndpoint}/${encodeURIComponent(submissionId)}`, {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error(`Não foi possível consultar a submissão (HTTP ${response.status}).`);
      }
      return (await response.json()) as SubmissionResult;
    },
  };
}

export const judgeGateway: JudgeGateway = createHttpJudgeGateway();

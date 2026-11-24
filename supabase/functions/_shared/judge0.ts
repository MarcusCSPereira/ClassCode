/**
 * Judge0 runner shared by the local dev server (vite.config.ts) and the Supabase Edge
 * Function. Server-side only: it receives the test cases, including hidden ones, and never
 * returns their outputs. Keep this file free of imports so Deno can bundle it as is.
 */

export type Language = 'python' | 'java' | 'cpp';
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
  /** Public example from the statement; only its stdout may be shown to the student. */
  isExample?: boolean;
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

export interface Judge0Config {
  baseUrl?: string;
  apiKey?: string;
  authToken?: string;
  cpuTimeLimitSeconds?: number;
  memoryLimitKb?: number;
  fetchFn?: typeof fetch;
}

/** Standard Judge0 CE language IDs (Python 3, OpenJDK Java, GCC C++17). */
export const JUDGE0_LANGUAGE_IDS: Record<Language, number> = {
  python: 71,
  java: 62,
  cpp: 54,
};

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

function judge0Headers(baseUrl: string, apiKey?: string, authToken?: string): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['X-RapidAPI-Key'] = apiKey;
    try {
      headers['X-RapidAPI-Host'] = new URL(baseUrl).host;
    } catch {
      // An invalid base URL fails on the request itself.
    }
  }
  if (authToken) headers['X-Auth-Token'] = authToken;
  return headers;
}

const withTrailingNewline = (value: string) => (value.endsWith('\n') ? value : `${value}\n`);

/**
 * Runs the source against every case, stopping at the first failure. Only the stdout of
 * the public example is ever returned, so hidden outputs never reach the browser.
 */
export async function runJudge0(
  submission: { id: string; language: Language; sourceCode: string },
  cases: TestCase[],
  config: Judge0Config = {},
): Promise<SubmissionResult> {
  const baseUrl = (config.baseUrl || 'https://ce.judge0.com').replace(/\/+$/, '');
  const fetchFn = config.fetchFn ?? fetch;
  const cpuTimeLimit = config.cpuTimeLimitSeconds ?? 2.0;
  const memoryLimit = config.memoryLimitKb ?? 128000;
  const languageId = JUDGE0_LANGUAGE_IDS[submission.language];
  const createdAt = new Date().toISOString();
  const base = { id: submission.id, createdAt };

  if (!languageId || !submission.sourceCode?.trim())
    return { ...base, verdict: 'internal_error', stderr: 'Código-fonte ou linguagem inválida.' };
  if (cases.length === 0)
    return {
      ...base,
      verdict: 'internal_error',
      stderr: 'Nenhum caso de teste encontrado para este desafio.',
    };

  const headers = judge0Headers(baseUrl, config.apiKey, config.authToken);
  let maxTimeMs = 0;
  let maxMemoryKb = 0;
  let passedCases = 0;
  let exampleStdout: string | undefined;

  for (const testCase of cases) {
    let data: Judge0SubmissionResponse;
    try {
      const response = await fetchFn(`${baseUrl}/submissions?base64_encoded=false&wait=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source_code: submission.sourceCode,
          language_id: languageId,
          stdin: withTrailingNewline(testCase.stdin),
          expected_output: withTrailingNewline(testCase.expectedOutput),
          cpu_time_limit: cpuTimeLimit,
          memory_limit: memoryLimit,
        }),
      });
      if (!response.ok)
        return {
          ...base,
          verdict: 'internal_error',
          passedCases,
          totalCases: cases.length,
          stderr: `Judge0 retornou HTTP ${response.status}.`,
        };
      data = (await response.json()) as Judge0SubmissionResponse;

      // If the Judge0 instance queued the submission instead of waiting, poll by token.
      let polls = 0;
      while (data.status?.id && data.status.id <= 2 && data.token && polls < 10) {
        polls += 1;
        await new Promise((resolve) => setTimeout(resolve, 300));
        const pollResponse = await fetchFn(
          `${baseUrl}/submissions/${encodeURIComponent(data.token)}?base64_encoded=false`,
          { method: 'GET', headers },
        );
        if (!pollResponse.ok) break;
        data = (await pollResponse.json()) as Judge0SubmissionResponse;
      }
    } catch (error) {
      return {
        ...base,
        verdict: 'internal_error',
        passedCases,
        totalCases: cases.length,
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
    if (testCase.isExample && data.stdout && exampleStdout === undefined)
      exampleStdout = data.stdout;

    const verdict = mapJudge0Status(data.status?.id, memoryKb, memoryLimit);
    if (verdict !== 'accepted')
      return {
        ...base,
        verdict,
        timeMs: maxTimeMs,
        memoryKb: maxMemoryKb,
        stdout: testCase.isExample ? (data.stdout ?? undefined) : exampleStdout,
        stderr: data.stderr ?? data.message ?? undefined,
        compileOutput: data.compile_output ?? undefined,
        passedCases,
        totalCases: cases.length,
      };
    passedCases += 1;
  }

  return {
    ...base,
    verdict: 'accepted',
    timeMs: maxTimeMs,
    memoryKb: maxMemoryKb,
    stdout: exampleStdout,
    passedCases,
    totalCases: cases.length,
  };
}

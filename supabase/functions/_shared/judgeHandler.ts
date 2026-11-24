/**
 * Request handling shared by the local dev server and the judge-submit Edge Function.
 * Each deployment injects how it identifies the caller and where test cases come from;
 * validation, error codes and the Judge0 run are the same everywhere.
 */
import {
  runJudge0,
  type Judge0Config,
  type Language,
  type SubmissionResult,
  type TestCase,
} from './judge0.ts';

/** What the browser sends. `tests` is honored only where `loadCases` chooses to (local demo). */
export interface JudgeRequestBody {
  problemId: string;
  language: Language;
  sourceCode: string;
  idempotencyKey?: string;
  tests?: TestCase[];
}
export interface JudgeDeps {
  /** Resolves the caller from the Authorization header; null rejects with 401. Omit to skip. */
  authenticate?: (authorization: string | null) => Promise<string | null>;
  /**
   * Test cases for the problem, hidden ones included. Throw an Error whose message is
   * `problem_not_accessible` when the caller may not run this problem.
   */
  loadCases: (
    problemId: string,
    userId: string | null,
    clientTests?: TestCase[],
  ) => Promise<TestCase[]>;
  judge0?: Judge0Config;
  /** Replaces the Judge0 run in tests. */
  run?: typeof runJudge0;
}
export interface JudgeResponse {
  status: number;
  body: SubmissionResult | { error: string };
}

const LANGUAGES: Language[] = ['python', 'java', 'cpp'];
export const JUDGE_LIMITS = { sourceBytes: 64 * 1024, tests: 20, testBytes: 20_000 };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;

function parseTests(value: unknown): TestCase[] | undefined | null {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > JUDGE_LIMITS.tests) return null;
  const tests: TestCase[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      !isText(item.stdin, JUDGE_LIMITS.testBytes) ||
      !isText(item.expectedOutput, JUDGE_LIMITS.testBytes)
    )
      return null;
    tests.push({
      stdin: item.stdin,
      expectedOutput: item.expectedOutput,
      isExample: item.isExample === true,
    });
  }
  return tests;
}

/** Validates the untrusted JSON body; null when anything is missing or out of bounds. */
export function parseJudgeRequest(value: unknown): JudgeRequestBody | null {
  if (!isRecord(value)) return null;
  const { problemId, language, sourceCode, idempotencyKey } = value;
  const tests = parseTests(value.tests);
  if (
    !isText(problemId, 200) ||
    !problemId.trim() ||
    !LANGUAGES.includes(language as Language) ||
    !isText(sourceCode, JUDGE_LIMITS.sourceBytes) ||
    !sourceCode.trim() ||
    (idempotencyKey !== undefined && !isText(idempotencyKey, 100)) ||
    tests === null
  )
    return null;
  return {
    problemId,
    language: language as Language,
    sourceCode,
    ...(idempotencyKey !== undefined && { idempotencyKey }),
    ...(tests && { tests }),
  };
}

export async function handleJudgeRequest(
  rawBody: unknown,
  authorization: string | null,
  deps: JudgeDeps,
): Promise<JudgeResponse> {
  const request = parseJudgeRequest(rawBody);
  if (!request) return { status: 400, body: { error: 'invalid_submission_payload' } };

  let userId: string | null = null;
  if (deps.authenticate) {
    userId = await deps.authenticate(authorization);
    if (!userId) return { status: 401, body: { error: 'authentication_required' } };
  }

  let cases: TestCase[];
  try {
    cases = await deps.loadCases(request.problemId, userId, request.tests);
  } catch (error) {
    return error instanceof Error && error.message === 'problem_not_accessible'
      ? { status: 403, body: { error: 'problem_not_accessible' } }
      : { status: 502, body: { error: 'cases_unavailable' } };
  }
  if (cases.length === 0) return { status: 422, body: { error: 'no_test_cases' } };

  const run = deps.run ?? runJudge0;
  const result = await run(
    {
      id: request.idempotencyKey ?? crypto.randomUUID(),
      language: request.language,
      sourceCode: request.sourceCode,
    },
    cases,
    deps.judge0,
  );
  return { status: 200, body: result };
}

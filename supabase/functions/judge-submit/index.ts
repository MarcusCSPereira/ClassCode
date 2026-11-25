/**
 * Supabase Edge Function: runs a student's code on Judge0 against the problem's test cases.
 * The caller is identified by the session token; the cases come from the database through
 * public.judge_cases, which only the service role may call and which checks that the
 * caller owns the class or is enrolled in it. Hidden cases never leave the server.
 *
 * Secrets (supabase secrets set ...): JUDGE0_URL, JUDGE0_API_KEY, JUDGE0_AUTH_TOKEN.
 * SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
 */
import type { TestCase } from '../_shared/judge0.ts';
import { handleJudgeRequest } from '../_shared/judgeHandler.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function authenticate(authorization: string | null): Promise<string | null> {
  if (!authorization?.startsWith('Bearer ')) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: unknown };
  return typeof user.id === 'string' ? user.id : null;
}

async function loadCases(problemId: string, userId: string | null): Promise<TestCase[]> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/judge_cases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ pid: problemId, requester: userId }),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string; code?: string };
    // 22P02: the id is not a UUID, so it cannot be a problem of this database.
    throw new Error(
      error.message === 'problem_not_accessible' || error.code === '22P02'
        ? 'problem_not_accessible'
        : 'cases_unavailable',
    );
  }
  return (await response.json()) as TestCase[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_submission_payload' });
  }
  const { status, body: payload } = await handleJudgeRequest(
    body,
    req.headers.get('Authorization'),
    {
      authenticate,
      loadCases,
      judge0: {
        baseUrl: Deno.env.get('JUDGE0_URL') || 'https://ce.judge0.com',
        apiKey: Deno.env.get('JUDGE0_API_KEY') || undefined,
        authToken: Deno.env.get('JUDGE0_AUTH_TOKEN') || undefined,
      },
    },
  );
  return json(status, payload);
});

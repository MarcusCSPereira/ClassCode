/**
 * Supabase Edge Function: Judge0 Gateway for ClassCode.
 * Evaluates student submissions against the exercises' test cases via Judge0 API.
 *
 * Environment variables (server-side only):
 * - JUDGE0_URL (defaults to https://ce.judge0.com)
 * - JUDGE0_API_KEY (optional RapidAPI key)
 * - JUDGE0_AUTH_TOKEN (optional self-hosted Judge0 X-Auth-Token)
 */
import { executeJudge0Submission, type SubmissionRequest } from '../../../src/lib/judge.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as SubmissionRequest;
    const result = await executeJudge0Submission(body, {
      baseUrl: Deno.env.get('JUDGE0_URL') || 'https://ce.judge0.com',
      apiKey: Deno.env.get('JUDGE0_API_KEY') || undefined,
      authToken: Deno.env.get('JUDGE0_AUTH_TOKEN') || undefined,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_submission_payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

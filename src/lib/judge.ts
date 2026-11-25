/**
 * Browser side of code execution. The browser sends only the source; the server holds the
 * test cases and runs Judge0 (supabase/functions/_shared). See docs/JUDGE-API.md.
 */
import type { Language } from './types';
import type {
  SubmissionResult,
  TestCase,
  Verdict,
} from '../../supabase/functions/_shared/judge0.ts';

export type { SubmissionResult, TestCase, Verdict };

export interface SubmissionRequest {
  problemId: string;
  language: Language;
  sourceCode: string;
  idempotencyKey: string;
  /** Cases of a problem that exists only in the local demo; servers with a database ignore it. */
  tests?: TestCase[];
}
export interface JudgeGateway {
  submit(request: SubmissionRequest): Promise<SubmissionResult>;
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

/**
 * Where the browser sends code, or null when this build has no judge (static hosting such
 * as GitHub Pages). `VITE_JUDGE_URL=off` disables it explicitly.
 */
export function resolveJudgeEndpoint({
  configured,
  remote,
  supabaseUrl,
  dev,
}: {
  configured?: string;
  remote: boolean;
  supabaseUrl?: string;
  dev: boolean;
}): string | null {
  const url = configured?.trim();
  if (url === 'off') return null;
  if (url) return url;
  if (remote && supabaseUrl) return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/judge-submit`;
  return dev ? '/api/judge/submit' : null;
}

const NOT_FOUND =
  'O serviço de execução não foi encontrado. Confira se a função judge-submit foi publicada e o VITE_JUDGE_URL.';
const httpMessages: Record<number, string> = {
  400: 'O código enviado é inválido ou grande demais.',
  401: 'Entre novamente para executar o código.',
  403: 'Você não tem acesso aos testes deste desafio.',
  404: NOT_FOUND,
  405: NOT_FOUND,
  422: 'Este desafio ainda não tem casos de teste.',
};

export function createHttpJudgeGateway(
  endpoint: string,
  {
    fetchFn = fetch,
    headers,
  }: {
    fetchFn?: typeof fetch;
    /** Extra headers per request, such as the Supabase session token. */
    headers?: () => Promise<Record<string, string>>;
  } = {},
): JudgeGateway {
  return {
    async submit(request) {
      let response: Response;
      try {
        response = await fetchFn(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await headers?.()) },
          body: JSON.stringify(request),
        });
      } catch {
        throw new Error('Não foi possível falar com o serviço de execução. Verifique a conexão.');
      }
      if (!response.ok)
        throw new Error(
          httpMessages[response.status] ??
            `O serviço de execução falhou (HTTP ${response.status}). Tente novamente.`,
        );
      return (await response.json()) as SubmissionResult;
    },
  };
}

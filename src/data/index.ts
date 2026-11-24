import { createClient } from '@supabase/supabase-js';
import { createHttpJudgeGateway, resolveJudgeEndpoint, type JudgeGateway } from '../lib/judge';
import { createDemoRepository } from './demoRepository';
import { browserStorage, createDemoStore } from './demoStore';
import { createSupabaseRepository } from './supabaseRepository';

export const demoStore = createDemoStore(browserStorage());
const requestedMode = import.meta.env.VITE_DATA_MODE?.trim() || 'demo';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const dataMode = requestedMode === 'remote' ? 'remote' : 'demo';
export const dataConfigurationError = !['demo', 'remote'].includes(requestedMode)
  ? 'VITE_DATA_MODE deve ser demo ou remote.'
  : dataMode === 'remote' && (!url || !publishableKey)
    ? 'O modo remoto exige VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.'
    : null;
export const supabase =
  dataMode === 'remote' && !dataConfigurationError
    ? createClient(url!, publishableKey!, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
export const repository = supabase
  ? createSupabaseRepository({
      async rpc(fn, args) {
        const { data, error } = await supabase.rpc(fn, args);
        return {
          data,
          error: error ? { message: error.message, code: error.code } : null,
        };
      },
    })
  : createDemoRepository(demoStore);

const judgeEndpoint = resolveJudgeEndpoint({
  configured: import.meta.env.VITE_JUDGE_URL,
  remote: dataMode === 'remote',
  supabaseUrl: url,
  dev: import.meta.env.DEV,
});
/** Null when this build has no judge; the practice page then explains instead of failing. */
export const judge: JudgeGateway | null = !judgeEndpoint
  ? null
  : supabase
    ? createHttpJudgeGateway(judgeEndpoint, {
        // The Edge Function identifies the student from the session to check enrollment.
        async headers() {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return { apikey: publishableKey!, ...(token && { Authorization: `Bearer ${token}` }) };
        },
      })
    : demoJudge(createHttpJudgeGateway(judgeEndpoint));

/** Problems created in the local demo exist only in this browser, so their cases go along. */
function demoJudge(gateway: JudgeGateway): JudgeGateway {
  return {
    submit(request) {
      const custom = demoStore.getSnapshot().customProblems.find((p) => p.id === request.problemId);
      return gateway.submit(
        custom
          ? {
              ...request,
              tests: [
                {
                  stdin: custom.exampleInput,
                  expectedOutput: custom.exampleOutput,
                  isExample: true,
                },
              ],
            }
          : request,
      );
    },
  };
}

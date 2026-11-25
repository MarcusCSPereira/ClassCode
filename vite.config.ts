import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { Judge0Config } from './supabase/functions/_shared/judge0.ts';
import { handleJudgeRequest } from './supabase/functions/_shared/judgeHandler.ts';
import { demoJudgeCases } from './src/server/demoJudgeCases.ts';

interface NodeReadableReq {
  method?: string;
  url?: string;
  on(event: string, listener: (chunk?: unknown) => void): void;
}
interface NodeWritableRes {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

/**
 * Local judge endpoint for `npm run dev` and `vite preview`. Static builds (GitHub Pages)
 * have no server: there the button stays disabled unless VITE_JUDGE_URL points elsewhere.
 * Judge0 credentials stay here, never in VITE_* variables.
 */
function judgeApiPlugin(judge0: Judge0Config): Plugin {
  const handler: Connect.NextHandleFunction = (rawReq, rawRes, next) => {
    const req = rawReq as unknown as NodeReadableReq;
    const res = rawRes as unknown as NodeWritableRes;
    if ((req.url?.split('?')[0] ?? '') !== '/api/judge/submit') {
      next();
      return;
    }
    const sendJson = (status: number, payload: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload));
    };
    if (req.method !== 'POST') {
      sendJson(405, { error: 'method_not_allowed' });
      return;
    }
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += String(chunk ?? '');
    });
    req.on('end', () => {
      void (async () => {
        let body: unknown;
        try {
          body = JSON.parse(rawBody);
        } catch {
          sendJson(400, { error: 'invalid_submission_payload' });
          return;
        }
        const { status, body: payload } = await handleJudgeRequest(body, null, {
          loadCases: demoJudgeCases,
          judge0,
        });
        sendJson(status, payload);
      })();
    });
  };

  return {
    name: 'classcode-judge0-api',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      judgeApiPlugin({
        baseUrl: env.JUDGE0_URL || 'https://ce.judge0.com',
        apiKey: env.JUDGE0_API_KEY || undefined,
        authToken: env.JUDGE0_AUTH_TOKEN || undefined,
      }),
    ],
    base: './',
  };
});

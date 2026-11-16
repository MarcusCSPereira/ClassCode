import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {
  executeJudge0Submission,
  type Judge0Config,
  type SubmissionRequest,
  type SubmissionResult,
} from './src/lib/judge.ts';

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

function judgeApiPlugin(config: Judge0Config): Plugin {
  const submissions = new Map<string, SubmissionResult>();

  const handler: Connect.NextHandleFunction = (rawReq, rawRes, next) => {
    const req = rawReq as unknown as NodeReadableReq;
    const res = rawRes as unknown as NodeWritableRes;
    const url = req.url?.split('?')[0] ?? '';
    if (!url.startsWith('/api/judge/submit')) {
      next();
      return;
    }

    const sendJson = (status: number, payload: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(payload));
    };

    if (req.method === 'GET' && url.startsWith('/api/judge/submit/')) {
      const id = decodeURIComponent(url.slice('/api/judge/submit/'.length));
      const found = submissions.get(id);
      if (!found) {
        sendJson(404, { error: 'submission_not_found' });
        return;
      }
      sendJson(200, found);
      return;
    }

    if (req.method !== 'POST' || url !== '/api/judge/submit') {
      sendJson(405, { error: 'method_not_allowed' });
      return;
    }

    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += String(chunk ?? '');
    });
    req.on('end', () => {
      void (async () => {
        try {
          const body = JSON.parse(rawBody) as SubmissionRequest;
          if (body.idempotencyKey && submissions.has(body.idempotencyKey)) {
            sendJson(200, submissions.get(body.idempotencyKey));
            return;
          }
          const result = await executeJudge0Submission(body, config);
          submissions.set(result.id, result);
          if (body.idempotencyKey) {
            submissions.set(body.idempotencyKey, result);
          }
          sendJson(200, result);
        } catch {
          sendJson(400, { error: 'invalid_submission_payload' });
        }
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
  const judgeConfig: Judge0Config = {
    baseUrl: env.JUDGE0_URL || 'https://ce.judge0.com',
    apiKey: env.JUDGE0_API_KEY || undefined,
    authToken: env.JUDGE0_AUTH_TOKEN || undefined,
  };
  return {
    plugins: [react(), judgeApiPlugin(judgeConfig)],
    base: './',
  };
});

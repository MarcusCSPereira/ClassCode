import { describe, expect, it, vi } from 'vitest';
import { createHttpJudgeGateway, resolveJudgeEndpoint, verdictLabel } from './judge';

const accepted = {
  id: 'sub-1',
  verdict: 'accepted',
  createdAt: '2026-11-24T00:00:00.000Z',
  passedCases: 4,
  totalCases: 4,
};

describe('judge no navegador', () => {
  it('escolhe o endereço conforme a publicação', () => {
    expect(resolveJudgeEndpoint({ dev: true, remote: false })).toBe('/api/judge/submit');
    // Static builds such as GitHub Pages have no server: no judge instead of a 404/405.
    expect(resolveJudgeEndpoint({ dev: false, remote: false })).toBeNull();
    expect(
      resolveJudgeEndpoint({ dev: false, remote: true, supabaseUrl: 'https://x.supabase.co/' }),
    ).toBe('https://x.supabase.co/functions/v1/judge-submit');
    expect(
      resolveJudgeEndpoint({ dev: true, remote: false, configured: ' https://judge.test/run ' }),
    ).toBe('https://judge.test/run');
    expect(
      resolveJudgeEndpoint({
        dev: true,
        remote: true,
        supabaseUrl: 'https://x',
        configured: 'off',
      }),
    ).toBeNull();
  });

  it('envia só o código, com os cabeçalhos da sessão', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(accepted), { status: 200 }));
    const gateway = createHttpJudgeGateway('https://x/functions/v1/judge-submit', {
      fetchFn: fetchFn as unknown as typeof fetch,
      headers: async () => ({ Authorization: 'Bearer token', apikey: 'publishable' }),
    });
    const result = await gateway.submit({
      problemId: 'sum',
      language: 'python',
      sourceCode: 'print(20)',
      idempotencyKey: 'sub-1',
    });
    expect(result.verdict).toBe('accepted');
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token', apikey: 'publishable' });
    expect(JSON.parse(String(init.body))).toEqual({
      problemId: 'sum',
      language: 'python',
      sourceCode: 'print(20)',
      idempotencyKey: 'sub-1',
    });
  });

  it('traduz falhas HTTP e de rede em mensagens claras', async () => {
    const respond = (status: number) =>
      createHttpJudgeGateway('/api/judge/submit', {
        fetchFn: (async () => new Response('{}', { status })) as unknown as typeof fetch,
      }).submit({
        problemId: 'x',
        language: 'cpp',
        sourceCode: 'int main(){}',
        idempotencyKey: 'k',
      });
    await expect(respond(404)).rejects.toThrow('judge-submit foi publicada');
    await expect(respond(405)).rejects.toThrow('judge-submit foi publicada');
    await expect(respond(403)).rejects.toThrow('não tem acesso');
    await expect(respond(503)).rejects.toThrow('HTTP 503');
    const offline = createHttpJudgeGateway('/api/judge/submit', {
      fetchFn: (async () => {
        throw new TypeError('Failed to fetch');
      }) as unknown as typeof fetch,
    });
    await expect(
      offline.submit({ problemId: 'x', language: 'java', sourceCode: 'x', idempotencyKey: 'k' }),
    ).rejects.toThrow('Verifique a conexão');
  });

  it('tem rótulo em português para cada veredito', () => {
    expect(verdictLabel('accepted')).toContain('Accepted');
    expect(verdictLabel('wrong_answer')).toBe('Resposta incorreta');
    expect(verdictLabel('compile_error')).toBe('Erro de compilação');
  });
});

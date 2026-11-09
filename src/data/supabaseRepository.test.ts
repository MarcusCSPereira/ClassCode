import { describe, expect, it, vi } from 'vitest';
import { RepositoryError } from './repository';
import {
  createSupabaseRepository,
  parseActivityRowsPayload,
  parseClassroomActivityPayload,
  type SupabaseRpcClient,
} from './supabaseRepository';

const activityPayload = [
  {
    studentId: 'student-1',
    problemId: 'problem-1',
    startedAt: '2026-11-09T10:00:00.000Z',
    hintViews: [{ ordinal: 1, viewedAt: '2026-11-09T10:03:00.000Z' }],
    reportedAt: '2026-11-09T10:08:00.000Z',
    verification: 'self_reported',
    evidence: 'Resolvido no judge.',
  },
];

describe('supabaseRepository', () => {
  it('converte o payload de my_activity para ActivityRow[]', () => {
    expect(parseActivityRowsPayload(activityPayload)).toEqual([
      {
        studentId: 'student-1',
        problemId: 'problem-1',
        startedAt: '2026-11-09T10:00:00.000Z',
        hintViews: [{ ordinal: 1, viewedAt: '2026-11-09T10:03:00.000Z' }],
        reportedAt: '2026-11-09T10:08:00.000Z',
        verification: 'self_reported',
        evidence: 'Resolvido no judge.',
      },
    ]);
  });

  it('converte o payload de classroom_activity para ClassroomActivity', () => {
    expect(
      parseClassroomActivityPayload({
        roster: [
          {
            studentId: 'student-1',
            displayName: 'Ana',
            joinedAt: '2026-11-08T08:00:00.000Z',
          },
        ],
        activity: activityPayload,
      }),
    ).toEqual({
      roster: [
        {
          studentId: 'student-1',
          displayName: 'Ana',
          joinedAt: '2026-11-08T08:00:00.000Z',
        },
      ],
      activity: [
        {
          studentId: 'student-1',
          problemId: 'problem-1',
          startedAt: '2026-11-09T10:00:00.000Z',
          hintViews: [{ ordinal: 1, viewedAt: '2026-11-09T10:03:00.000Z' }],
          reportedAt: '2026-11-09T10:08:00.000Z',
          verification: 'self_reported',
          evidence: 'Resolvido no judge.',
        },
      ],
    });
  });

  it('chama as RPCs corretas e devolve os dados convertidos', async () => {
    const rpc = vi
      .fn<SupabaseRpcClient['rpc']>()
      .mockResolvedValueOnce({ data: activityPayload, error: null })
      .mockResolvedValueOnce({
        data: {
          roster: [
            {
              studentId: 'student-1',
              displayName: 'Ana',
              joinedAt: '2026-11-08T08:00:00.000Z',
            },
          ],
          activity: activityPayload,
        },
        error: null,
      });
    const repo = createSupabaseRepository({ rpc });

    expect(await repo.myActivity()).toHaveLength(1);
    expect(await repo.classroomActivity('class-1')).toEqual({
      roster: [
        {
          studentId: 'student-1',
          displayName: 'Ana',
          joinedAt: '2026-11-08T08:00:00.000Z',
        },
      ],
      activity: [
        {
          studentId: 'student-1',
          problemId: 'problem-1',
          startedAt: '2026-11-09T10:00:00.000Z',
          hintViews: [{ ordinal: 1, viewedAt: '2026-11-09T10:03:00.000Z' }],
          reportedAt: '2026-11-09T10:08:00.000Z',
          verification: 'self_reported',
          evidence: 'Resolvido no judge.',
        },
      ],
    });
    expect(rpc).toHaveBeenNthCalledWith(1, 'my_activity');
    expect(rpc).toHaveBeenNthCalledWith(2, 'classroom_activity', { cid: 'class-1' });
  });

  it('mapeia erros conhecidos do backend para RepositoryError', async () => {
    const repo = createSupabaseRepository({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'owner_required' } }),
    });

    await expect(repo.classroomActivity('class-1')).rejects.toMatchObject({
      code: 'owner_required',
    } satisfies Pick<RepositoryError, 'code'>);
  });

  it('falha cedo quando o backend devolve payload inválido', async () => {
    const repo = createSupabaseRepository({
      rpc: vi.fn().mockResolvedValue({
        data: [{ ...activityPayload[0], startedAt: 'nao-e-data' }],
        error: null,
      }),
    });

    await expect(repo.myActivity()).rejects.toThrow('Resposta inválida do backend');
  });
});

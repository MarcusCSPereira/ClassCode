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

const classroomPayload = {
  id: 'class-1',
  name: 'Algoritmos',
  code: 'ABC123',
  teacher: 'Professora Ada',
  term: '2026.2',
};

const problemPayload = {
  id: 'problem-1',
  moduleId: 'foundations',
  title: 'Soma',
  difficulty: 'Básico' as const,
  minutes: 10,
  objective: 'Somar dois números.',
  statement: 'Leia e some.',
  input: 'a b',
  output: 'a + b',
  constraints: '0 ≤ a, b ≤ 10',
  exampleInput: '1 2',
  exampleOutput: '3',
  source: 'Professora Ada',
  authorClassId: 'class-1',
  hints: [{ afterSeconds: 180 }, { afterSeconds: 420 }, { afterSeconds: 720 }],
};

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

  it('implementa perfil, turmas e importação da trilha pelo contrato remoto', async () => {
    const rpc = vi
      .fn<SupabaseRpcClient['rpc']>()
      .mockResolvedValueOnce({
        data: { id: 'teacher-1', displayName: 'Professora Ada', role: 'teacher' },
        error: null,
      })
      .mockResolvedValueOnce({ data: [classroomPayload], error: null })
      .mockResolvedValueOnce({ data: { id: 'class-2', code: 'XYZ789' }, error: null })
      .mockResolvedValueOnce({ data: 'class-2', error: null })
      .mockResolvedValueOnce({ data: 7, error: null });
    const repo = createSupabaseRepository({ rpc });

    await expect(repo.getProfile()).resolves.toEqual({
      id: 'teacher-1',
      displayName: 'Professora Ada',
      role: 'teacher',
    });
    await expect(repo.listClassrooms()).resolves.toEqual([classroomPayload]);
    await expect(repo.createClassroom('Estruturas', '2026.2')).resolves.toEqual({
      id: 'class-2',
      code: 'XYZ789',
    });
    await expect(repo.joinClassroom('xyz789')).resolves.toBe('class-2');
    await expect(repo.importBaseTrail('class-2')).resolves.toBe(7);

    expect(rpc).toHaveBeenNthCalledWith(1, 'my_profile');
    expect(rpc).toHaveBeenNthCalledWith(2, 'list_classrooms');
    expect(rpc).toHaveBeenNthCalledWith(3, 'create_classroom', {
      class_name: 'Estruturas',
      class_term: '2026.2',
    });
    expect(rpc).toHaveBeenNthCalledWith(4, 'join_classroom', { invite_code: 'xyz789' });
    expect(rpc).toHaveBeenNthCalledWith(5, 'import_base_trail', { cid: 'class-2' });
  });

  it('lista, publica e atualiza questões e progresso pelo servidor', async () => {
    const rpc = vi
      .fn<SupabaseRpcClient['rpc']>()
      .mockResolvedValueOnce({ data: [problemPayload], error: null })
      .mockResolvedValueOnce({ data: 'problem-2', error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const repo = createSupabaseRepository({ rpc });
    const newProblem = {
      ...problemPayload,
      hints: [
        { afterSeconds: 180, text: 'Dica 1' },
        { afterSeconds: 420, text: 'Dica 2' },
        { afterSeconds: 720, text: 'Dica 3' },
      ],
    };
    const { id: _id, source: _source, ...payload } = newProblem;

    await expect(repo.listProblems()).resolves.toEqual([problemPayload]);
    await expect(repo.publishProblem(payload)).resolves.toBe('problem-2');
    await expect(
      repo.reportProgress('problem-1', 'Validado externamente.'),
    ).resolves.toBeUndefined();
    await expect(repo.reopenProblem('problem-1')).resolves.toBeUndefined();

    expect(rpc).toHaveBeenNthCalledWith(1, 'list_problems');
    expect(rpc).toHaveBeenNthCalledWith(2, 'publish_problem', { payload });
    expect(rpc).toHaveBeenNthCalledWith(3, 'report_progress', {
      pid: 'problem-1',
      report_evidence: 'Validado externamente.',
    });
    expect(rpc).toHaveBeenNthCalledWith(4, 'reopen_problem', { pid: 'problem-1' });
  });

  it('salva rascunho, lê para edição e muda a situação da questão', async () => {
    const hints = [
      { afterSeconds: 180, text: 'D1' },
      { afterSeconds: 420, text: 'D2' },
      { afterSeconds: 720, text: 'D3' },
    ];
    const tests = [{ stdin: '5 5', expectedOutput: '10' }];
    const editPayload = { ...problemPayload, hints, tests, status: 'draft', attempts: 2 };
    const rpc = vi
      .fn<SupabaseRpcClient['rpc']>()
      .mockResolvedValueOnce({ data: 'problem-9', error: null })
      .mockResolvedValueOnce({ data: editPayload, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: [{ ...problemPayload, status: 'archived' }], error: null });
    const repo = createSupabaseRepository({ rpc });
    const { id: _id, source: _source, ...base } = problemPayload;
    const input = { ...base, hints, tests };

    await expect(repo.saveProblem(input)).resolves.toBe('problem-9');
    await expect(repo.getProblemForEdit('problem-1')).resolves.toMatchObject({
      id: 'problem-1',
      authorClassId: 'class-1',
      hints,
      tests,
      status: 'draft',
      attempts: 2,
    });
    await expect(repo.setProblemStatus('problem-1', 'archived')).resolves.toBeUndefined();
    await expect(repo.listProblems()).resolves.toMatchObject([{ status: 'archived' }]);

    expect(rpc).toHaveBeenNthCalledWith(1, 'save_problem', { payload: input });
    expect(rpc).toHaveBeenNthCalledWith(2, 'get_problem_for_edit', { pid: 'problem-1' });
    expect(rpc).toHaveBeenNthCalledWith(3, 'set_problem_status', {
      pid: 'problem-1',
      new_status: 'archived',
    });
  });

  it('revisa conclusões e gera novo convite pelas RPCs do professor', async () => {
    const rpc = vi
      .fn<SupabaseRpcClient['rpc']>()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: 'NOVO1234', error: null });
    const repo = createSupabaseRepository({ rpc });

    await repo.reviewProgress('problem-1', 'student-1', 'changes_requested', 'Teste o caso 0.');
    await repo.reviewProgress('problem-1', 'student-1', 'clear');
    await expect(repo.rotateInvite('class-1')).resolves.toBe('NOVO1234');

    expect(rpc).toHaveBeenNthCalledWith(1, 'review_progress', {
      pid: 'problem-1',
      sid: 'student-1',
      review_status: 'changes_requested',
      review_comment: 'Teste o caso 0.',
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'review_progress', {
      pid: 'problem-1',
      sid: 'student-1',
      review_status: 'clear',
      review_comment: null,
    });
    expect(rpc).toHaveBeenNthCalledWith(3, 'rotate_invite', { cid: 'class-1' });
  });

  it('converte a revisão da atividade e recusa situação desconhecida', async () => {
    const review = { status: 'reviewed', reviewedAt: '2026-11-09T11:00:00.000Z' };
    expect(parseActivityRowsPayload([{ ...activityPayload[0], review }])[0].review).toEqual(review);
    expect(() =>
      parseActivityRowsPayload([{ ...activityPayload[0], review: { ...review, status: 'ok' } }]),
    ).toThrow('activity[0].review');
    expect(() =>
      parseActivityRowsPayload([{ ...activityPayload[0], review: { ...review, comment: 1 } }]),
    ).toThrow('activity[0].review.comment');
    const failing = createSupabaseRepository({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'invalid_review' } }),
    });
    await expect(
      failing.reviewProgress('problem-1', 'student-1', 'changes_requested'),
    ).rejects.toMatchObject({ code: 'invalid_review' });
  });

  it('rejeita situação desconhecida e edição sem casos de teste', async () => {
    const badStatus = createSupabaseRepository({
      rpc: vi
        .fn()
        .mockResolvedValue({ data: [{ ...problemPayload, status: 'deleted' }], error: null }),
    });
    const noTests = createSupabaseRepository({
      rpc: vi.fn().mockResolvedValue({ data: { ...problemPayload, status: 'draft' }, error: null }),
    });
    await expect(badStatus.listProblems()).rejects.toThrow('problems[0].status');
    await expect(noTests.getProblemForEdit('problem-1')).rejects.toThrow('get_problem_for_edit');
  });

  it('rejeita payloads remotos que expõem formato incompleto ou inválido', async () => {
    const invalidProblems = createSupabaseRepository({
      rpc: vi.fn().mockResolvedValue({
        data: [{ ...problemPayload, hints: [{ afterSeconds: 180, text: 'não deveria vir' }] }],
        error: null,
      }),
    });
    const invalidProfile = createSupabaseRepository({
      rpc: vi.fn().mockResolvedValue({
        data: { id: 'user-1', displayName: 'Pessoa', role: 'admin' },
        error: null,
      }),
    });

    await expect(invalidProblems.listProblems()).rejects.toThrow(
      'Resposta inválida do backend em problems[0].hints',
    );
    await expect(invalidProfile.getProfile()).rejects.toThrow(
      'Resposta inválida do backend em my_profile.role',
    );
  });

  it('inicia uma tentativa pelo servidor e preserva o horário retornado', async () => {
    const startedAt = '2026-11-10T09:30:00.000Z';
    const rpc = vi.fn<SupabaseRpcClient['rpc']>().mockResolvedValue({
      data: startedAt,
      error: null,
    });
    const repo = createSupabaseRepository({ rpc });

    await expect(repo.startAttempt('problem-1')).resolves.toBe(startedAt);
    expect(rpc).toHaveBeenCalledWith('start_attempt', { pid: 'problem-1' });
  });

  it('revela uma dica pelo servidor com o ordinal solicitado', async () => {
    const rpc = vi.fn<SupabaseRpcClient['rpc']>().mockResolvedValue({
      data: 'Compare o alvo com o elemento central.',
      error: null,
    });
    const repo = createSupabaseRepository({ rpc });

    await expect(repo.revealHint('problem-1', 2)).resolves.toBe(
      'Compare o alvo com o elemento central.',
    );
    expect(rpc).toHaveBeenCalledWith('get_hint', {
      pid: 'problem-1',
      hint_number: 2,
    });
  });

  it.each([
    ['startAttempt', 'problem_not_accessible'],
    ['revealHint', 'hint_locked'],
  ] as const)('mapeia o erro conhecido de %s para RepositoryError', async (method, code) => {
    const repo = createSupabaseRepository({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: code } }),
    });

    const operation =
      method === 'startAttempt' ? repo.startAttempt('problem-1') : repo.revealHint('problem-1', 1);
    await expect(operation).rejects.toMatchObject({ code } satisfies Pick<RepositoryError, 'code'>);
  });

  it('rejeita retornos inválidos das RPCs de tentativa e dica', async () => {
    const rpc = vi
      .fn<SupabaseRpcClient['rpc']>()
      .mockResolvedValueOnce({ data: 'horario-invalido', error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const repo = createSupabaseRepository({ rpc });

    await expect(repo.startAttempt('problem-1')).rejects.toThrow(
      'Resposta inválida do backend em start_attempt',
    );
    await expect(repo.revealHint('problem-1', 1)).rejects.toThrow(
      'Resposta inválida do backend em get_hint',
    );
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

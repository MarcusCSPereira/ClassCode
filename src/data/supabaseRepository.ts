import type { HintOrdinal } from '../lib/types';
import {
  RepositoryError,
  type ActivityRow,
  type ClassCodeRepository,
  type ClassroomActivity,
  type NewProblem,
  type ProblemSummary,
  type RepositoryErrorCode,
} from './repository';

type RpcName = 'my_activity' | 'classroom_activity';
export interface SupabaseRpcError {
  message: string;
  code?: string | null;
}
export interface SupabaseRpcClient {
  rpc(
    fn: RpcName,
    args?: Record<string, unknown>,
  ): Promise<{ data: unknown; error: SupabaseRpcError | null }>;
}

const KNOWN_CODES: RepositoryErrorCode[] = [
  'authentication_required',
  'teacher_required',
  'owner_required',
  'invalid_invite',
  'problem_not_accessible',
  'attempt_required',
  'hint_locked',
  'invalid_problem',
  'invalid_evidence',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseIso(value: unknown, field: string) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
    throw new Error(`Resposta inválida do backend em ${field}.`);
  return value;
}
function parseString(value: unknown, field: string) {
  if (typeof value !== 'string') throw new Error(`Resposta inválida do backend em ${field}.`);
  return value;
}
function parseHintOrdinal(value: unknown, field: string): HintOrdinal {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error(`Resposta inválida do backend em ${field}.`);
}
function parseHintView(value: unknown, index: number): ActivityRow['hintViews'][number] {
  if (!isRecord(value)) throw new Error(`Resposta inválida do backend em hintViews[${index}].`);
  return {
    ordinal: parseHintOrdinal(value.ordinal, `hintViews[${index}].ordinal`),
    viewedAt: parseIso(value.viewedAt, `hintViews[${index}].viewedAt`),
  };
}
export function parseActivityRow(value: unknown, index = 0): ActivityRow {
  if (!isRecord(value)) throw new Error(`Resposta inválida do backend em activity[${index}].`);
  const verification = value.verification;
  if (verification !== undefined && verification !== 'self_reported')
    throw new Error(`Resposta inválida do backend em activity[${index}].verification.`);
  if (value.evidence !== undefined && typeof value.evidence !== 'string')
    throw new Error(`Resposta inválida do backend em activity[${index}].evidence.`);
  return {
    studentId: parseString(value.studentId, `activity[${index}].studentId`),
    problemId: parseString(value.problemId, `activity[${index}].problemId`),
    startedAt: parseIso(value.startedAt, `activity[${index}].startedAt`),
    hintViews: Array.isArray(value.hintViews)
      ? value.hintViews.map((hint, hintIndex) => parseHintView(hint, hintIndex))
      : [],
    ...(value.reportedAt !== undefined && {
      reportedAt: parseIso(value.reportedAt, `activity[${index}].reportedAt`),
    }),
    ...(verification !== undefined && { verification }),
    ...(value.evidence !== undefined && { evidence: value.evidence }),
  };
}
export function parseActivityRowsPayload(data: unknown): ActivityRow[] {
  if (!Array.isArray(data)) throw new Error('Resposta inválida do backend em my_activity.');
  return data.map((row, index) => parseActivityRow(row, index));
}
function parseRosterEntry(value: unknown, index: number): ClassroomActivity['roster'][number] {
  if (!isRecord(value)) throw new Error(`Resposta inválida do backend em roster[${index}].`);
  return {
    studentId: parseString(value.studentId, `roster[${index}].studentId`),
    displayName: parseString(value.displayName, `roster[${index}].displayName`),
    joinedAt: parseIso(value.joinedAt, `roster[${index}].joinedAt`),
  };
}
export function parseClassroomActivityPayload(data: unknown): ClassroomActivity {
  if (!isRecord(data)) throw new Error('Resposta inválida do backend em classroom_activity.');
  if (!Array.isArray(data.roster) || !Array.isArray(data.activity))
    throw new Error('Resposta inválida do backend em classroom_activity.');
  return {
    roster: data.roster.map((entry, index) => parseRosterEntry(entry, index)),
    activity: data.activity.map((row, index) => parseActivityRow(row, index)),
  };
}

function notImplemented(method: string): never {
  throw new Error(`CC-03 pendente: método remoto ${method} ainda não foi implementado.`);
}
function toRepositoryError(error: SupabaseRpcError): Error {
  const message = error.message.trim();
  return KNOWN_CODES.includes(message as RepositoryErrorCode)
    ? new RepositoryError(message as RepositoryErrorCode)
    : new Error(message || 'Falha ao consultar o backend.');
}

export function createSupabaseRepository(client: SupabaseRpcClient): ClassCodeRepository {
  return {
    mode: 'remote',
    async listClassrooms() {
      return notImplemented('listClassrooms');
    },
    async createClassroom(_name: string, _term: string) {
      return notImplemented('createClassroom');
    },
    async joinClassroom(_code: string) {
      return notImplemented('joinClassroom');
    },
    async listProblems(): Promise<ProblemSummary[]> {
      return notImplemented('listProblems');
    },
    async publishProblem(_problem: NewProblem) {
      return notImplemented('publishProblem');
    },
    async startAttempt(_problemId: string) {
      return notImplemented('startAttempt');
    },
    async revealHint(_problemId: string, _ordinal: HintOrdinal) {
      return notImplemented('revealHint');
    },
    async reportProgress(_problemId: string, _evidence: string) {
      return notImplemented('reportProgress');
    },
    async reopenProblem(_problemId: string) {
      return notImplemented('reopenProblem');
    },
    async myActivity() {
      const { data, error } = await client.rpc('my_activity');
      if (error) throw toRepositoryError(error);
      return parseActivityRowsPayload(data);
    },
    async classroomActivity(classroomId: string) {
      const { data, error } = await client.rpc('classroom_activity', { cid: classroomId });
      if (error) throw toRepositoryError(error);
      return parseClassroomActivityPayload(data);
    },
  };
}

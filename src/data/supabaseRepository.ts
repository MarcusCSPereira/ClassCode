import type { HintOrdinal } from '../lib/types';
import {
  RepositoryError,
  type ActivityRow,
  type ClassCodeRepository,
  type ClassroomActivity,
  type EditableProblem,
  type NewProblem,
  type ProblemInput,
  type ProblemSummary,
  type RepositoryErrorCode,
  type UserProfile,
} from './repository';
import type { Classroom, Problem, ProblemStatus, ProblemTest } from '../lib/types';

type RpcName =
  | 'my_profile'
  | 'list_classrooms'
  | 'create_classroom'
  | 'join_classroom'
  | 'import_base_trail'
  | 'list_problems'
  | 'publish_problem'
  | 'save_problem'
  | 'get_problem_for_edit'
  | 'set_problem_status'
  | 'start_attempt'
  | 'get_hint'
  | 'report_progress'
  | 'reopen_problem'
  | 'my_activity'
  | 'classroom_activity';
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
function parseNumber(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`Resposta inválida do backend em ${field}.`);
  return value;
}
function parseProfile(data: unknown): UserProfile {
  if (!isRecord(data)) throw new Error('Resposta inválida do backend em my_profile.');
  const role = data.role;
  if (role !== 'student' && role !== 'teacher')
    throw new Error('Resposta inválida do backend em my_profile.role.');
  return {
    id: parseString(data.id, 'my_profile.id'),
    displayName: parseString(data.displayName, 'my_profile.displayName'),
    role,
  };
}
function parseClassroom(value: unknown, index: number): Classroom {
  if (!isRecord(value)) throw new Error(`Resposta inválida do backend em classrooms[${index}].`);
  return {
    id: parseString(value.id, `classrooms[${index}].id`),
    name: parseString(value.name, `classrooms[${index}].name`),
    code: parseString(value.code, `classrooms[${index}].code`),
    teacher: parseString(value.teacher, `classrooms[${index}].teacher`),
    term: parseString(value.term, `classrooms[${index}].term`),
  };
}
function parseProblem(value: unknown, index: number): ProblemSummary {
  if (!isRecord(value)) throw new Error(`Resposta inválida do backend em problems[${index}].`);
  const difficulty = value.difficulty;
  if (!['Básico', 'Intermediário', 'Avançado'].includes(difficulty as string))
    throw new Error(`Resposta inválida do backend em problems[${index}].difficulty.`);
  if (!Array.isArray(value.hints) || value.hints.length !== 3)
    throw new Error(`Resposta inválida do backend em problems[${index}].hints.`);
  return {
    id: parseString(value.id, `problems[${index}].id`),
    moduleId: parseString(value.moduleId, `problems[${index}].moduleId`),
    title: parseString(value.title, `problems[${index}].title`),
    difficulty: difficulty as Problem['difficulty'],
    minutes: parseNumber(value.minutes, `problems[${index}].minutes`),
    objective: parseString(value.objective, `problems[${index}].objective`),
    statement: parseString(value.statement, `problems[${index}].statement`),
    input: parseString(value.input, `problems[${index}].input`),
    output: parseString(value.output, `problems[${index}].output`),
    constraints: parseString(value.constraints, `problems[${index}].constraints`),
    exampleInput: parseString(value.exampleInput, `problems[${index}].exampleInput`),
    exampleOutput: parseString(value.exampleOutput, `problems[${index}].exampleOutput`),
    source: parseString(value.source, `problems[${index}].source`),
    authorClassId: parseString(value.authorClassId, `problems[${index}].authorClassId`),
    hints: value.hints.map((hint, hintIndex) => {
      if (!isRecord(hint))
        throw new Error(`Resposta inválida do backend em problems[${index}].hints[${hintIndex}].`);
      return { afterSeconds: parseNumber(hint.afterSeconds, `problems[${index}].hints`) };
    }),
    ...(typeof value.externalUrl === 'string' && { externalUrl: value.externalUrl }),
    ...(value.status !== undefined && {
      status: parseStatus(value.status, `problems[${index}].status`),
    }),
  };
}
const STATUSES: ProblemStatus[] = ['draft', 'published', 'archived'];
function parseStatus(value: unknown, field: string): ProblemStatus {
  if (!STATUSES.includes(value as ProblemStatus))
    throw new Error(`Resposta inválida do backend em ${field}.`);
  return value as ProblemStatus;
}
function parseTest(value: unknown, index: number): ProblemTest {
  if (!isRecord(value) || typeof value.stdin !== 'string')
    throw new Error(`Resposta inválida do backend em tests[${index}].`);
  return {
    stdin: value.stdin,
    expectedOutput: parseString(value.expectedOutput, `tests[${index}].expectedOutput`),
  };
}
export function parseEditableProblem(data: unknown): EditableProblem {
  if (!isRecord(data) || !Array.isArray(data.tests) || !Array.isArray(data.hints))
    throw new Error('Resposta inválida do backend em get_problem_for_edit.');
  // The listed fields are validated as usual; hint text, hidden cases and attempts on top.
  const summary = parseProblem({ ...data, source: '' }, 0);
  return {
    id: summary.id,
    authorClassId: summary.authorClassId!,
    moduleId: summary.moduleId,
    title: summary.title,
    difficulty: summary.difficulty,
    minutes: summary.minutes,
    objective: summary.objective,
    statement: summary.statement,
    input: summary.input,
    output: summary.output,
    constraints: summary.constraints,
    exampleInput: summary.exampleInput,
    exampleOutput: summary.exampleOutput,
    ...(summary.externalUrl && { externalUrl: summary.externalUrl }),
    hints: data.hints.map((hint, i) => {
      if (!isRecord(hint)) throw new Error(`Resposta inválida do backend em hints[${i}].`);
      return {
        afterSeconds: parseNumber(hint.afterSeconds, `hints[${i}].afterSeconds`),
        text: parseString(hint.text, `hints[${i}].text`),
      };
    }),
    tests: data.tests.map(parseTest),
    status: parseStatus(data.status, 'get_problem_for_edit.status'),
    attempts: parseNumber(data.attempts, 'get_problem_for_edit.attempts'),
  };
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

function toRepositoryError(error: SupabaseRpcError): Error {
  const message = error.message.trim();
  return KNOWN_CODES.includes(message as RepositoryErrorCode)
    ? new RepositoryError(message as RepositoryErrorCode)
    : new Error(message || 'Falha ao consultar o backend.');
}

export function createSupabaseRepository(client: SupabaseRpcClient): ClassCodeRepository {
  return {
    mode: 'remote',
    async getProfile() {
      const { data, error } = await client.rpc('my_profile');
      if (error) throw toRepositoryError(error);
      return parseProfile(data);
    },
    async listClassrooms() {
      const { data, error } = await client.rpc('list_classrooms');
      if (error) throw toRepositoryError(error);
      if (!Array.isArray(data)) throw new Error('Resposta inválida do backend em list_classrooms.');
      return data.map(parseClassroom);
    },
    async createClassroom(name: string, term: string) {
      const { data, error } = await client.rpc('create_classroom', {
        class_name: name,
        class_term: term,
      });
      if (error) throw toRepositoryError(error);
      if (!isRecord(data)) throw new Error('Resposta inválida do backend em create_classroom.');
      return {
        id: parseString(data.id, 'create_classroom.id'),
        code: parseString(data.code, 'create_classroom.code'),
      };
    },
    async joinClassroom(code: string) {
      const { data, error } = await client.rpc('join_classroom', { invite_code: code });
      if (error) throw toRepositoryError(error);
      return parseString(data, 'join_classroom');
    },
    async importBaseTrail(classroomId: string) {
      const { data, error } = await client.rpc('import_base_trail', { cid: classroomId });
      if (error) throw toRepositoryError(error);
      return parseNumber(data, 'import_base_trail');
    },
    async listProblems(): Promise<ProblemSummary[]> {
      const { data, error } = await client.rpc('list_problems');
      if (error) throw toRepositoryError(error);
      if (!Array.isArray(data)) throw new Error('Resposta inválida do backend em list_problems.');
      return data.map(parseProblem);
    },
    async publishProblem(problem: NewProblem) {
      const { data, error } = await client.rpc('publish_problem', { payload: problem });
      if (error) throw toRepositoryError(error);
      return parseString(data, 'publish_problem');
    },
    async saveProblem(problem: ProblemInput) {
      const { data, error } = await client.rpc('save_problem', { payload: problem });
      if (error) throw toRepositoryError(error);
      return parseString(data, 'save_problem');
    },
    async getProblemForEdit(problemId: string) {
      const { data, error } = await client.rpc('get_problem_for_edit', { pid: problemId });
      if (error) throw toRepositoryError(error);
      return parseEditableProblem(data);
    },
    async setProblemStatus(problemId: string, status: ProblemStatus) {
      const { error } = await client.rpc('set_problem_status', {
        pid: problemId,
        new_status: status,
      });
      if (error) throw toRepositoryError(error);
    },
    async startAttempt(problemId: string) {
      const { data, error } = await client.rpc('start_attempt', { pid: problemId });
      if (error) throw toRepositoryError(error);
      return parseIso(data, 'start_attempt');
    },
    async revealHint(problemId: string, ordinal: HintOrdinal) {
      const { data, error } = await client.rpc('get_hint', {
        pid: problemId,
        hint_number: ordinal,
      });
      if (error) throw toRepositoryError(error);
      return parseString(data, 'get_hint');
    },
    async reportProgress(problemId: string, evidence: string) {
      const { error } = await client.rpc('report_progress', {
        pid: problemId,
        report_evidence: evidence,
      });
      if (error) throw toRepositoryError(error);
    },
    async reopenProblem(problemId: string) {
      const { error } = await client.rpc('reopen_problem', { pid: problemId });
      if (error) throw toRepositoryError(error);
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

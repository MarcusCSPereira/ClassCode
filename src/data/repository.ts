/**
 * Contract between the UI and its data source (docs/ENTREGA-2.md, section 7).
 * The demo implements it over localStorage; CC-03 adds the Supabase implementation.
 * Screens use this interface and never touch localStorage or Supabase directly.
 */
import type { Classroom, HintOrdinal, Problem } from '../lib/types';

/** A problem as the student receives it: release times only, never the hint text. */
export type ProblemSummary = Omit<Problem, 'hints'> & { hints: { afterSeconds: number }[] };
/** What the teacher submits; the data source assigns id and source. */
export type NewProblem = Omit<Problem, 'id' | 'source' | 'authorClassId'> & {
  authorClassId: string;
};
/** One student × problem attempt. Timestamps are ISO strings from the data source clock. */
export interface ActivityRow {
  studentId: string;
  problemId: string;
  startedAt: string;
  hintViews: { ordinal: HintOrdinal; viewedAt: string }[];
  reportedAt?: string;
  verification?: 'self_reported';
  evidence?: string;
}
export interface RosterEntry {
  studentId: string;
  displayName: string;
  joinedAt: string;
}
export interface ClassroomActivity {
  roster: RosterEntry[];
  activity: ActivityRow[];
}

/** Codes mirror the exceptions raised by the SQL functions. */
export type RepositoryErrorCode =
  | 'authentication_required'
  | 'teacher_required'
  | 'owner_required'
  | 'invalid_invite'
  | 'problem_not_accessible'
  | 'attempt_required'
  | 'hint_locked'
  | 'invalid_problem'
  | 'invalid_evidence';
const messages: Record<RepositoryErrorCode, string> = {
  authentication_required: 'Entre novamente para continuar.',
  teacher_required: 'Esta ação é exclusiva do professor.',
  owner_required: 'Somente o professor responsável pela turma pode fazer isso.',
  invalid_invite: 'Código de turma não encontrado.',
  problem_not_accessible: 'Este desafio não está disponível para você.',
  attempt_required: 'Abra o desafio antes de registrar a conclusão.',
  hint_locked: 'Esta dica ainda não foi liberada.',
  invalid_problem: 'A questão não segue o padrão ClassCode.',
  invalid_evidence: 'Descreva sua solução em até 2000 caracteres.',
};
export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  constructor(code: RepositoryErrorCode, message = messages[code]) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
  }
}
/** User-facing message for any failure coming from a repository call. */
export function describeError(error: unknown): string {
  return error instanceof RepositoryError ? error.message : 'Algo deu errado. Tente novamente.';
}

export interface ClassCodeRepository {
  readonly mode: 'demo' | 'remote';
  listClassrooms(): Promise<Classroom[]>;
  createClassroom(name: string, term: string): Promise<{ id: string; code: string }>;
  joinClassroom(code: string): Promise<string>;
  listProblems(): Promise<ProblemSummary[]>;
  publishProblem(problem: NewProblem): Promise<string>;
  /** Idempotent; resolves to the original start time. */
  startAttempt(problemId: string): Promise<string>;
  /** Records the first view and resolves to the hint text; rejects with `hint_locked` early. */
  revealHint(problemId: string, ordinal: HintOrdinal): Promise<string>;
  reportProgress(problemId: string, evidence: string): Promise<void>;
  reopenProblem(problemId: string): Promise<void>;
  myActivity(): Promise<ActivityRow[]>;
  classroomActivity(classroomId: string): Promise<ClassroomActivity>;
}

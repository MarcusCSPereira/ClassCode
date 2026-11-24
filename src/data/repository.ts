/**
 * Contract between the UI and its data source (docs/ENTREGA-2.md, section 7).
 * The demo implements it over localStorage; CC-03 adds the Supabase implementation.
 * Screens use this interface and never touch localStorage or Supabase directly.
 */
import type { Classroom, HintOrdinal, Problem, ProblemStatus, ProblemTest } from '../lib/types';

export interface UserProfile {
  id: string;
  displayName: string;
  role: 'student' | 'teacher';
}

/** A problem as listed: release times only, never the hint text or the hidden cases. */
export type ProblemSummary = Omit<Problem, 'hints' | 'tests'> & {
  hints: { afterSeconds: number }[];
};
/** What the teacher submits; the data source assigns id and source. */
export type NewProblem = Omit<Problem, 'id' | 'source' | 'authorClassId' | 'status' | 'tests'> & {
  authorClassId: string;
};
/** What the editor saves: a new draft (no id) or changes to an owned problem. */
export type ProblemInput = NewProblem & { id?: string; tests: ProblemTest[] };
/** Everything the owner needs to edit a problem, hidden cases included. */
export type EditableProblem = NewProblem & {
  id: string;
  tests: ProblemTest[];
  status: ProblemStatus;
  /** Students who already opened it; edits change the problem for them too. */
  attempts: number;
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
  getProfile(): Promise<UserProfile>;
  listClassrooms(): Promise<Classroom[]>;
  createClassroom(name: string, term: string): Promise<{ id: string; code: string }>;
  joinClassroom(code: string): Promise<string>;
  importBaseTrail(classroomId: string): Promise<number>;
  /** Owners also receive their drafts and archived problems, marked by `status`. */
  listProblems(): Promise<ProblemSummary[]>;
  /** Creates and publishes in one step (kept for compatibility; the UI uses saveProblem). */
  publishProblem(problem: NewProblem): Promise<string>;
  /** Saves a new draft or edits an owned problem without changing its status. */
  saveProblem(problem: ProblemInput): Promise<string>;
  getProblemForEdit(problemId: string): Promise<EditableProblem>;
  setProblemStatus(problemId: string, status: ProblemStatus): Promise<void>;
  /** Idempotent; resolves to the original start time. */
  startAttempt(problemId: string): Promise<string>;
  /** Records the first view and resolves to the hint text; rejects with `hint_locked` early. */
  revealHint(problemId: string, ordinal: HintOrdinal): Promise<string>;
  reportProgress(problemId: string, evidence: string): Promise<void>;
  reopenProblem(problemId: string): Promise<void>;
  myActivity(): Promise<ActivityRow[]>;
  classroomActivity(classroomId: string): Promise<ClassroomActivity>;
}

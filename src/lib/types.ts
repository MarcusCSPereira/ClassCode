export type Language = 'python' | 'java' | 'cpp';
export type Role = 'student' | 'teacher';
export interface Hint {
  afterSeconds: number;
  text: string;
}
export interface Problem {
  id: string;
  title: string;
  moduleId: string;
  difficulty: 'Básico' | 'Intermediário' | 'Avançado';
  minutes: number;
  objective: string;
  statement: string;
  input: string;
  output: string;
  constraints: string;
  exampleInput: string;
  exampleOutput: string;
  hints: Hint[];
  externalUrl?: string;
  source: string;
  authorClassId?: string;
  /** Absent on catalog problems, which are always published. */
  status?: ProblemStatus;
  /** Hidden judge cases written by the teacher; the example is always case 1. */
  tests?: ProblemTest[];
}
/** draft: only the teacher sees it; published: students practice; archived: hidden, restorable. */
export type ProblemStatus = 'draft' | 'published' | 'archived';
export interface ProblemTest {
  stdin: string;
  expectedOutput: string;
}
export interface Module {
  id: string;
  title: string;
  description: string;
  level: string;
  prerequisites: string[];
  icon: string;
}
export interface Classroom {
  id: string;
  name: string;
  code: string;
  teacher: string;
  term: string;
  /** Generated demo data with no real students; the UI must say so. */
  fictitious?: boolean;
}
export type HintOrdinal = 1 | 2 | 3;
export interface HintView {
  ordinal: HintOrdinal;
  viewedAt: number;
}
export interface ProgressReport {
  evidence: string;
  reportedAt: number;
}
/** The teacher's review of the local identity's completion (demo only). */
export interface DemoReview {
  status: 'reviewed' | 'changes_requested';
  comment?: string;
  reviewedAt: number;
}
/** Demo persistence. Version 2 keeps the timestamps that metrics and progression need. */
export interface DemoState {
  version: 2;
  role: Role;
  name: string;
  joinedClassIds: string[];
  joinedAt: Record<string, number>;
  classes: Classroom[];
  customProblems: Problem[];
  startedAt: Record<string, number>;
  drafts: Record<string, string>;
  hintViews: Record<string, HintView[]>;
  reports: Record<string, ProgressReport>;
  /** Added in the Entrega 4; absent in data saved before it. */
  reviews?: Record<string, DemoReview>;
}
/** Shape saved by the first demo release; migrated on read. */
export interface DemoStateV1 {
  version: 1;
  role: Role;
  name: string;
  joinedClassIds: string[];
  classes: Classroom[];
  customProblems: Problem[];
  solved: string[];
  startedAt: Record<string, number>;
  drafts: Record<string, string>;
  revealedHints: Record<string, number[]>;
  evidence: Record<string, string>;
}

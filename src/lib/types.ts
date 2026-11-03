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

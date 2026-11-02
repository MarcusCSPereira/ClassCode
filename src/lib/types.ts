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
export interface DemoState {
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

/** Server-side integration contract. The demo never executes untrusted source. */
import type { Language } from './types';
export type Verdict =
  | 'queued'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit'
  | 'memory_limit'
  | 'compile_error'
  | 'runtime_error'
  | 'internal_error';
export interface SubmissionRequest {
  problemId: string;
  language: Language;
  sourceCode: string;
  idempotencyKey: string;
}
export interface SubmissionResult {
  id: string;
  verdict: Verdict;
  createdAt: string;
  timeMs?: number;
  memoryKb?: number;
}
export interface JudgeGateway {
  submit(request: SubmissionRequest): Promise<SubmissionResult>;
  getResult(submissionId: string): Promise<SubmissionResult>;
}

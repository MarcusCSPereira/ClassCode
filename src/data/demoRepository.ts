import { problems as defaultCatalog } from '../lib/catalog';
import {
  belongsToClassroom,
  normalizeClassCode,
  remainingHintSeconds,
  validateProblem,
  visibleProblems,
} from '../lib/domain';
import type { DemoState, Problem } from '../lib/types';
import type { DemoStore } from './demoStore';
import { FICTITIOUS_CLASS, fictitiousActivity } from './fictitiousClass';
import {
  RepositoryError,
  type ActivityRow,
  type ClassCodeRepository,
  type ProblemSummary,
} from './repository';

/** The demo has a single local identity shared by the student and teacher perspectives. */
export const DEMO_USER_ID = 'demo-user';
const iso = (ms: number) => new Date(ms).toISOString();
/** Lists never carry hint text or hidden cases, as in the remote mode. */
function toSummary(p: Problem): ProblemSummary {
  const summary: ProblemSummary & { tests?: unknown } = {
    ...p,
    hints: p.hints.map(({ afterSeconds }) => ({ afterSeconds })),
  };
  delete summary.tests;
  return summary;
}
/** The seeded class receives the catalog; other classes only their own problems. */
function classroomProblemIds(catalog: Problem[], state: DemoState, classroomId: string) {
  return new Set(
    [...catalog, ...state.customProblems]
      .filter((p) => belongsToClassroom(p, classroomId))
      .map((p) => p.id),
  );
}

export function createDemoRepository(
  store: DemoStore,
  { catalog = defaultCatalog, now = Date.now }: { catalog?: Problem[]; now?: () => number } = {},
): ClassCodeRepository {
  const state = () => store.getSnapshot();
  function accessibleProblem(problemId: string) {
    const problem = visibleProblems(catalog, state()).find((p) => p.id === problemId);
    if (!problem) throw new RepositoryError('problem_not_accessible');
    return problem;
  }
  /** Problems the teacher wrote in this browser; catalog problems are not editable. */
  function ownProblem(problemId: string) {
    const problem = state().customProblems.find((p) => p.id === problemId);
    if (!problem) throw new RepositoryError('owner_required');
    return problem;
  }
  function requireTeacher() {
    if (state().role !== 'teacher') throw new RepositoryError('teacher_required');
  }
  function activityRows(problemIds?: Set<string>): ActivityRow[] {
    const s = state();
    return Object.entries(s.startedAt)
      .filter(([problemId]) => !problemIds || problemIds.has(problemId))
      .map(([problemId, startedAt]): ActivityRow => {
        const report = s.reports[problemId];
        const review = report && s.reviews?.[problemId];
        return {
          studentId: DEMO_USER_ID,
          problemId,
          startedAt: iso(startedAt),
          hintViews: (s.hintViews[problemId] ?? []).map((v) => ({
            ordinal: v.ordinal,
            viewedAt: iso(v.viewedAt),
          })),
          ...(report && {
            reportedAt: iso(report.reportedAt),
            verification: 'self_reported' as const,
            evidence: report.evidence,
          }),
          ...(review && {
            review: {
              status: review.status,
              ...(review.comment && { comment: review.comment }),
              reviewedAt: iso(review.reviewedAt),
            },
          }),
        };
      });
  }
  /** Removes the review of a problem, as the database does when the completion changes. */
  const withoutReview = (s: DemoState, problemId: string): DemoState => {
    if (!s.reviews?.[problemId]) return s;
    const reviews = { ...s.reviews };
    delete reviews[problemId];
    return { ...s, reviews };
  };
  return {
    mode: 'demo',
    async getProfile() {
      return { id: DEMO_USER_ID, displayName: state().name, role: state().role };
    },
    async listClassrooms() {
      const s = state();
      if (s.role === 'teacher') return [...s.classes, FICTITIOUS_CLASS];
      return s.classes.filter((c) => s.joinedClassIds.includes(c.id));
    },
    async createClassroom(name, term) {
      requireTeacher();
      const classroom = {
        id: crypto.randomUUID(),
        name: name.trim(),
        code: crypto.randomUUID().slice(0, 8).toUpperCase(),
        teacher: state().name,
        term: term.trim(),
      };
      store.update((s) => ({ ...s, classes: [...s.classes, classroom] }));
      return { id: classroom.id, code: classroom.code };
    },
    async joinClassroom(code) {
      const classroom = state().classes.find((c) => c.code === normalizeClassCode(code));
      if (!classroom) throw new RepositoryError('invalid_invite');
      store.update((s) =>
        s.joinedClassIds.includes(classroom.id)
          ? s
          : {
              ...s,
              joinedClassIds: [...s.joinedClassIds, classroom.id],
              joinedAt: { ...s.joinedAt, [classroom.id]: now() },
            },
      );
      return classroom.id;
    },
    async importBaseTrail(_classroomId: string) {
      // The demonstration catalog is already available in its seeded classroom.
      return 0;
    },
    async listProblems() {
      return visibleProblems(catalog, state()).map(toSummary);
    },
    async publishProblem(input) {
      requireTeacher();
      const invalid = validateProblem(input);
      if (invalid) throw new RepositoryError('invalid_problem', invalid);
      if (!state().classes.some((c) => c.id === input.authorClassId))
        throw new RepositoryError('owner_required');
      const problem: Problem = {
        ...input,
        id: crypto.randomUUID(),
        source: 'Questão do professor · demonstração local',
        status: 'published',
      };
      store.update((s) => ({ ...s, customProblems: [...s.customProblems, problem] }));
      return problem.id;
    },
    async saveProblem(input) {
      requireTeacher();
      const invalid = validateProblem(input);
      if (invalid) throw new RepositoryError('invalid_problem', invalid);
      const existing = input.id ? ownProblem(input.id) : undefined;
      if (existing && existing.authorClassId !== input.authorClassId)
        throw new RepositoryError('invalid_problem');
      if (!state().classes.some((c) => c.id === input.authorClassId))
        throw new RepositoryError('owner_required');
      const problem: Problem = {
        ...input,
        id: existing?.id ?? crypto.randomUUID(),
        source: 'Questão do professor · demonstração local',
        // Problems saved before drafts existed have no status and are published.
        status: existing ? (existing.status ?? 'published') : 'draft',
      };
      store.update((s) => ({
        ...s,
        customProblems: existing
          ? s.customProblems.map((p) => (p.id === problem.id ? problem : p))
          : [...s.customProblems, problem],
      }));
      return problem.id;
    },
    async getProblemForEdit(problemId) {
      requireTeacher();
      const p = ownProblem(problemId);
      return {
        id: p.id,
        authorClassId: p.authorClassId!,
        moduleId: p.moduleId,
        title: p.title,
        difficulty: p.difficulty,
        minutes: p.minutes,
        objective: p.objective,
        statement: p.statement,
        input: p.input,
        output: p.output,
        constraints: p.constraints,
        exampleInput: p.exampleInput,
        exampleOutput: p.exampleOutput,
        hints: p.hints,
        ...(p.externalUrl && { externalUrl: p.externalUrl }),
        tests: p.tests ?? [],
        status: p.status ?? 'published',
        // The single demo identity is the only student who can have opened it.
        attempts: state().startedAt[problemId] ? 1 : 0,
      };
    },
    async setProblemStatus(problemId, status) {
      requireTeacher();
      ownProblem(problemId);
      store.update((s) => ({
        ...s,
        customProblems: s.customProblems.map((p) => (p.id === problemId ? { ...p, status } : p)),
      }));
    },
    async startAttempt(problemId) {
      accessibleProblem(problemId);
      store.update((s) =>
        s.startedAt[problemId] ? s : { ...s, startedAt: { ...s.startedAt, [problemId]: now() } },
      );
      return iso(state().startedAt[problemId]);
    },
    async revealHint(problemId, ordinal) {
      const hint = accessibleProblem(problemId).hints[ordinal - 1];
      if (!hint || remainingHintSeconds(hint, state().startedAt[problemId], now()) > 0)
        throw new RepositoryError('hint_locked');
      store.update((s) =>
        s.hintViews[problemId]?.some((v) => v.ordinal === ordinal)
          ? s
          : {
              ...s,
              hintViews: {
                ...s.hintViews,
                [problemId]: [...(s.hintViews[problemId] ?? []), { ordinal, viewedAt: now() }],
              },
            },
      );
      return hint.text;
    },
    async reportProgress(problemId, evidence) {
      accessibleProblem(problemId);
      const text = evidence.trim();
      if (!text || text.length > 2000) throw new RepositoryError('invalid_evidence');
      if (!state().startedAt[problemId]) throw new RepositoryError('attempt_required');
      store.update((s) => {
        const changed = s.reports[problemId]?.evidence !== text;
        const next = {
          ...s,
          reports: {
            ...s.reports,
            // Like the database, editing the evidence keeps the original report time.
            [problemId]: { evidence: text, reportedAt: s.reports[problemId]?.reportedAt ?? now() },
          },
        };
        // New evidence needs a new look from the teacher.
        return changed ? withoutReview(next, problemId) : next;
      });
    },
    async reopenProblem(problemId) {
      store.update((s) => {
        if (!s.reports[problemId]) return s;
        const reports = { ...s.reports };
        delete reports[problemId];
        return withoutReview({ ...s, reports }, problemId);
      });
    },
    async reviewProgress(problemId, studentId, status, comment) {
      requireTeacher();
      // The fictitious class is read-only; the local identity is the only real student.
      if (studentId !== DEMO_USER_ID) throw new RepositoryError('owner_required');
      if (!state().reports[problemId]) throw new RepositoryError('report_required');
      if (status === 'clear') {
        store.update((s) => withoutReview(s, problemId));
        return;
      }
      const text = comment?.trim() ?? '';
      if ((status === 'changes_requested' && !text) || text.length > 1000)
        throw new RepositoryError('invalid_review');
      store.update((s) => ({
        ...s,
        reviews: {
          ...s.reviews,
          [problemId]: { status, ...(text && { comment: text }), reviewedAt: now() },
        },
      }));
    },
    async rotateInvite(classroomId) {
      requireTeacher();
      if (!state().classes.some((c) => c.id === classroomId))
        throw new RepositoryError('owner_required');
      const code = crypto.randomUUID().slice(0, 8).toUpperCase();
      store.update((s) => ({
        ...s,
        classes: s.classes.map((c) => (c.id === classroomId ? { ...c, code } : c)),
      }));
      return code;
    },
    async myActivity() {
      return activityRows();
    },
    async classroomActivity(classroomId) {
      // Every local class belongs to the teacher perspective of the single demo identity.
      requireTeacher();
      if (classroomId === FICTITIOUS_CLASS.id) return fictitiousActivity(now());
      const s = state();
      if (!s.classes.some((c) => c.id === classroomId)) throw new RepositoryError('owner_required');
      if (!s.joinedClassIds.includes(classroomId)) return { roster: [], activity: [] };
      return {
        roster: [
          { studentId: DEMO_USER_ID, displayName: s.name, joinedAt: iso(s.joinedAt[classroomId]) },
        ],
        activity: activityRows(classroomProblemIds(catalog, s, classroomId)),
      };
    },
  };
}

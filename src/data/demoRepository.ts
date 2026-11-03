import { problems as defaultCatalog } from '../lib/catalog';
import {
  normalizeClassCode,
  remainingHintSeconds,
  validateProblem,
  visibleProblems,
} from '../lib/domain';
import type { DemoState, Problem } from '../lib/types';
import type { DemoStore } from './demoStore';
import {
  RepositoryError,
  type ActivityRow,
  type ClassCodeRepository,
  type ProblemSummary,
} from './repository';

/** The demo has a single local identity shared by the student and teacher perspectives. */
export const DEMO_USER_ID = 'demo-user';
const iso = (ms: number) => new Date(ms).toISOString();
const withoutHintText = (p: Problem): ProblemSummary => ({
  ...p,
  hints: p.hints.map(({ afterSeconds }) => ({ afterSeconds })),
});
/** The seeded class receives the catalog; other classes only their own problems. */
function classroomProblemIds(catalog: Problem[], state: DemoState, classroomId: string) {
  return new Set(
    [...(classroomId === 'demo-class' ? catalog : []), ...state.customProblems]
      .filter((p) => (p.authorClassId ?? 'demo-class') === classroomId)
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
  function requireTeacher() {
    if (state().role !== 'teacher') throw new RepositoryError('teacher_required');
  }
  function activityRows(problemIds?: Set<string>): ActivityRow[] {
    const s = state();
    return Object.entries(s.startedAt)
      .filter(([problemId]) => !problemIds || problemIds.has(problemId))
      .map(([problemId, startedAt]): ActivityRow => {
        const report = s.reports[problemId];
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
          }),
        };
      });
  }
  return {
    mode: 'demo',
    async listClassrooms() {
      const s = state();
      return s.classes.filter((c) => s.role === 'teacher' || s.joinedClassIds.includes(c.id));
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
    async listProblems() {
      return visibleProblems(catalog, state()).map(withoutHintText);
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
      };
      store.update((s) => ({ ...s, customProblems: [...s.customProblems, problem] }));
      return problem.id;
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
      store.update((s) => ({
        ...s,
        reports: {
          ...s.reports,
          // Like the database, editing the evidence keeps the original report time.
          [problemId]: { evidence: text, reportedAt: s.reports[problemId]?.reportedAt ?? now() },
        },
      }));
    },
    async reopenProblem(problemId) {
      store.update((s) => {
        if (!s.reports[problemId]) return s;
        const reports = { ...s.reports };
        delete reports[problemId];
        return { ...s, reports };
      });
    },
    async myActivity() {
      return activityRows();
    },
    async classroomActivity(classroomId) {
      // Every local class belongs to the teacher perspective of the single demo identity.
      requireTeacher();
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

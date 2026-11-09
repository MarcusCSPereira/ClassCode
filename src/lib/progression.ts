/**
 * Progression model v1 (docs/ENTREGA-2.md, section 5): deterministic, explainable rules.
 * Every function takes the activity of a single student and never touches React or the network.
 */
import type { ActivityRow, ProblemSummary } from '../data/repository';
import type { Module, Problem } from './types';

/** Parameters to calibrate with the course teacher (decision D3). */
export const PROGRESSION_RULES = {
  /** Completions that finish a module, capped by how many problems it has. */
  minCompletions: 2,
  /** Mean autonomy a finished module needs to count as mastered. */
  masteryAutonomy: 0.75,
  /** At or below this, a completion needed a lot of help. */
  lowAutonomy: 0.5,
};

export type ModuleStatus =
  'preparing' | 'waiting' | 'available' | 'in_progress' | 'completed' | 'mastered';
export interface ModuleProgress {
  status: ModuleStatus;
  /** Published problems in the module. */
  total: number;
  /** Completions that finish the module. */
  required: number;
  completed: number;
  started: number;
  /** Mean autonomy of the completions; null before the first one. */
  autonomy: number | null;
  /** Modules to finish first; only filled while waiting. */
  blockedBy: string[];
}
export interface Recommendation {
  kind: 'continue' | 'advance' | 'reinforce';
  problemId: string;
  moduleId: string;
  /** Shown to the student, so the recommendation is never a black box. */
  reason: string;
}

const DIFFICULTY_RANK: Record<Problem['difficulty'], number> = {
  Básico: 0,
  Intermediário: 1,
  Avançado: 2,
};
const FINISHED: ModuleStatus[] = ['completed', 'mastered'];
const OPEN: ModuleStatus[] = ['available', 'in_progress'];
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const latestFirst = (a: string, b: string) => Date.parse(b) - Date.parse(a);

/** 1.00, 0.75, 0.50 or 0.25 for 0, 1, 2 or 3 hints. */
export function autonomy(hintsBeforeCompletion: number): number {
  return 1 - 0.25 * Math.min(3, Math.max(0, hintsBeforeCompletion));
}
/** Hints opened up to the completion. Later views are revision and do not count. */
export function hintsBeforeCompletion(row: ActivityRow): number {
  if (!row.reportedAt) return row.hintViews.length;
  const reported = Date.parse(row.reportedAt);
  return row.hintViews.filter((v) => Date.parse(v.viewedAt) <= reported).length;
}

export function moduleStatuses(
  modules: Module[],
  problems: ProblemSummary[],
  activity: ActivityRow[],
): Record<string, ModuleProgress> {
  const rows = new Map(activity.map((row) => [row.problemId, row]));
  const byId = new Map(modules.map((m) => [m.id, m]));
  const result: Record<string, ModuleProgress> = {};
  const visiting = new Set<string>();

  function progress(id: string): ModuleProgress {
    if (result[id]) return result[id];
    visiting.add(id);
    const list = problems.filter((p) => p.moduleId === id);
    const done = list.flatMap((p) => {
      const row = rows.get(p.id);
      return row?.reportedAt ? [row] : [];
    });
    const total = list.length;
    const required = Math.min(PROGRESSION_RULES.minCompletions, total);
    const meanAutonomy = done.length
      ? mean(done.map((row) => autonomy(hintsBeforeCompletion(row))))
      : null;
    const started = list.filter((p) => rows.has(p.id)).length;
    const blockedBy = unmet(id, new Set());
    let status: ModuleStatus;
    if (total === 0) status = 'preparing';
    else if (done.length >= required)
      status = meanAutonomy! >= PROGRESSION_RULES.masteryAutonomy ? 'mastered' : 'completed';
    else if (blockedBy.length) status = 'waiting';
    else status = started ? 'in_progress' : 'available';
    visiting.delete(id);
    return (result[id] = {
      status,
      total,
      required,
      completed: done.length,
      started,
      autonomy: meanAutonomy,
      blockedBy: status === 'waiting' ? blockedBy : [],
    });
  }
  /**
   * Prerequisites still to finish. A prerequisite without problems has nothing to finish,
   * so its own prerequisites stand in for it; unknown ids and cycles are ignored.
   */
  function unmet(id: string, seen: Set<string>): string[] {
    const missing = new Set<string>();
    for (const pre of byId.get(id)?.prerequisites ?? []) {
      if (!byId.has(pre) || visiting.has(pre) || seen.has(pre)) continue;
      seen.add(pre);
      const status = progress(pre).status;
      if (status === 'preparing') unmet(pre, seen).forEach((m) => missing.add(m));
      else if (!FINISHED.includes(status)) missing.add(pre);
    }
    return [...missing];
  }

  modules.forEach((m) => progress(m.id));
  return result;
}

/** Module the student is working towards, in trail order; null when all of them are finished. */
export function currentModule(
  modules: Module[],
  progress: Record<string, ModuleProgress>,
): string | null {
  return modules.find((m) => progress[m.id] && OPEN.includes(progress[m.id].status))?.id ?? null;
}

/** Recent help level: the last two completions both high or both low autonomy. */
function recentTrend(rows: ActivityRow[]): 'high' | 'low' | 'mixed' {
  const recent = rows
    .filter((row) => row.reportedAt)
    .sort((a, b) => latestFirst(a.reportedAt!, b.reportedAt!))
    .slice(0, 2)
    .map((row) => autonomy(hintsBeforeCompletion(row)));
  if (recent.length < 2) return 'mixed';
  if (recent.every((a) => a >= PROGRESSION_RULES.masteryAutonomy)) return 'high';
  if (recent.every((a) => a <= PROGRESSION_RULES.lowAutonomy)) return 'low';
  return 'mixed';
}
/** Easiest first; ties keep the publication order. */
function byDifficulty(list: ProblemSummary[]) {
  return list
    .map((problem, index) => ({ problem, index }))
    .sort(
      (a, b) =>
        DIFFICULTY_RANK[a.problem.difficulty] - DIFFICULTY_RANK[b.problem.difficulty] ||
        a.index - b.index,
    )
    .map(({ problem }) => problem);
}

export function recommendNext(
  modules: Module[],
  problems: ProblemSummary[],
  activity: ActivityRow[],
): Recommendation | null {
  const progress = moduleStatuses(modules, problems, activity);
  const rows = new Map(activity.map((row) => [row.problemId, row]));
  const known = problems.filter((p) => progress[p.moduleId]);
  const title = (moduleId: string) => modules.find((m) => m.id === moduleId)?.title ?? moduleId;
  const pick = (kind: Recommendation['kind'], problem: ProblemSummary, reason: string) => ({
    kind,
    problemId: problem.id,
    moduleId: problem.moduleId,
    reason,
  });

  // 1. Continue the most recent unfinished attempt outside modules still waiting.
  const unfinished = known
    .filter((p) => {
      const row = rows.get(p.id);
      return row && !row.reportedAt && progress[p.moduleId].status !== 'waiting';
    })
    .sort((a, b) => latestFirst(rows.get(a.id)!.startedAt, rows.get(b.id)!.startedAt));
  if (unfinished[0])
    return pick(
      'continue',
      unfinished[0],
      'Você começou este desafio e ainda não registrou a conclusão.',
    );

  // 2. Advance in the first open module, adapting difficulty to the recent help level.
  const trend = recentTrend(known.flatMap((p) => rows.get(p.id) ?? []));
  for (const m of modules) {
    const status = progress[m.id].status;
    if (!OPEN.includes(status)) continue;
    const candidates = byDifficulty(known.filter((p) => p.moduleId === m.id && !rows.has(p.id)));
    if (!candidates.length) continue;
    if (trend === 'high') {
      const hardest = Math.max(...candidates.map((p) => DIFFICULTY_RANK[p.difficulty]));
      return pick(
        'advance',
        candidates.find((p) => DIFFICULTY_RANK[p.difficulty] === hardest)!,
        'Você resolveu os últimos desafios quase sem dicas.',
      );
    }
    if (trend === 'low')
      return pick('advance', candidates[0], 'Vamos consolidar antes de subir o nível.');
    return pick(
      'advance',
      candidates[0],
      status === 'available'
        ? `Você está pronto para começar ${title(m.id)}.`
        : `Próximo passo em ${title(m.id)}.`,
    );
  }

  // 3. Everything open is finished: reinforce the finished, not mastered, module with least autonomy.
  const reinforce = modules
    .filter((m) => progress[m.id].status === 'completed')
    .sort((a, b) => progress[a.id].autonomy! - progress[b.id].autonomy!);
  for (const m of reinforce) {
    const candidate = byDifficulty(known.filter((p) => p.moduleId === m.id && !rows.has(p.id)))[0];
    if (candidate)
      return pick(
        'reinforce',
        candidate,
        `Vale reforçar ${title(m.id)}: você concluiu a etapa com bastante ajuda das dicas.`,
      );
  }
  return null;
}

/**
 * Teacher metrics v1 (docs/ENTREGA-2.md, section 6). They support pedagogical follow-up and are
 * never a grade: completions are self-reported. Pure functions over ClassroomActivity.
 */
import type { ActivityRow, ClassroomActivity, ProblemSummary } from '../data/repository';
import { currentModule, hintsBeforeCompletion, moduleStatuses } from './progression';
import type { HintOrdinal, Module } from './types';

/** Thresholds to calibrate with the course teacher (decision D4). */
export const METRIC_RULES = {
  /** Any activity within this many days counts as active; none for this long is "inactive". */
  inactiveDays: 7,
  /** An unfinished attempt with an opened hint, older than this, counts towards "stuck". */
  stuckHours: 48,
  stuckProblems: 2,
  dependentCompletions: 3,
  dependentHints: 2.5,
};

export type SignalKind = 'not_started' | 'inactive' | 'stuck' | 'hint_dependent';
/** A fact worth a teacher's look, stated with its reason; not a performance label. */
export interface Signal {
  kind: SignalKind;
  reason: string;
}
export interface StudentMetrics {
  studentId: string;
  displayName: string;
  joinedAt: string;
  opened: number;
  completed: number;
  completionRate: number | null;
  hintsPerCompletion: number | null;
  /** Share of completions without any hint; shown as "Autonomia". */
  noHintRate: number | null;
  medianTimeToReportMs: number | null;
  lastActivity: string | null;
  /** First open stage of the trail; null when none is open (finished or no problems). */
  currentModule: string | null;
  signals: Signal[];
}
export interface ProblemMetrics {
  problemId: string;
  opened: number;
  completed: number;
  completionRate: number | null;
  /** Share of the students who opened it that revealed hint 1, 2 and 3. */
  hintFunnel: [number, number, number] | null;
  medianTimeToReportMs: number | null;
}
export type MapCell =
  | { status: 'not_opened' }
  | { status: 'in_progress'; hints: number }
  | { status: 'completed'; hints: number };
export interface ClassroomMetrics {
  enrolled: number;
  activeLastWeek: number;
  /** Ordered by name. */
  students: StudentMetrics[];
  /** In the order of the problems received. */
  problems: ProblemMetrics[];
  /** Opened problems, most third hints first, then lowest completion rate. */
  mostHelpNeeded: ProblemMetrics[];
  /** Students per current stage in trail order; `null` groups those with no open stage. */
  moduleDistribution: { moduleId: string | null; students: number }[];
  /** `map[studentId][problemId]` */
  map: Record<string, Record<string, MapCell>>;
}

const DAY = 86_400_000;
const HOUR = 3_600_000;
const time = (iso: string) => Date.parse(iso);
const ratio = (part: number, whole: number) => (whole ? part / whole : null);
const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const decimal = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
/** Hints that count as help: viewed up to the completion, or all of them while unfinished. */
function helpOrdinals(row: ActivityRow): Set<HintOrdinal> {
  const limit = row.reportedAt ? time(row.reportedAt) : Infinity;
  return new Set(row.hintViews.filter((v) => time(v.viewedAt) <= limit).map((v) => v.ordinal));
}
function lastActivity(rows: ActivityRow[]): number | null {
  const times = rows.flatMap((row) => [
    time(row.startedAt),
    ...row.hintViews.map((v) => time(v.viewedAt)),
    ...(row.reportedAt ? [time(row.reportedAt)] : []),
  ]);
  return times.length ? Math.max(...times) : null;
}
const timesToReport = (rows: ActivityRow[]) =>
  rows.flatMap((row) => (row.reportedAt ? [time(row.reportedAt) - time(row.startedAt)] : []));

function signalsFor(rows: ActivityRow[], last: number | null, now: number): Signal[] {
  if (!rows.length)
    return [{ kind: 'not_started', reason: 'Matriculado e ainda sem nenhum desafio aberto.' }];
  const signals: Signal[] = [];
  if (last !== null && now - last >= METRIC_RULES.inactiveDays * DAY)
    signals.push({
      kind: 'inactive',
      reason: `Sem atividade há ${Math.floor((now - last) / DAY)} dias.`,
    });
  const stuck = rows.filter(
    (row) =>
      !row.reportedAt &&
      row.hintViews.length > 0 &&
      now - time(row.startedAt) > METRIC_RULES.stuckHours * HOUR,
  ).length;
  if (stuck >= METRIC_RULES.stuckProblems)
    signals.push({
      kind: 'stuck',
      reason: `${stuck} desafios com dica aberta e sem conclusão há mais de ${METRIC_RULES.stuckHours} h.`,
    });
  const hints = rows.filter((row) => row.reportedAt).map(hintsBeforeCompletion);
  const meanHints = mean(hints);
  if (
    hints.length >= METRIC_RULES.dependentCompletions &&
    meanHints !== null &&
    meanHints >= METRIC_RULES.dependentHints
  )
    signals.push({
      kind: 'hint_dependent',
      reason: `Média de ${decimal(meanHints)} dicas em ${hints.length} conclusões.`,
    });
  return signals;
}

/**
 * @param problems the classroom's published problems, in publication order
 * @param now reference time for "active", "inactive" and "stuck"
 */
export function classroomMetrics(
  modules: Module[],
  problems: ProblemSummary[],
  { roster, activity }: ClassroomActivity,
  now: number,
): ClassroomMetrics {
  const problemIds = new Set(problems.map((p) => p.id));
  const enrolled = new Set(roster.map((s) => s.studentId));
  const rows = activity.filter((r) => problemIds.has(r.problemId) && enrolled.has(r.studentId));
  const rowsOf = (studentId: string) => rows.filter((r) => r.studentId === studentId);

  const students = roster
    .map((entry): StudentMetrics => {
      const own = rowsOf(entry.studentId);
      const done = own.filter((r) => r.reportedAt);
      const hints = done.map(hintsBeforeCompletion);
      const last = lastActivity(own);
      return {
        studentId: entry.studentId,
        displayName: entry.displayName,
        joinedAt: entry.joinedAt,
        opened: own.length,
        completed: done.length,
        completionRate: ratio(done.length, own.length),
        hintsPerCompletion: mean(hints),
        noHintRate: ratio(hints.filter((h) => h === 0).length, done.length),
        medianTimeToReportMs: median(timesToReport(done)),
        lastActivity: last === null ? null : new Date(last).toISOString(),
        currentModule: currentModule(modules, moduleStatuses(modules, problems, own)),
        signals: signalsFor(own, last, now),
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));

  const problemMetrics = problems.map((problem): ProblemMetrics => {
    const own = rows.filter((r) => r.problemId === problem.id);
    const done = own.filter((r) => r.reportedAt);
    const share = (ordinal: HintOrdinal) =>
      own.filter((r) => helpOrdinals(r).has(ordinal)).length / own.length;
    return {
      problemId: problem.id,
      opened: own.length,
      completed: done.length,
      completionRate: ratio(done.length, own.length),
      hintFunnel: own.length ? [share(1), share(2), share(3)] : null,
      medianTimeToReportMs: median(timesToReport(done)),
    };
  });

  const counts = new Map<string | null, number>();
  for (const s of students) counts.set(s.currentModule, (counts.get(s.currentModule) ?? 0) + 1);
  const moduleDistribution = [...modules.map((m) => m.id), null]
    .filter((id) => counts.has(id))
    .map((moduleId) => ({ moduleId, students: counts.get(moduleId)! }));

  const map: ClassroomMetrics['map'] = {};
  for (const s of students) {
    const own = new Map(rowsOf(s.studentId).map((r) => [r.problemId, r]));
    map[s.studentId] = Object.fromEntries(
      problems.map((p): [string, MapCell] => {
        const row = own.get(p.id);
        if (!row) return [p.id, { status: 'not_opened' }];
        if (row.reportedAt)
          return [p.id, { status: 'completed', hints: hintsBeforeCompletion(row) }];
        return [p.id, { status: 'in_progress', hints: row.hintViews.length }];
      }),
    );
  }

  return {
    enrolled: roster.length,
    activeLastWeek: students.filter(
      (s) =>
        s.lastActivity !== null && now - time(s.lastActivity) < METRIC_RULES.inactiveDays * DAY,
    ).length,
    students,
    problems: problemMetrics,
    mostHelpNeeded: problemMetrics
      .filter((p) => p.opened > 0)
      .sort((a, b) => b.hintFunnel![2] - a.hintFunnel![2] || a.completionRate! - b.completionRate!),
    moduleDistribution,
    map,
  };
}

/** Text for a cell of the student × problem map. */
export function describeCell(cell: MapCell): string {
  const hints = (n: number) => `${n} ${n === 1 ? 'dica' : 'dicas'}`;
  if (cell.status === 'not_opened') return 'Não abriu';
  if (cell.status === 'in_progress')
    return cell.hints ? `Viu ${hints(cell.hints)}` : 'Em andamento';
  return cell.hints ? `Concluiu com ${hints(cell.hints)}` : 'Concluiu sem dica';
}

const CSV_COLUMNS = [
  'Aluno',
  'Matriculado em',
  'Desafios abertos',
  'Conclusões autodeclaradas',
  'Taxa de conclusão (%)',
  'Dicas por conclusão',
  'Autonomia: conclusões sem dica (%)',
  'Tempo mediano até registrar (min)',
  'Última atividade',
  'Etapa atual',
  'Sinais de atenção (não são nota)',
];
function csvCell(value: string | number): string {
  // A leading =, +, -, @ or control character would run as a formula in spreadsheets.
  const text = String(value).replace(/^[=+\-@\t\r]/, "'$&");
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
/**
 * Per-student table for spreadsheets used in Brazil: `;` separator, decimal comma,
 * UTF-8 BOM and CRLF line breaks.
 */
export function studentsCsv(
  students: StudentMetrics[],
  modules: Module[],
  { timeZone }: { timeZone?: string } = {},
): string {
  const date = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  });
  const percent = (rate: number | null) => (rate === null ? '' : Math.round(rate * 100));
  const lines = students.map((s) => [
    s.displayName,
    date.format(new Date(s.joinedAt)),
    s.opened,
    s.completed,
    percent(s.completionRate),
    s.hintsPerCompletion === null ? '' : decimal(s.hintsPerCompletion),
    percent(s.noHintRate),
    s.medianTimeToReportMs === null ? '' : Math.round(s.medianTimeToReportMs / 60_000),
    s.lastActivity ? date.format(new Date(s.lastActivity)) : '',
    s.currentModule
      ? (modules.find((m) => m.id === s.currentModule)?.title ?? s.currentModule)
      : 'Sem etapa em aberto',
    s.signals.map((signal) => signal.reason).join(' '),
  ]);
  return '﻿' + [CSV_COLUMNS, ...lines].map((l) => l.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

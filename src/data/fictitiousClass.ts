/**
 * Fictitious class to demonstrate the teacher panel (CC-21). Every student and attempt is
 * generated and times are relative to `now`, so the same situations appear on any day.
 * Nothing here is a real person or a real submission, and the UI must say so.
 */
import { FICTITIOUS_CLASS_ID } from '../lib/domain';
import type { Classroom, HintOrdinal } from '../lib/types';
import type { ActivityRow, ClassroomActivity } from './repository';

export const FICTITIOUS_CLASS: Classroom = {
  id: FICTITIOUS_CLASS_ID,
  name: 'Turma de demonstração · dados fictícios',
  code: 'FICTICIA',
  teacher: 'Professor da demonstração',
  term: '2026.2',
  fictitious: true,
};

const MINUTE = 60_000;
const HOUR = 60;
const DAY = 24 * HOUR;
/** Minutes after the start at which hints 1, 2 and 3 are opened (they unlock at 3, 7 and 12). */
const HINT_TIMES = [4, 8, 13];
interface Attempt {
  problem: string;
  /** Minutes before now. */
  start: number;
  /** Minutes after the start. */
  hints: number[];
  done?: number;
}
const solved = (problem: string, start: number, hints = 0, minutes = 25): Attempt => ({
  problem,
  start,
  hints: HINT_TIMES.slice(0, hints),
  done: minutes,
});
const open = (problem: string, start: number, hints = 0): Attempt => ({
  problem,
  start,
  hints: HINT_TIMES.slice(0, hints),
});

/** One student per situation the panel must show (docs/ENTREGA-2.md, section 6). */
const STUDENTS: { name: string; attempts: Attempt[] }[] = [
  {
    // Advances with little help; "Quantos são diferentes?" is still open with every hint.
    name: 'Aline M.',
    attempts: [
      solved('sum', 6 * DAY, 0, 15),
      solved('parity', 6 * DAY - HOUR, 0, 20),
      solved('maximum', 5 * DAY),
      solved('weird', 4 * DAY, 0, 35),
      solved('missing', 2 * DAY, 1, 40),
      open('distinct', 3 * HOUR, 3),
    ],
  },
  { name: 'Bruno S.', attempts: [] },
  {
    name: 'Camila R.',
    attempts: [solved('sum', 10 * DAY + 2 * HOUR, 1), open('parity', 10 * DAY)],
  },
  {
    name: 'Diego F.',
    attempts: [
      solved('sum', 5 * DAY, 1, 30),
      open('parity', 4 * DAY, 2),
      open('maximum', 3 * DAY, 1),
    ],
  },
  {
    name: 'Elisa T.',
    attempts: [
      solved('sum', 3 * DAY, 3, 45),
      solved('parity', 2 * DAY, 3, 50),
      solved('maximum', DAY, 2, 30),
      solved('weird', 6 * HOUR, 3, 60),
    ],
  },
  {
    name: 'Felipe N.',
    attempts: [solved('sum', 2 * DAY, 0, 18), solved('parity', DAY, 1), open('weird', 2 * HOUR)],
  },
  {
    name: 'Gabriela P.',
    attempts: [
      solved('sum', 4 * DAY, 1),
      solved('parity', 3 * DAY, 2, 40),
      open('maximum', 5 * HOUR, 1),
    ],
  },
  {
    // Finished the trail; needed every hint only on "Quantos são diferentes?".
    name: 'Heitor C.',
    attempts: [
      solved('sum', 8 * DAY, 0, 10),
      solved('parity', 8 * DAY - HOUR, 0, 12),
      solved('maximum', 7 * DAY, 0, 15),
      solved('weird', 6 * DAY, 0, 20),
      solved('missing', 5 * DAY, 0, 20),
      solved('distinct', 2 * DAY, 3, 70),
      solved('binary', DAY, 1, 35),
    ],
  },
];

export function fictitiousActivity(now: number): ClassroomActivity {
  const ago = (minutes: number) => new Date(now - minutes * MINUTE).toISOString();
  const studentId = (index: number) => `ficticio-${index + 1}`;
  return {
    roster: STUDENTS.map((s, i) => ({
      studentId: studentId(i),
      displayName: s.name,
      joinedAt: ago(14 * DAY),
    })),
    activity: STUDENTS.flatMap((s, i) =>
      s.attempts.map((a): ActivityRow => ({
        studentId: studentId(i),
        problemId: a.problem,
        startedAt: ago(a.start),
        hintViews: a.hints.map((after, k) => ({
          ordinal: (k + 1) as HintOrdinal,
          viewedAt: ago(a.start - after),
        })),
        ...(a.done !== undefined && {
          reportedAt: ago(a.start - a.done),
          verification: 'self_reported' as const,
        }),
      })),
    ),
  };
}

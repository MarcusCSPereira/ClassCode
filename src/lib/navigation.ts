export type Page =
  'overview' | 'roadmap' | 'problems' | 'visuals' | 'classes' | 'teacher' | 'problem';
export const pageNames: Record<Page, string> = {
  overview: 'Visão geral',
  roadmap: 'Minha trilha',
  problems: 'Desafios',
  visuals: 'Laboratório visual',
  classes: 'Minhas turmas',
  teacher: 'Painel do professor',
  problem: 'Espaço de prática',
};
export function readPage(): Page {
  const page = location.hash.slice(1).split('/')[0] as Page;
  return Object.hasOwn(pageNames, page) ? page : 'overview';
}
/** Problem id from `#problem/<id>`; undefined on other pages. */
export function problemIdFromHash(): string | undefined {
  return location.hash.split('/')[1];
}

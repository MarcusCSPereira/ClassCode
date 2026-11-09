import { modules } from '../lib/catalog';
import type { ModuleProgress, ModuleStatus } from '../lib/progression';

export const statusLabels: Record<ModuleStatus, string> = {
  preparing: 'Em preparação',
  waiting: 'Aguardando',
  available: 'Disponível',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  mastered: 'Dominado',
};
export const statusTones: Record<ModuleStatus, 'blue' | 'amber' | 'neutral'> = {
  preparing: 'neutral',
  waiting: 'neutral',
  available: 'blue',
  in_progress: 'amber',
  completed: 'neutral',
  mastered: 'blue',
};
const titles = new Intl.ListFormat('pt-BR', { type: 'conjunction' });
/** The situation of a module in words, so it never depends on color alone. */
export function describeProgress(p: ModuleProgress): string {
  switch (p.status) {
    case 'preparing':
      return 'Em preparação';
    case 'waiting':
      return `Recomendado após ${titles.format(
        p.blockedBy.map((id) => modules.find((m) => m.id === id)?.title ?? id),
      )}`;
    case 'available':
    case 'in_progress':
      return `${p.completed} de ${p.required} para concluir`;
    default:
      return `${p.completed}/${p.total} desafios concluídos`;
  }
}

import { ArrowUpRight } from 'lucide-react';
import type { Module } from '../lib/types';
import type { ModuleProgress } from '../lib/progression';
import type { ProblemSummary } from '../data/repository';
import { describeProgress, statusLabels, statusTones } from './moduleStatus';
import Progress from './Progress';
import TopicIcon from './TopicIcon';
export default function ModuleCard({
  module: m,
  index,
  problems,
  progress,
  current = false,
  onSelect,
}: {
  module: Module;
  index: number;
  problems: ProblemSummary[];
  /** Undefined while the student's activity is loading. */
  progress?: ModuleProgress;
  current?: boolean;
  onSelect: (m: Module) => void;
}) {
  const total = problems.filter((p) => p.moduleId === m.id).length;
  return (
    <button className={`topic-card ${current ? 'featured-topic' : ''}`} onClick={() => onSelect(m)}>
      <div className="topic-card-top">
        <span className={`topic-icon tone-${index % 4}`}>
          <TopicIcon id={m.id} />
        </span>
        <span className="topic-card-meta">
          {progress && progress.status !== 'preparing' && (
            <span className={`badge ${statusTones[progress.status]}`}>
              {current ? 'Etapa atual' : statusLabels[progress.status]}
            </span>
          )}
          <span className="topic-number">{String(index + 1).padStart(2, '0')}</span>
        </span>
      </div>
      <h3>{m.title}</h3>
      <p>{m.description}</p>
      <div className="topic-card-bottom">
        <span>
          {progress ? describeProgress(progress) : total ? `${total} desafios` : 'Em preparação'}
        </span>
        <ArrowUpRight size={17} />
      </div>
      <Progress
        value={
          progress?.required ? Math.min(100, (progress.completed / progress.required) * 100) : 0
        }
      />
    </button>
  );
}

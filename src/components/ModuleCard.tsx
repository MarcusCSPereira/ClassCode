import { ArrowUpRight } from 'lucide-react';
import type { Module, Problem } from '../lib/types';
import Progress from './Progress';
import TopicIcon from './TopicIcon';
export default function ModuleCard({
  module: m,
  index,
  problems,
  solved,
  onSelect,
}: {
  module: Module;
  index: number;
  problems: Problem[];
  solved: string[];
  onSelect: (m: Module) => void;
}) {
  const list = problems.filter((p) => p.moduleId === m.id);
  const done = list.filter((p) => solved.includes(p.id)).length;
  return (
    <button
      className={`topic-card ${m.id === 'foundations' ? 'featured-topic' : ''}`}
      onClick={() => onSelect(m)}
    >
      <div className="topic-card-top">
        <span className={`topic-icon tone-${index % 4}`}>
          <TopicIcon id={m.id} />
        </span>
        <span className="topic-number">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <h3>{m.title}</h3>
      <p>{m.description}</p>
      <div className="topic-card-bottom">
        <span>{list.length ? `${done}/${list.length} desafios` : 'Em preparação'}</span>
        <ArrowUpRight size={17} />
      </div>
      <Progress value={list.length ? (done / list.length) * 100 : 0} />
    </button>
  );
}

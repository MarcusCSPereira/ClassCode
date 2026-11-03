import { Check, ChevronRight, Clock3, Search } from 'lucide-react';
import { modules } from '../lib/catalog';
import type { Problem } from '../lib/types';
export default function ProblemList({
  list,
  solved,
  onOpen,
}: {
  list: Problem[];
  solved: string[];
  onOpen: (p: Problem) => void;
}) {
  return (
    <div className="problem-list">
      {list.length === 0 ? (
        <div className="empty">
          <Search size={28} />
          <h3>Nenhum desafio encontrado</h3>
          <p>Tente outro título ou tópico.</p>
        </div>
      ) : (
        list.map((p, i) => (
          <button className="problem-row" key={p.id} onClick={() => onOpen(p)}>
            <span className={`problem-status ${solved.includes(p.id) ? 'done' : ''}`}>
              {solved.includes(p.id) ? <Check size={16} /> : String(i + 1).padStart(2, '0')}
            </span>
            <span className="problem-info">
              <strong>{p.title}</strong>
              <small>
                {modules.find((m) => m.id === p.moduleId)?.title} <span>· {p.source}</span>
              </small>
            </span>
            <span className={`badge ${p.difficulty === 'Básico' ? 'blue' : 'amber'}`}>
              {p.difficulty}
            </span>
            <span className="problem-time">
              <Clock3 size={14} /> {p.minutes} min
            </span>
            <ChevronRight size={18} />
          </button>
        ))
      )}
    </div>
  );
}

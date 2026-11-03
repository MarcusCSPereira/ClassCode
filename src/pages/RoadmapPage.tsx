import { useState } from 'react';
import { Map } from 'lucide-react';
import { modules } from '../lib/catalog';
import type { ModuleProgress } from '../lib/progression';
import type { Module } from '../lib/types';
import type { ProblemSummary } from '../data/repository';
import ModuleCard from '../components/ModuleCard';
export default function RoadmapPage({
  problems: all,
  progress,
  current,
  onSelectTopic,
}: {
  problems: ProblemSummary[];
  /** Null while the student's activity is loading. */
  progress: Record<string, ModuleProgress> | null;
  current: string | null;
  onSelectTopic: (m: Module) => void;
}) {
  const [level, setLevel] = useState('Todos');
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">UM CAMINHO, MUITAS DESCOBERTAS</div>
          <h1>Do primeiro passo ao próximo nível.</h1>
          <p>
            Explore a trilha. Os pré-requisitos sugerem uma ordem, sem bloquear sua curiosidade.
          </p>
        </div>
      </div>
      <div className="roadmap-banner">
        <span className="topic-icon blue">
          <Map size={25} />
        </span>
        <div>
          <strong>{modules.length} etapas conectadas pela aprendizagem</strong>
          <p>
            As primeiras {new Set(all.map((p) => p.moduleId)).size} etapas já têm desafios. As
            demais compõem o plano de conteúdo.
            {current && (
              <>
                {' '}
                Sua etapa atual é <strong>{modules.find((m) => m.id === current)?.title}</strong>.
              </>
            )}
          </p>
        </div>
        <span className="badge blue">{all.length} desafios</span>
      </div>
      <div className="filter-row">
        <div className="segmented">
          {['Todos', 'Fundamentos', 'Intermediário', 'Avançado'].map((v) => (
            <button key={v} className={level === v ? 'selected' : ''} onClick={() => setLevel(v)}>
              {v}
            </button>
          ))}
        </div>
        <span className="muted">Selecione uma etapa para explorar</span>
      </div>
      <div className="roadmap-grid">
        {modules
          .filter((m) => level === 'Todos' || m.level === level)
          .map((m) => (
            <ModuleCard
              module={m}
              index={modules.indexOf(m)}
              problems={all}
              progress={progress?.[m.id]}
              current={m.id === current}
              onSelect={onSelectTopic}
              key={m.id}
            />
          ))}
      </div>
    </>
  );
}

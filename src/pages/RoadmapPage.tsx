import { useState } from 'react';
import { Map } from 'lucide-react';
import { modules } from '../lib/catalog';
import type { Module, Problem } from '../lib/types';
import ModuleCard from '../components/ModuleCard';
export default function RoadmapPage({
  problems: all,
  solved,
  onSelectTopic,
}: {
  problems: Problem[];
  solved: string[];
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
              solved={solved}
              onSelect={onSelectTopic}
              key={m.id}
            />
          ))}
      </div>
    </>
  );
}

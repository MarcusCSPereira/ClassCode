import { useState } from 'react';
import { Lightbulb, Plus, Search } from 'lucide-react';
import { modules } from '../lib/catalog';
import type { ProblemSummary } from '../data/repository';
import ProblemList from '../components/ProblemList';
export default function ProblemsPage({
  problems: all,
  solved,
  teacher,
  onCreateProblem,
  onOpenProblem,
}: {
  problems: ProblemSummary[];
  solved: string[];
  teacher: boolean;
  onCreateProblem: () => void;
  onOpenProblem: (p: ProblemSummary) => void;
}) {
  const [query, setQuery] = useState('');
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">APRENDA FAZENDO</div>
          <h1>Ideias que viram código.</h1>
          <p>Desafios com objetivos claros e a ajuda certa, na hora certa.</p>
        </div>
        {teacher && (
          <button className="button primary" onClick={onCreateProblem}>
            <Plus size={17} /> Criar desafio
          </button>
        )}
      </div>
      <div className="filter-row">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Buscar desafios"
            placeholder="Buscar por título ou tópico..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className="muted">{all.length} desafios disponíveis</span>
      </div>
      <div className="list-header">
        <span>DESAFIO / TÓPICO</span>
        <span>DIFICULDADE & TEMPO</span>
      </div>
      <ProblemList
        list={all.filter((p) =>
          `${p.title} ${modules.find((m) => m.id === p.moduleId)?.title}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase()),
        )}
        solved={solved}
        onOpen={onOpenProblem}
      />
      <div className="info-strip">
        <Lightbulb size={19} />
        <p>
          Dicas progressivas são liberadas após <strong>3, 7 e 12 minutos</strong> de tentativa. O
          tempo começa quando você abre o desafio.
        </p>
      </div>
    </>
  );
}

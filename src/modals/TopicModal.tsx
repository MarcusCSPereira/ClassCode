import { Sprout } from 'lucide-react';
import { modules } from '../lib/catalog';
import type { ModuleProgress } from '../lib/progression';
import type { Module } from '../lib/types';
import type { ProblemSummary } from '../data/repository';
import Modal from '../components/Modal';
import { describeProgress, statusLabels } from '../components/moduleStatus';
import ProblemList from '../components/ProblemList';
import TopicIcon from '../components/TopicIcon';
export default function TopicModal({
  topic,
  problems: all,
  solved,
  progress,
  teacher,
  onOpenProblem,
  onCreateProblem,
  onClose,
}: {
  topic: Module;
  problems: ProblemSummary[];
  solved: string[];
  /** Undefined while the student's activity is loading. */
  progress?: ModuleProgress;
  teacher: boolean;
  onOpenProblem: (p: ProblemSummary) => void;
  onCreateProblem: () => void;
  onClose: () => void;
}) {
  const list = all.filter((p) => p.moduleId === topic.id);
  return (
    <Modal title={topic.title} onClose={onClose} wide>
      <div className="topic-modal-intro">
        <span className="topic-icon blue">
          <TopicIcon id={topic.id} size={27} />
        </span>
        <p>{topic.description}</p>
      </div>
      <p className="helper">
        Pré-requisitos sugeridos:{' '}
        {topic.prerequisites.length
          ? topic.prerequisites.map((id) => modules.find((m) => m.id === id)?.title).join(' · ')
          : 'Nenhum. Você pode começar aqui.'}
      </p>
      {progress && progress.status !== 'preparing' && (
        <p className="helper">
          Sua situação: <strong>{statusLabels[progress.status]}</strong> ·{' '}
          {describeProgress(progress)}
          {progress.autonomy !== null &&
            ` · autonomia média de ${Math.round(progress.autonomy * 100)}%`}
        </p>
      )}
      {list.length ? (
        <ProblemList list={list} solved={solved} onOpen={onOpenProblem} />
      ) : (
        <div className="empty">
          <Sprout size={30} />
          <h3>Uma nova etapa está sendo preparada.</h3>
          <p>
            O tópico faz parte do currículo planejado. Professores já podem criar desafios para ele
            na demonstração.
          </p>
          {teacher && (
            <button className="button primary" onClick={onCreateProblem}>
              Criar um desafio
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

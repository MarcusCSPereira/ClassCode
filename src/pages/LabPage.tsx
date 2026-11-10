import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Lightbulb } from 'lucide-react';
import { modules, problems } from '../lib/catalog';
import type { ProblemSummary } from '../data/repository';
import Visualizer from '../components/Visualizer';
import { getVisualLab, visualLabIdFromProblem, type VisualLabId } from '../lib/visualLabs';

interface ReflectionDraft {
  prediction: string;
  explanation: string;
}

const STORAGE_KEY = 'classcode:visual-reflections:v1';

function readDrafts(): Record<string, ReflectionDraft> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export default function LabPage({
  onOpenProblem,
  contextProblemId,
}: {
  onOpenProblem: (p: ProblemSummary) => void;
  contextProblemId?: string | null;
}) {
  const [selectedLabId, setSelectedLabId] = useState<VisualLabId>(() =>
    visualLabIdFromProblem(contextProblemId),
  );
  const [playback, setPlayback] = useState<{ step: number; total: number; message: string }>({
    step: 0,
    total: 1,
    message: '',
  });
  const [drafts, setDrafts] = useState<Record<string, ReflectionDraft>>(readDrafts);

  useEffect(() => {
    setSelectedLabId(visualLabIdFromProblem(contextProblemId));
  }, [contextProblemId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // The lab still works without persistence when storage is unavailable.
    }
  }, [drafts]);

  const selectedLab = getVisualLab(selectedLabId);
  const selectedProblem = useMemo(
    () => problems.find((problem) => problem.id === selectedLab.problemId)!,
    [selectedLab.problemId],
  );
  const selectedModule = useMemo(
    () => modules.find((module) => module.id === selectedLab.moduleId)!,
    [selectedLab.moduleId],
  );
  const draftKey = `${selectedLabId}:${playback.step}`;
  const currentDraft = drafts[draftKey] ?? { prediction: '', explanation: '' };

  function updateDraft(field: keyof ReflectionDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [draftKey]: {
        prediction: current[draftKey]?.prediction ?? '',
        explanation: current[draftKey]?.explanation ?? '',
        [field]: value,
      },
    }));
  }

  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">ALÉM DAS LINHAS DE CÓDIGO</div>
          <h1>Veja. Pause. Entenda.</h1>
          <p>Acompanhe cada comparação e descubra o que acontece entre a entrada e a resposta.</p>
        </div>
        <span className="badge blue">2 experiências interativas</span>
      </div>
      <div className="lab-layout">
        <section className="card">
          <div className="lab-association">
            <div>
              <span className="badge blue">Tópico: {selectedModule.title}</span>
              <span className="badge neutral">Desafio: {selectedProblem.title}</span>
            </div>
            <p>{selectedLab.summary}</p>
          </div>
          <Visualizer
            labId={selectedLabId}
            onLabChange={setSelectedLabId}
            onStepChange={({ frame, step, total }) =>
              setPlayback({ step, total, message: frame.message })
            }
          />
        </section>
        <aside className="card lab-notes">
          <span className="topic-icon peach">
            <Lightbulb size={24} />
          </span>
          <h2>Primeiro, faça uma previsão.</h2>
          <p>
            Esta visualização está ligada ao tópico <strong>{selectedModule.title}</strong> e ao
            desafio <strong>{selectedProblem.title}</strong>.
          </p>
          <ol>
            <li>Quais valores serão comparados?</li>
            <li>O que muda depois dessa comparação?</li>
            <li>Que parte do problema já está resolvida?</li>
          </ol>
          <div className="lab-reflection">
            <label>
              Previsão do passo {Math.min(playback.step + 2, playback.total)}
              <textarea
                value={currentDraft.prediction}
                onChange={(event) => updateDraft('prediction', event.target.value)}
                placeholder={selectedLab.predictionPrompt}
                rows={4}
              />
            </label>
            <label>
              Explicação do quadro {playback.step + 1}
              <textarea
                value={currentDraft.explanation}
                onChange={(event) => updateDraft('explanation', event.target.value)}
                placeholder={selectedLab.explanationPrompt}
                rows={4}
              />
            </label>
          </div>
          <div className="info-strip">
            <BookOpen size={19} />
            <p>
              {selectedLab.helper} O replay continua determinístico: a animação não executa o
              código do editor e sempre repete os mesmos quadros para a mesma entrada.
            </p>
          </div>
          <button
            className="button secondary full"
            onClick={() => onOpenProblem(selectedProblem)}
          >
            Praticar desafio associado <ArrowRight size={16} />
          </button>
          <p className="aside-footnote">Quadro atual: {playback.message || 'Preparando replay...'}</p>
        </aside>
      </div>
    </>
  );
}

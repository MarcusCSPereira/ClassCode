import { useState } from 'react';
import { Play, Send } from 'lucide-react';
import { verdictLabel, type JudgeGateway, type SubmissionResult } from '../lib/judge';
import type { Language } from '../lib/types';
import Modal from '../components/Modal';

/**
 * Runs the teacher's reference solution on the saved cases (example and hidden ones) before
 * the problem becomes visible to students. Publishing without validation stays possible,
 * explicitly, for builds without a judge.
 */
export default function PublishProblemModal({
  problem,
  judge,
  onPublish,
  onClose,
}: {
  problem: { id: string; title: string };
  judge: JudgeGateway | null;
  onPublish: () => Promise<void>;
  onClose: () => void;
}) {
  const [language, setLanguage] = useState<Language>('python');
  const [source, setSource] = useState('');
  const [running, setRunning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [error, setError] = useState('');
  const accepted = result?.verdict === 'accepted';
  const publish = async () => {
    setPublishing(true);
    try {
      await onPublish();
    } finally {
      setPublishing(false);
    }
  };
  return (
    <Modal title="Validar e publicar" onClose={onClose} wide>
      <div className="form-stack">
        <p>
          Questão: <strong>{problem.title}</strong>
        </p>
        {judge ? (
          <>
            <p className="helper">
              Rode sua solução de referência nos casos de teste da questão (o exemplo e os ocultos).
              Se ela não passar, revise os casos antes de publicar.
            </p>
            <label>
              Linguagem da solução
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value as Language);
                  setResult(null);
                }}
              >
                <option value="python">Python 3</option>
                <option value="java">Java</option>
                <option value="cpp">C++17</option>
              </select>
            </label>
            <label>
              Solução de referência
              <textarea
                className="mono"
                rows={8}
                value={source}
                spellCheck={false}
                onChange={(e) => {
                  setSource(e.target.value);
                  setResult(null);
                }}
              />
            </label>
            <button
              type="button"
              className="button secondary"
              disabled={running || !source.trim()}
              onClick={async () => {
                setRunning(true);
                setError('');
                try {
                  setResult(
                    await judge.submit({
                      problemId: problem.id,
                      language,
                      sourceCode: source,
                      idempotencyKey: crypto.randomUUID(),
                    }),
                  );
                } catch (failure) {
                  setResult(null);
                  setError(failure instanceof Error ? failure.message : 'Falha ao executar.');
                } finally {
                  setRunning(false);
                }
              }}
            >
              <Play size={16} /> {running ? 'Executando…' : 'Rodar nos casos de teste'}
            </button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {result && (
              <div
                className={`judge-result judge-${result.verdict}`}
                role="status"
                aria-label="Resultado da validação"
              >
                <div className="judge-result-header">
                  <strong>{verdictLabel(result.verdict)}</strong>
                  {result.passedCases !== undefined && result.totalCases !== undefined && (
                    <span className="mono">
                      Casos: {result.passedCases}/{result.totalCases}
                    </span>
                  )}
                </div>
                {!accepted && (result.compileOutput || result.stderr) && (
                  <pre className="judge-output">{result.compileOutput || result.stderr}</pre>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="helper" role="note">
            A execução de código não está disponível nesta publicação, então a solução de referência
            não pode ser rodada aqui. Revise os casos com atenção antes de publicar.
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button primary"
            disabled={!accepted || publishing}
            onClick={() => void publish()}
          >
            <Send size={16} /> Publicar para a turma
          </button>
          <button
            type="button"
            className="text-button"
            disabled={publishing}
            onClick={() => void publish()}
          >
            Publicar sem validar
          </button>
        </div>
      </div>
    </Modal>
  );
}

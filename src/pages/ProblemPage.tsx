import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  CircleHelp,
  Clock3,
  Code2,
  ExternalLink,
  Lightbulb,
  LockKeyhole,
  Play,
} from 'lucide-react';
import { modules, starters } from '../lib/catalog';
import { remainingHintSeconds } from '../lib/domain';
import { verdictLabel, type JudgeGateway, type SubmissionResult } from '../lib/judge';
import type { HintOrdinal, Language } from '../lib/types';
import type { Theme } from '../lib/useTheme';
import type { ProblemSummary, ProgressReview } from '../data/repository';
const CodeEditor = lazy(() => import('../components/CodeEditor'));
export type ProblemTab = 'statement' | 'hints';
const fmt = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
export default function ProblemPage({
  problem,
  startedAt,
  viewedHints,
  solved,
  draft,
  language,
  theme,
  storageError,
  tab,
  judge,
  onTabChange,
  onLanguageChange,
  onDraftChange,
  onRevealHint,
  onReport,
  review,
  onBack,
  onOpenLab,
}: {
  problem: ProblemSummary;
  startedAt: number | undefined;
  viewedHints: HintOrdinal[];
  solved: boolean;
  draft: string | undefined;
  language: Language;
  theme: Theme;
  storageError: boolean;
  tab: ProblemTab;
  /** Null when this build has no judge (static hosting); execution is then unavailable. */
  judge: JudgeGateway | null;
  onTabChange: (tab: ProblemTab) => void;
  onLanguageChange: (language: Language) => void;
  onDraftChange: (value: string) => void;
  /** Records the view on first call and resolves to the text; safe to repeat. */
  onRevealHint: (ordinal: HintOrdinal) => Promise<string>;
  onReport: () => void;
  /** The teacher's review of this completion, shown to the student. */
  review?: ProgressReview;
  onBack: () => void;
  onOpenLab: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // Hint text is never part of the problem: it comes from the data source after a view,
  // and hints viewed earlier are fetched again when the page opens.
  const [hintTexts, setHintTexts] = useState<Partial<Record<HintOrdinal, string>>>({});
  const requested = useRef(new Set<HintOrdinal>());
  function loadHint(ordinal: HintOrdinal) {
    if (requested.current.has(ordinal)) return;
    requested.current.add(ordinal);
    onRevealHint(ordinal).then(
      (text) => setHintTexts((t) => ({ ...t, [ordinal]: text })),
      () => requested.current.delete(ordinal),
    );
  }
  useEffect(() => viewedHints.forEach(loadHint), [viewedHints.join()]);

  async function runJudge() {
    if (!judge) return;
    setSubmitting(true);
    setSubmissionError(null);
    try {
      const result = await judge.submit({
        problemId: problem.id,
        language,
        sourceCode: draft ?? starters[language],
        idempotencyKey: crypto.randomUUID(),
      });
      setSubmissionResult(result);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : 'Falha ao executar código no Judge0.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button className="text-button back-button" onClick={onBack}>
        <ArrowLeft size={16} /> Voltar aos desafios
      </button>
      <div className="problem-title">
        <div>
          <div className="eyebrow">{modules.find((m) => m.id === problem.moduleId)?.title}</div>
          <h1>{problem.title}</h1>
          <p>{problem.objective}</p>
        </div>
        <div className="problem-title-meta">
          <span className="badge blue">{problem.difficulty}</span>
          <span>
            <Clock3 size={16} /> {fmt(Math.floor(Math.max(0, now - (startedAt ?? now)) / 1000))}
          </span>
        </div>
      </div>
      <div className="workspace-grid">
        <section className="card statement-card">
          <div className="tabs">
            <button
              className={tab === 'statement' ? 'selected' : ''}
              onClick={() => onTabChange('statement')}
            >
              <BookOpen size={17} /> Enunciado
            </button>
            <button
              className={tab === 'hints' ? 'selected' : ''}
              onClick={() => onTabChange('hints')}
            >
              <Lightbulb size={17} /> Dicas progressivas
            </button>
          </div>
          {tab === 'statement' ? (
            <div className="statement-content">
              <span className="source-label">{problem.source}</span>
              <p>{problem.statement}</p>
              <h3>Entrada</h3>
              <p>{problem.input}</p>
              <h3>Saída</h3>
              <p>{problem.output}</p>
              <h3>Restrições</h3>
              <p className="mono">{problem.constraints}</p>
              <div className="example-grid">
                <div>
                  <h3>Exemplo de entrada</h3>
                  <pre>{problem.exampleInput}</pre>
                </div>
                <div>
                  <h3>Exemplo de saída</h3>
                  <pre>{problem.exampleOutput}</pre>
                </div>
              </div>
              {problem.externalUrl && (
                <a
                  href={problem.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="button secondary full"
                >
                  Abrir problema no judge <ExternalLink size={16} />
                </a>
              )}
            </div>
          ) : (
            <div className="hints-content">
              <p className="helper">
                Dê tempo ao seu raciocínio. As dicas são liberadas desde a abertura do desafio,
                mesmo se você sair desta tela. O cronômetro local é apenas demonstrativo.
              </p>
              {problem.hints.map((hint, i) => {
                const ordinal = (i + 1) as HintOrdinal;
                const remaining = remainingHintSeconds(hint, startedAt, now);
                const revealed = viewedHints.includes(ordinal);
                return (
                  <div className="hint-card" key={i}>
                    <div>
                      <span className="hint-number">{i + 1}</span>
                      <strong>
                        {['Uma direção', 'Uma estratégia', 'Mais perto da solução'][i]}
                      </strong>
                      <span className="mono">{remaining > 0 ? fmt(remaining) : 'Disponível'}</span>
                    </div>
                    {revealed ? (
                      <p>{hintTexts[ordinal] ?? 'Carregando dica…'}</p>
                    ) : (
                      <button
                        className="button secondary full"
                        disabled={remaining > 0}
                        onClick={() => loadHint(ordinal)}
                      >
                        {remaining ? <LockKeyhole size={15} /> : <Lightbulb size={15} />}
                        {remaining ? `Libera após ${hint.afterSeconds / 60} min` : 'Revelar dica'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="card code-panel">
          <div className="code-toolbar">
            <span>
              <Code2 size={17} /> Seu rascunho
            </span>
            <label className="sr-only" htmlFor="language">
              Linguagem
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
            >
              <option value="python">Python 3</option>
              <option value="java">Java</option>
              <option value="cpp">C++17</option>
            </select>
          </div>
          <Suspense
            fallback={
              <div className="editor-loading" role="status">
                Carregando editor…
              </div>
            }
          >
            <CodeEditor
              key={`${problem.id}:${language}`}
              value={draft ?? starters[language]}
              language={language}
              theme={theme}
              onChange={onDraftChange}
            />
          </Suspense>
          <div className="editor-footer">
            <span>
              <span className="tiny-dot" /> Rascunho{' '}
              {storageError ? 'em memória' : 'salvo localmente'}
            </span>
            <span>UTF-8</span>
          </div>
          <div className="submission-area">
            <div className="submission-info">
              <CircleHelp size={18} />
              <p>
                {judge
                  ? 'Execute sua solução nos casos de teste via Judge0 ou '
                  : 'A execução de código não está disponível nesta publicação. '}
                {problem.externalUrl
                  ? 'Envie no judge de origem e registre seu progresso aqui.'
                  : 'Valide com seu professor e registre seu progresso.'}
              </p>
            </div>
            {solved && review && (
              <div
                className={`teacher-feedback ${review.status === 'changes_requested' ? 'needs-change' : ''}`}
                role="note"
                aria-label="Retorno do professor"
              >
                <strong>
                  {review.status === 'reviewed'
                    ? 'Seu professor revisou esta conclusão.'
                    : 'Seu professor pediu um ajuste.'}
                </strong>
                {review.comment && <p>{review.comment}</p>}
                {review.status === 'changes_requested' && (
                  <p className="helper">
                    Ajuste sua solução e atualize a evidência em “Conclusão declarada · ver
                    registro”.
                  </p>
                )}
              </div>
            )}
            {submissionError && (
              <div className="judge-result judge-error" role="alert">
                <strong>Erro na execução:</strong> {submissionError}
              </div>
            )}
            {submissionResult && (
              <div
                className={`judge-result judge-${submissionResult.verdict}`}
                role="status"
                aria-label="Resultado do Judge0"
              >
                <div className="judge-result-header">
                  <strong>{verdictLabel(submissionResult.verdict)}</strong>
                  <span className="mono">
                    {submissionResult.passedCases !== undefined &&
                      submissionResult.totalCases !== undefined &&
                      `Casos: ${submissionResult.passedCases}/${submissionResult.totalCases}`}
                    {submissionResult.timeMs !== undefined && ` · ${submissionResult.timeMs} ms`}
                    {submissionResult.memoryKb !== undefined &&
                      ` · ${submissionResult.memoryKb} KB`}
                  </span>
                </div>
                {(submissionResult.compileOutput ||
                  submissionResult.stderr ||
                  submissionResult.stdout) && (
                  <pre className="judge-output">
                    {submissionResult.compileOutput ||
                      submissionResult.stderr ||
                      submissionResult.stdout}
                  </pre>
                )}
              </div>
            )}
            <div className="submission-actions">
              <button
                type="button"
                className="button primary full"
                disabled={submitting || !judge}
                title={judge ? undefined : 'Execução indisponível nesta publicação'}
                onClick={() => void runJudge()}
              >
                <Play size={16} />
                {submitting ? 'Executando no Judge0…' : 'Executar código'}
              </button>
              <button className="button secondary full" onClick={onReport}>
                {solved ? <Check size={17} /> : <CheckCheck size={17} />}
                {solved ? 'Conclusão declarada · ver registro' : 'Registrar conclusão'}
              </button>
            </div>
            <button className="text-button" onClick={onOpenLab}>
              Abrir laboratório visual <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

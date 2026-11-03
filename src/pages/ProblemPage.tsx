import { lazy, Suspense, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { modules, starters } from '../lib/catalog';
import { remainingHintSeconds } from '../lib/domain';
import type { Language, Problem } from '../lib/types';
import type { Theme } from '../lib/useTheme';
const CodeEditor = lazy(() => import('../components/CodeEditor'));
export type ProblemTab = 'statement' | 'hints';
const fmt = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
export default function ProblemPage({
  problem,
  startedAt,
  revealedHints,
  solved,
  draft,
  language,
  theme,
  storageError,
  tab,
  onTabChange,
  onLanguageChange,
  onDraftChange,
  onRevealHint,
  onReport,
  onBack,
  onOpenLab,
}: {
  problem: Problem;
  startedAt: number | undefined;
  revealedHints: number[];
  solved: boolean;
  draft: string | undefined;
  language: Language;
  theme: Theme;
  storageError: boolean;
  tab: ProblemTab;
  onTabChange: (tab: ProblemTab) => void;
  onLanguageChange: (language: Language) => void;
  onDraftChange: (value: string) => void;
  onRevealHint: (index: number) => void;
  onReport: () => void;
  onBack: () => void;
  onOpenLab: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
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
                const remaining = remainingHintSeconds(hint, startedAt, now);
                const revealed = revealedHints.includes(i);
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
                      <p>{hint.text}</p>
                    ) : (
                      <button
                        className="button secondary full"
                        disabled={remaining > 0}
                        onClick={() => onRevealHint(i)}
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
                O editor ainda não executa código.{' '}
                {problem.externalUrl
                  ? 'Envie sua solução no judge e registre seu progresso aqui.'
                  : 'Valide sua solução com seu professor e registre seu progresso.'}
              </p>
            </div>
            <button
              className={`button ${solved ? 'secondary' : 'primary'} full`}
              onClick={onReport}
            >
              {solved ? <Check size={17} /> : <CheckCheck size={17} />}
              {solved ? 'Conclusão declarada · ver registro' : 'Registrar conclusão'}
            </button>
            <button className="text-button" onClick={onOpenLab}>
              Abrir laboratório visual <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

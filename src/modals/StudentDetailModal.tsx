import { useState } from 'react';
import { Check, MessageSquareWarning, RotateCcw } from 'lucide-react';
import { describeCell, type MapCell, type StudentMetrics } from '../lib/metrics';
import {
  describeError,
  type ActivityRow,
  type ProblemSummary,
  type ReviewStatus,
} from '../data/repository';
import Modal from '../components/Modal';

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const when = (iso: string) => dateTime.format(new Date(iso));

/**
 * One student's work in a class: each opened problem with the self-reported evidence and the
 * teacher's review. Asking for changes requires a comment, which the student sees.
 */
export default function StudentDetailModal({
  student,
  problems,
  rows,
  cells,
  readOnly,
  onReview,
  onClose,
}: {
  student: StudentMetrics;
  /** Published problems of the class, in publication order. */
  problems: ProblemSummary[];
  /** This student's activity in the class. */
  rows: ActivityRow[];
  cells: Record<string, MapCell>;
  /** True for the fictitious class: its data cannot be reviewed. */
  readOnly: boolean;
  onReview: (problemId: string, status: ReviewStatus | 'clear', comment?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const rowOf = (problemId: string) => rows.find((r) => r.problemId === problemId);
  const opened = problems.filter((p) => rowOf(p.id));
  const notOpened = problems.filter((p) => !rowOf(p.id));
  const review = async (problemId: string, status: ReviewStatus | 'clear', text?: string) => {
    setBusy(problemId);
    setError('');
    try {
      await onReview(problemId, status, text);
      setAsking(null);
      setComment('');
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Modal title={student.displayName} onClose={onClose} wide>
      <div className="form-stack student-detail">
        <p className="helper">
          {student.opened} {student.opened === 1 ? 'questão aberta' : 'questões abertas'} ·{' '}
          {student.completed}{' '}
          {student.completed === 1 ? 'conclusão autodeclarada' : 'conclusões autodeclaradas'} ·{' '}
          {student.reviewed} {student.reviewed === 1 ? 'revisada' : 'revisadas'} ·{' '}
          {student.changesRequested} com ajuste pedido
        </p>
        {readOnly && (
          <p className="helper warning-note" role="note">
            Dados fictícios: a revisão fica desativada nesta turma.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {opened.length === 0 && <p>Este aluno ainda não abriu nenhuma questão da turma.</p>}
        {opened.map((problem) => {
          const row = rowOf(problem.id)!;
          const cell = cells[problem.id];
          return (
            <section
              className="review-item"
              key={problem.id}
              aria-labelledby={`review-${problem.id}`}
            >
              <div className="review-item-heading">
                <strong id={`review-${problem.id}`}>{problem.title}</strong>
                <span className="muted-cell">{cell ? describeCell(cell) : 'Em andamento'}</span>
              </div>
              {row.reportedAt ? (
                <>
                  <p className="helper">Evidência registrada em {when(row.reportedAt)}:</p>
                  <blockquote className="evidence-text">
                    {row.evidence?.trim() || 'Sem texto.'}
                  </blockquote>
                  {row.review && (
                    <p className="review-state">
                      {row.review.status === 'reviewed' ? (
                        <Check size={15} />
                      ) : (
                        <MessageSquareWarning size={15} />
                      )}
                      <span>
                        {row.review.status === 'reviewed' ? 'Revisada' : 'Ajuste pedido'} em{' '}
                        {when(row.review.reviewedAt)}
                        {row.review.comment && `: “${row.review.comment}”`}
                      </span>
                    </p>
                  )}
                  {!readOnly && (
                    <div className="form-actions">
                      {row.review?.status !== 'reviewed' && (
                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy === problem.id}
                          aria-label={`Marcar ${problem.title} como revisada`}
                          onClick={() => void review(problem.id, 'reviewed')}
                        >
                          <Check size={16} /> Marcar como revisada
                        </button>
                      )}
                      {asking !== problem.id && (
                        <button
                          type="button"
                          className="text-button"
                          aria-label={`Pedir ajuste em ${problem.title}`}
                          onClick={() => {
                            setAsking(problem.id);
                            setComment(row.review?.comment ?? '');
                          }}
                        >
                          <MessageSquareWarning size={15} /> Pedir ajuste
                        </button>
                      )}
                      {row.review && (
                        <button
                          type="button"
                          className="text-button"
                          disabled={busy === problem.id}
                          aria-label={`Desfazer revisão de ${problem.title}`}
                          onClick={() => void review(problem.id, 'clear')}
                        >
                          <RotateCcw size={15} /> Desfazer revisão
                        </button>
                      )}
                    </div>
                  )}
                  {asking === problem.id && (
                    <form
                      className="form-stack"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void review(problem.id, 'changes_requested', comment);
                      }}
                    >
                      <label>
                        O que o aluno deve ajustar em {problem.title}
                        <textarea
                          rows={3}
                          maxLength={1000}
                          required
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Ex.: Explique por que sua solução cobre o caso n = 0."
                        />
                      </label>
                      <div className="form-actions">
                        <button
                          type="submit"
                          className="button primary"
                          disabled={busy === problem.id}
                        >
                          Enviar pedido de ajuste
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setAsking(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <p className="helper">Ainda não registrou a conclusão.</p>
              )}
            </section>
          );
        })}
        {notOpened.length > 0 && (
          <p className="helper">Ainda não abriu: {notOpened.map((p) => p.title).join(' · ')}.</p>
        )}
      </div>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCheck, CircleAlert, Download, RotateCcw, Users } from 'lucide-react';
import { modules } from '../lib/catalog';
import { belongsToClassroom, downloadFile, slug } from '../lib/domain';
import {
  classroomMetrics,
  describeCell,
  studentsCsv,
  type MapCell,
  type SignalKind,
} from '../lib/metrics';
import type { Classroom } from '../lib/types';
import { describeError, type ClassroomActivity, type ProblemSummary } from '../data/repository';

type Load =
  | { status: 'loading' }
  | { status: 'error'; classroomId: string; message: string }
  | { status: 'ready'; classroomId: string; data: ClassroomActivity };
const signalLabels: Record<SignalKind, string> = {
  not_started: 'Ainda não começou',
  inactive: 'Inativo',
  stuck: 'Travado',
  hint_dependent: 'Muito dependente de dicas',
};
const percent = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);
const decimal = (n: number | null) =>
  n === null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
function duration(ms: number | null) {
  if (ms === null) return '—';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h` : `${Math.round(hours / 24)} dias`;
}
const moduleTitle = (id: string | null) =>
  id === null ? 'Sem etapa em aberto' : (modules.find((m) => m.id === id)?.title ?? id);
function cellTone(cell: MapCell) {
  if (cell.status === 'not_opened') return 'muted-cell';
  if (cell.status === 'in_progress') return 'badge amber';
  return cell.hints ? 'badge neutral' : 'badge blue';
}

/** Teacher follow-up of one class (docs/ENTREGA-2.md, section 6). */
export default function ClassMetrics({
  classes,
  problems,
  loadActivity,
}: {
  classes: Classroom[];
  /** Every problem the teacher sees; filtered here to the selected class. */
  problems: ProblemSummary[];
  /** Changes identity when the underlying activity changes, which triggers a reload. */
  loadActivity: (classroomId: string) => Promise<ClassroomActivity>;
}) {
  const [selectedId, setSelectedId] = useState(classes[0]?.id ?? '');
  const classroom = classes.find((c) => c.id === selectedId) ?? classes[0];
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!classroom) return;
    let cancelled = false;
    loadActivity(classroom.id).then(
      (data) => !cancelled && setLoad({ status: 'ready', classroomId: classroom.id, data }),
      (error: unknown) =>
        !cancelled &&
        setLoad({ status: 'error', classroomId: classroom.id, message: describeError(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, [classroom?.id, loadActivity, retry]);
  const classProblems = useMemo(
    () => (classroom ? problems.filter((p) => belongsToClassroom(p, classroom.id)) : []),
    [problems, classroom?.id],
  );
  // Keep showing the previous result while the same class reloads; switch to loading otherwise.
  const current = load.status !== 'loading' && load.classroomId === classroom?.id ? load : null;
  const report = useMemo(
    () =>
      current?.status === 'ready'
        ? classroomMetrics(modules, classProblems, current.data, Date.now())
        : null,
    [current, classProblems],
  );
  const title = (problemId: string) => classProblems.find((p) => p.id === problemId)?.title;

  return (
    <section className="class-metrics" aria-labelledby="class-metrics-title">
      <div className="section-heading">
        <div>
          <h2 id="class-metrics-title">Acompanhamento da turma</h2>
          <p>
            Conclusões são autodeclaradas. As métricas apoiam o acompanhamento pedagógico e não são
            nota.
          </p>
        </div>
        {classroom && (
          <div className="metrics-toolbar">
            <label>
              Turma acompanhada
              <select value={classroom.id} onChange={(e) => setSelectedId(e.target.value)}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button secondary"
              disabled={!report?.students.length}
              onClick={() =>
                report &&
                downloadFile(
                  studentsCsv(report.students, modules),
                  `classcode-${slug(classroom.name)}-acompanhamento.csv`,
                  'text/csv;charset=utf-8',
                )
              }
            >
              <Download size={16} /> Exportar CSV
            </button>
          </div>
        )}
      </div>

      {!classroom ? (
        <div className="empty card">
          <Users size={30} />
          <h3>Nenhuma turma ainda.</h3>
          <p>Crie uma turma para acompanhar seus alunos.</p>
        </div>
      ) : current?.status === 'error' ? (
        <div className="empty card" role="alert">
          <CircleAlert size={30} />
          <h3>Não foi possível carregar o acompanhamento.</h3>
          <p>{current.message}</p>
          <button
            className="button secondary"
            onClick={() => {
              setLoad({ status: 'loading' });
              setRetry((n) => n + 1);
            }}
          >
            <RotateCcw size={16} /> Tentar novamente
          </button>
        </div>
      ) : !report ? (
        <p className="metrics-note" role="status">
          Carregando o acompanhamento da turma…
        </p>
      ) : report.enrolled === 0 ? (
        <div className="empty card">
          <Users size={30} />
          <h3>Nenhum aluno matriculado ainda.</h3>
          <p>
            Compartilhe o código <strong>{classroom.code}</strong> para os alunos entrarem na turma.
          </p>
        </div>
      ) : (
        <>
          <div className="metric-summary">
            <div className="card">
              <Users size={18} />
              <strong>{report.enrolled}</strong>
              <span>Alunos matriculados</span>
            </div>
            <div className="card">
              <Activity size={18} />
              <strong>{report.activeLastWeek}</strong>
              <span>Ativos nos últimos 7 dias</span>
            </div>
            <div className="card">
              <CheckCheck size={18} />
              <strong>{report.students.reduce((sum, s) => sum + s.completed, 0)}</strong>
              <span>Conclusões autodeclaradas</span>
            </div>
            <div className="card">
              <CircleAlert size={18} />
              <strong>{report.students.filter((s) => s.signals.length).length}</strong>
              <span>Alunos com sinais de atenção</span>
            </div>
          </div>

          <section className="card metrics-block" aria-labelledby="students-title">
            <h3 id="students-title">Alunos</h3>
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Tabela de alunos">
              <table className="metrics-table">
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    <th scope="col">Abertos</th>
                    <th scope="col">Conclusões</th>
                    <th scope="col">Dicas por conclusão</th>
                    <th scope="col">Autonomia</th>
                    <th scope="col">Tempo até registrar</th>
                    <th scope="col">Última atividade</th>
                    <th scope="col">Etapa atual</th>
                    <th scope="col">Sinais de atenção</th>
                  </tr>
                </thead>
                <tbody>
                  {report.students.map((s) => (
                    <tr key={s.studentId}>
                      <th scope="row">{s.displayName}</th>
                      <td className="num">{s.opened}</td>
                      <td className="num">{s.completed}</td>
                      <td className="num">{decimal(s.hintsPerCompletion)}</td>
                      <td className="num">{percent(s.noHintRate)}</td>
                      <td className="num">{duration(s.medianTimeToReportMs)}</td>
                      <td>{s.lastActivity ? dateTime.format(new Date(s.lastActivity)) : '—'}</td>
                      <td>{moduleTitle(s.currentModule)}</td>
                      <td>
                        {s.signals.length ? (
                          <ul className="signal-list">
                            {s.signals.map((signal) => (
                              <li key={signal.kind}>
                                <strong>{signalLabels[signal.kind]}.</strong> {signal.reason}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="muted-cell">Nenhum</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="metrics-note">
              Autonomia é a parte das conclusões feitas sem abrir dicas. O tempo até registrar
              inclui pausas.
            </p>
          </section>

          <div className="metrics-layout">
            <section className="card metrics-block" aria-labelledby="help-title">
              <h3 id="help-title">Questões que mais exigiram ajuda</h3>
              {report.mostHelpNeeded.length ? (
                <ol className="help-ranking">
                  {report.mostHelpNeeded.slice(0, 5).map((p) => (
                    <li key={p.problemId}>
                      <strong>{title(p.problemId)}</strong>
                      <small>
                        Dicas abertas por quem abriu a questão: 1ª {percent(p.hintFunnel![0])} · 2ª{' '}
                        {percent(p.hintFunnel![1])} · 3ª {percent(p.hintFunnel![2])}
                      </small>
                      <small>
                        {p.completed} de {p.opened} concluíram ({percent(p.completionRate)}) · tempo
                        mediano {duration(p.medianTimeToReportMs)}
                      </small>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="metrics-note">Nenhuma questão foi aberta ainda.</p>
              )}
            </section>
            <section className="card metrics-block" aria-labelledby="stages-title">
              <h3 id="stages-title">Alunos por etapa</h3>
              <ul className="stage-list">
                {report.moduleDistribution.map(({ moduleId, students }) => (
                  <li key={moduleId ?? 'none'}>
                    <strong>{moduleTitle(moduleId)}</strong>
                    <small>
                      {students} {students === 1 ? 'aluno' : 'alunos'}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="card metrics-block" aria-labelledby="map-title">
            <h3 id="map-title">Mapa aluno × questão</h3>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Mapa aluno × questão"
            >
              <table className="metrics-table map-table">
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    {classProblems.map((p) => (
                      <th scope="col" key={p.id}>
                        {p.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.students.map((s) => (
                    <tr key={s.studentId}>
                      <th scope="row">{s.displayName}</th>
                      {classProblems.map((p) => {
                        const cell = report.map[s.studentId][p.id];
                        return (
                          <td key={p.id}>
                            <span className={cellTone(cell)}>{describeCell(cell)}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

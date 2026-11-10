import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowRight,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  FolderKanban,
  GraduationCap,
  Map,
  Menu,
  Moon,
  Settings2,
  Sprout,
  Sun,
  Users,
  Waypoints,
  X,
} from 'lucide-react';
import { dataConfigurationError, dataMode, demoStore, repository, supabase } from './data';
import { FICTITIOUS_CLASS } from './data/fictitiousClass';
import {
  describeError,
  RepositoryError,
  type ProblemSummary,
  type UserProfile,
} from './data/repository';
import type { ActivityRow } from './data/repository';
import { modules, problems } from './lib/catalog';
import { downloadJson, visibleProblems } from './lib/domain';
import { currentModule, moduleStatuses, recommendNext } from './lib/progression';
import { pageNames, problemIdFromHash, readPage, type Page } from './lib/navigation';
import type { Language, Module, Role } from './lib/types';
import { useTheme } from './lib/useTheme';
import Modal from './components/Modal';
import AuthPanel from './components/AuthPanel';
import ProblemEditor from './components/ProblemEditor';
import ClassesPage from './pages/ClassesPage';
import LabPage from './pages/LabPage';
import OverviewPage from './pages/OverviewPage';
import ProblemPage, { type ProblemTab } from './pages/ProblemPage';
import ProblemsPage from './pages/ProblemsPage';
import RoadmapPage from './pages/RoadmapPage';
import TeacherPage from './pages/TeacherPage';
import CreateClassModal from './modals/CreateClassModal';
import HelpModal from './modals/HelpModal';
import JoinClassModal from './modals/JoinClassModal';
import ProfileModal from './modals/ProfileModal';
import ReportModal from './modals/ReportModal';
import TopicModal from './modals/TopicModal';

type ModalName = 'join' | 'profile' | 'create-class' | 'create-problem' | 'help' | 'report';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const state = useSyncExternalStore(demoStore.subscribe, demoStore.getSnapshot);
  const storageError = demoStore.storageError();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(dataMode === 'remote');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [remoteClasses, setRemoteClasses] = useState<
    Awaited<ReturnType<typeof repository.listClassrooms>>
  >([]);
  const [remoteProblems, setRemoteProblems] = useState<ProblemSummary[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(dataMode === 'remote');
  const [activity, setActivity] = useState<ActivityRow[] | null>(null);
  const [page, setPage] = useState<Page>(readPage);
  const [activeProblem, setActiveProblem] = useState<ProblemSummary>(
    () =>
      visibleProblems(problems, demoStore.getSnapshot()).find(
        (p) => p.id === problemIdFromHash(),
      ) ?? problems[0],
  );
  const [modal, setModal] = useState<ModalName | null>(null);
  const [topic, setTopic] = useState<Module | null>(null);
  const [language, setLanguage] = useState<Language>('python');
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [problemTab, setProblemTab] = useState<ProblemTab>('statement');
  const [visualContextProblemId, setVisualContextProblemId] = useState<string | null>(null);
  const fail = (error: unknown) => setNotice(describeError(error));
  const refreshRemote = useCallback(async () => {
    if (dataMode !== 'remote' || !session) return;
    setRemoteLoading(true);
    try {
      const [nextProfile, nextClasses, nextProblems, nextActivity] = await Promise.all([
        repository.getProfile(),
        repository.listClassrooms(),
        repository.listProblems(),
        repository.myActivity(),
      ]);
      setProfile(nextProfile);
      setRemoteClasses(nextClasses);
      setRemoteProblems(nextProblems);
      setActivity(nextActivity);
    } catch (error) {
      fail(error);
    } finally {
      setRemoteLoading(false);
    }
  }, [session]);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (!nextSession) {
        setProfile(null);
        setRemoteClasses([]);
        setRemoteProblems([]);
        setActivity(null);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    void refreshRemote();
  }, [refreshRemote]);
  const teacher = dataMode === 'remote' ? profile?.role === 'teacher' : state.role === 'teacher';
  const name = dataMode === 'remote' ? (profile?.displayName ?? 'Estudante') : state.name;
  const all = useMemo(
    () => (dataMode === 'remote' ? remoteProblems : visibleProblems(problems, state)),
    [remoteProblems, state],
  );
  const myClasses =
    dataMode === 'remote'
      ? remoteClasses
      : state.classes.filter((c) => teacher || state.joinedClassIds.includes(c.id));
  const activityByProblem = useMemo(
    () => Object.fromEntries((activity ?? []).map((row) => [row.problemId, row])),
    [activity],
  );
  useEffect(() => {
    const handle = () => {
      const current = readPage();
      setPage(current);
      if (current === 'problem') {
        const p = all.find((problem) => problem.id === problemIdFromHash());
        if (p) {
          setActiveProblem(p);
          repository.startAttempt(p.id).then(() => {
            if (dataMode === 'remote') void refreshRemote();
          }, fail);
        } else {
          setPage('problems');
          location.hash = 'problems';
        }
      }
    };
    handle();
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, [all]);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  // The trail reacts to attempts, hint views and reports; drafts and names do not affect it.
  useEffect(() => {
    if (dataMode === 'remote') return;
    let cancelled = false;
    repository.myActivity().then((rows) => {
      if (!cancelled) setActivity(rows);
    }, fail);
    return () => {
      cancelled = true;
    };
  }, [state.startedAt, state.hintViews, state.reports]);
  const solved =
    dataMode === 'remote'
      ? (activity ?? []).filter((row) => row.reportedAt).map((row) => row.problemId)
      : Object.keys(state.reports);
  const solvedCount = all.filter((p) => solved.includes(p.id)).length;
  const progress = moduleStatuses(modules, all, activity ?? []);
  const current = activity && currentModule(modules, progress);
  const recommendation = activity && recommendNext(modules, all, activity);
  const recommended = recommendation && all.find((p) => p.id === recommendation.problemId);
  // A new function when the activity changes makes the teacher panel reload.
  const loadClassroomActivity = useCallback(
    (classroomId: string) => repository.classroomActivity(classroomId),
    [activity, state.startedAt, state.hintViews, state.reports, state.name, state.joinedClassIds],
  );
  function navigate(p: Page, problemId?: string) {
    const hash = p === 'problem' ? `problem/${problemId ?? activeProblem.id}` : p;
    if (location.hash.slice(1) !== hash) location.hash = hash;
    setPage(p);
    setMobileNav(false);
    window.scrollTo({ top: 0 });
  }
  function openProblem(p: ProblemSummary) {
    setTopic(null);
    setVisualContextProblemId(p.id);
    setActiveProblem(p);
    setProblemTab('statement');
    repository.startAttempt(p.id).then(() => {
      if (dataMode === 'remote') void refreshRemote();
    }, fail);
    navigate('problem', p.id);
  }
  function announce(message: string) {
    setNotice(message);
  }
  /** Opens the recommended problem; with the trail finished, shows the whole trail. */
  function practice() {
    if (recommended) openProblem(recommended);
    else navigate('roadmap');
  }
  const draftKey = `${activeProblem.id}:${language}`;

  const navItems: { page: Page; label: string; Icon: typeof Map; count?: number }[] = [
    { page: 'overview', label: 'Visão geral', Icon: FolderKanban },
    { page: 'roadmap', label: 'Minha trilha', Icon: Map },
    { page: 'problems', label: 'Desafios', Icon: Code2, count: all.length },
    { page: 'visuals', label: 'Laboratório visual', Icon: Waypoints },
    { page: 'classes', label: 'Minhas turmas', Icon: Users },
  ];

  if (dataConfigurationError)
    return (
      <main className="auth-shell">
        <section className="card auth-card" role="alert">
          <h1>Configuração incompleta</h1>
          <p>{dataConfigurationError}</p>
          <p className="helper">Revise o arquivo de ambiente e reinicie o servidor.</p>
        </section>
      </main>
    );

  if (dataMode === 'remote' && supabase && (authLoading || (session && remoteLoading && !profile)))
    return (
      <main className="auth-shell">
        <p className="card">Carregando seu espaço…</p>
      </main>
    );
  if (dataMode === 'remote' && supabase && !session) return <AuthPanel client={supabase} />;

  return (
    <div className="app-shell">
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Fechar navegação"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <a className="brand" href="#overview" onClick={() => navigate('overview')}>
          <span className="brand-mark">
            <Code2 size={25} />
          </span>
          <span>
            class<span className="brand-light">code</span>
            <small>UM PASSO. UM ALGORITMO.</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="workspace-icon">
            <GraduationCap size={19} />
          </span>
          <span>
            Espaço de aprendizagem<small>Semestre 2026.2</small>
          </span>
        </div>
        <div className="nav-label">APRENDER</div>
        <nav>
          {navItems.map(({ page: p, label, Icon, count }) => (
            <button
              key={p}
              className={`nav-link ${page === p ? 'active' : ''}`}
              onClick={() => navigate(p)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {count !== undefined && <small>{count}</small>}
              {p === 'visuals' && <i />}
            </button>
          ))}
        </nav>
        {teacher && (
          <>
            <div className="nav-label teacher-label">ENSINAR</div>
            <button
              className={`nav-link ${page === 'teacher' ? 'active' : ''}`}
              onClick={() => navigate('teacher')}
            >
              <ChartNoAxesCombined size={19} />
              <span>Painel do professor</span>
            </button>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sprout size={25} />
            <h3>Consistência é o caminho.</h3>
            <p>Um desafio por vez. Uma ideia nova todos os dias.</p>
            <button onClick={practice} disabled={!activity}>
              Vamos praticar <ArrowRight size={15} />
            </button>
          </div>
          <button className="help-link" onClick={() => setModal('help')}>
            <CircleHelp size={18} /> Como funciona
          </button>
          <button className="profile" onClick={() => setModal('profile')}>
            <span className="avatar">{name.slice(0, 2).toUpperCase()}</span>
            <span>
              {name}
              <small>
                {teacher ? 'Professor' : 'Estudante'} ·{' '}
                {dataMode === 'remote' ? 'conectado' : 'demo local'}
              </small>
            </span>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Abrir navegação"
            >
              <Menu size={22} />
            </button>
            <span>Meu espaço</span>
            <ChevronRight size={14} />
            <strong>{pageNames[page]}</strong>
          </div>
          <div className="topbar-right">
            <button
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              aria-pressed={theme === 'dark'}
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <span className="demo-pill">
              <span /> {dataMode === 'remote' ? 'Supabase conectado' : 'Demonstração local'}
            </span>
            <button
              className="topbar-avatar"
              aria-label={dataMode === 'remote' ? 'Abrir conta' : 'Alterar perfil da demonstração'}
              onClick={() => setModal('profile')}
            >
              {name.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <main id="main-content">
          {storageError && (
            <p role="alert" className="storage-warning">
              O navegador bloqueou o armazenamento. Suas alterações serão mantidas apenas enquanto
              esta página estiver aberta.
            </p>
          )}
          {page === 'overview' && (
            <OverviewPage
              name={name}
              teacher={teacher}
              problems={all}
              solved={solved}
              loading={!activity}
              progress={progress}
              current={current ?? null}
              recommendation={recommendation ?? null}
              onPractice={practice}
              onOpenProblem={openProblem}
              onNavigate={navigate}
              onPrimaryAction={() => setModal(teacher ? 'create-class' : 'join')}
              onSelectTopic={setTopic}
            />
          )}
          {page === 'roadmap' && (
            <RoadmapPage
              problems={all}
              progress={activity ? progress : null}
              current={current ?? null}
              onSelectTopic={setTopic}
            />
          )}
          {page === 'problems' && (
            <ProblemsPage
              problems={all}
              solved={solved}
              teacher={teacher}
              onCreateProblem={() => setModal('create-problem')}
              onOpenProblem={openProblem}
            />
          )}
          {page === 'visuals' && (
            <LabPage onOpenProblem={openProblem} contextProblemId={visualContextProblemId} />
          )}
          {page === 'classes' && (
            <ClassesPage
              teacher={teacher}
              classes={myClasses}
              problems={all}
              onPrimaryAction={() => setModal(teacher ? 'create-class' : 'join')}
              onOpenProblem={openProblem}
              onAnnounce={announce}
              remote={dataMode === 'remote'}
            />
          )}
          {page === 'teacher' && (
            <TeacherPage
              teacher={teacher}
              classes={dataMode === 'remote' ? remoteClasses : [...state.classes, FICTITIOUS_CLASS]}
              problems={all}
              customProblems={dataMode === 'remote' ? all : state.customProblems}
              solvedCount={solvedCount}
              solved={solved}
              loadActivity={loadClassroomActivity}
              onCreateClass={() => setModal('create-class')}
              onCreateProblem={() => setModal('create-problem')}
              onExport={() =>
                downloadJson(
                  {
                    classes: myClasses,
                    problems: dataMode === 'remote' ? all : state.customProblems,
                  },
                  'classcode-conteudo.json',
                )
              }
              onOpenProblem={openProblem}
              onChangeProfile={() => setModal('profile')}
              remote={dataMode === 'remote'}
            />
          )}
          {page === 'problem' && (
            <ProblemPage
              key={activeProblem.id}
              problem={activeProblem}
              startedAt={
                dataMode === 'remote'
                  ? Date.parse(activityByProblem[activeProblem.id]?.startedAt ?? '') || undefined
                  : state.startedAt[activeProblem.id]
              }
              viewedHints={
                dataMode === 'remote'
                  ? (activityByProblem[activeProblem.id]?.hintViews ?? []).map((v) => v.ordinal)
                  : (state.hintViews[activeProblem.id] ?? []).map((v) => v.ordinal)
              }
              solved={solved.includes(activeProblem.id)}
              draft={state.drafts[draftKey]}
              language={language}
              theme={theme}
              storageError={storageError}
              tab={problemTab}
              onTabChange={setProblemTab}
              onLanguageChange={setLanguage}
              onDraftChange={(value) =>
                // Drafts stay local in every mode; remote drafts are outside the MVP.
                demoStore.update((s) => ({ ...s, drafts: { ...s.drafts, [draftKey]: value } }))
              }
              onRevealHint={(ordinal) =>
                repository.revealHint(activeProblem.id, ordinal).catch((error: unknown) => {
                  fail(error);
                  throw error;
                })
              }
              onReport={() => setModal('report')}
              onBack={() => navigate('problems')}
              onOpenLab={() => {
                setVisualContextProblemId(activeProblem.id);
                navigate('visuals');
              }}
            />
          )}
          <footer className="page-footer">
            <span>
              classcode <span>· Aprender é um processo.</span>
            </span>
            <span>Feito para quem ensina e para quem descobre.</span>
          </footer>
        </main>
      </div>

      {topic && (
        <TopicModal
          topic={topic}
          problems={all}
          solved={solved}
          progress={activity ? progress[topic.id] : undefined}
          teacher={teacher}
          onOpenProblem={openProblem}
          onCreateProblem={() => {
            setTopic(null);
            setModal('create-problem');
          }}
          onClose={() => setTopic(null)}
        />
      )}
      {modal === 'profile' && dataMode === 'demo' && (
        <ProfileModal
          name={state.name}
          role={state.role}
          onSubmit={(name: string, role: Role) => {
            // The perspective switch exists only in the demo; CC-02 replaces it with login.
            demoStore.update((s) => ({ ...s, name, role }));
            setModal(null);
            navigate(role === 'teacher' ? 'teacher' : 'overview');
            announce('Perfil da demonstração alterado.');
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'profile' && dataMode === 'remote' && supabase && (
        <Modal title="Sua conta" onClose={() => setModal(null)}>
          <div className="form-stack">
            <p>
              <strong>{name}</strong>
            </p>
            <p className="helper">
              Papel: {teacher ? 'Professor' : 'Estudante'}. Papéis são concedidos por um operador
              autorizado e não podem ser alterados aqui.
            </p>
            <button className="button secondary" onClick={() => void supabase?.auth.signOut()}>
              Sair da conta
            </button>
          </div>
        </Modal>
      )}
      {modal === 'join' && (
        <JoinClassModal
          remote={dataMode === 'remote'}
          onJoin={async (code) => {
            try {
              const id = await repository.joinClassroom(code);
              const joined = (await repository.listClassrooms()).find((c) => c.id === id);
              if (dataMode === 'remote') await refreshRemote();
              setModal(null);
              navigate('classes');
              announce(`Você está na turma ${joined?.name}.`);
              return null;
            } catch (error) {
              if (error instanceof RepositoryError && error.code === 'invalid_invite')
                return dataMode === 'remote'
                  ? 'Código de turma inválido ou expirado.'
                  : 'Código não encontrado neste navegador. Experimente CLASS26.';
              return describeError(error);
            }
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'create-class' && teacher && (
        <CreateClassModal
          remote={dataMode === 'remote'}
          onCreate={async (name, term, importTrail) => {
            try {
              const { id, code } = await repository.createClassroom(name, term);
              const imported = importTrail ? await repository.importBaseTrail(id) : 0;
              if (dataMode === 'remote') await refreshRemote();
              setModal(null);
              navigate('classes');
              announce(
                `Turma criada. Código: ${code}${imported ? ` · ${imported} desafios importados` : ''}`,
              );
            } catch (error) {
              fail(error);
            }
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'create-problem' && teacher && (
        <Modal title="Um desafio com propósito" onClose={() => setModal(null)} wide>
          <ProblemEditor
            classes={myClasses}
            remote={dataMode === 'remote'}
            onSave={(p) =>
              repository.publishProblem(p).then(async () => {
                if (dataMode === 'remote') await refreshRemote();
                setModal(null);
                navigate('teacher');
                announce(
                  dataMode === 'remote'
                    ? 'Desafio publicado para a turma.'
                    : 'Desafio publicado na demonstração.',
                );
                return null;
              }, describeError)
            }
          />
        </Modal>
      )}
      {modal === 'report' && (
        <ReportModal
          problemTitle={activeProblem.title}
          evidence={
            dataMode === 'remote'
              ? activityByProblem[activeProblem.id]?.evidence
              : state.reports[activeProblem.id]?.evidence
          }
          solved={solved.includes(activeProblem.id)}
          onSave={(evidence) =>
            repository.reportProgress(activeProblem.id, evidence).then(async () => {
              if (dataMode === 'remote') await refreshRemote();
              setModal(null);
              announce('Conclusão autodeclarada registrada. Continue aprendendo!');
            }, fail)
          }
          onReopen={() =>
            repository.reopenProblem(activeProblem.id).then(async () => {
              if (dataMode === 'remote') await refreshRemote();
              setModal(null);
              announce('Desafio reaberto para praticar.');
            }, fail)
          }
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'help' && <HelpModal onClose={() => setModal(null)} />}
      {notice && (
        <div role="status" className="toast">
          <Check size={18} />
          <span>{notice}</span>
          <button className="icon-button" aria-label="Fechar aviso" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

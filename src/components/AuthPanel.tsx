import { useState } from 'react';
import { ArrowRight, Code2, KeyRound, UserPlus } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

export default function AuthPanel({ client }: { client: SupabaseClient }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const displayName = String(data.get('displayName') ?? '').trim();
    setBusy(true);
    setMessage('');
    const { error } =
      mode === 'login'
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } },
          });
    setBusy(false);
    setMessage(
      error
        ? error.message
        : mode === 'signup'
          ? 'Cadastro criado. Confirme o email se o projeto exigir confirmação.'
          : '',
    );
  }
  async function recover(form: HTMLFormElement) {
    const email = String(new FormData(form).get('email') ?? '').trim();
    if (!email) {
      setMessage('Informe o email para recuperar a senha.');
      return;
    }
    setBusy(true);
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    setMessage(error?.message ?? 'Enviamos as instruções de recuperação para o email informado.');
  }
  return (
    <main className="auth-shell">
      <section className="auth-card card">
        <div className="auth-brand">
          <span className="brand-mark">
            <Code2 size={25} />
          </span>
          <strong>classcode</strong>
        </div>
        <span className="eyebrow">AMBIENTE INSTITUCIONAL</span>
        <h1>{mode === 'login' ? 'Continue sua jornada.' : 'Crie sua conta de estudante.'}</h1>
        <p>
          Entre com sua identidade real. O papel de professor é concedido somente por um operador
          autorizado.
        </p>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(event.currentTarget);
          }}
        >
          {mode === 'signup' && (
            <label>
              Nome
              <input name="displayName" required maxLength={100} autoComplete="name" />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {message && (
            <p role="status" className="helper">
              {message}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {mode === 'login' ? <KeyRound size={16} /> : <UserPlus size={16} />}
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            <ArrowRight size={16} />
          </button>
          {mode === 'login' && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={(event) => void recover(event.currentTarget.form!)}
            >
              Esqueci minha senha
            </button>
          )}
        </form>
        <button
          className="text-button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setMessage('');
          }}
        >
          {mode === 'login' ? 'Ainda não tenho uma conta' : 'Já tenho uma conta'}
        </button>
      </section>
    </main>
  );
}

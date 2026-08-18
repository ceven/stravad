import { useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

const blankForm = { email: '', password: '' };

type AuthMode = 'login' | 'signup' | 'reset' | 'confirmReset';

export default function AuthFlow({
  setSession,
  initialMode,
}: {
  setSession: (s: Session | null) => void;
  initialMode?: AuthMode;
}) {
  const [form, setForm] = useState(blankForm);
  const [mode, setMode] = useState<AuthMode>(initialMode ?? 'login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Note: auth state subscription is handled at the app level so sign-out
  // events are observed even when this component is unmounted.

  const handleAuth = async (selectedMode: AuthMode) => {
    setLoading(true);
    setMessage(null);

    if (!form.email || !form.password) {
      setMessage('Enter both email and password.');
      setLoading(false);
      return;
    }

    const authAction = selectedMode === 'signup'
      ? supabase.auth.signUp({ email: form.email, password: form.password })
      : supabase.auth.signInWithPassword({ email: form.email, password: form.password });

    const { error } = await authAction;

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(selectedMode === 'signup' ? 'Check your inbox to verify your email.' : 'Logged in successfully.');
      setForm(blankForm);
    }

    setLoading(false);
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    setMessage(null);

    if (!form.email) {
      setMessage('Enter your email address.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your inbox for a password reset link.');
      setForm(blankForm);
      setMode('login');
    }

    setLoading(false);
  };

  const handlePasswordUpdate = async () => {
    setLoading(true);
    setMessage(null);

    if (!form.password) {
      setMessage('Enter a new password.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: form.password });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Your password has been updated. Please log in with your new password.');
      setForm(blankForm);
      setMode('login');
    }

    setLoading(false);
  };

  return (
    <>
      <header>
        <h1>Stravad</h1>
        <p>More fun with your Strava activities!</p>
      </header>
    <section className="card auth-card">
      <h2>
        {mode === 'login'
          ? 'Login'
          : mode === 'signup'
          ? 'Create Account'
          : mode === 'reset'
          ? 'Reset Password'
          : 'Set a New Password'}
      </h2>
      {mode !== 'confirmReset' ? (
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="you@example.com"
          />
        </label>
      ) : (
        <p className="helper-text">Enter your new password to complete the reset.</p>
      )}
      {(mode === 'login' || mode === 'signup') && (
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="••••••••"
          />
        </label>
      )}
      {mode === 'reset' && (
        <p className="helper-text">Enter your email to receive a password reset link.</p>
      )}
      {mode === 'confirmReset' && (
        <label>
          New password
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="••••••••"
          />
        </label>
      )}
      <div className="button-row">
        <button
          type="button"
          onClick={() => {
            if (mode === 'reset') {
              handlePasswordReset();
            } else if (mode === 'confirmReset') {
              handlePasswordUpdate();
            } else {
              handleAuth(mode);
            }
          }}
          disabled={loading}
        >
          {mode === 'login'
            ? 'Log in'
            : mode === 'signup'
            ? 'Sign up'
            : mode === 'reset'
            ? 'Send reset email'
            : 'Set new password'}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (mode === 'reset' || mode === 'confirmReset') {
              setMode('login');
            } else {
              setMode(mode === 'login' ? 'signup' : 'login');
            }
          }}
        >
          {mode === 'reset' || mode === 'confirmReset'
            ? 'Back to login'
            : mode === 'login'
            ? 'Create account'
            : 'Already have an account?'}
        </button>
      </div>
      {mode === 'login' ? (
        <button
          type="button"
          className="secondary"
          onClick={() => setMode('reset')}
          disabled={loading}
        >
          Forgot password?
        </button>
      ) : null}
      {message ? <p className="message">{message}</p> : null}
    </section>
    </>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Activity } from './types';

const blankForm = { email: '', password: '' };

type AuthMode = 'login' | 'signup' | 'reset' | 'confirmReset';

type SessionType = Awaited<ReturnType<typeof supabase.auth.getSession>>['data'] extends { session: infer S }
  ? S
  : null;

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function App() {
  const [session, setSession] = useState<SessionType>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [form, setForm] = useState(blankForm);
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') {
        setMode('confirmReset');
      }
    });

    async function loadSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
    }

    loadSession();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setActivities([]);
      return;
    }

    async function loadActivities() {
      setLoading(true);
      setMessage(null);
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('start_date_local', { ascending: false });

      if (error) {
        setMessage(error.message);
      } else if (data) {
        setActivities(data as Activity[]);
      }
      setLoading(false);
    }

    loadActivities();
  }, [session]);

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

  // const handleGoogle = async () => {
  //   setLoading(true);
  //   setMessage(null);
  //   const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  //   if (error) {
  //     setMessage(error.message);
  //     setLoading(false);
  //   }
  // };

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  return (
    <div className="page-shell">
      <header>
        <h1>Stravad</h1>
        <p>More fun with your Strava activities!</p>
      </header>

      {!session || mode === 'confirmReset' ? (
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
      ) : (
        <section className="card feed-card">
          <div className="account-bar">
            <div>
              <strong>{session.user.email}</strong>
              <p>{session.user.id}</p>
            </div>
            <button type="button" className="secondary" onClick={handleSignOut} disabled={loading}>
              Sign out
            </button>
          </div>

          <h2>Recent activities</h2>
          {loading ? (
            <p>Loading activities…</p>
          ) : activities.length === 0 ? (
            <p>No synced activities yet. Activities sync daily. We are working on adding more features!</p>
          ) : (
            <ul className="activity-list">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <div className="activity-header">
                    <h3>{activity.name}</h3>
                    <span>{activity.type}</span>
                  </div>
                  <div className="activity-meta">
                    <span>{new Date(activity.start_date_local).toLocaleDateString()}</span>
                    <span>{(activity.distance / 1000).toFixed(1)} km</span>
                    <span>{formatDuration(activity.moving_time)}</span>
                  </div>
                  <div className="activity-stats">
                    <span>Avg {activity.average_speed.toFixed(2)} m/s</span>
                    <span>Max {activity.max_speed.toFixed(2)} m/s</span>
                    <span>Elevation {activity.total_elevation_gain.toFixed(0)} m</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default App;

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StravaConnect from './StravaConnect';
import StravaCallback from './StravaCallback';
import AuthFlow from './AuthFlow';
import ActivityFeed from './ActivityFeed';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';

type SessionType = Session | null;

function AppContent() {
  const [session, setSession] = useState<SessionType>(null);
  const [initialAuthMode, setInitialAuthMode] = useState<'login' | 'signup' | 'reset' | 'confirmReset' | undefined>(undefined);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') {
        setInitialAuthMode('confirmReset');
      }
    });

    (async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
    })();

    return () => subscription.unsubscribe();
  }, []);

  // Session subscription and auth flow are handled by `AuthFlow` component.

  return (
    <div className="page-shell">
      <header>
        <h1>Stravad</h1>
        <p>More fun with your Strava activities!</p>
      </header>

      {!session ? (
        <AuthFlow setSession={setSession} initialMode={initialAuthMode} />
      ) : (
        <ActivityFeed session={session} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/stravad" element={<AppContent />} />
        <Route path="/stravad/strava/callback" element={<StravaCallback />} />
        <Route path="/stravad/strava/connect" element={<StravaConnect />} />
      </Routes>
    </BrowserRouter>
  );
}

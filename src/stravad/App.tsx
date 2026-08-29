import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import StravaConnect from './strava/connection/StravaConnect';
import StravaCallback from './strava/connection/StravaCallback';
import AuthFlow from './AuthFlow';
import ActivityMainPage from './activities/ActivityMainPage';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import ActivityStatsPage from './activities/ActivityStatsPage';
import ActivityFeedPage from './activities/ActivityFeedPage';
import AccountPage from './account/AccountPage';
import ProtectedRoute from './ProtectedRoute';

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

  return (
    <div className="page-shell">
      {initialAuthMode === 'confirmReset' ? (
        <AuthFlow
          key="confirmReset"
          setSession={setSession}
          initialMode="confirmReset"
          onPasswordResetComplete={() => setInitialAuthMode(undefined)}
        />
      ) : !session ? (
        <AuthFlow
          key="login"
          setSession={setSession}
          initialMode={initialAuthMode}
          onPasswordResetComplete={() => setInitialAuthMode(undefined)}
        />
      ) : (
        <ActivityMainPage session={session} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/stravad" element={<AppContent />} />
        <Route path="/stravad/strava/callback" element={<StravaCallback />} />
        <Route path="/stravad/strava/connect" element={<StravaConnect />} />
                  {/* Everything nested here requires authentication */}
        <Route element={<ProtectedRoute />}>
            <Route path="/stravad/account" element={<AccountPage />}></Route>
            <Route path="/stravad/athlete/statistics" element={<ActivityStatsPage />}></Route>
            <Route path="/stravad/athlete/activities" element={<ActivityFeedPage />}></Route>
        </Route>

            <Route path="*" element={<AppContent />} />

      </Routes>
    </HashRouter>
  );
}

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';

export default function ProtectedRoute() {
  const location = useLocation();
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    // Still checking auth status — avoid a premature redirect
    return null; // or a loading spinner
  }

  if (!session) {
    return <Navigate to="/stravad" state={{ from: location }} replace />;
  }

  return (
    <div className="page-shell">
      <Outlet />
    </div>
  );
}
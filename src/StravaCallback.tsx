// src/StravaCallback.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';

export default function StravaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'connecting' | 'success' | 'error'>('connecting');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setStatus('error');
      return;
    }

    const exchangeCode = async () => {
      try {
        // Get the current user's session token to authenticate the Edge Function call
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) throw new Error('Not logged in');

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strava-exchange`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ code }),
          }
        );

        if (!res.ok) throw new Error('Exchange failed');

        setStatus('success');
        setTimeout(() => navigate('/'), 1000);
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    exchangeCode();
  }, [searchParams, navigate]);

  if (status === 'connecting') return <p>Connecting your Strava account…</p>;
  if (status === 'error') return <p>Something went wrong. Please try again later.</p>;
  return <p>Strava connected! Redirecting…</p>;
}
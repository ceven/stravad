// src/StravaCallback.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';

type ConnectionStatus = 'connecting' | 'success' | 'error';
const VITE_STRAVAD_AUTH_EXCHANGE_URL = import.meta.env.VITE_STRAVAD_AUTH_EXCHANGE_URL as string; // e.g., http://localhost:4000/v1/strava/exchange
const DASHBOARD_URL = '/'; // Redirect to the main dashboard after successful connection

interface StravaExchangeResponse {
  connected: boolean;
  athlete?: {
    id: number;
    firstname: string;
    lastname: string;
    email?: string;
    [key: string]: unknown;
  };
  error?: string;
}

export default function StravaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error'); // e.g. 'access_denied' if user cancels

    if (error) {
      setStatus('error');
      return;
    }

    if (!code) {
      setStatus('error');
      return;
    }

    const exchangeCode = async (): Promise<void> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user.id;
        if (!userId) throw new Error('User not signed in');
        // call stravad backend to exchange the code for access token and refresh token
        // pass in supabase JWT in the Authorization header to verify the user
        const supabaseAccessToken = session?.access_token;
        const res = await fetch(VITE_STRAVAD_AUTH_EXCHANGE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAccessToken}`
          },
          body: JSON.stringify({
            code,
          }),
        });

        if (!res.ok) throw new Error('Exchange failed');

        const data: StravaExchangeResponse = await res.json();
        if (!data.connected) throw new Error(data.error ?? 'Exchange failed');

        setStatus('success');
        setTimeout(() => navigate(DASHBOARD_URL), 1000);
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    exchangeCode();
  }, [searchParams, navigate]);

  if (status === 'connecting') return <p>Connecting your Strava account…</p>;
  if (status === 'error') return <p>Something went wrong when connecting Strava. Please try again.</p>;
  return <p>Strava connected! Redirecting…</p>;
}

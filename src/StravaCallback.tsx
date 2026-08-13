// src/StravaCallback.tsx
// Rendered at the /strava/callback route
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ConnectionStatus = 'connecting' | 'success' | 'error';
const STRAVAD_BACKEND_EXCHANGE_URL = import.meta.env.VITE_STRAVAD_BACKEND_EXCHANGE_URL as string; // e.g., http://localhost:4000/api/strava/exchange
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

    console.log('Received Strava code:', code);

    const exchangeCode = async (): Promise<void> => {
      try {
        // call stravad backend to exchange the code for access token and refresh token
        const res = await fetch(STRAVAD_BACKEND_EXCHANGE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            userId: 'current-user-id', // replace with your actual logged-in user's ID
          }),
        });

        if (!res.ok) throw new Error('Exchange failed');

        const data: StravaExchangeResponse = await res.json();
        if (!data.connected) throw new Error(data.error ?? 'Exchange failed');

        // TODO : Store the access token and refresh token securely, e.g., in Supabase or another backend service.
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

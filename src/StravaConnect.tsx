// src/StravaConnect.tsx
import { useState } from 'react';

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID as string; // safe to expose, it's public
const REDIRECT_URI = `${window.location.origin}/stravad/strava/callback`;
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';

export default function StravaConnect() {
  const [connected, setConnected] = useState<boolean>(false);

  const handleConnect = (): void => {

    // c.f. https://developers.strava.com/docs/authentication/#detailsaboutrequestingaccess 

    const authUrl = new URL(STRAVA_AUTH_URL);
    authUrl.searchParams.set('client_id', STRAVA_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('approval_prompt', 'force'); // 'auto' or 'force' to always prompt for approval
    authUrl.searchParams.set('scope', 'read,activity:read');

    window.location.href = authUrl.toString();
  };

  return (
    <button onClick={handleConnect} disabled={connected}>
      {connected ? 'Strava Connected' : 'Connect with Strava'}
    </button>
  );
}

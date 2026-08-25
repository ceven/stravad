// src/StravaConnect.tsx
import { useState } from 'react';

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID as string; // safe to expose, it's public
// Build a redirect URI that works both locally and on GitHub Pages (uses hash routing)
const basePath = window.location.pathname.replace(/\/$/, '');
const REDIRECT_URI = `${window.location.origin}${basePath}/#/stravad/strava/callback`;
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';

export default function StravaDisconnect() {
  const [connected, setConnected] = useState<boolean>(false);

  const handleDisconnect = (): void => {
  };

  return (
    <></>
  );
}

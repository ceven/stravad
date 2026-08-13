// server/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { supabaseAdmin } from './supabaseClient.ts';

const app = express();
app.use(cors());
app.use(express.json());

const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = process.env as {
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
};

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname: string; lastname: string, city?: string; state?: string; country?: string; sex?: string; premium?: boolean; profile?: string; username?: string };
}

interface ExchangeRequestBody {
  code: string;
  userId: string; // Supabase auth.users.id of the currently logged-in user
}

// --- Step 1: exchange the authorization code for tokens, store in Supabase ---
app.post('/v1/strava/exchange', async (req: Request<{}, {}, ExchangeRequestBody>, res: Response) => {
  const { code, userId } = req.body;

  if (!code || !userId) {
    return res.status(400).json({ error: 'Missing code or userId' });
  }

  // c.f. strava docs: https://developers.strava.com/docs/authentication/#step-3-exchange-the-authorization-code-for-an-access-token
  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }
    const data = (await response.json()) as StravaTokenResponse;
    const { access_token, refresh_token, expires_at, athlete } = data;

    const { error } = await supabaseAdmin.from('strava_tokens').upsert(
      {
        user_id: userId,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expires_at,
        scope: 'read,activity:read',
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Error storing Strava tokens in Supabase:', error);
      throw error;
    }

    res.json({ connected: true, athlete });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to connect Strava account' });
  }
});

// --- Step 2: fetch (and refresh if needed) a valid access token from Supabase ---
async function getValidAccessToken(userId: string): Promise<string> {
  const { data: tokens, error } = await supabaseAdmin
    .from('strava_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !tokens) throw new Error('No Strava connection for user');

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (nowInSeconds < tokens.expires_at) {
    return tokens.access_token;
  }

  // Access token expired — refresh it
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!response.ok) throw new Error('Failed to refresh Strava token');

  const refreshed = (await response.json()) as StravaTokenResponse;

  const { error: updateError } = await supabaseAdmin
    .from('strava_tokens')
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
    })
    .eq('user_id', userId);

  if (updateError) throw updateError;

  return refreshed.access_token;
}

// --- Example: fetch the user's Strava activities via the backend ---
app.get('/v1/strava/activities/:userId', async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const accessToken = await getValidAccessToken(req.params.userId);
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const activities = await response.json();
    res.json(activities);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// --- Optional: check connection status (e.g. for showing "Connected" in the UI) ---
app.get('/v1/strava/status/:userId', async (req: Request<{ userId: string }>, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('strava_tokens')
    .select('strava_athlete_id, created_at')
    .eq('user_id', req.params.userId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ connected: !!data, athleteId: data?.strava_athlete_id ?? null });
});

// --- Optional: disconnect ---
app.delete('/v1/strava/disconnect/:userId', async (req: Request<{ userId: string }>, res: Response) => {
  const { error } = await supabaseAdmin
    .from('strava_tokens')
    .delete()
    .eq('user_id', req.params.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ disconnected: true });
});

app.get('/v1/routes', (req: Request, res: Response) => {
  const routes: { method: string; path: string }[] = [];

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods);
      methods.forEach((method) => {
        // only include routes that which path starts with /v1
        if (middleware.route.path.startsWith('/v1')) {
          routes.push({ method: method.toUpperCase(), path: middleware.route.path });
        }
      });
    }
  });

  res.json(routes);
});

// create a constant for the port number, defaulting to 4000 if not set in environment variables
const PORT = process.env.PORT || 4000;

// log the full URL for the server to the console, including the port number
app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
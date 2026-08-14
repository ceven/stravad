import { Request, Response } from 'express';
import fetch from 'node-fetch';
import * as model from '../models/stravaModel';

const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = process.env as {
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
};

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: any;
}

export async function exchangeToken(req: Request, res: Response) {
  const { code } = req.body as { code?: string };
  const verifiedUserId = (req as any).authUserId as string | undefined;
  if (!code || !verifiedUserId) return res.status(400).json({ error: 'Missing code or authenticated user' });

  try {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET, code, grant_type: 'authorization_code' }),
    });

    if (!response.ok) throw new Error('Token exchange failed');
    const data = (await response.json()) as StravaTokenResponse;
    const { access_token, refresh_token, expires_at, athlete } = data;

    if (athlete) {
      const athleteError = await model.upsertAthlete(verifiedUserId, athlete);
      if (athleteError) {
        console.error('Error upserting athlete:', athleteError);
        throw athleteError;
      }
    }

    const expiresAtIso = new Date(expires_at * 1000).toISOString();
    const tokensError = await model.upsertTokens(verifiedUserId, access_token, refresh_token, expiresAtIso);
    if (tokensError) {
      console.error('Error storing tokens:', tokensError);
      throw tokensError;
    }

    res.json({ connected: true, athlete });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to connect Strava account' });
  }
}

export async function getActivities(req: Request, res: Response) {
  const userId = (req as any).authUserId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Missing authenticated user' });
  try {
    // get tokens and refresh if needed
    let tokens = await model.getTokensByUser(userId);

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (nowInSeconds >= Number(tokens.expires_at)) {
      // refresh
      const refreshResp = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: tokens.refresh_token }),
      });
      if (!refreshResp.ok) throw new Error('Failed to refresh token');
      const refreshed = (await refreshResp.json()) as StravaTokenResponse;
      await model.updateTokens(userId, refreshed.access_token, refreshed.refresh_token, refreshed.expires_at);
      tokens = { access_token: refreshed.access_token, refresh_token: refreshed.refresh_token, expires_at: refreshed.expires_at } as any;
    }

    const response = await fetch('https://www.strava.com/api/v3/athlete/activities', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const activities = await response.json();
    res.json(activities);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}

export async function getStravaAthlete(req: Request, res: Response) {
  const userId = (req as any).authUserId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Missing authenticated user' });
  try {
    const data = await model.getStravaAthlete(userId);
    res.json({ connected: !!data, athleteId: data?.strava_athlete_id ?? null });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}

export async function disconnect(req: Request, res: Response) {
  const userId = (req as any).authUserId as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Missing authenticated user' });
  try {
    const error = await model.deleteTokens(userId);
    if (error) return res.status(500).json({ error: (error as any).message ?? 'Delete failed' });
    res.json({ disconnected: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}

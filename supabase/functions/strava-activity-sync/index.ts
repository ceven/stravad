import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const STRAVAD_SCHEMA = 'stravad';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const LOOKBACK_SECONDS = 24 * 60 * 60;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID');
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET');
const STRAVA_SYNC_CRON_SECRET = Deno.env.get('STRAVA_SYNC_CRON_SECRET');

type Athlete = {
  user_id: string;
};

type StoredToken = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

type StravaActivity = {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date_local: string;
  average_speed: number | null;
  max_speed: number | null;
  total_elevation_gain: number | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requireEnvironmentVariable(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

async function refreshToken(refreshToken: string) {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: requireEnvironmentVariable('STRAVA_CLIENT_ID', STRAVA_CLIENT_ID),
      client_secret: requireEnvironmentVariable('STRAVA_CLIENT_SECRET', STRAVA_CLIENT_SECRET),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Strava token refresh failed: ${response.status} ${await response.text()}`);
  }

  return await response.json() as {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
  };
}

async function fetchRecentActivities(accessToken: string): Promise<StravaActivity[]> {
  const after = Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS;
  const activities: StravaActivity[] = [];
  let page = 1;

  while (true) {
    const url = new URL(STRAVA_ACTIVITIES_URL);
    url.searchParams.set('after', String(after));
    url.searchParams.set('per_page', '200');
    url.searchParams.set('page', String(page));

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Strava activity fetch failed: ${response.status} ${await response.text()}`);
    }

    const currentPage = await response.json() as StravaActivity[];
    if (!currentPage.length) {
      break;
    }

    activities.push(...currentPage);
    if (currentPage.length < 200) {
      break;
    }

    page += 1;
  }

  return activities;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!STRAVA_SYNC_CRON_SECRET || request.headers.get('x-cron-secret') !== STRAVA_SYNC_CRON_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createClient(
      requireEnvironmentVariable('SUPABASE_URL', SUPABASE_URL),
      requireEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: athletes, error: athletesError } = await supabase
      .schema(STRAVAD_SCHEMA)
      .from('athletes')
      .select('user_id');

    if (athletesError) {
      throw athletesError;
    }

    const { data: tokens, error: tokensError } = await supabase
      .schema(STRAVAD_SCHEMA)
      .from('users_strava_tokens')
      .select('user_id, access_token, refresh_token, expires_at');

    if (tokensError) {
      throw tokensError;
    }

    const tokensByUserId = new Map((tokens ?? []).map((token) => [token.user_id, token as StoredToken]));
    let activitiesSynced = 0;
    const failures: Array<{ userId: string; error: string }> = [];

    for (const athlete of (athletes ?? []) as Athlete[]) {
      const token = tokensByUserId.get(athlete.user_id);
      if (!token) {
        failures.push({ userId: athlete.user_id, error: 'No Strava tokens found' });
        continue;
      }

      try {
        let accessToken = token.access_token;
        if (new Date(token.expires_at).getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS) {
          const refreshedToken = await refreshToken(token.refresh_token);
          accessToken = refreshedToken.access_token;

          const { error: updateError } = await supabase
            .schema(STRAVAD_SCHEMA)
            .from('users_strava_tokens')
            .update({
              access_token: refreshedToken.access_token,
              refresh_token: refreshedToken.refresh_token ?? token.refresh_token,
              expires_at: new Date(refreshedToken.expires_at * 1000).toISOString(),
            })
            .eq('user_id', athlete.user_id);

          if (updateError) {
            throw updateError;
          }
        }

        const activities = await fetchRecentActivities(accessToken);
        if (activities.length === 0) {
          continue;
        }

        const { error: upsertError } = await supabase
          .schema(STRAVAD_SCHEMA)
          .from('activities')
          .upsert(
            activities.map((activity) => ({
              strava_activity_id: String(activity.id),
              user_id: athlete.user_id,
              name: activity.name,
              type: activity.type,
              distance: activity.distance,
              moving_time: activity.moving_time,
              elapsed_time: activity.elapsed_time,
              start_date_local: activity.start_date_local,
              average_speed: activity.average_speed ?? 0,
              max_speed: activity.max_speed ?? 0,
              total_elevation_gain: activity.total_elevation_gain ?? 0,
            })),
            { onConflict: 'strava_activity_id' },
          );

        if (upsertError) {
          throw upsertError;
        }

        activitiesSynced += activities.length;
      } catch (error) {
        console.error(`Failed to sync Strava activities for ${athlete.user_id}`, error);
        failures.push({
          userId: athlete.user_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return jsonResponse({
      athletesProcessed: athletes?.length ?? 0,
      activitiesSynced,
      failures,
    }, failures.length > 0 ? 207 : 200);
  } catch (error) {
    console.error('Strava activity sync failed', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

import { createClient } from 'supabase';

// Add timestamps to console methods
const originalLog = console.log;
const originalInfo = console.info;
const originalError = console.error;
const originalWarn = console.warn;

const formatTimestamp = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `[${hours}:${minutes}:${seconds}.${ms}]`;
};

console.log = (...args) => originalLog(formatTimestamp(), ...args);
console.info = (...args) => originalInfo(formatTimestamp(), ...args);
console.error = (...args) => originalError(formatTimestamp(), ...args);
console.warn = (...args) => originalWarn(formatTimestamp(), ...args);


const STRAVAD_SCHEMA = 'stravad';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const BATCH_SIZE = 200;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID');
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET');
const STRAVA_SYNC_CRON_SECRET = Deno.env.get('STRAVA_SYNC_CRON_SECRET');

type Athlete = {
  user_id: string;
  created_at: string;
};

type SyncedActivity = {
  start_date_local: string;
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

async function* fetchActivitiesAfter(
  accessToken: string,
  after: Date,
): AsyncGenerator<StravaActivity[]> {
  let page = 1;

  while (true) {
    const url = new URL(STRAVA_ACTIVITIES_URL);
    url.searchParams.set('after', String(Math.floor(after.getTime() / 1000)));
    url.searchParams.set('per_page', String(BATCH_SIZE));
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

    yield currentPage;
    if (currentPage.length < BATCH_SIZE) {
      break;
    }

    page += 1;
  }

}

Deno.serve(async (request) => {
  const startTime = performance.now();
  
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!STRAVA_SYNC_CRON_SECRET || request.headers.get('x-cron-secret') !== STRAVA_SYNC_CRON_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  console.info("Start fetching most recent activities for athletes");

  try {
    const supabase = createClient(
      requireEnvironmentVariable('SUPABASE_URL', SUPABASE_URL),
      requireEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: athletes, error: athletesError } = await supabase
      .schema(STRAVAD_SCHEMA)
      .from('athletes')
      .select('user_id, created_at');

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

        const { data: lastSyncedActivity, error: lastSyncedActivityError } = await supabase
          .schema(STRAVAD_SCHEMA)
          .from('activities')
          .select('start_date_local')
          .eq('user_id', athlete.user_id)
          .order('start_date_local', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastSyncedActivityError) {
          throw lastSyncedActivityError;
        }

        const syncAfter = new Date(
          (lastSyncedActivity as SyncedActivity | null)?.start_date_local ?? athlete.created_at,
        );
        if (Number.isNaN(syncAfter.getTime())) {
          throw new Error(`Invalid sync start date for athlete ${athlete.user_id}`);
        }

        console.info(`Processing activities for athlete ${athlete.user_id} after date ${lastSyncedActivity}`);

        for await (const activities of fetchActivitiesAfter(accessToken, syncAfter)) {
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

          console.info(`Synced ${activitiesSynced} activities so far for athlete ${athlete.user_id}`)
        }
      } catch (error) {
        console.error(`Failed to sync Strava activities for ${athlete.user_id}`, error);
        failures.push({
          userId: athlete.user_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const athletesProcessed = athletes?.length ?? 0

    const elapsedMs = performance.now() - startTime;
    const elapsedSecs = (elapsedMs / 1000).toFixed(2);
    console.info(`Done fetching most recent activities for athletes. Took ${elapsedSecs}s for ${athletesProcessed} athletes and ${activitiesSynced} activities.`);

    return jsonResponse({
      athletesProcessed: athletesProcessed,
      activitiesSynced,
      failures,
    }, failures.length > 0 ? 207 : 200);
  } catch (error) {
    console.error('Strava activity sync failed', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

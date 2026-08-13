import 'dotenv/config';
import fs from 'fs';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stravaAccessToken = process.env.STRAVA_ACCESS_TOKEN;
const stravaRefreshToken = process.env.STRAVA_REFRESH_TOKEN;
const stravaClientId = process.env.STRAVA_CLIENT_ID;
const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;
const grantType = "refresh_token"; // This is the grant type for refreshing the access token

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

if (!stravaAccessToken || !stravaRefreshToken || !stravaClientId || !stravaClientSecret) {
  throw new Error('Missing STRAVA environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

async function refreshToken() {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Number(stravaClientId),
      client_secret: stravaClientSecret,
      grant_type: 'refresh_token',
      refresh_token: stravaRefreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Strava token: ${response.statusText}`);
  }

  return response.json();
}

async function fetchAthlete(accessToken: string) {
  const response = await fetch('https://www.strava.com/api/v3/athlete', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Strava athlete: ${response.statusText}`);
  }

  return response.json();
}

async function fetchActivities(accessToken: string) {
  const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;
  const pageSize = 50;
  let page = 1;
  const activities: any[] = [];

  while (true) {
    const url = `https://www.strava.com/api/v3/athlete/activities?after=${twoDaysAgo}&per_page=${pageSize}&page=${page}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Strava activities: ${response.statusText}`);
    }

    const pageActivities = await response.json();
    if (!Array.isArray(pageActivities) || pageActivities.length === 0) {
      break;
    }

    activities.push(...pageActivities);
    if (pageActivities.length < pageSize) {
      break;
    }

    page += 1;
  }

  return activities;
}

function writeGitHubOutput(name: string, value: string) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath || !value) {
    return;
  }

  const encoded = value
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');

  fs.appendFileSync(outputPath, `${name}=${encoded}\n`, 'utf8');
}

async function persistUser(athlete: any) {
  const userRow = {
    strava_id: athlete.id,
    username: athlete.username,
    firstname: athlete.firstname,
    lastname: athlete.lastname,
    city: athlete.city,
    state: athlete.state,
    country: athlete.country,
    sex: athlete.sex,
    profile: athlete.profile,
  };

  const { error } = await supabase.from('strava_users').upsert(userRow, { onConflict: 'strava_id' });
  if (error) {
    throw error;
  }

  return athlete.id;
}

async function persistActivities(activities: any[], userId: number) {
  if (!activities.length) {
    return;
  }

  const rows = activities.map((activity) => ({
    user_id: userId,
    name: activity.name,
    type: activity.type,
    distance: activity.distance,
    moving_time: activity.moving_time,
    elapsed_time: activity.elapsed_time,
    start_date_local: activity.start_date_local,
    average_speed: activity.average_speed ?? 0,
    max_speed: activity.max_speed ?? 0,
    total_elevation_gain: activity.total_elevation_gain ?? 0,
    strava_id: activity.id,
  }));

  const activityIds = rows.map((row) => row.strava_id);
  const { data: existingActivities, error: existingError } = await supabase
    .from('activities')
    .select('strava_id')
    .in('strava_id', activityIds);

  if (existingError) {
    throw existingError;
  }

  const existingIds = new Set(existingActivities?.map((row) => row.strava_id) ?? []);
  const newRows = rows.filter((row) => !existingIds.has(row.strava_id));

  if (!newRows.length) {
    return;
  }

  const { error } = await supabase.from('activities').insert(newRows);
  if (error) {
    throw error;
  }
}

async function main() {
  const refreshed = await refreshToken();
  writeGitHubOutput('strava_access_token', refreshed.access_token);
  if (refreshed.refresh_token) {
    writeGitHubOutput('strava_refresh_token', refreshed.refresh_token);
  }
  console.log('Strava token refreshed.');

  const athlete = await fetchAthlete(refreshed.access_token);
  const userId = await persistUser(athlete);
  console.log(`Persisted Strava user ${userId}.`);

  const activities = await fetchActivities(refreshed.access_token);
  console.log(`Fetched ${activities.length} activities from Strava.`);

  await persistActivities(activities, userId);
  console.log('Activities synced to Supabase.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

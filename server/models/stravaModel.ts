import { supabaseAdmin } from '../supabaseClient';

const DB_SCHEMA = 'stravad';
const STRAVA_TOKENS_TABLE = 'users_strava_tokens';
const ATHLETES_TABLE = 'athletes';

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: any;
}

export async function upsertAthlete(userId: string, athlete: any) {
  const { error } = await supabaseAdmin
    .schema(DB_SCHEMA)
    .from(ATHLETES_TABLE)
    .upsert(
      {
        user_id: userId,
        strava_athlete_id: athlete.id,
        email: null,
        first_name: athlete.firstname,
        last_name: athlete.lastname,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'strava_athlete_id' }
    );

  return error;
}

export async function upsertTokens(userId: string, accessToken: string, refreshToken: string, expiresAtIso: string) {
  const { error } = await supabaseAdmin
    .schema(DB_SCHEMA)
    .from(STRAVA_TOKENS_TABLE)
    .upsert(
      {
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAtIso,
      },
      { onConflict: 'user_id' }
    );

  return error;
}

export async function getTokensByUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .schema(DB_SCHEMA)
    .from(STRAVA_TOKENS_TABLE)
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data as StoredTokens;
}

export async function updateTokens(userId: string, accessToken: string, refreshToken: string, expiresAt: any) {
  const { error } = await supabaseAdmin
    .schema(DB_SCHEMA)
    .from(STRAVA_TOKENS_TABLE)
    .update({ access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt })
    .eq('user_id', userId);

  return error;
}

export async function deleteTokens(userId: string) {
  const { error } = await supabaseAdmin
    .schema(DB_SCHEMA)
    .from(STRAVA_TOKENS_TABLE)
    .delete()
    .eq('user_id', userId);

  return error;
}

export async function getStravaAthlete(userId: string) {
  const { data, error } = await supabaseAdmin
    .schema(DB_SCHEMA)
    .from(STRAVA_TOKENS_TABLE)
    .select('strava_athlete_id, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// supabase/functions/strava-exchange/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID')!;
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const STRAVAD_SCHEMA = 'stravad';
const STRAVAD_USERS_TOKENS_TABLE = 'users_strava_tokens';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // restrict to your domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the caller is an authenticated Supabase user via their JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(jwt);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = userData.user.id;
    const { code } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Exchange the code with Strava
    const stravaRes = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!stravaRes.ok) {
      const errText = await stravaRes.text();
      throw new Error(`Strava exchange failed: ${errText}`);
    }

    const { access_token, refresh_token, expires_at, athlete } = await stravaRes.json();

    // convert expires_at (epoch seconds) to timestamptz  
    const expiresAtIso = new Date(expires_at * 1000).toISOString();

    // Store tokens using the service role client (bypasses RLS)
    const { error: dbError } = await supabaseClient.schema(STRAVAD_SCHEMA).from(STRAVAD_USERS_TOKENS_TABLE).upsert(
      {
        user_id: userId,
        access_token,
        refresh_token,
        expires_at: expiresAtIso,
        // scope: 'read,activity:read', // TODO: update table to store scope if needed
      },
      { onConflict: 'user_id' }
    );

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ connected: true, athlete }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
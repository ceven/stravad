import { supabase } from "./lib/supabaseClient";

export type Activity = {
  id: string;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  total_elevation_gain: number;
  strava_id: number;
};

export type Athlete = {
  user_id: string,
  strava_athlete_id: string, 
  first_name: string, 
  last_name: string
};

export type SessionType = Awaited<ReturnType<typeof supabase.auth.getSession>>['data'] extends { session: infer S }
  ? S
  : null;
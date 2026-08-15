import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Activity, Athlete } from './types';
import StravaConnect from './StravaConnect';

type SessionType = Awaited<ReturnType<typeof supabase.auth.getSession>>['data'] extends { session: infer S }
  ? S
  : null;

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export default function ActivityFeed({ session }: { session: SessionType }) {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [hasConnectedStrava, setHasConnectedStrava] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setActivities([]);
      setHasConnectedStrava(null);
      setAthlete(null);
      return;
    }

    async function loadActivities(userId: string) {
      setLoading(true);
      setMessage(null);

      const { data: athlete, error: athleteError } = await supabase
        .schema('stravad')
        .from('athletes')
        .select('user_id, strava_athlete_id, first_name, last_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (athleteError) {
        setHasConnectedStrava(null);
        setActivities([]);
        setAthlete(null);
        setMessage(athleteError.message);
        setLoading(false);
        return;
      }

      const isConnected = Boolean(athlete);
      setHasConnectedStrava(isConnected);

      if (!isConnected) {
        setActivities([]);
        setLoading(false);
        setAthlete(null);
        return;
      }

      setAthlete(athlete);

      // TODO: customize this query, remove hardcoded fields, and add pagination
      const { data, error } = await supabase
        .schema('stravad')
        .from('activities')
        .select('name, type, distance, moving_time, elapsed_time, start_date_local, average_speed, max_speed, total_elevation_gain')
        .eq('user_id', userId)
        .order('start_date_local', { ascending: false })
        .limit(20);

      if (error) {
        setMessage(error.message);
      } else if (data) {
        setActivities(data as Activity[]);
      }
      setLoading(false);
    }

    loadActivities(session.user.id);
  }, [session]);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  return (
    <section className="card feed-card">
      <div className="account-bar">
        <div>
          <strong>{session?.user.email}</strong>
          <p>{session?.user.id}</p>
        </div>
        <button type="button" className="secondary" onClick={handleSignOut} disabled={loading}>
          Sign out
        </button>
      </div>

      {hasConnectedStrava === false && <StravaConnect />}

      {message && <p role="alert">{message}</p>}

      {hasConnectedStrava === true && (
        <>
          <h2>Recent activities for {athlete?.first_name} {athlete?.last_name} </h2>
          {loading ? (
            <p>Loading activities…</p>
          ) : activities.length === 0 ? (
            <p>No synced activities yet. Activities sync daily. We are working on adding more features!</p>
          ) : (
            <ul className="activity-list">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <div className="activity-header">
                    <h3>{activity.name}</h3>
                    <span>{activity.type}</span>
                  </div>
                  <div className="activity-meta">
                    <span>{new Date(activity.start_date_local).toLocaleDateString()}</span>
                    <span>{(activity.distance / 1000).toFixed(1)} km</span>
                    <span>{formatDuration(activity.moving_time)}</span>
                  </div>
                  <div className="activity-stats">
                    <span>Avg {activity.average_speed.toFixed(2)} m/s</span>
                    <span>Max {activity.max_speed.toFixed(2)} m/s</span>
                    <span>Elevation {activity.total_elevation_gain.toFixed(0)} m</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

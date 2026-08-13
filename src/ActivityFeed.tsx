import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Activity } from './types';
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setActivities([]);
      return;
    }

    async function loadActivities(userId: string) {
      setLoading(true);
      setMessage(null);

      // TODO: customize this query, remove hardcoded fields, and add pagination
      const { data, error } = await supabase
        .from('activities')
        .select('name, type, distance')
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

      <div>        
        <StravaConnect/>
      </div>

      <h2>Recent activities</h2>
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
    </section>
  );
}

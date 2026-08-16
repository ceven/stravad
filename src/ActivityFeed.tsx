import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Activity, Athlete } from './types';
import StravaConnect from './StravaConnect';

type SessionType = Awaited<ReturnType<typeof supabase.auth.getSession>>['data'] extends { session: infer S }
  ? S
  : null;

const PAGE_SIZE = 20;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const nextActivityOffsetRef = useRef(0);
  const isLoadingActivitiesRef = useRef(false);
  const hasMoreActivitiesRef = useRef(false);
  const feedCardRef = useRef<HTMLElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadActivityPage = useCallback(async (userId: string, offset: number) => {
    if (isLoadingActivitiesRef.current) {
      return;
    }

    isLoadingActivitiesRef.current = true;
    if (offset === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const { data, error } = await supabase
      .schema('stravad')
      .from('activities')
      .select('id:strava_activity_id, name, type, distance, moving_time, elapsed_time, start_date_local, average_speed, max_speed, total_elevation_gain')
      .eq('user_id', userId)
      .order('start_date_local', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (activeUserIdRef.current === userId) {
      if (error) {
        setMessage(error.message);
        setHasMoreActivities(false);
        hasMoreActivitiesRef.current = false;
      } else {
        const page = (data ?? []) as Activity[];
        setActivities((currentActivities) => offset === 0 ? page : [...currentActivities, ...page]);
        nextActivityOffsetRef.current = offset + page.length;
        const hasMore = page.length === PAGE_SIZE;
        setHasMoreActivities(hasMore);
        hasMoreActivitiesRef.current = hasMore;
      }
    }

    isLoadingActivitiesRef.current = false;
    if (activeUserIdRef.current === userId) {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!session) {
      activeUserIdRef.current = null;
      setActivities([]);
      setHasConnectedStrava(null);
      setAthlete(null);
      setHasMoreActivities(false);
      hasMoreActivitiesRef.current = false;
      return;
    }

    async function loadActivities(userId: string) {
      activeUserIdRef.current = userId;
      nextActivityOffsetRef.current = 0;
      hasMoreActivitiesRef.current = false;
      setLoading(true);
      setMessage(null);
      setActivities([]);
      setHasMoreActivities(false);

      const { data: athlete, error: athleteError } = await supabase
        .schema('stravad')
        .from('athletes')
        .select('user_id, strava_athlete_id, first_name, last_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (athleteError) {
        if (activeUserIdRef.current !== userId) return;
        setHasConnectedStrava(null);
        setActivities([]);
        setAthlete(null);
        setMessage(athleteError.message);
        setLoading(false);
        return;
      }

      const isConnected = Boolean(athlete);
      if (activeUserIdRef.current !== userId) return;
      setHasConnectedStrava(isConnected);

      if (!isConnected) {
        setActivities([]);
        setLoading(false);
        setAthlete(null);
        return;
      }

      setAthlete(athlete);
      await loadActivityPage(userId, 0);
    }

    loadActivities(session.user.id);
  }, [session, loadActivityPage]);

  useEffect(() => {
    if (!session || hasConnectedStrava !== true || !feedCardRef.current || !loadMoreRef.current) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (
        entry.isIntersecting
        && hasMoreActivitiesRef.current
        && !isLoadingActivitiesRef.current
      ) {
        void loadActivityPage(session.user.id, nextActivityOffsetRef.current);
      }
    }, { root: feedCardRef.current, rootMargin: '160px' });

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasConnectedStrava, hasMoreActivities, loadActivityPage, session]);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  return (
    <section ref={feedCardRef} className="card feed-card">
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
            <p>No synced activities yet. Activities sync every hour. Come back soon!</p>
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
          {hasMoreActivities && <div ref={loadMoreRef} className="activity-load-more" aria-hidden="true" />}
          {loadingMore && <p>Loading more activities…</p>}
        </>
      )}
    </section>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Activity, Athlete, SessionType } from './types';
import StravaConnect from './StravaConnect';
import ActivityCompare from './ActivityCompare';
import ActivityAggregates from './ActivityAggregates';
import UserPanel from './UserPanel';



const PAGE_SIZE = 20;

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function ActivityNameBackground({ activityNames }: { activityNames: string[] }) {
  const names = useMemo(() => {
    if (activityNames.length === 0) {
      return [];
    }
    
    const shuffled = [...activityNames];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [activityNames]);

  if (names.length === 0) {
    return null;
  }

  return (
    <div className="activity-name-background" aria-hidden="true">
      {names.map((name, index) => (
        <span className={`activity-name activity-name-${index % 3}`} key={`${name}-${index}`}>
          {name}
        </span>
      ))}
    </div>
  );
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

  const activityNames = useMemo(
    () => Array.from(new Set(activities.map((activity) => activity.name).filter(Boolean))),
    [activities],
  );

  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const toggleSelectActivity = (id: string) => {
    setSelectedActivities((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length < 2) return [...prev, id];
      // if two are already selected, drop the oldest (first) and add the new one
      return [prev[1], id];
    });
  };

  const clearSelection = () => setSelectedActivities([]);

  const selectedActivityObjects = useMemo(() => {
    return selectedActivities.map((id) => activities.find((a) => a.id === id)).filter(Boolean) as Activity[];
  }, [selectedActivities, activities]);

  function formatDistanceKm(meters: number) {
    return `${(meters / 1000).toFixed(2)} km`;
  }

  function formatElevation(meters: number) {
    return `${meters.toFixed(0)} m`;
  }


  return (
    <>
      <ActivityNameBackground activityNames={activityNames} />
      <UserPanel session={session} />
      {hasConnectedStrava === false && <StravaConnect />}

      <div className="activities-layout">
        <div className="activity-column">
          <section ref={feedCardRef} className="card feed-card">

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
                  {activities.map((activity) => {
                    const selected = selectedActivities.includes(activity.id);
                    return (
                    <li key={activity.id} className={selected ? 'selected' : ''}>
                      <label className="activity-select">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelectActivity(activity.id)}
                          aria-label={`Select activity ${activity.name}`}
                        />
                        <span className={`select-btn ${selected ? 'is-selected' : ''}`}>
                          {selected ? String(selectedActivities.indexOf(activity.id) + 1) : ''}
                        </span>
                        <div className="activity-header">
                          <h3>{activity.name}</h3>
                          <span>{activity.type}</span>
                        </div>
                      </label>
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
                  )})}
                </ul>
              )}
              {hasMoreActivities && <div ref={loadMoreRef} className="activity-load-more" aria-hidden="true" />}
              {loadingMore && <p>Loading more activities…</p>}
            </>
          )}
          </section>
        </div>

        <div className="activity-column">
          {selectedActivityObjects.length > 0 && (
            <ActivityCompare activities={selectedActivityObjects} onClear={clearSelection} />
          )}
          {hasConnectedStrava === true && <ActivityAggregates session={session} />}
        </div>
      </div>
    </>
  );
}

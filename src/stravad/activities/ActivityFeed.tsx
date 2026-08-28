import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Athlete, SessionType } from "../types/types";
import { supabase } from "../lib/supabaseClient";
import ActivityCompare from "./ActivityCompare";
import { activityIcon } from "../lib/activityIcons";

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
    <div className="activity-name-background">
      {names.map((name, index) => (
        <span className={`activity-name activity-name-${index % 3}`} key={`${name}-${index}`}>
          {name}
        </span>
      ))}
    </div>
  );
}

export default function ActivityFeed({session, athlete}:{session: SessionType, athlete: Athlete}) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
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

      if (!athlete) {
        if (activeUserIdRef.current !== userId) return;
        setActivities([]);
        setLoading(false);
        return;
      }

      const isConnected = Boolean(athlete);
      if (activeUserIdRef.current !== userId) return;

      if (!isConnected) {
        setActivities([]);
        setLoading(false);
        return;
      }

      await loadActivityPage(userId, 0);
    }

    loadActivities(session.user.id);
  }, [session, loadActivityPage]);

  useEffect(() => {
    if (!session || !feedCardRef.current || !loadMoreRef.current) {
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
  }, [hasMoreActivities, loadActivityPage, session]);

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

    return(
        <>
        <ActivityNameBackground activityNames={activityNames} />
         <div className="activities-layout">
          <section ref={feedCardRef} className="card feed-card">

          {message && <p role="alert">{message}</p>}

          {(
            <>
              
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
                        <div className="activity-select-header">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelectActivity(activity.id)}
                            aria-label={`Select activity ${activity.name}`}
                          />
                          <span className={`select-btn ${selected ? 'is-selected' : ''}`}>
                            {selected ? String(selectedActivities.indexOf(activity.id) + 1) : ''}
                          </span>
                          <h4 className="activity-feed-name">{activity.name}</h4>
                          <div className="activity-type">{activityIcon(activity.type)}<span className='activity-type-text'>{activity.type}</span></div>
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
                      </label>
                    </li>
                  )})}
                </ul>
              )}
              {hasMoreActivities && <div ref={loadMoreRef} className="activity-load-more" />}
              {loadingMore && <p>Loading more activities…</p>}
            </>
          )}
          </section>

          <section className='activity-column'>
          {selectedActivityObjects.length > 0 && (
            <ActivityCompare activities={selectedActivityObjects} onClear={clearSelection} />
          )}
          </section>
      </div>
    </>
    );
}
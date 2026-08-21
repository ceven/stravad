import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Activity } from './types';


function formatDate(d: any) {
    return new Date(d).toLocaleDateString()
}

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function formatDistanceKm(meters: number) {
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatElevation(meters: number) {
  return `${meters.toFixed(0)} m`;
}

function formatDurationTime(seconds: number) {
 const absSeconds = Math.abs(seconds)
  const hrs = Math.floor(absSeconds / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;
  const sign = seconds >= 0 ? `` : `-`
  if (hrs > 0) {
    return `${sign}${hrs}h${mins}m${secs}s`
  } else if (mins > 0) {
    return `${sign}${mins}m${secs}s`
  } else {
    return `${sign}${secs}s`
  }
}

export default function ActivityCompare({ activities, onClear }: { activities: Activity[]; onClear: () => void }) {
  const cardRef = useRef<HTMLElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const [isStuck, setIsStuck] = useState(false);

  useLayoutEffect(() => {
    const update = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const cardTopAbs = rect.top + window.scrollY;
      const topOffset = 16; // matches CSS top: 1rem
      const threshold = cardTopAbs - topOffset;

      const onScroll = () => {
        const stuck = window.scrollY >= threshold;
        if (stuck !== isStuck) setIsStuck(stuck);
        if (spacerRef.current) {
          if (stuck) {
            spacerRef.current.style.height = `${cardRef.current!.getBoundingClientRect().height}px`;
          } else {
            spacerRef.current.style.height = '0px';
          }
        }
      };

      // set initial spacer to 0
      if (spacerRef.current) spacerRef.current.style.height = '0px';
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      // run once to initialize
      onScroll();
      return () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    };

    const cleanup = update();
    return () => {
      if (cleanup && typeof cleanup === 'function') cleanup();
    };
  }, [activities, isStuck]);

  if (!activities || activities.length < 1) return null;
  const [a, b] = activities;

  return (
      <section ref={cardRef} className="activity-table">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>{a.name}</th>
              <th>{b ? b.name : `Select another activity`}</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Date</td>
              <td>{formatDate(a.start_date_local)}</td>
              <td>{b ? formatDate(b.start_date_local) : ``}</td>
            </tr>
            <tr>
              <td>Distance</td>
              <td>{formatDistanceKm(a.distance)}</td>
              <td>{b ? formatDistanceKm(b.distance): ``}</td>
              <td>{b ? formatDistanceKm(b?.distance - a.distance): ``}</td>
            </tr>
            <tr>
              <td>Moving time</td>
              <td>{formatDuration(a.moving_time)}</td>
              <td>{b ? formatDuration(b.moving_time): ``}</td>
              <td>{b ? formatDurationTime(b.moving_time - a.moving_time): ``}</td>
            </tr>
            <tr>
              <td>Elevation</td>
              <td>{formatElevation(a.total_elevation_gain)}</td>
              <td>{b ? formatElevation(b.total_elevation_gain) : ``}</td>
              <td>{b ? formatElevation(b?.total_elevation_gain - a.total_elevation_gain): ``}</td>
            </tr>
          </tbody>
        </table>
        <div className="clear-selection">
          <button type="button" onClick={onClear}>Clear selection</button>
        </div>
      </section>
  );
}

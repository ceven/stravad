import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Athlete, SessionType } from '../types/types';
import StravaConnect from '../strava/connection/StravaConnect';
import ActivityFeed from './ActivityFeed';
import Navbar from '../navigation/Navbar';
import Footer from '../navigation/Footer';

export default function ActivityMainPage({ session }: { session: SessionType }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [hasConnectedStrava, setHasConnectedStrava] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) {
      activeUserIdRef.current = null;
      setHasConnectedStrava(null);
      setAthlete(null);
      return;
    }

    async function loadAthlete(userId: string) {
      activeUserIdRef.current = userId;
      setLoading(true);

      const { data: athlete, error: athleteError } = await supabase
        .schema('stravad')
        .from('athletes')
        .select('user_id, strava_athlete_id, first_name, last_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (athleteError) {
        if (activeUserIdRef.current !== userId) return;
        setHasConnectedStrava(null);
        setAthlete(null);
        setMessage(athleteError.message);
        setLoading(false);
        return;
      }

      const isConnected = Boolean(athlete);
      if (activeUserIdRef.current !== userId) return;
      setHasConnectedStrava(isConnected);

      if (!isConnected) {
        setLoading(false);
        setAthlete(null);
        return;
      }

      setAthlete(athlete);
      setLoading(false);
    }

    loadAthlete(session.user.id);
  }, [session]);


  return (
    <>
      <Navbar session={session} athlete={athlete}/>
      {loading ? 
        (<p>Loading athlete...</p>) : (!hasConnectedStrava ? <StravaConnect />:
            (athlete && (
              <>
            <ActivityFeed session={session} athlete={athlete}></ActivityFeed>
            </>
            )
          )
      )
      }
      <Footer />
    </>
  );
}

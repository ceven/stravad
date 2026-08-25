import { useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { Athlete, SessionType } from "./types";
import './css/navbar.css'
import { useNavigate } from "react-router-dom";

export default function Navbar({ session, athlete }: {session: SessionType, athlete: Athlete | null}) {

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setLoading(false);
        navigate("/stravad")
    };

    const getActivities = async () => {
        setLoading(true);
        console.log("not implemented")
        setLoading(false);
    };

    if (!session) {
        return null;
    }
      
    return (
      <nav className="navbar">
          <div className="navbar-item account-dropdown">
            <i className="fa-solid fa-circle-user label-icon"></i>
            <span className="label-text"> 
                {athlete && <> {athlete?.first_name} {athlete?.last_name}</>}
                {!athlete && <>My account</>}</span>
            <div className="content">
              <div>{session?.user.email}</div>
              </div>
          </div>
          <button type="button" className="navbar-item" onClick=
          {() => navigate(`/stravad/athlete/activities`, { state: { session, athlete } })}
          disabled={loading}>
              <i className="fa-solid fa-chart-column label-icon"></i>
              <span className="label-text"> Activities</span>
          </button>
          <button type="button" className="navbar-item" onClick={
                      () => navigate(`/stravad/athlete/statistics`, { state: { session, athlete } })
          } disabled={loading}>
              <i className="fa-solid fa-person-running label-icon"></i>
              <span className="label-text"> Statistics</span>
          </button>
          <button id="signout" className="navbar-item" type="button" onClick={handleSignOut} disabled={loading}>
              <i className="fa-solid fa-right-from-bracket label-icon"></i>
              <span className="label-text"> Sign out</span>
          </button>
      </nav>
    );
}
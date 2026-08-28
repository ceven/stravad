import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Athlete, SessionType } from "../types/types";
import './Navbar.css'
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

    if (!session) {
        return null;
    }
      
    return (
      <nav className="navbar">
          <button type="button" className="navbar-item account-dropdown" onClick={
            () => navigate(`/stravad/account`, {state: {session, athlete}})
          }>
            <i className="fa-solid fa-circle-user label-icon"></i>
            <span className="label-text"> 
                {athlete && <> {athlete?.first_name} {athlete?.last_name}</>}
                {!athlete && <>My account</>}</span>
            <div className="content">
              <div>{session?.user.email}</div>
              </div>
          </button>
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
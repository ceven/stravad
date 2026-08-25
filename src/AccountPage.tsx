import { useLocation } from "react-router-dom";
import { SessionAthlete } from "./types";
import Navbar from "./Navbar";
import StravaConnect from "./StravaConnect";
import StravaDisconnect from "./StravaDisconnect";
import "./css/account-page.css"

function formatDate(d: any) {
    return new Date(d).toLocaleDateString()
}

export default function AccountPage() {

    const location = useLocation();
    const { session, athlete } = (location.state ?? {}) as SessionAthlete;
    return(
        <>
            <Navbar session={session} athlete={athlete}/>
            <div className="stravad-account-page">
                {session && <div className="stravad-profile"><span id="stravad-profile-title">Stravad profile</span>
                    <table>
                    <tbody>
                        <tr>
                            <th>Email</th>
                            <td>{session.user.email}</td>
                        </tr>
                        <tr>
                            <th>Active Since</th>
                            <td>{formatDate(session.user.created_at)}</td>
                        </tr>
                        {athlete && 
                        <tr>
                            <th>Strava name</th>
                            <td>{athlete.first_name} {athlete.last_name}</td>
                        </tr>
                        }

                    </tbody>
                    </table>
                    </div>
                    }
               {athlete && 
                <div className="athlete-info"><i className="fa-brands fa-strava"></i> Connected to Strava as {athlete.first_name} {athlete.last_name}</div>
                }
                {athlete ? <StravaDisconnect /> : <StravaConnect />}
            </div>

        </>
    );
}
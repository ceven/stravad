import { useLocation } from "react-router-dom";
import ActivityAggregates from "./ActivityAggregates";
import Navbar from "../navigation/Navbar";
import { SessionAthlete} from "../types/types";

export default function ActivityStatsPage() {
  const location = useLocation();
  const { session, athlete } = (location.state ?? {}) as SessionAthlete;

    if (!session || !athlete) {
        return <p>Missing data — need to pass state.</p>;
    }

    return(
        <>
            <Navbar session={session} athlete={athlete}></Navbar>
            <ActivityAggregates session={session}></ActivityAggregates>
        </>
    );
}
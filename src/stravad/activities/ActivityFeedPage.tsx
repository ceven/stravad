import { useLocation } from "react-router-dom";
import { SessionAthlete } from "../types/types";
import ActivityMainPage from "./ActivityMainPage";

export default function ActivityFeedPage(){

    const location = useLocation();
    const { session, athlete } = (location.state ?? {}) as SessionAthlete;

    if (!session || !athlete) {
        return <p>Missing data — need to pass state.</p>;
    }
    return(
        // FIXME: change component to only show navbar + activities feed
        <ActivityMainPage session={session} ></ActivityMainPage>
    );
}
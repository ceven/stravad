import { Navigate, Outlet, Session, useLocation } from "react-router-dom";
import { SessionAthlete, SessionType } from "./types";


export default function ProtectedRoute() {
  const location = useLocation();
  const { session } = (location.state ?? {}) as SessionAthlete;
  if (!session) {
    return <Navigate to="/stravad" state={{ from: location }} replace />;
  }
  return <Outlet />
}
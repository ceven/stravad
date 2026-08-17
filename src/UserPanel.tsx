import { useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { SessionType } from "./types";

export default function UserPanel({ session }: {session: SessionType}) {

    const [loading, setLoading] = useState(false);

    const handleSignOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setLoading(false);
    };

    if (!session) {
        return null;
    }
      
    return (
      <div className="account-bar">
        <div>
          <strong>{session?.user.email}</strong>
        </div>
        <button type="button" className="secondary" onClick={handleSignOut} disabled={loading}>
          Sign out
        </button>
      </div>
    );
}
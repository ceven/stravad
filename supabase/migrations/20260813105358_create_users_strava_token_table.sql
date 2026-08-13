--- athletes token for strava api access
create table if not exists stravad.users_strava_tokens (
    user_id text primary key references stravad.athletes(user_id) on delete cascade,
    access_token text not null,
    refresh_token text not null,
    expires_at timestamp with time zone not null
);

-- RLS
ALTER TABLE stravad.users_strava_tokens ENABLE ROW LEVEL SECURITY;

-- permissions
GRANT SELECT ON stravad.users_strava_tokens TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON stravad.users_strava_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stravad.users_strava_tokens TO service_role;

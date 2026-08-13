create schema if not exists stravad;
grant usage on schema stravad to authenticated, service_role, anon;

--- athletes table
create table if not exists stravad.athletes (
    user_id text primary key,
    strava_athlete_id text unique not null,
    email text unique,
    first_name text,
    last_name text,
    created_at timestamp with time zone default now()
);

--- activities table
create table if not exists stravad.activities (
    strava_activity_id text primary key,
    user_id text references stravad.athletes(user_id) on delete cascade,
    name text not null,
    type text not null,
    distance double precision not null,
    moving_time integer not null,
    elapsed_time integer not null,
    start_date_local timestamp with time zone not null,
    average_speed double precision not null,
    max_speed double precision not null,
    total_elevation_gain double precision not null
);

-- indices for performance
CREATE INDEX IF NOT EXISTS idx_athletes_strava_athlete_id ON stravad.athletes(strava_athlete_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON stravad.activities(user_id);

-- RLS
ALTER TABLE stravad.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stravad.activities ENABLE ROW LEVEL SECURITY;

-- permissions
GRANT SELECT ON ALL TABLES IN SCHEMA stravad TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA stravad TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA stravad TO service_role;

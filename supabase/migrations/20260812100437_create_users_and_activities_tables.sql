create schema if not exists stravad;
grant usage on schema stravad to authenticated, service_role;

create table if not exists stravad.users (
    user_id text primary key,
    strava_user_id text unique not null,
    email text unique not null,
    created_at timestamp with time zone default now()
);
create table if not exists stravad.activities (
    strava_activity_id text primary key,
    user_id text references stravad.users(strava_user_id) on delete cascade,
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
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON stravad.activities(user_id);

ALTER TABLE stravad.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stravad.activities ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA stravad TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA stravad TO service_role;

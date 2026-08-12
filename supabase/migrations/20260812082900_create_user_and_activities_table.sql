create table if not exists strava_users (
  user_id text primary key,
  username text not null,
  first_name text not null,
  last_name text not null,
  email text not null
);

create table if not exists strava_activities (
  strava_id bigint primary key,
  user_id text not null,
  name text not null,
  type text not null,
  distance double precision not null,
  moving_time integer not null,
  elapsed_time integer not null,
  start_date_local timestamptz not null,
  average_speed double precision not null default 0,
  max_speed double precision not null default 0,
  total_elevation_gain double precision not null default 0
);

create index if not exists strava_activities_user_id_idx on strava_activities (user_id);

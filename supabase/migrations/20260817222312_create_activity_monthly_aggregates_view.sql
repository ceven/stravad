create view stravad.activities_aggregates with (security_invoker = on) as
 SELECT 
    user_id,
    type,
    EXTRACT(year FROM start_date_local)::integer AS year,
    EXTRACT(month FROM start_date_local)::integer AS month,
    count(strava_activity_id) AS activity_count,
    sum(total_elevation_gain)::integer AS total_elevation_gain,
    sum(distance) AS total_distance,
    avg(distance) AS avg_distance,
    max(distance) AS max_distance,
    avg(average_speed) AS avg_speed
   FROM stravad.activities
  GROUP BY (EXTRACT(year FROM start_date_local)::integer), (EXTRACT(month FROM start_date_local)::integer), user_id, type;
  
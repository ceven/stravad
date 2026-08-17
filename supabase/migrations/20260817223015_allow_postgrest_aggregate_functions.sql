ALTER ROLE authenticator SET pgrst.db_aggregates_enabled = 'true';
NOTIFY pgrst, 'reload config';

ALTER USER authenticator SET plan_filter.statement_cost_limit = 1e7;

-- anonymous users can only run cheap queries
ALTER
  USER anon
SET
  plan_filter.statement_cost_limit = 10000;

-- authenticated users can run more expensive queries
ALTER
  USER authenticated
SET
  plan_filter.statement_cost_limit = 1e6;

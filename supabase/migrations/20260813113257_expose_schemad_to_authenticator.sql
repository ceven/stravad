
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage, graphql_public, stravad';

-- Reload the PostgREST cache immediately
NOTIFY pgrst;

-- permissions
GRANT USAGE ON SCHEMA stravad TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA stravad TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA stravad TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA stravad TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA stravad TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA stravad
GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- Policy for table athletes
-- 2) SELECT: user can read own rows
CREATE POLICY "athletes_select_own"
ON stravad.athletes
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

-- 3) INSERT: user can insert rows only for themselves
CREATE POLICY "athletes_insert_own"
ON stravad.athletes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- 4) UPDATE: user can update only their rows, and cannot change ownership
CREATE POLICY "athletes_update_own"
ON stravad.athletes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- 5) DELETE: user can delete only their rows
CREATE POLICY "athletes_delete_own"
ON stravad.athletes
FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);

-- Policy for table users_strava_tokens
-- 2) SELECT: user can read own rows
CREATE POLICY "users_strava_tokens_select_own"
ON stravad.users_strava_tokens
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

-- 3) INSERT: user can insert rows only for themselves
CREATE POLICY "users_strava_tokens_insert_own"
ON stravad.users_strava_tokens
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- 4) UPDATE: user can update only their rows, and cannot change ownership
CREATE POLICY "users_strava_tokens_update_own"
ON stravad.users_strava_tokens
FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- 5) DELETE: user can delete only their rows
CREATE POLICY "users_strava_tokens_delete_own"
ON stravad.users_strava_tokens
FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);

-- Policy for table activities
-- 2) SELECT: user can read own rows
CREATE POLICY "activities_select_own"
ON stravad.activities
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

-- 3) INSERT: user can insert rows only for themselves
CREATE POLICY "activities_insert_own"
ON stravad.activities
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- 4) UPDATE: user can update only their rows, and cannot change ownership
CREATE POLICY "activities_update_own"
ON stravad.activities
FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- 5) DELETE: user can delete only their rows
CREATE POLICY "activities_delete_own"
ON stravad.activities
FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);

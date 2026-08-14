# Stravad

A lightweight React app that displays your Strava activities in fun ways, and allow you to gain further insights!

## What this project does

- Lets users sign up and log in with email/password
- Allow users to connect to their Strava account
- Syncs user's Strava activities into a database
- Shows user's Strava activities in a simple feed

## Architecture

- **Frontend**: Vite + React + TypeScript.

- **Backend**: Supabase functions

The Strava OAuth callback / exchange is implemented as a Supabase Edge Function (see `supabase/functions/strava-exchange`). This function performs the code->token exchange with Strava, verifies the caller's Supabase JWT, and stores tokens using the Supabase service role key (server-side only).

- **Sync script**: `scripts/sync-strava.ts`
  - Fetches recent Strava activities from the Strava API.
  - Writes new activity rows into Supabase, avoiding duplicate imports.
  - Refreshes the Strava OAuth token as needed.

- **Database**: Supabase Postgres
  - Stores authenticated user data and Strava activity records.
  - Uses Supabase Auth for login, signup, and password reset.

- **Workflows**: GitHub Actions
  - `/.github/workflows/daily-sync.yml` runs the Strava sync script on a daily schedule and supports manual dispatch.
  - The workflow updates Strava tokens in GitHub Secrets after refresh.

## Environment

The app expects runtime and build secrets in `.env`, Supabase, and GitHub Actions secrets. Secrets include:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`

## Run the project locally 

### Run Supabase Stack - including database

  1. Install the Supabase CLI (see https://supabase.com/docs/guides/cli). Example installs:

  ```bash
  # npm (cross-platform)
  npm install -g supabase

  # or on macOS via Homebrew
  brew install supabase/tap/supabase
  ```

  2. Starts the local Supabase services with `supabase start`
  3. Run database migrations with `supabase migration up`

The database UI will be available at:
```
http://localhost:54323/project/default
```

### Run Frontend Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm run dev
   ```


  ### Run the Supabase backend function locally

Serve the function locally from the project root:

  ```bash
  supabase functions serve strava-exchange --env-file supabase/functions/.env
  ```

  The function will be available at:

  ```
  http://localhost:54321/functions/v1/strava-exchange
  ```

  Example request (pass the user's JWT in `Authorization`):

  ```bash
  curl -X POST 'http://localhost:54321/functions/v1/strava-exchange' \
    -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"code":"<STRAVA_CODE>"}'
  ```

  If you prefer to test via the frontend, ensure `VITE_SUPABASE_URL` points to your local Supabase (usually `http://localhost:54321`) so the client posts to the local function URL.

## Notes

- The app uses a public Supabase anon key for the front end and a service role key in the sync workflow.
- The reset password flow uses Supabase email recovery and updates the password after the user clicks the recovery link.

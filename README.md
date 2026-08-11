# Stravad

A lightweight React app that displays Strava activity data stored in Supabase.

## What this project does

- Lets users sign up and log in with email/password.
- Syncs Strava activity data into a Supabase database on a scheduled GitHub Actions workflow.
- Shows the latest activities in a simple feed after login.
- Supports password reset via email with Supabase auth.

## Architecture

- **Frontend**: Vite + React + TypeScript.
  - `src/App.tsx` contains the auth UI, session handling, and activity feed.
  - `src/lib/supabaseClient.ts` initializes the Supabase client using environment variables.
  - `src/types.ts` defines shared data shapes like `Activity`.

- **Backend / sync script**: `scripts/sync-strava.ts`
  - Refreshes the Strava OAuth token as needed.
  - Fetches recent Strava activities from the Strava API.
  - Writes new activity rows into Supabase, avoiding duplicate imports.

- **Database**: Supabase Postgres
  - Stores authenticated user data and Strava activity records.
  - Uses Supabase Auth for login, signup, and password reset.

- **Workflows**: GitHub Actions
  - `/.github/workflows/daily-sync.yml` runs the Strava sync script on a daily schedule and supports manual dispatch.
  - The workflow updates Strava tokens in GitHub Secrets after refresh.

## Environment

The app expects runtime and build secrets in `.env` or GitHub Actions secrets, including:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRAVA_ACCESS_TOKEN`
- `STRAVA_REFRESH_TOKEN`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app:
   ```bash
   npm run dev
   ```

## Notes

- The app uses a public Supabase anon key for the front end and a service role key in the sync workflow.
- The reset password flow uses Supabase email recovery and updates the password after the user clicks the recovery link.

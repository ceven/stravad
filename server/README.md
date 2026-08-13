Stravad backend

This small Express app handles the Strava OAuth callback and optionally persists tokens to Supabase.

Setup

1. Install dependencies:

```bash
cd server
npm install
```

2. Create a `.env` file in `server/` based on `.env.example` and set `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`.

3. Start the server:

```bash
npm start
```

Usage

Set your Strava app's redirect URI to `http://<server-host>:<PORT>/auth/strava/callback` (e.g. `http://localhost:3001/auth/strava/callback`).

When Strava redirects back, the server exchanges the code and redirects the browser to the frontend `FRONTEND_URL/strava/callback` with `?connected=1`.

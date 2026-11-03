<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0eb3243d-781d-4d9e-9613-5f765508ecf4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Trading database

Set `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_JWKS_URL` as server-side environment variables in Netlify (and in `.env` for local Netlify development). Set `VITE_NEON_AUTH_URL` to the same Neon Auth base URL as a public browser build variable. Never prefix `DATABASE_URL` or `TWELVE_DATA_API_KEY` with `VITE_`.

Neon Managed Auth is enabled for the production branch. Apply migrations `002_trade_closures.sql` and `003_auth_rls.sql` to the existing database before deploying the trade function. The trade function verifies Auth JWTs, maps the verified subject to a profile, and uses RLS to restrict profiles and trades. It calculates realized P&L from the stored trade and server-defined contract size.

The production Auth redirect origin is `https://ticks.com.np`. Localhost is allowed by Neon Auth for development.

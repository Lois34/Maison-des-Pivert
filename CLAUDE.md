# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**La Maison des Piverts** — PWA Vue 3 de gestion domestique (inventaire, courses, recettes, lessive, tâches). Déployée sur Netlify + Supabase.

URL de production : `kaleidoscopic-biscotti-2e7cab.netlify.app`

## Build & Dev Commands

All commands run from `la-maison-des-piverts/`:

```bash
npm install          # install dependencies
npm run dev          # local dev server (Vite, hot reload)
npm run build        # production build → dist/
npm run preview      # preview built app
```

Netlify build (triggered on push to `main`):
```
cd la-maison-des-piverts && npm install && npm run build
```

There are no tests in this project.

## Architecture

```
AppPivert/
├── la-maison-des-piverts/      # Vue 3 + Vite SPA (main app)
│   ├── src/
│   │   ├── main.js             # Entry: Supabase auth init → mount app
│   │   ├── App.vue             # Root: layout + <RouterView>
│   │   ├── style.css           # Design system (CSS variables, typography)
│   │   ├── views/              # One file per route
│   │   ├── components/         # AppHeader, BottomNav, NotifPanel
│   │   ├── composables/        # useAuth.js, useTheme.js
│   │   ├── services/supabase.js # Supabase client singleton
│   │   └── router/index.js     # Vue Router + beforeEach auth guard
│   └── public/sw.js            # Service worker (PWA)
├── netlify/functions/          # Node.js serverless functions
│   ├── ia-proxy.js             # Proxies OpenRouter API (12s timeout)
│   └── ia-vision.js            # Vision/OCR for product detection
├── supabase/
│   ├── functions/              # TypeScript Edge Functions
│   │   ├── push-notif/         # Web Push notifications
│   │   └── notify-courses/     # Shopping list notifications
│   └── migrations/             # SQL migration files
└── netlify.toml                # Build config + CSP headers
```

## Key Patterns

**Vue 3 Composition API** — all components use `<script setup>`. No Options API.

**Authentication** — Supabase OTP (email → 8-digit code). Auth state is reactive via `useAuth.js` composable. Router guard in `router/index.js` redirects unauthenticated users to `/login`. Draft preview URLs (Netlify deploy previews) bypass auth.

**AI proxying** — Never call OpenRouter or Vision API directly from the frontend. Use Netlify functions (`/api/ia-proxy`, `/api/ia-vision`) to keep API keys server-side. `OPENROUTER_KEY` is set as a Netlify env var.

**Push notifications** — Subscriptions stored in Supabase table `push_subscriptions`. Triggers via Supabase Edge Functions (`push-notif`, `notify-courses`), not Netlify functions.

**Design system** — All colors, radii, spacing, and shadows come from CSS variables defined in `style.css`. The palette is "Forêt Close": moss greens, sage, parchment, bark tones. Fonts: Fraunces (display) + Nunito (UI) via Google Fonts.

## Environment Variables

`la-maison-des-piverts/.env` (committed):
```
VITE_SUPABASE_URL=https://flrwnvtruxmrofamkegy.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Netlify env var (set in dashboard, not in repo): `OPENROUTER_KEY`

## Deployment Notes

- **Frontend**: auto-deployed via Netlify on push to `main`. Static SPA with `/* → /index.html` redirect.
- **Supabase Edge Functions**: deployed manually with `supabase functions deploy <name>`.
- **Netlify Functions**: deployed automatically as part of the Netlify build.
- Test locally before pushing to save Netlify build minutes (see workflow memory).

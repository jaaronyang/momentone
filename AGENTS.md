# Agent instructions

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Unit tests: `npm test`
- Watch tests: `npm run test:watch`
- Production build: `npm run build`
- Preview build: `npm run preview`

## Notes

- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, …)
- Specs: `docs/prd.md` (product), `docs/rfc.md` (technical)
- Session logic is pure TS under `src/session` — prefer extending tests there
- Audio (`src/audio`) requires a real browser + user gesture; do not expect Tone to fully run in Vitest/jsdom
- Background-tab Pomodoro catch-up (visibility + tick) is best-effort; timers may drift while the tab is heavily throttled — known limitation
- No backend or env vars for v1
- Deploy: GitHub Pages via `.github/workflows/deploy.yml` (Vite `base` is `/momentone/`)

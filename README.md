# Momentone

Focus soundscapes for deep work, with an optional Pomodoro timer.

Momentone plays continuous, non-distracting generative audio in the browser. Pomodoro is optional — leave it off for indefinite focus sound, or turn it on for work/break cycles with quieter breaks on the same soundscape.

This is a research-informed deep-work tool, **not** a medical device or treatment for ADHD or any other condition.

## Quick start

```bash
npm install
npm run dev
```

Open the local URL, press **Start** (required for browser audio), and adjust volume / modulation as needed.

## Docs

- [PRD](docs/prd.md) — product goals, requirements, research positioning
- [RFC](docs/rfc.md) — architecture, audio graph, session FSM, testing

## Deploy

```bash
npm run build
```

Host the `dist/` folder on any static HTTPS host (Cloudflare Pages or Vercel free tier both work). No environment variables required.

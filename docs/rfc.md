# RFC: Momentone technical design

| Field | Value |
|-------|--------|
| **Status** | Draft |
| **Date** | 2026-08-01 |
| **Product** | Momentone |
| **Related** | [PRD: Momentone](./prd.md) |

## 1. Summary

Build Momentone as a **static Vite + React + TypeScript** web app. Audio is a **Tone.js** graph: generative focus sources through a shared FX bus (warmth filter + amplitude modulation). **Pomodoro is optional**: continuous play keeps audio at work level with no timer; when Pomodoro is enabled, the session FSM drives work/break and **break ducking**. No backend for v1. Optional curated beds later attach as samples into the same bus and can ship as static files.

## 2. Motivation

See the [PRD](./prd.md) for product goals. Technically we need:

- Reliable browser audio under autoplay policies
- A clear separation between **session timing** and **sound generation**
- An extension point for curated beds without rewriting the engine
- Free-tier deploy suitable for a workshop demo link

## 3. Goals / non-goals (technical)

**Goals**

- Client-only architecture; zero required server APIs for v1
- Testable session state machine (continuous + Pomodoro) independent of React and Tone
- Shared FX path for generative and future sample sources
- Sensible handling of AudioContext suspend / background tabs

**Non-goals**

- Next.js, SSR, or a database
- Streaming CDN auth, user uploads, or multi-tenant audio storage
- Bit-exact reproduction of any commercial focus-music pipeline
- Paid music generation APIs in v1

## 4. Proposal

### 4.1 High-level architecture

```mermaid
flowchart LR
  UI[React_UI] --> Session[Session_FSM]
  UI --> Audio[Tone_AudioEngine]
  Session -->|"optional_phase_and_duck"| Audio
  subgraph sources [Sources]
    Gen[GenerativeBed]
    Sample[SampleBed_later]
  end
  Gen --> FX[Shared_FX_AM_LPF]
  Sample --> FX
  FX --> Out[Master_Out]
```

Suggested source layout:

```text
src/
  audio/          # Tone graph: engine, sources, fx — no React
  session/        # Playback + optional Pomodoro FSM — pure helpers
  ui/             # React pages/components binding controls
  app/            # shell, routing if any (single view is fine)
```

### 4.2 Audio engine

**Signal chain (v1)**

1. **Sources (generative)**
   - Soft harmonic pad / drone (stable key, slow evolution)
   - Gentle rhythmic / pulse layer (subtle, not song-like)
   - Filtered noise (pink/brown) for masking
2. **Shared FX bus**
   - Low-pass / warmth to reduce distracting highs
   - Amplitude modulator: user **depth** 0–100%; rate in a focus-oriented band (~12–20 Hz), tunable in code/presets
3. **Master gain** + optional Pomodoro ducking
   - Continuous play / Pomodoro work: nominal level
   - Pomodoro break: same graph, lower master/bus gain (PRD: continuity, quieter)
   - Continuous play never enters break ducking

**Libraries:** Tone.js over Web Audio.

**Controls wired from UI:** start/stop (or play/pause), master volume, modulation depth, texture preset (maps to generative + FX params only).

**Start policy:** AudioContext / Tone starts only after an explicit user gesture (`Start`).

### 4.3 Extension: curated beds (v1.5+)

- Add `SampleBed` (Tone `Player` / grain player) feeding the **same** FX bus.
- Host a few seamless loops under `public/beds/*` on the static host.
- **No backend required** for a small fixed library. Introduce object storage or an API only if uploads, large catalogs, or gated assets appear later.

### 4.4 Session module (continuous + optional Pomodoro)

Pure TypeScript state machine, no Tone imports.

**Playback modes**

| Mode | Behavior |
|------|----------|
| `continuous` | Audio playing; no countdown; no phase changes; ducking off |
| `pomodoro` | Timer active; work/break phases; break ducking on |

Recommend default **continuous** (Pomodoro off) on first visit; persist the user’s choice.

| State | Behavior |
|-------|----------|
| `idle` | Prefs editable; audio stopped or silent |
| `playing` | Continuous mode: audio at work level, no timer |
| `work` | Pomodoro: countdown; audio at work level |
| `break` | Pomodoro: countdown; audio ducked |
| `paused` | Timer frozen if any; audio paused (prefer pause both) |

Events: `start`, `pause`, `resume`, `setPomodoro(on/off)`, `skipPhase` (Pomodoro only), `tick` / deadline reached, `reset`.

When Pomodoro is enabled mid-session: enter `work` with a fresh work duration (or remaining policy decided in implementation — prefer fresh work block). When disabled mid-session: leave break/work timer, keep audio playing in continuous mode at work level.

Defaults when Pomodoro is on: work **25m**, break **5m** (from prefs). Persist prefs via `localStorage` in the UI layer.

**Timer accuracy (Pomodoro only):** Prefer wall-clock deadlines (`Date.now()` + duration) over `setInterval` alone so background-tab throttling drifts less. Reconcile on `visibilitychange`. Document remaining Safari/Chrome quirks as known limitations for the demo.

### 4.5 UI

Single composition, session-first:

- Idle: brand **Momentone**, short line of purpose, **Pomodoro toggle**, duration prefs (visible/enabled when Pomodoro is on), Start
- Active (continuous): play/pause, volume, modulation, optional texture — no countdown chrome
- Active (Pomodoro): large timer, phase label (Work / Break), play/pause, skip, volume, modulation, optional texture

Keep chrome minimal during focus (few competing controls; deep-work friendly).

### 4.6 Deploy

- Build: Vite production build
- Host: Cloudflare Pages **or** Vercel free tier
- Env: none required for v1
- HTTPS required for reliable AudioContext on modern browsers

## 5. Alternatives considered

| Option | Why not for v1 |
|--------|----------------|
| **Library-first tracks + light FX** | Faster “music app” feel, but needs assets/licensing early; less aligned with generative-first + free tier |
| **Generative-only with no sample seam** | Slightly less code, but making beds later forces a redesign |
| **Next.js + backend** | Unnecessary for demo; adds cost/complexity |
| **Binaural-beats-centric design** | Mixed evidence; not the PRD’s research bet |
| **Paid AI beds in v1 (e.g. Suno)** | Conflicts with free-tier preference; defer |

**Chosen path:** Generative-first engine with a sample-ready FX bus (Approach 1 v1 ≈ Approach 3 surface area).

## 6. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Generative audio sounds thin or fatiguing | Iterate presets; keep Soft/Standard/Strong; listen checklist before demo |
| Over-claiming science / patent sensitivity | PRD copy rules; implement general AM + filtering; no Brain.fm assets or proprietary replication claims |
| Autoplay / suspended AudioContext | Explicit Start; resume prompt on return |
| Timer drift in background tabs | Wall-clock deadlines + visibility reconcile |
| Workshop demo flakiness on unknown browsers | Smoke-test Chrome + Safari; show unsupported message if needed |

## 7. Testing plan

**Automated (lightweight)**

- Unit tests for session FSM: continuous play, Pomodoro on/off, transitions, skip, pause/resume, duration boundaries

**Manual listen checklist**

- [ ] Start requires gesture; sound begins
- [ ] Continuous play has no timer UI / no auto break
- [ ] Enabling Pomodoro shows timer and runs work → break duck
- [ ] Disabling Pomodoro returns to indefinite play at work level
- [ ] Modulation depth low vs high is audible
- [ ] Work → break ducks volume; texture continuous
- [ ] Break → work restores level
- [ ] Pause/resume keeps audio (and phase if Pomodoro) coherent
- [ ] Prefs survive reload
- [ ] Deployed URL works for a second device/user

## 8. Rollout (workshop)

1. Implement v1 locally (separate session)
2. Deploy static site to free host
3. Share URL; no accounts
4. Optional: 1–2 curated beds post-demo if time allows (static assets only)

## 9. Open technical decisions (decide in implementation)

- Exact Tone node graph and modulator waveshape
- Break duck amount (e.g. −8 to −12 dB) and fade time
- Whether pause silences audio or only freezes the timer (recommend both)
- Cloudflare Pages vs Vercel

## 10. References (informative)

- Woods, K.J.P., et al. (2024). Rapid modulation in music supports attention in listeners with attentional difficulties. *Communications Biology*.
- Brain.fm public science materials (modulation / phase-locking positioning) — inspiration only, not a spec to copy.
- Tone.js documentation — Web Audio abstraction for the engine.

# Momentone v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static Vite + React + TypeScript app with Tone.js generative focus audio, optional Pomodoro FSM, and docs for running/testing (`AGENTS.md`) plus product description (`README.md`).

**Architecture:** Pure TypeScript session FSM (continuous + Pomodoro) drives UI and ducking; Tone.js audio engine (generative sources → shared LPF + AM FX → master gain) has no React imports. Prefs persist in `localStorage` from the UI layer. Single-view app, client-only.

**Tech Stack:** Vite, React 19, TypeScript, Tone.js, Vitest, Cloudflare Pages / Vercel compatible static build.

## Global Constraints

- Client-only; no backend, no env vars required for v1
- AudioContext / Tone starts only after explicit user **Start** gesture
- Default playback mode: **continuous** (Pomodoro off) on first visit
- Pomodoro defaults when enabled: work **25m**, break **5m**
- Break duck: **−10 dB**, ramp **500 ms**; continuous mode never ducks
- Pause: freeze timer (if any) **and** silence audio; resume restores both
- Product copy must not claim medical treatment or clinical outcomes
- Session module: pure TS, no Tone imports
- Soft / Standard / Strong texture presets map to generative + FX params only

---

## File Structure

```text
package.json
vite.config.ts
tsconfig.json
tsconfig.app.json
tsconfig.node.json
index.html
vitest.config.ts
src/
  main.tsx
  vite-env.d.ts
  app/
    App.tsx
    styles.css
  session/
    types.ts
    machine.ts
    machine.test.ts
    prefs.ts
    prefs.test.ts
  audio/
    types.ts
    presets.ts
    generative.ts
    fx.ts
    engine.ts
  ui/
    IdleView.tsx
    ActiveView.tsx
    UnsupportedAudio.tsx
AGENTS.md
README.md
docs/prd.md          # existing — do not rewrite
docs/rfc.md          # existing — do not rewrite
```

---

### Task 1: Scaffold Vite + React + TypeScript + Vitest

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `vitest.config.ts`, `src/main.tsx`, `src/vite-env.d.ts`, `src/app/App.tsx`, `src/app/styles.css`
- Modify: none (greenfield)

**Interfaces:**
- Consumes: n/a
- Produces: runnable Vite app shell; `npm test` runs Vitest; `npm run build` produces `dist/`

- [ ] **Step 1: Scaffold the project with Vite**

```bash
cd /Users/yang.jason/Desktop/personal/momentone
npm create vite@latest . -- --template react-ts
```

If the directory is non-empty and the scaffolder refuses, create files manually with equivalent Vite React-TS defaults instead of forcing overwrite of `docs/`, `README.md`, or `.git`.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install tone
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
```

In `package.json` scripts ensure:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Minimal App shell**

`src/app/App.tsx`:

```tsx
export function App() {
  return (
    <main>
      <h1>Momentone</h1>
      <p>Focus soundscapes for deep work.</p>
    </main>
  )
}
```

`src/main.tsx` mounts `<App />` into `#root` and imports `./app/styles.css`.

- [ ] **Step 5: Verify scaffold**

```bash
npm test
npm run build
```

Expected: tests exit 0 (0 tests OK); build succeeds.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts vitest.config.ts tsconfig*.json index.html src
git commit -m "$(cat <<'EOF'
chore: scaffold Vite React TypeScript app with Vitest

EOF
)"
```

---

### Task 2: Session FSM (pure TypeScript)

**Files:**
- Create: `src/session/types.ts`, `src/session/machine.ts`, `src/session/machine.test.ts`
- Test: `src/session/machine.test.ts`

**Interfaces:**
- Consumes: n/a
- Produces:
  - `SessionState`, `SessionEvent`, `SessionPrefs` types
  - `createInitialState(prefs: SessionPrefs, now: number): SessionState`
  - `reduce(state: SessionState, event: SessionEvent, now: number): SessionState`
  - `remainingMs(state: SessionState, now: number): number | null`

- [ ] **Step 1: Write failing tests for core transitions**

Create `src/session/types.ts` and `src/session/machine.test.ts` first (types needed by tests).

`src/session/types.ts`:

```ts
export type PlaybackMode = 'continuous' | 'pomodoro'
export type Phase = 'idle' | 'playing' | 'work' | 'break' | 'paused'

export type TexturePreset = 'soft' | 'standard' | 'strong'

export interface SessionPrefs {
  pomodoroEnabled: boolean
  workMinutes: number
  breakMinutes: number
  volume: number // 0–1
  modulationDepth: number // 0–1
  texture: TexturePreset
}

export interface SessionState {
  phase: Phase
  mode: PlaybackMode
  prefs: SessionPrefs
  /** Wall-clock deadline for current work/break; null in continuous/idle/paused-without-deadline */
  deadlineAt: number | null
  /** Remaining ms captured when entering paused from work/break */
  pausedRemainingMs: number | null
  /** Phase to restore on resume when paused from work/break/playing */
  resumePhase: 'playing' | 'work' | 'break' | null
}

export type SessionEvent =
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'tick' }
  | { type: 'skipPhase' }
  | { type: 'setPomodoro'; enabled: boolean }
  | { type: 'setPrefs'; prefs: Partial<SessionPrefs> }
```

`src/session/machine.test.ts` must cover at least:

```ts
import { describe, expect, it } from 'vitest'
import { createInitialState, reduce, remainingMs } from './machine'
import type { SessionPrefs } from './types'

const prefs: SessionPrefs = {
  pomodoroEnabled: false,
  workMinutes: 25,
  breakMinutes: 5,
  volume: 0.7,
  modulationDepth: 0.5,
  texture: 'standard',
}

describe('session machine', () => {
  it('starts continuous play with no deadline', () => {
    const s0 = createInitialState(prefs, 0)
    const s1 = reduce(s0, { type: 'start' }, 1000)
    expect(s1.phase).toBe('playing')
    expect(s1.mode).toBe('continuous')
    expect(s1.deadlineAt).toBeNull()
  })

  it('starts pomodoro in work with deadline', () => {
    const s0 = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    const s1 = reduce(s0, { type: 'start' }, 1000)
    expect(s1.phase).toBe('work')
    expect(s1.deadlineAt).toBe(1000 + 25 * 60_000)
  })

  it('transitions work → break on deadline tick', () => {
    let s = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'tick' }, 25 * 60_000)
    expect(s.phase).toBe('break')
    expect(s.deadlineAt).toBe(25 * 60_000 + 5 * 60_000)
  })

  it('transitions break → work on deadline tick', () => {
    let s = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'tick' }, 25 * 60_000)
    s = reduce(s, { type: 'tick' }, 30 * 60_000)
    expect(s.phase).toBe('work')
  })

  it('pause freezes remaining; resume restores deadline', () => {
    let s = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'pause' }, 5 * 60_000)
    expect(s.phase).toBe('paused')
    expect(s.pausedRemainingMs).toBe(20 * 60_000)
    s = reduce(s, { type: 'resume' }, 10 * 60_000)
    expect(s.phase).toBe('work')
    expect(s.deadlineAt).toBe(10 * 60_000 + 20 * 60_000)
  })

  it('skipPhase jumps work → break', () => {
    let s = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'skipPhase' }, 1000)
    expect(s.phase).toBe('break')
  })

  it('enabling pomodoro mid-session enters fresh work', () => {
    let s = createInitialState(prefs, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'setPomodoro'; enabled: true }, 5000)
    expect(s.phase).toBe('work')
    expect(s.mode).toBe('pomodoro')
    expect(s.deadlineAt).toBe(5000 + 25 * 60_000)
  })

  it('disabling pomodoro mid-session returns to continuous playing', () => {
    let s = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'setPomodoro'; enabled: false }, 5000)
    expect(s.phase).toBe('playing')
    expect(s.mode).toBe('continuous')
    expect(s.deadlineAt).toBeNull()
  })

  it('remainingMs is null in continuous playing', () => {
    let s = createInitialState(prefs, 0)
    s = reduce(s, { type: 'start' }, 0)
    expect(remainingMs(s, 1000)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/session/machine.test.ts
```

Expected: FAIL (module `./machine` not found or exports missing).

- [ ] **Step 3: Implement machine**

`src/session/machine.ts`:

```ts
import type { SessionEvent, SessionPrefs, SessionState } from './types'

export function createInitialState(prefs: SessionPrefs, _now: number): SessionState {
  return {
    phase: 'idle',
    mode: prefs.pomodoroEnabled ? 'pomodoro' : 'continuous',
    prefs,
    deadlineAt: null,
    pausedRemainingMs: null,
    resumePhase: null,
  }
}

function workMs(p: SessionPrefs) {
  return Math.max(1, p.workMinutes) * 60_000
}
function breakMs(p: SessionPrefs) {
  return Math.max(1, p.breakMinutes) * 60_000
}

export function remainingMs(state: SessionState, now: number): number | null {
  if (state.phase === 'paused') return state.pausedRemainingMs
  if (state.deadlineAt == null) return null
  return Math.max(0, state.deadlineAt - now)
}

export function reduce(state: SessionState, event: SessionEvent, now: number): SessionState {
  switch (event.type) {
    case 'setPrefs': {
      const prefs = { ...state.prefs, ...event.prefs }
      const mode = prefs.pomodoroEnabled ? 'pomodoro' : 'continuous'
      return { ...state, prefs, mode: state.phase === 'idle' ? mode : state.mode }
    }
    case 'start': {
      if (state.phase !== 'idle') return state
      if (state.prefs.pomodoroEnabled) {
        return {
          ...state,
          mode: 'pomodoro',
          phase: 'work',
          deadlineAt: now + workMs(state.prefs),
          pausedRemainingMs: null,
          resumePhase: null,
        }
      }
      return {
        ...state,
        mode: 'continuous',
        phase: 'playing',
        deadlineAt: null,
        pausedRemainingMs: null,
        resumePhase: null,
      }
    }
    case 'pause': {
      if (state.phase !== 'playing' && state.phase !== 'work' && state.phase !== 'break') {
        return state
      }
      const rem =
        state.phase === 'playing' ? null : remainingMs(state, now)
      return {
        ...state,
        phase: 'paused',
        pausedRemainingMs: rem,
        resumePhase: state.phase,
        deadlineAt: null,
      }
    }
    case 'resume': {
      if (state.phase !== 'paused' || !state.resumePhase) return state
      if (state.resumePhase === 'playing') {
        return {
          ...state,
          phase: 'playing',
          deadlineAt: null,
          pausedRemainingMs: null,
          resumePhase: null,
        }
      }
      const rem = state.pausedRemainingMs ?? 0
      return {
        ...state,
        phase: state.resumePhase,
        deadlineAt: now + rem,
        pausedRemainingMs: null,
        resumePhase: null,
      }
    }
    case 'reset':
      return createInitialState(state.prefs, now)
    case 'skipPhase': {
      if (state.mode !== 'pomodoro') return state
      if (state.phase === 'work') {
        return {
          ...state,
          phase: 'break',
          deadlineAt: now + breakMs(state.prefs),
          pausedRemainingMs: null,
          resumePhase: null,
        }
      }
      if (state.phase === 'break') {
        return {
          ...state,
          phase: 'work',
          deadlineAt: now + workMs(state.prefs),
          pausedRemainingMs: null,
          resumePhase: null,
        }
      }
      return state
    }
    case 'tick': {
      if (state.mode !== 'pomodoro') return state
      if (state.phase !== 'work' && state.phase !== 'break') return state
      if (state.deadlineAt == null || now < state.deadlineAt) return state
      if (state.phase === 'work') {
        return {
          ...state,
          phase: 'break',
          deadlineAt: now + breakMs(state.prefs),
        }
      }
      return {
        ...state,
        phase: 'work',
        deadlineAt: now + workMs(state.prefs),
      }
    }
    case 'setPomodoro': {
      const prefs = { ...state.prefs, pomodoroEnabled: event.enabled }
      if (state.phase === 'idle') {
        return {
          ...state,
          prefs,
          mode: event.enabled ? 'pomodoro' : 'continuous',
        }
      }
      if (event.enabled) {
        // Mid-session: fresh work block
        return {
          ...state,
          prefs,
          mode: 'pomodoro',
          phase: 'work',
          deadlineAt: now + workMs(prefs),
          pausedRemainingMs: null,
          resumePhase: null,
        }
      }
      // Disable: continuous at work level
      return {
        ...state,
        prefs,
        mode: 'continuous',
        phase: state.phase === 'paused' ? 'paused' : 'playing',
        deadlineAt: null,
        pausedRemainingMs: null,
        resumePhase: state.phase === 'paused' ? 'playing' : null,
      }
    }
    default:
      return state
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/session/machine.test.ts
```

Expected: PASS all cases.

- [ ] **Step 5: Commit**

```bash
git add src/session
git commit -m "$(cat <<'EOF'
feat: add pure session FSM for continuous and Pomodoro play

EOF
)"
```

---

### Task 3: Prefs persistence (`localStorage`)

**Files:**
- Create: `src/session/prefs.ts`, `src/session/prefs.test.ts`
- Test: `src/session/prefs.test.ts`

**Interfaces:**
- Consumes: `SessionPrefs` from `src/session/types.ts`
- Produces:
  - `DEFAULT_PREFS: SessionPrefs`
  - `loadPrefs(): SessionPrefs`
  - `savePrefs(prefs: SessionPrefs): void`

- [ ] **Step 1: Write failing prefs tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, loadPrefs, savePrefs } from './prefs'

describe('prefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when empty', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
    expect(DEFAULT_PREFS.pomodoroEnabled).toBe(false)
  })

  it('round-trips saved prefs', () => {
    const next = { ...DEFAULT_PREFS, volume: 0.4, pomodoroEnabled: true }
    savePrefs(next)
    expect(loadPrefs()).toEqual(next)
  })

  it('ignores corrupt JSON', () => {
    localStorage.setItem('momentone:prefs', '{not-json')
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
npm test -- src/session/prefs.test.ts
```

Expected: FAIL (module missing).

- [ ] **Step 3: Implement prefs**

```ts
import type { SessionPrefs } from './types'

const KEY = 'momentone:prefs'

export const DEFAULT_PREFS: SessionPrefs = {
  pomodoroEnabled: false,
  workMinutes: 25,
  breakMinutes: 5,
  volume: 0.7,
  modulationDepth: 0.45,
  texture: 'standard',
}

export function loadPrefs(): SessionPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<SessionPrefs>
    return { ...DEFAULT_PREFS, ...parsed }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(prefs: SessionPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/session/prefs.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/session/prefs.ts src/session/prefs.test.ts
git commit -m "$(cat <<'EOF'
feat: persist session prefs in localStorage

EOF
)"
```

---

### Task 4: Audio engine (Tone.js)

**Files:**
- Create: `src/audio/types.ts`, `src/audio/presets.ts`, `src/audio/generative.ts`, `src/audio/fx.ts`, `src/audio/engine.ts`
- Test: manual listen checklist (automated Tone graph tests optional / skip if flaky in jsdom)

**Interfaces:**
- Consumes: `TexturePreset` from session types (or re-export in audio types)
- Produces: `AudioEngine` class with:
  - `async start(): Promise<void>`
  - `stop(): void`
  - `pause(): void` / `resume(): void`
  - `setVolume(v: number): void` // 0–1
  - `setModulationDepth(d: number): void` // 0–1
  - `setTexture(preset: TexturePreset): void`
  - `setDucking(active: boolean): void` // break → true
  - `static isSupported(): boolean`

**Locked audio params:**
- AM rate: **16 Hz** sine LFO on shared gain (depth 0–100% maps to gain oscillation amount)
- Warmth: low-pass ~ **800–1800 Hz** depending on texture
- Break duck: master gain *= `Tone.dbToGain(-10)` over **0.5 s**
- Generative: soft pad (2–3 detuned sines), subtle pulse (soft square/triangle low gain), brown/pink noise filtered

- [ ] **Step 1: Implement presets**

`src/audio/presets.ts`:

```ts
import type { TexturePreset } from '../session/types'

export interface TextureParams {
  filterFreq: number
  pulseGain: number
  noiseGain: number
  padGain: number
  modRateHz: number
}

export const TEXTURE_PRESETS: Record<TexturePreset, TextureParams> = {
  soft: { filterFreq: 900, pulseGain: 0.02, noiseGain: 0.04, padGain: 0.18, modRateHz: 14 },
  standard: { filterFreq: 1400, pulseGain: 0.04, noiseGain: 0.06, padGain: 0.22, modRateHz: 16 },
  strong: { filterFreq: 1800, pulseGain: 0.07, noiseGain: 0.08, padGain: 0.26, modRateHz: 18 },
}

export const DUCK_DB = -10
export const DUCK_RAMP_SEC = 0.5
```

- [ ] **Step 2: Implement generative + FX + engine**

`src/audio/generative.ts` — build pad/pulse/noise, connect to a provided Tone `ToneAudioNode` input (FX bus). Export `dispose()` / `start()` / `stop()` helpers or class `GenerativeBed`.

`src/audio/fx.ts` — `Filter` (lowpass) → `Gain` (carrier) with `LFO` connected to gain for AM; expose `setDepth(0–1)`, `setFilterFreq`, `setRate`, `input`, `output`.

`src/audio/engine.ts` — compose GenerativeBed → FX → master Gain → destination. On `start()`, call `await Tone.start()`, start sources and LFO. `setDucking(true)` ramps master to `volume * Tone.dbToGain(-10)`; false restores `volume`. `pause()` sets master to 0 (or `Tone.getTransport().pause` + mute); prefer muting master gain to 0 with short ramp and stopping transport if used. `isSupported()` checks `window.AudioContext || window.webkitAudioContext`.

Keep implementation focused; no React imports in `src/audio/*`.

- [ ] **Step 3: Smoke-check in browser (manual)**

```bash
npm run dev
```

Temporarily wire a button in App that calls `engine.start()` — or proceed to Task 5 if wiring UI next. Confirm console has no Tone errors after Start.

- [ ] **Step 4: Commit**

```bash
git add src/audio
git commit -m "$(cat <<'EOF'
feat: add Tone.js generative engine with shared AM/LPF bus

EOF
)"
```

---

### Task 5: UI — bind session + audio

**Files:**
- Create: `src/ui/IdleView.tsx`, `src/ui/ActiveView.tsx`, `src/ui/UnsupportedAudio.tsx`
- Modify: `src/app/App.tsx`, `src/app/styles.css`, `src/main.tsx`
- Test: optional light React test for idle Start dispatch; prioritize manual checklist

**Interfaces:**
- Consumes: `reduce`, `createInitialState`, `remainingMs`, prefs helpers, `AudioEngine`
- Produces: full single-page UX per RFC §4.5

- [ ] **Step 1: Implement App controller**

`App.tsx` responsibilities:

1. On mount: `loadPrefs()` → `createInitialState`; if `!AudioEngine.isSupported()` render `UnsupportedAudio`.
2. Hold `session` state; `dispatch(event)` = `setSession(reduce(..., Date.now()))` + `savePrefs` when prefs change.
3. Own one `AudioEngine` instance (ref).
4. On `start` / `resume`: `await engine.start()` or `engine.resume()`, apply volume/mod/texture, `setDucking(phase === 'break')`.
5. On `pause` / `reset`: `engine.pause()` / `engine.stop()`.
6. When phase becomes `break`/`work`/`playing`: update ducking.
7. Pomodoro timer: `requestAnimationFrame` or `setInterval(250ms)` that dispatches `{ type: 'tick' }` and reads `remainingMs` for display; also listen to `visibilitychange` and dispatch `tick` with `Date.now()` on return.
8. Idle view vs Active view based on `phase === 'idle'`.

**IdleView:** brand Momentone (hero-level), one short purpose line, Pomodoro toggle, work/break duration inputs when Pomodoro on, Start CTA. Non-medical copy only.

**ActiveView:**
- Continuous: play/pause, volume, modulation, texture; **no** countdown
- Pomodoro: large timer `mm:ss`, phase label Work/Break, play/pause, skip, volume, modulation, texture
- Allow toggling Pomodoro on/off while active (dispatches `setPomodoro`)

**Styles:** Follow repo root `DESIGN.md` as the design language (warm cream canvas `#f7f7f4`, ink `#26251e`, primary CTA `#f54e00`, hairline-only depth, display weight 400 with negative tracking). Map DESIGN.md color/type/spacing/radius tokens to CSS variables in `src/app/styles.css`. Font stack: `'CursorGothic', system-ui, 'Helvetica Neue', Helvetica, Arial, sans-serif` for UI; JetBrains Mono only if showing code-like timer digits is desirable. Do not invent a different palette or load unrelated Google Fonts families. Brand wordmark may use primary orange scarcely. One composition, deep-work minimal chrome; mobile + desktop readable.

- [ ] **Step 2: Manual checklist pass**

Walk RFC §7 manual listen checklist locally via `npm run dev`.

- [ ] **Step 3: Commit**

```bash
git add src/app src/ui index.html
git commit -m "$(cat <<'EOF'
feat: wire session UI to audio engine and Pomodoro controls

EOF
)"
```

---

### Task 6: Documentation — `AGENTS.md` + `README.md`

**Files:**
- Modify: `AGENTS.md`, `README.md`

**Interfaces:**
- Consumes: final npm scripts
- Produces: agent runbook + human-facing README (PRD stays source of product detail)

- [ ] **Step 1: Write `AGENTS.md` (agent-only runbook)**

Keep short and imperative — how to run/test/build only:

```markdown
# Agent instructions

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Unit tests: `npm test`
- Watch tests: `npm run test:watch`
- Production build: `npm run build`
- Preview build: `npm run preview`

## Notes

- Specs: `docs/prd.md` (product), `docs/rfc.md` (technical)
- Session logic is pure TS under `src/session` — prefer extending tests there
- Audio (`src/audio`) requires a real browser + user gesture; do not expect Tone to fully run in Vitest/jsdom
- No backend or env vars for v1
- Deploy: static `dist/` to Cloudflare Pages or Vercel
```

- [ ] **Step 2: Expand `README.md` (human description)**

Keep product detail in PRD; README = short description + quick start + honesty note + links:

```markdown
# Momentone

Focus soundscapes for deep work, with an optional Pomodoro timer.

Momentone plays continuous, non-distracting generative audio in the browser. Pomodoro is optional — leave it off for indefinite focus sound, or turn it on for work/break cycles with quieter breaks on the same soundscape.

This is a research-informed deep-work tool, **not** a medical device or treatment for ADHD or any other condition.

## Quick start

\`\`\`bash
npm install
npm run dev
\`\`\`

Open the local URL, press **Start** (required for browser audio), and adjust volume / modulation as needed.

## Docs

- [PRD](docs/prd.md) — product goals, requirements, research positioning
- [RFC](docs/rfc.md) — architecture, audio graph, session FSM, testing

## Deploy

\`\`\`bash
npm run build
\`\`\`

Host the `dist/` folder on any static HTTPS host (Cloudflare Pages or Vercel free tier both work). No environment variables required.
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md README.md
git commit -m "$(cat <<'EOF'
docs: add agent runbook and README quick start

EOF
)"
```

---

### Task 7: Final verification

**Files:** none new

- [ ] **Step 1: Run full automated suite + build**

```bash
npm test
npm run build
```

Expected: all session/prefs tests pass; production build succeeds.

- [ ] **Step 2: Confirm docs exist and match scripts**

Cross-check `AGENTS.md` / `README.md` scripts against `package.json`.

- [ ] **Step 3: Final commit only if stray fixes remain**

```bash
git status
# if needed:
git add -A
git commit -m "$(cat <<'EOF'
chore: final v1 polish after verification

EOF
)"
```

---

## Self-review (plan vs RFC)

| RFC requirement | Task |
|-----------------|------|
| Vite + React + TS static app | 1 |
| Tone generative + shared FX (LPF + AM) | 4 |
| Optional Pomodoro + continuous; pure FSM | 2 |
| Break ducking −10 dB / 500 ms | 4 + 5 |
| Prefs localStorage | 3 |
| UI idle/active per §4.5 | 5 |
| Unit tests session FSM | 2 |
| Manual listen checklist | 5 / 7 |
| Deploy static | 6 docs |
| AGENTS.md + README.md | 6 |
| Sample beds v1.1 | out of scope (extension point only via shared FX) |

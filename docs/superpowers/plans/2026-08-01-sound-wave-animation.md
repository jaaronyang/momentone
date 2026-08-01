# Sound Wave Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a decorative CSS sound-wave under the active-session timer that animates while audio is audible, freezes on pause, and softens during break.

**Architecture:** A presentational `SoundWave` React component renders 5–7 bars with class modifiers (`is-active`, `is-break`). `ActiveView` derives those props from `session.phase` only. All motion lives in `styles.css` (`scaleY` keyframes + `prefers-reduced-motion`). No audio engine or session machine changes.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, plain CSS (DESIGN.md tokens already in `styles.css`).

## Global Constraints

- Decorative only: `aria-hidden="true"`; no analyser / Tone.js coupling.
- Animate only when `phase` is `playing` | `work` | `break`; freeze when `paused`.
- Break modifier only when `phase === 'break'` (not when paused from break).
- Color: `var(--color-ink-muted-48)` — do not use Action Blue for bars.
- Honor `prefers-reduced-motion: reduce` (static bars).
- Spec: `docs/superpowers/specs/2026-08-01-sound-wave-animation-design.md`.
- Commits: Conventional Commits; only commit when the user asks (plan steps that say “Commit” mean stage the message and wait unless the user requested commits).

---

## File Structure

| File | Responsibility |
|------|----------------|
| Create: `src/ui/SoundWave.tsx` | Presentational bars + class modifiers from props |
| Create: `src/ui/SoundWave.test.tsx` | Class / structure unit tests |
| Modify: `src/ui/ActiveView.tsx` | Place wave under timer; pass `active` / `breakMode` from phase |
| Modify: `src/app/styles.css` | Layout + keyframes + reduced-motion |
| Modify: `src/ui/App.test.tsx` | Integration: wave on active, freeze on pause, break class on break |

---

### Task 1: `SoundWave` component (TDD)

**Files:**
- Create: `src/ui/SoundWave.tsx`
- Create: `src/ui/SoundWave.test.tsx`

**Interfaces:**
- Consumes: nothing from other new tasks
- Produces:
  ```ts
  export interface SoundWaveProps {
    active: boolean
    breakMode?: boolean
  }
  export function SoundWave({ active, breakMode = false }: SoundWaveProps): JSX.Element
  ```
  - Root element: `div.sound-wave` with `data-testid="sound-wave"`, `aria-hidden="true"`
  - Classes: always `sound-wave`; add `is-active` when `active`; add `is-break` when `breakMode`
  - Children: exactly **5** `span.sound-wave__bar` elements

- [ ] **Step 1: Write the failing test**

Create `src/ui/SoundWave.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SoundWave } from './SoundWave'

describe('SoundWave', () => {
  it('renders five decorative bars with resting classes by default', () => {
    const { container } = render(<SoundWave active={false} />)
    const root = container.querySelector('[data-testid="sound-wave"]')
    expect(root).toBeTruthy()
    expect(root?.getAttribute('aria-hidden')).toBe('true')
    expect(root?.classList.contains('sound-wave')).toBe(true)
    expect(root?.classList.contains('is-active')).toBe(false)
    expect(root?.classList.contains('is-break')).toBe(false)
    expect(container.querySelectorAll('.sound-wave__bar')).toHaveLength(5)
  })

  it('adds is-active when active', () => {
    const { container } = render(<SoundWave active />)
    const root = container.querySelector('[data-testid="sound-wave"]')
    expect(root?.classList.contains('is-active')).toBe(true)
  })

  it('adds is-break when breakMode', () => {
    const { container } = render(<SoundWave active breakMode />)
    const root = container.querySelector('[data-testid="sound-wave"]')
    expect(root?.classList.contains('is-break')).toBe(true)
    expect(root?.classList.contains('is-active')).toBe(true)
  })

  it('can show is-break without is-active (paused-from-break callers should not pass breakMode)', () => {
    const { container } = render(<SoundWave active={false} breakMode />)
    const root = container.querySelector('[data-testid="sound-wave"]')
    expect(root?.classList.contains('is-break')).toBe(true)
    expect(root?.classList.contains('is-active')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/ui/SoundWave.test.tsx`

Expected: FAIL — cannot resolve `./SoundWave` (or similar module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/ui/SoundWave.tsx`:

```tsx
export interface SoundWaveProps {
  active: boolean
  breakMode?: boolean
}

const BAR_COUNT = 5

export function SoundWave({ active, breakMode = false }: SoundWaveProps) {
  const className = [
    'sound-wave',
    active ? 'is-active' : null,
    breakMode ? 'is-break' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} data-testid="sound-wave" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span key={i} className="sound-wave__bar" />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/ui/SoundWave.test.tsx`

Expected: PASS (all 4 tests).

- [ ] **Step 5: Commit (only if user requested commits)**

```bash
git add src/ui/SoundWave.tsx src/ui/SoundWave.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add SoundWave presentational component

EOF
)"
```

---

### Task 2: Wire into `ActiveView` + CSS motion

**Files:**
- Modify: `src/ui/ActiveView.tsx`
- Modify: `src/app/styles.css`
- Modify: `src/ui/App.test.tsx`

**Interfaces:**
- Consumes: `SoundWave` from Task 1 (`active`, `breakMode`)
- Produces: Active view shows wave under timer; CSS classes drive animation

**Phase → props mapping (exact):**

```ts
const waveActive =
  phase === 'playing' || phase === 'work' || phase === 'break'
const waveBreak = phase === 'break'
```

- [ ] **Step 1: Write failing App integration tests**

Append a new `describe` block to `src/ui/App.test.tsx` (keep existing mocks/`beforeEach`):

```tsx
describe('App sound wave', () => {
  beforeEach(() => {
    localStorage.clear()
    calls.length = 0
    startImpl = async () => {
      calls.push('start')
    }
  })

  it('shows an active wave after start in continuous mode', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(await screen.findByText('00:00')).toBeTruthy()

    const wave = screen.getByTestId('sound-wave')
    expect(wave.classList.contains('is-active')).toBe(true)
    expect(wave.classList.contains('is-break')).toBe(false)
  })

  it('freezes the wave when paused', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(await screen.findByText('00:00')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(await screen.findByRole('button', { name: 'Resume' })).toBeTruthy()

    const wave = screen.getByTestId('sound-wave')
    expect(wave.classList.contains('is-active')).toBe(false)
  })

  it('uses break modifier during an audible break', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByLabelText('Pomodoro'))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(await screen.findByText('Work')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(await screen.findByText('Break')).toBeTruthy()

    const wave = screen.getByTestId('sound-wave')
    expect(wave.classList.contains('is-active')).toBe(true)
    expect(wave.classList.contains('is-break')).toBe(true)
  })

  it('drops is-active on pause during break (no break duck while frozen)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByLabelText('Pomodoro'))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(await screen.findByText('Work')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(await screen.findByText('Break')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(await screen.findByRole('button', { name: 'Resume' })).toBeTruthy()

    const wave = screen.getByTestId('sound-wave')
    expect(wave.classList.contains('is-active')).toBe(false)
    expect(wave.classList.contains('is-break')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/ui/App.test.tsx`

Expected: FAIL — `getByTestId('sound-wave')` not found (or similar).

- [ ] **Step 3: Wire `SoundWave` into `ActiveView`**

In `src/ui/ActiveView.tsx`:

1. Add import:

```tsx
import { SoundWave } from './SoundWave'
```

2. After destructuring `phase`, compute:

```tsx
  const waveActive =
    phase === 'playing' || phase === 'work' || phase === 'break'
  const waveBreak = phase === 'break'
```

3. Insert the wave **after** the timer block and **before** `.transport`:

```tsx
        <SoundWave active={waveActive} breakMode={waveBreak} />
```

Full structural snippet for the compose region (preserve existing timer / transport / controls logic):

```tsx
      <div className="active-compose">
        {isPomodoro ? (
          <div className="timer-block">
            <p className="phase-label" aria-live="polite">
              {phaseLabel}
            </p>
            <p className="timer-display">{formatCountdown(remainingMs)}</p>
          </div>
        ) : (
          <div className="timer-block">
            <p className="timer-display" aria-live="polite">
              {formatElapsed(elapsedMs)}
            </p>
          </div>
        )}

        <SoundWave active={waveActive} breakMode={waveBreak} />

        <div className="transport">
          {/* existing transport buttons unchanged */}
```

- [ ] **Step 4: Add CSS for layout and animation**

Append to `src/app/styles.css` (after the Active section / before Form controls is fine):

```css
/* —— Sound wave (decorative) —— */
.sound-wave {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  margin: 0;
}

.sound-wave__bar {
  display: block;
  width: 3px;
  height: 100%;
  border-radius: var(--radius-xs);
  background: var(--color-ink-muted-48);
  transform-origin: center center;
  transform: scaleY(0.28);
}

.sound-wave.is-active .sound-wave__bar {
  animation-name: sound-wave-pulse;
  animation-duration: 1.05s;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

.sound-wave.is-active .sound-wave__bar:nth-child(1) {
  animation-delay: 0ms;
}
.sound-wave.is-active .sound-wave__bar:nth-child(2) {
  animation-delay: 120ms;
}
.sound-wave.is-active .sound-wave__bar:nth-child(3) {
  animation-delay: 240ms;
}
.sound-wave.is-active .sound-wave__bar:nth-child(4) {
  animation-delay: 180ms;
}
.sound-wave.is-active .sound-wave__bar:nth-child(5) {
  animation-delay: 60ms;
}

.sound-wave.is-active.is-break .sound-wave__bar {
  animation-name: sound-wave-pulse-break;
  animation-duration: 1.8s;
}

@keyframes sound-wave-pulse {
  0%,
  100% {
    transform: scaleY(0.28);
  }
  50% {
    transform: scaleY(1);
  }
}

@keyframes sound-wave-pulse-break {
  0%,
  100% {
    transform: scaleY(0.22);
  }
  50% {
    transform: scaleY(0.55);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sound-wave.is-active .sound-wave__bar {
    animation: none;
    transform: scaleY(0.28);
  }
}
```

- [ ] **Step 5: Run App + SoundWave tests**

Run: `npm test -- src/ui/App.test.tsx src/ui/SoundWave.test.tsx`

Expected: PASS (all existing App tests + new sound-wave tests + SoundWave unit tests).

- [ ] **Step 6: Manual smoke (optional but recommended)**

Run: `npm run dev`

Check: Start → wave animates under timer; Pause → freezes; Pomodoro Skip to Break → slower/lower pulse; End → idle (no wave).

- [ ] **Step 7: Commit (only if user requested commits)**

Suggested message (from spec):

```bash
git add src/ui/SoundWave.tsx src/ui/SoundWave.test.tsx src/ui/ActiveView.tsx src/app/styles.css src/ui/App.test.tsx docs/superpowers/specs/2026-08-01-sound-wave-animation-design.md
git commit -m "$(cat <<'EOF'
feat(ui): add decorative sound-wave while audio plays

EOF
)"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Decorative CSS bars | Task 1 + Task 2 CSS |
| Under timer, above transport | Task 2 ActiveView placement |
| Animate playing/work/break | Task 2 `waveActive` |
| Freeze on pause | Task 2 + App test |
| Softer/slower on break | Task 2 CSS `sound-wave-pulse-break` |
| `prefers-reduced-motion` | Task 2 CSS media query |
| `ink-muted-48` | Task 2 CSS |
| `aria-hidden` | Task 1 |
| No engine/machine changes | File structure (untouched) |
| UI tests for classes | Task 1 + Task 2 App tests |

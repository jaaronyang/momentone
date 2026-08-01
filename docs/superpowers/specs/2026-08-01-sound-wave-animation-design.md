# Sound wave animation (decorative CSS)

**Date:** 2026-08-01  
**Status:** Approved for planning  
**Scope:** Active session UI only — decorative “playing” signal

## Goal

Show a quiet sound-wave animation under the timer while focus audio is audible, so the active screen clearly signals that sound is on — without coupling to the Tone.js graph or competing with the timer hero.

## Decisions

| Choice | Decision |
|--------|----------|
| Style | Decorative CSS bars (not analyser-driven) |
| Placement | Under the timer, above transport |
| Playing | Animate for `playing`, `work`, and `break` |
| Paused | Bars visible, frozen at a low resting height |
| Break | Same animation, slower + lower amplitude (visual duck) |
| Motion a11y | `prefers-reduced-motion: reduce` → static bars |
| Color | `ink-muted-48` — Action Blue reserved for interactive chrome |
| Semantics | Decorative (`aria-hidden="true"`) |

## UI behavior

1. On ActiveView, render a centered row of 5–7 thin vertical bars between the timer block and the transport.
2. When `phase` is `playing` | `work` | `break`, apply a playing modifier so staggered `scaleY` keyframes run.
3. When `phase` is `paused`, omit the playing animation (resting heights only).
4. When `phase === 'break'` (audible break, not paused), apply a break modifier that slows the cycle and reduces max scale.
5. Reduced motion: disable keyframes; bars remain at resting height whenever shown.

**Paused:** Always freeze (no `is-active`). Paused work and paused break look the same — static low bars. Break modifiers apply only while `phase === 'break'`.

## Implementation sketch

### Components

- Prefer a small `SoundWave` presentational component under `src/ui/` taking props such as:
  - `active: boolean` — true when phase is `playing` | `work` | `break`
  - `breakMode: boolean` — true when audible break (`phase === 'break'`)
- Or inline equivalent markup in `ActiveView` if the helper would be thinner than the call site.
- No props from `AudioEngine`. Derive state only from `session.phase`.

### CSS (`styles.css`)

- `.sound-wave` flex row, centered, fixed height so layout does not jump.
- Bars: narrow width, rounded or square ends matching existing radius tokens lightly; `background: var(--color-ink-muted-48)`.
- Keyframes: `scaleY` pulse with per-bar `animation-delay` stagger.
- `.sound-wave.is-active` enables animation.
- `.sound-wave.is-break.is-active` uses longer duration and lower peak scale.
- `@media (prefers-reduced-motion: reduce)` disables animation.

### Out of scope

- Real-time analyser / Web Audio visualization
- Idle view wave
- Engine, session machine, or prefs changes
- Color tied to volume / modulation / texture

## Testing

- Extend UI tests (e.g. `App.test.tsx` or ActiveView-focused):
  - Wave present after start / on active view.
  - Playing/work/break: active (animating) class present.
  - Paused: active class absent (frozen).
  - Break: break modifier present while in break (not paused).
- Do not assert animation timing or computed keyframe values.

## Suggested commit message (implementation)

```
feat(ui): add decorative sound-wave while audio plays
```

import type { SessionPrefs, SessionState, TexturePreset } from '../session/types'
import { SoundWave } from './SoundWave'

export interface ActiveViewProps {
  session: SessionState
  remainingMs: number | null
  elapsedMs: number | null
  onPause: () => void
  onResume: () => void
  onSkip: () => void
  onReset: () => void
  onSetPomodoro: (enabled: boolean) => void
  onSetPrefs: (prefs: Partial<SessionPrefs>) => void
}

const TEXTURES: TexturePreset[] = ['soft', 'standard', 'strong']

export function ActiveView({
  session,
  remainingMs,
  elapsedMs,
  onPause,
  onResume,
  onSkip,
  onReset,
  onSetPomodoro,
  onSetPrefs,
}: ActiveViewProps) {
  const { prefs, mode, phase } = session
  const isPaused = phase === 'paused'
  const isPomodoro = mode === 'pomodoro'
  const phaseLabel = pomodoroPhaseLabel(session)
  const waveActive =
    phase === 'playing' || phase === 'work' || phase === 'break'
  const waveBreak = phase === 'break'

  return (
    <main className="shell active">
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
          {isPaused ? (
            <button type="button" className="btn-primary" onClick={onResume}>
              Resume
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={onPause}>
              Pause
            </button>
          )}
          {isPomodoro && (
            <button type="button" className="btn-secondary" onClick={onSkip} disabled={isPaused}>
              Skip
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={onReset}>
            End
          </button>
        </div>

        <div className="controls">
          <label className="toggle-row">
            <span>Pomodoro</span>
            <input
              type="checkbox"
              checked={prefs.pomodoroEnabled}
              onChange={(e) => onSetPomodoro(e.target.checked)}
            />
          </label>

          <label className="slider-row">
            <span>Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={prefs.volume}
              onChange={(e) => onSetPrefs({ volume: Number(e.target.value) })}
            />
          </label>

          <label className="slider-row">
            <span>Modulation</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={prefs.modulationDepth}
              onChange={(e) => onSetPrefs({ modulationDepth: Number(e.target.value) })}
            />
          </label>

          <label className="field texture-field">
            <span>Texture</span>
            <select
              value={prefs.texture}
              onChange={(e) => onSetPrefs({ texture: e.target.value as TexturePreset })}
            >
              {TEXTURES.map((t) => (
                <option key={t} value={t}>
                  {capitalize(t)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </main>
  )
}

function pomodoroPhaseLabel(session: SessionState): string {
  const effective =
    session.phase === 'paused' ? session.resumePhase : session.phase
  if (effective === 'break') return 'Break'
  if (effective === 'work') return 'Work'
  return 'Work'
}

function formatCountdown(ms: number | null): string {
  if (ms == null) return '--:--'
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  return formatClock(totalSec)
}

function formatElapsed(ms: number | null): string {
  if (ms == null) return '--:--'
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  return formatClock(totalSec)
}

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

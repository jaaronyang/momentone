import type { SessionPrefs, SessionState } from '../session/types'

export interface IdleViewProps {
  session: SessionState
  starting?: boolean
  startError?: string | null
  onStart: () => void
  onSetPomodoro: (enabled: boolean) => void
  onSetPrefs: (prefs: Partial<SessionPrefs>) => void
}

export function IdleView({
  session,
  starting = false,
  startError = null,
  onStart,
  onSetPomodoro,
  onSetPrefs,
}: IdleViewProps) {
  const { prefs } = session

  return (
    <main className="shell idle">
      <div className="idle-compose">
        <h1 className="brand">Momentone</h1>
        <p className="purpose">
          Live generative soundscapes for deep work.
        </p>

        <div className="prefs-block">
          <label className="toggle-row">
            <span>Pomodoro</span>
            <input
              type="checkbox"
              checked={prefs.pomodoroEnabled}
              onChange={(e) => onSetPomodoro(e.target.checked)}
            />
          </label>

          {prefs.pomodoroEnabled && (
            <div className="duration-row">
              <label className="field">
                <span>Work (min)</span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={prefs.workMinutes}
                  onChange={(e) =>
                    onSetPrefs({
                      workMinutes: clampMinutes(e.target.value, prefs.workMinutes, 180),
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Break (min)</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={prefs.breakMinutes}
                  onChange={(e) =>
                    onSetPrefs({
                      breakMinutes: clampMinutes(e.target.value, prefs.breakMinutes, 60),
                    })
                  }
                />
              </label>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={onStart}
          disabled={starting}
          aria-busy={starting}
        >
          {starting ? 'Starting…' : 'Start'}
        </button>
        {startError && (
          <p className="start-error" role="alert">
            {startError}
          </p>
        )}
      </div>
    </main>
  )
}

function clampMinutes(raw: string, fallback: number, max: number): number {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(max, n)
}

import type { SessionPrefs, SessionState } from '../session/types'

export interface IdleViewProps {
  session: SessionState
  onStart: () => void
  onSetPomodoro: (enabled: boolean) => void
  onSetPrefs: (prefs: Partial<SessionPrefs>) => void
}

export function IdleView({ session, onStart, onSetPomodoro, onSetPrefs }: IdleViewProps) {
  const { prefs } = session

  return (
    <main className="shell idle">
      <div className="idle-compose">
        <h1 className="brand">Momentone</h1>
        <p className="purpose">Focus soundscapes for deep work.</p>

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
                    onSetPrefs({ workMinutes: clampMinutes(e.target.value, prefs.workMinutes) })
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
                    onSetPrefs({ breakMinutes: clampMinutes(e.target.value, prefs.breakMinutes) })
                  }
                />
              </label>
            </div>
          )}
        </div>

        <button type="button" className="btn-primary" onClick={onStart}>
          Start
        </button>
      </div>
    </main>
  )
}

function clampMinutes(raw: string, fallback: number): number {
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return n
}

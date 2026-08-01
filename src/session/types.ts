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

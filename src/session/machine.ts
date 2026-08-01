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

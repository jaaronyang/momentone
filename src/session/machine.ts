import type { SessionEvent, SessionPrefs, SessionState } from './types'

export function createInitialState(prefs: SessionPrefs, _now: number): SessionState {
  return {
    phase: 'idle',
    mode: prefs.pomodoroEnabled ? 'pomodoro' : 'continuous',
    prefs,
    deadlineAt: null,
    pausedRemainingMs: null,
    resumePhase: null,
    elapsedOriginAt: null,
    pausedElapsedMs: null,
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

/** Elapsed play time for continuous mode; null in Pomodoro / idle. */
export function elapsedMs(state: SessionState, now: number): number | null {
  if (state.mode !== 'continuous') return null
  if (state.phase === 'paused' && state.resumePhase === 'playing') {
    return state.pausedElapsedMs ?? 0
  }
  if (state.phase === 'playing' && state.elapsedOriginAt != null) {
    return Math.max(0, now - state.elapsedOriginAt)
  }
  return null
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
          elapsedOriginAt: null,
          pausedElapsedMs: null,
        }
      }
      return {
        ...state,
        mode: 'continuous',
        phase: 'playing',
        deadlineAt: null,
        pausedRemainingMs: null,
        resumePhase: null,
        elapsedOriginAt: now,
        pausedElapsedMs: null,
      }
    }
    case 'pause': {
      if (state.phase !== 'playing' && state.phase !== 'work' && state.phase !== 'break') {
        return state
      }
      if (state.phase === 'playing') {
        const elapsed =
          state.elapsedOriginAt != null ? Math.max(0, now - state.elapsedOriginAt) : 0
        return {
          ...state,
          phase: 'paused',
          pausedRemainingMs: null,
          pausedElapsedMs: elapsed,
          resumePhase: 'playing',
          deadlineAt: null,
          elapsedOriginAt: null,
        }
      }
      return {
        ...state,
        phase: 'paused',
        pausedRemainingMs: remainingMs(state, now),
        resumePhase: state.phase,
        deadlineAt: null,
        elapsedOriginAt: null,
        pausedElapsedMs: null,
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
          elapsedOriginAt: now - (state.pausedElapsedMs ?? 0),
          pausedElapsedMs: null,
        }
      }
      const rem = state.pausedRemainingMs ?? 0
      return {
        ...state,
        phase: state.resumePhase,
        deadlineAt: now + rem,
        pausedRemainingMs: null,
        resumePhase: null,
        elapsedOriginAt: null,
        pausedElapsedMs: null,
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
          elapsedOriginAt: null,
          pausedElapsedMs: null,
        }
      }
      // Disable: continuous at work level; start elapsed fresh
      if (state.phase === 'paused') {
        return {
          ...state,
          prefs,
          mode: 'continuous',
          phase: 'paused',
          deadlineAt: null,
          pausedRemainingMs: null,
          resumePhase: 'playing',
          elapsedOriginAt: null,
          pausedElapsedMs: 0,
        }
      }
      return {
        ...state,
        prefs,
        mode: 'continuous',
        phase: 'playing',
        deadlineAt: null,
        pausedRemainingMs: null,
        resumePhase: null,
        elapsedOriginAt: now,
        pausedElapsedMs: null,
      }
    }
    default:
      return state
  }
}

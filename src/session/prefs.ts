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

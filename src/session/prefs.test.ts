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

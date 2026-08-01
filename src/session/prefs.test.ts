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

  it('clamps numbers and falls back invalid texture', () => {
    localStorage.setItem(
      'momentone:prefs',
      JSON.stringify({
        volume: 9,
        modulationDepth: -1,
        workMinutes: 999,
        breakMinutes: 0,
        texture: 'mega',
        junk: true,
      }),
    )
    expect(loadPrefs()).toEqual({
      ...DEFAULT_PREFS,
      volume: 1,
      modulationDepth: 0,
      workMinutes: 180,
      breakMinutes: 1,
      texture: 'standard',
    })
  })

  it('ignores non-object payloads', () => {
    localStorage.setItem('momentone:prefs', 'null')
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
    localStorage.setItem('momentone:prefs', '[]')
    expect(loadPrefs()).toEqual(DEFAULT_PREFS)
  })
})

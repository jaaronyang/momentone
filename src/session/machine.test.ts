import { describe, expect, it } from 'vitest'
import { createInitialState, reduce, remainingMs } from './machine'
import type { SessionPrefs } from './types'

const prefs: SessionPrefs = {
  pomodoroEnabled: false,
  workMinutes: 25,
  breakMinutes: 5,
  volume: 0.7,
  modulationDepth: 0.5,
  texture: 'standard',
}

describe('session machine', () => {
  it('starts continuous play with no deadline', () => {
    const s0 = createInitialState(prefs, 0)
    const s1 = reduce(s0, { type: 'start' }, 1000)
    expect(s1.phase).toBe('playing')
    expect(s1.mode).toBe('continuous')
    expect(s1.deadlineAt).toBeNull()
  })

  it('starts pomodoro in work with deadline', () => {
    const s0 = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    const s1 = reduce(s0, { type: 'start' }, 1000)
    expect(s1.phase).toBe('work')
    expect(s1.deadlineAt).toBe(1000 + 25 * 60_000)
  })

  it('transitions work → break on deadline tick', () => {
    let s = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'tick' }, 25 * 60_000)
    expect(s.phase).toBe('break')
    expect(s.deadlineAt).toBe(25 * 60_000 + 5 * 60_000)
  })

  it('transitions break → work on deadline tick', () => {
    let s = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'tick' }, 25 * 60_000)
    s = reduce(s, { type: 'tick' }, 30 * 60_000)
    expect(s.phase).toBe('work')
  })

  it('pause freezes remaining; resume restores deadline', () => {
    let s = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'pause' }, 5 * 60_000)
    expect(s.phase).toBe('paused')
    expect(s.pausedRemainingMs).toBe(20 * 60_000)
    s = reduce(s, { type: 'resume' }, 10 * 60_000)
    expect(s.phase).toBe('work')
    expect(s.deadlineAt).toBe(10 * 60_000 + 20 * 60_000)
  })

  it('skipPhase jumps work → break', () => {
    let s = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'skipPhase' }, 1000)
    expect(s.phase).toBe('break')
  })

  it('enabling pomodoro mid-session enters fresh work', () => {
    let s = createInitialState(prefs, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'setPomodoro', enabled: true }, 5000)
    expect(s.phase).toBe('work')
    expect(s.mode).toBe('pomodoro')
    expect(s.deadlineAt).toBe(5000 + 25 * 60_000)
  })

  it('disabling pomodoro mid-session returns to continuous playing', () => {
    let s = createInitialState({ ...prefs, pomodoroEnabled: true }, 0)
    s = reduce(s, { type: 'start' }, 0)
    s = reduce(s, { type: 'setPomodoro', enabled: false }, 5000)
    expect(s.phase).toBe('playing')
    expect(s.mode).toBe('continuous')
    expect(s.deadlineAt).toBeNull()
  })

  it('remainingMs is null in continuous playing', () => {
    let s = createInitialState(prefs, 0)
    s = reduce(s, { type: 'start' }, 0)
    expect(remainingMs(s, 1000)).toBeNull()
  })
})

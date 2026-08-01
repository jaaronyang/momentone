import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'

const calls: string[] = []
let startImpl: () => Promise<void> = async () => {
  calls.push('start')
}

vi.mock('../audio/engine', () => {
  class MockAudioEngine {
    static isSupported() {
      return true
    }
    async start() {
      return startImpl()
    }
    stop() {
      calls.push('stop')
    }
    pause() {
      calls.push('pause')
    }
    resume() {
      calls.push('resume')
    }
    resumeAudioContext() {
      calls.push('resumeAudioContext')
    }
    setVolume() {}
    setModulationDepth() {}
    setTexture() {}
    setDucking(active: boolean) {
      calls.push(`duck:${active}`)
    }
  }
  return { AudioEngine: MockAudioEngine }
})

describe('App idle Start', () => {
  beforeEach(() => {
    localStorage.clear()
    calls.length = 0
    startImpl = async () => {
      calls.push('start')
    }
  })

  it('dispatches start and shows active continuous view', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Momentone' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(await screen.findByText('00:00')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()
  })

  it('ducks before resume when restoring a break', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByLabelText('Pomodoro'))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(await screen.findByText('Work')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(await screen.findByText('Break')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(await screen.findByRole('button', { name: 'Resume' })).toBeTruthy()

    calls.length = 0
    await user.click(screen.getByRole('button', { name: 'Resume' }))

    expect(await screen.findByText('Break')).toBeTruthy()
    const duckIdx = calls.indexOf('duck:true')
    const resumeIdx = calls.indexOf('resume')
    expect(duckIdx).toBeGreaterThanOrEqual(0)
    expect(resumeIdx).toBeGreaterThanOrEqual(0)
    expect(duckIdx).toBeLessThan(resumeIdx)
  })

  it('resumes audio when enabling Pomodoro while paused', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(await screen.findByText('00:00')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(await screen.findByRole('button', { name: 'Resume' })).toBeTruthy()

    calls.length = 0
    await user.click(screen.getByLabelText('Pomodoro'))

    expect(await screen.findByText('Work')).toBeTruthy()
    expect(calls).toContain('resume')
    expect(calls.indexOf('duck:false')).toBeLessThan(calls.indexOf('resume'))
  })

  it('keeps idle and shows retry when start fails', async () => {
    startImpl = async () => {
      throw new Error('boom')
    }
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Start' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/try again/i)
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
    expect(screen.queryByText('00:00')).toBeNull()
  })
})

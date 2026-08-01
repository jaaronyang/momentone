import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'

const calls: string[] = []

vi.mock('../audio/engine', () => {
  class MockAudioEngine {
    static isSupported() {
      return true
    }
    async start() {
      calls.push('start')
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
  })

  it('dispatches start and shows active continuous view', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Momentone' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(await screen.findByText('Playing')).toBeTruthy()
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
    expect(await screen.findByText('Playing')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(await screen.findByText('Paused')).toBeTruthy()

    calls.length = 0
    await user.click(screen.getByLabelText('Pomodoro'))

    expect(await screen.findByText('Work')).toBeTruthy()
    expect(calls).toContain('resume')
    expect(calls.indexOf('duck:false')).toBeLessThan(calls.indexOf('resume'))
  })
})

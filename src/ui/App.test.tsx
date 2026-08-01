import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'

vi.mock('../audio/engine', () => {
  class MockAudioEngine {
    static isSupported() {
      return true
    }
    async start() {}
    stop() {}
    pause() {}
    resume() {}
    setVolume() {}
    setModulationDepth() {}
    setTexture() {}
    setDucking() {}
  }
  return { AudioEngine: MockAudioEngine }
})

describe('App idle Start', () => {
  beforeEach(() => {
    localStorage.clear()
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
})

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SoundWave } from './SoundWave'

describe('SoundWave', () => {
  it('renders five decorative bars with resting classes by default', () => {
    const { container } = render(<SoundWave active={false} />)
    const root = container.querySelector('[data-testid="sound-wave"]')
    expect(root).toBeTruthy()
    expect(root?.getAttribute('aria-hidden')).toBe('true')
    expect(root?.classList.contains('sound-wave')).toBe(true)
    expect(root?.classList.contains('is-active')).toBe(false)
    expect(root?.classList.contains('is-break')).toBe(false)
    expect(container.querySelectorAll('.sound-wave__bar')).toHaveLength(5)
  })

  it('adds is-active when active', () => {
    const { container } = render(<SoundWave active />)
    const root = container.querySelector('[data-testid="sound-wave"]')
    expect(root?.classList.contains('is-active')).toBe(true)
  })

  it('adds is-break when breakMode', () => {
    const { container } = render(<SoundWave active breakMode />)
    const root = container.querySelector('[data-testid="sound-wave"]')
    expect(root?.classList.contains('is-break')).toBe(true)
    expect(root?.classList.contains('is-active')).toBe(true)
  })

  it('can show is-break without is-active (paused-from-break callers should not pass breakMode)', () => {
    const { container } = render(<SoundWave active={false} breakMode />)
    const root = container.querySelector('[data-testid="sound-wave"]')
    expect(root?.classList.contains('is-break')).toBe(true)
    expect(root?.classList.contains('is-active')).toBe(false)
  })
})

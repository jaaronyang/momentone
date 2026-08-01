export interface SoundWaveProps {
  active: boolean
  breakMode?: boolean
}

const BAR_COUNT = 5

export function SoundWave({ active, breakMode = false }: SoundWaveProps) {
  const className = [
    'sound-wave',
    active ? 'is-active' : null,
    breakMode ? 'is-break' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} data-testid="sound-wave" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span key={i} className="sound-wave__bar" />
      ))}
    </div>
  )
}

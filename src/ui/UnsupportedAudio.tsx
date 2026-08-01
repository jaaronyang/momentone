export function UnsupportedAudio() {
  return (
    <main className="shell unsupported">
      <h1 className="brand">Momentone</h1>
      <p className="purpose">
        This browser does not support the Web Audio API, which Momentone needs to play focus
        soundscapes.
      </p>
      <p className="hint">Try Chrome, Safari, or Firefox on a recent desktop or mobile device.</p>
    </main>
  )
}

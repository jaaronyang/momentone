import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine } from '../audio/engine'
import { createInitialState, reduce, remainingMs } from '../session/machine'
import { loadPrefs, savePrefs } from '../session/prefs'
import type { SessionEvent, SessionPrefs, SessionState } from '../session/types'
import { ActiveView } from '../ui/ActiveView'
import { IdleView } from '../ui/IdleView'
import { UnsupportedAudio } from '../ui/UnsupportedAudio'

export function App() {
  const [supported] = useState(() => AudioEngine.isSupported())
  const [session, setSession] = useState<SessionState>(() =>
    createInitialState(loadPrefs(), Date.now()),
  )
  const [now, setNow] = useState(() => Date.now())
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const engineRef = useRef<AudioEngine | null>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session

  if (supported && !engineRef.current) {
    engineRef.current = new AudioEngine()
  }

  const applySession = useCallback((event: SessionEvent, at = Date.now()) => {
    setNow(at)
    setSession((prev) => {
      const next = reduce(prev, event, at)
      if (next.prefs !== prev.prefs) {
        savePrefs(next.prefs)
      }
      return next
    })
  }, [])

  const syncEnginePrefs = useCallback((prefs: SessionPrefs) => {
    const engine = engineRef.current
    if (!engine) return
    engine.setVolume(prefs.volume)
    engine.setModulationDepth(prefs.modulationDepth)
    engine.setTexture(prefs.texture)
  }, [])

  // Keep engine volume / mod / texture in sync with prefs
  useEffect(() => {
    syncEnginePrefs(session.prefs)
  }, [session.prefs, syncEnginePrefs])

  // Duck on break phases
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    engine.setDucking(session.phase === 'break')
  }, [session.phase])

  // Pomodoro tick + display clock
  useEffect(() => {
    if (session.phase !== 'work' && session.phase !== 'break') return
    const id = window.setInterval(() => {
      const at = Date.now()
      setNow(at)
      setSession((prev) => reduce(prev, { type: 'tick' }, at))
    }, 250)
    return () => window.clearInterval(id)
  }, [session.phase])

  // Reconcile deadline + resume AudioContext when tab becomes visible again
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const at = Date.now()
      const next = reduce(sessionRef.current, { type: 'tick' }, at)
      setNow(at)
      setSession(next)
      const audible =
        next.phase === 'playing' || next.phase === 'work' || next.phase === 'break'
      if (audible) {
        engineRef.current?.resumeAudioContext()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Stop audio if component unmounts
  useEffect(() => {
    return () => {
      engineRef.current?.stop()
    }
  }, [])

  const handleStart = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    const current = sessionRef.current
    if (current.phase !== 'idle') return
    if (starting) return

    setStarting(true)
    setStartError(null)
    syncEnginePrefs(current.prefs)

    try {
      await engine.start()
      const at = Date.now()
      const next = reduce(sessionRef.current, { type: 'start' }, at)
      // If user reset or phase changed while awaiting, stay put and stop audio.
      if (sessionRef.current.phase !== 'idle') {
        engine.stop()
        return
      }
      engine.setDucking(next.phase === 'break')
      setNow(at)
      setSession(next)
    } catch {
      setStartError("Couldn't start audio. Try again.")
    } finally {
      setStarting(false)
    }
  }, [starting, syncEnginePrefs])

  const handlePause = useCallback(() => {
    engineRef.current?.pause()
    applySession({ type: 'pause' })
  }, [applySession])

  const handleResume = useCallback(() => {
    const engine = engineRef.current
    const current = sessionRef.current
    if (current.phase !== 'paused') return
    // Duck before audio returns so break resume isn't a full-volume flash
    engine?.setDucking(current.resumePhase === 'break')
    engine?.resume()
    applySession({ type: 'resume' })
  }, [applySession])

  const handleSkip = useCallback(() => {
    applySession({ type: 'skipPhase' })
  }, [applySession])

  const handleReset = useCallback(() => {
    engineRef.current?.stop()
    applySession({ type: 'reset' })
  }, [applySession])

  const handleSetPomodoro = useCallback((enabled: boolean) => {
    const at = Date.now()
    const prev = sessionRef.current
    const next = reduce(prev, { type: 'setPomodoro', enabled }, at)
    const engine = engineRef.current
    if (engine) {
      engine.setDucking(next.phase === 'break')
      const audible =
        next.phase === 'work' || next.phase === 'break' || next.phase === 'playing'
      if (prev.phase === 'paused' && audible) {
        engine.resume()
      } else if (next.phase === 'paused' && prev.phase !== 'paused') {
        engine.pause()
      }
    }
    if (next.prefs !== prev.prefs) {
      savePrefs(next.prefs)
    }
    setNow(at)
    setSession(next)
  }, [])

  const handleSetPrefs = useCallback(
    (prefs: Partial<SessionPrefs>) => {
      const clamped: Partial<SessionPrefs> = { ...prefs }
      if (clamped.workMinutes != null) {
        clamped.workMinutes = Math.min(180, Math.max(1, clamped.workMinutes))
      }
      if (clamped.breakMinutes != null) {
        clamped.breakMinutes = Math.min(60, Math.max(1, clamped.breakMinutes))
      }
      applySession({ type: 'setPrefs', prefs: clamped })
    },
    [applySession],
  )

  if (!supported) {
    return <UnsupportedAudio />
  }

  if (session.phase === 'idle') {
    return (
      <IdleView
        session={session}
        starting={starting}
        startError={startError}
        onStart={() => {
          void handleStart()
        }}
        onSetPomodoro={handleSetPomodoro}
        onSetPrefs={handleSetPrefs}
      />
    )
  }

  return (
    <ActiveView
      session={session}
      remainingMs={remainingMs(session, now)}
      onPause={handlePause}
      onResume={handleResume}
      onSkip={handleSkip}
      onReset={handleReset}
      onSetPomodoro={handleSetPomodoro}
      onSetPrefs={handleSetPrefs}
    />
  )
}

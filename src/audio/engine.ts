import { Gain, dbToGain, start as toneStart } from 'tone'
import { SharedFxBus } from './fx'
import { GenerativeBed } from './generative'
import { DUCK_DB, DUCK_RAMP_SEC, TEXTURE_PRESETS } from './presets'
import type { TexturePreset } from '../session/types'

const MUTE_RAMP_SEC = 0.05

/**
 * Tone.js generative engine. No React imports.
 * Graph: GenerativeBed → SharedFxBus (LPF + AM) → master Gain → destination.
 */
export class AudioEngine {
  private fx: SharedFxBus | null = null
  private bed: GenerativeBed | null = null
  private master: Gain | null = null

  private volume = 0.7
  private modulationDepth = 0
  private ducking = false
  private paused = false
  private started = false
  private texture: TexturePreset = 'standard'

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false
    const w = window as unknown as {
      AudioContext?: unknown
      webkitAudioContext?: unknown
    }
    return typeof w.AudioContext !== 'undefined' || typeof w.webkitAudioContext !== 'undefined'
  }

  async start(): Promise<void> {
    if (this.started) {
      if (this.paused) this.resume()
      return
    }
    if (!AudioEngine.isSupported()) {
      throw new Error('Web Audio API is not supported in this environment')
    }

    await toneStart()

    const fx = new SharedFxBus()
    const bed = new GenerativeBed(fx.input, TEXTURE_PRESETS[this.texture])
    const master = new Gain(0)
    fx.output.connect(master)
    master.toDestination()

    this.fx = fx
    this.bed = bed
    this.master = master

    fx.setFilterFreq(TEXTURE_PRESETS[this.texture].filterFreq)
    fx.setRate(TEXTURE_PRESETS[this.texture].modRateHz)
    fx.setDepth(this.modulationDepth)

    bed.start()
    fx.start()

    this.started = true
    this.paused = false
    this.applyMasterGain(MUTE_RAMP_SEC)
  }

  stop(): void {
    if (!this.started) return
    this.bed?.stop()
    this.fx?.stop()
    this.bed?.dispose()
    this.fx?.dispose()
    this.master?.dispose()
    this.bed = null
    this.fx = null
    this.master = null
    this.started = false
    this.paused = false
    this.ducking = false
  }

  pause(): void {
    if (!this.started || this.paused) return
    this.paused = true
    this.master?.gain.rampTo(0, MUTE_RAMP_SEC)
  }

  resume(): void {
    if (!this.started || !this.paused) return
    this.paused = false
    this.applyMasterGain(MUTE_RAMP_SEC)
  }

  setVolume(v: number): void {
    this.volume = clamp01(v)
    if (this.started && !this.paused) {
      this.applyMasterGain(0.05)
    }
  }

  setModulationDepth(d: number): void {
    this.modulationDepth = clamp01(d)
    this.fx?.setDepth(this.modulationDepth)
  }

  setTexture(preset: TexturePreset): void {
    this.texture = preset
    const params = TEXTURE_PRESETS[preset]
    this.bed?.applyParams(params)
    this.fx?.setFilterFreq(params.filterFreq)
    this.fx?.setRate(params.modRateHz)
  }

  setDucking(active: boolean): void {
    this.ducking = active
    if (this.started && !this.paused) {
      this.applyMasterGain(DUCK_RAMP_SEC)
    }
  }

  /** Expose FX input for future SampleBed attachment. */
  getFxInput() {
    return this.fx?.input ?? null
  }

  private applyMasterGain(rampSec: number): void {
    if (!this.master) return
    const duckFactor = this.ducking ? dbToGain(DUCK_DB) : 1
    const target = this.paused ? 0 : this.volume * duckFactor
    this.master.gain.rampTo(target, rampSec)
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

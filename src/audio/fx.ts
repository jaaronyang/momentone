import { Filter, Gain, LFO } from 'tone'
import { TEXTURE_PRESETS } from './presets'

/**
 * Shared FX bus: low-pass warmth → AM carrier gain.
 * SampleBed (later) can connect to the same `input`.
 */
export class SharedFxBus {
  readonly input: Filter
  readonly output: Gain
  private readonly carrier: Gain
  private readonly lfo: LFO
  private depth = 0

  constructor() {
    const defaults = TEXTURE_PRESETS.standard
    this.input = new Filter({
      type: 'lowpass',
      frequency: defaults.filterFreq,
      rolloff: -24,
      Q: 0.7,
    })
    this.carrier = new Gain(1)
    this.output = this.carrier
    this.lfo = new LFO({
      type: 'sine',
      frequency: defaults.modRateHz,
      min: 1,
      max: 1,
    })

    this.input.connect(this.carrier)
    this.lfo.connect(this.carrier.gain)
  }

  setFilterFreq(hz: number): void {
    this.input.frequency.rampTo(hz, 0.15)
  }

  setRate(hz: number): void {
    this.lfo.frequency.rampTo(hz, 0.15)
  }

  /** Modulation depth 0–1 → LFO sweeps carrier gain between (1 − d) and 1. */
  setDepth(depth: number): void {
    const d = clamp01(depth)
    this.depth = d
    this.lfo.min = 1 - d
    this.lfo.max = 1
  }

  getDepth(): number {
    return this.depth
  }

  start(): void {
    this.lfo.start()
  }

  stop(): void {
    this.lfo.stop()
  }

  dispose(): void {
    this.lfo.dispose()
    this.input.dispose()
    this.carrier.dispose()
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

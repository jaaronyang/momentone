import { Filter, Gain, Noise, Oscillator, type ToneAudioNode } from 'tone'
import { TEXTURE_PRESETS, type TextureParams } from './presets'

/** Soft pad fundamentals (Hz) with light detune for chorusing. */
const PAD_FREQS = [110, 110.35, 164.8] as const
const PULSE_FREQ = 55

/**
 * Generative focus bed: detuned sine pad + soft pulse + filtered noise.
 * Connects into a provided FX-bus input; no destination ownership.
 */
export class GenerativeBed {
  private readonly bus: Gain
  private readonly padGain: Gain
  private readonly pulseGain: Gain
  private readonly noiseGain: Gain
  private readonly noiseFilter: Filter
  private readonly pads: Oscillator[]
  private readonly pulse: Oscillator
  private readonly noise: Noise
  private running = false

  constructor(fxInput: ToneAudioNode, params: TextureParams = TEXTURE_PRESETS.standard) {
    this.bus = new Gain(1)
    this.padGain = new Gain(params.padGain)
    this.pulseGain = new Gain(params.pulseGain)
    this.noiseGain = new Gain(params.noiseGain)
    this.noiseFilter = new Filter({
      type: 'lowpass',
      frequency: 600,
      rolloff: -12,
      Q: 0.5,
    })

    this.pads = PAD_FREQS.map(
      (freq) =>
        new Oscillator({
          type: 'sine',
          frequency: freq,
          volume: -6,
        }),
    )
    this.pulse = new Oscillator({
      type: 'triangle',
      frequency: PULSE_FREQ,
    })
    this.noise = new Noise('brown')

    for (const osc of this.pads) {
      osc.connect(this.padGain)
    }
    this.pulse.connect(this.pulseGain)
    this.noise.connect(this.noiseFilter)
    this.noiseFilter.connect(this.noiseGain)

    this.padGain.connect(this.bus)
    this.pulseGain.connect(this.bus)
    this.noiseGain.connect(this.bus)
    this.bus.connect(fxInput)
  }

  applyParams(params: TextureParams): void {
    this.padGain.gain.rampTo(params.padGain, 0.2)
    this.pulseGain.gain.rampTo(params.pulseGain, 0.2)
    this.noiseGain.gain.rampTo(params.noiseGain, 0.2)
  }

  start(): void {
    if (this.running) return
    for (const osc of this.pads) osc.start()
    this.pulse.start()
    this.noise.start()
    this.running = true
  }

  stop(): void {
    if (!this.running) return
    for (const osc of this.pads) osc.stop()
    this.pulse.stop()
    this.noise.stop()
    this.running = false
  }

  dispose(): void {
    this.stop()
    for (const osc of this.pads) osc.dispose()
    this.pulse.dispose()
    this.noise.dispose()
    this.noiseFilter.dispose()
    this.padGain.dispose()
    this.pulseGain.dispose()
    this.noiseGain.dispose()
    this.bus.dispose()
  }
}

import type { TexturePreset } from '../session/types'

export interface TextureParams {
  filterFreq: number
  pulseGain: number
  noiseGain: number
  padGain: number
  modRateHz: number
}

export const TEXTURE_PRESETS: Record<TexturePreset, TextureParams> = {
  soft: { filterFreq: 900, pulseGain: 0.02, noiseGain: 0.04, padGain: 0.18, modRateHz: 14 },
  standard: { filterFreq: 1400, pulseGain: 0.04, noiseGain: 0.06, padGain: 0.22, modRateHz: 16 },
  strong: { filterFreq: 1800, pulseGain: 0.07, noiseGain: 0.08, padGain: 0.26, modRateHz: 18 },
}

export const DUCK_DB = -10
export const DUCK_RAMP_SEC = 0.5

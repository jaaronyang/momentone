import type { SessionPrefs, TexturePreset } from './types'

const KEY = 'momentone:prefs'

const TEXTURES: readonly TexturePreset[] = ['soft', 'standard', 'strong']

export const DEFAULT_PREFS: SessionPrefs = {
  pomodoroEnabled: false,
  workMinutes: 25,
  breakMinutes: 5,
  volume: 0.7,
  modulationDepth: 0.45,
  texture: 'standard',
}

export function loadPrefs(): SessionPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_PREFS }
    }
    return coercePrefs(parsed as Record<string, unknown>)
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(prefs: SessionPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}

function coercePrefs(raw: Record<string, unknown>): SessionPrefs {
  return {
    pomodoroEnabled: Boolean(raw.pomodoroEnabled ?? DEFAULT_PREFS.pomodoroEnabled),
    workMinutes: clampInt(raw.workMinutes, DEFAULT_PREFS.workMinutes, 1, 180),
    breakMinutes: clampInt(raw.breakMinutes, DEFAULT_PREFS.breakMinutes, 1, 60),
    volume: clampNum(raw.volume, DEFAULT_PREFS.volume, 0, 1),
    modulationDepth: clampNum(raw.modulationDepth, DEFAULT_PREFS.modulationDepth, 0, 1),
    texture: coerceTexture(raw.texture),
  }
}

function coerceTexture(value: unknown): TexturePreset {
  return TEXTURES.includes(value as TexturePreset)
    ? (value as TexturePreset)
    : DEFAULT_PREFS.texture
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function clampNum(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

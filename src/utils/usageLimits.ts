export type FeatureKey = 'foro' | 'diary' | 'chatbot'

type FeatureLimit = {
  dailyLimit: number // para free (por día)
  label: string
}

const TZ = 'America/Argentina/Buenos_Aires'

export const FEATURE_LIMITS: Record<FeatureKey, FeatureLimit> = {
  // foro: gratis NO puede crear publicaciones (limit 0)
  foro: { dailyLimit: 0, label: 'Foro' },

  // diario: 10 por día (gratis)
  diary: { dailyLimit: 10, label: 'Diario' },

  // chatbot: 10 por día (gratis) — como pediste
  chatbot: { dailyLimit: 10, label: 'Chatbot' },
}

/** YYYY-MM-DD en timezone Argentina */
function dayKeyAR(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const y = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const d = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${y}-${m}-${d}` // "2026-02-03"
}

function storageKey(feature: FeatureKey) {
  return `nura_usage_${feature}`
}

type StoredUsage = {
  day: string
  used: number
}

export function getUsage(feature: FeatureKey) {
  const raw = localStorage.getItem(storageKey(feature))
  const current = dayKeyAR()

  if (!raw) {
    const initial: StoredUsage = { day: current, used: 0 }
    localStorage.setItem(storageKey(feature), JSON.stringify(initial))
    return initial
  }

  try {
    const parsed = JSON.parse(raw) as StoredUsage

    // si cambió el día (según Argentina), reset
    if (parsed.day !== current) {
      const reset: StoredUsage = { day: current, used: 0 }
      localStorage.setItem(storageKey(feature), JSON.stringify(reset))
      return reset
    }

    return parsed
  } catch {
    const reset: StoredUsage = { day: current, used: 0 }
    localStorage.setItem(storageKey(feature), JSON.stringify(reset))
    return reset
  }
}

export function setUsage(feature: FeatureKey, used: number) {
  const current = dayKeyAR()
  const next: StoredUsage = { day: current, used: Math.max(0, used) }
  localStorage.setItem(storageKey(feature), JSON.stringify(next))
  return next
}

export function incrementUsage(feature: FeatureKey, amount = 1) {
  const current = getUsage(feature)
  return setUsage(feature, current.used + amount)
}

export function remainingForFree(feature: FeatureKey) {
  const limit = FEATURE_LIMITS[feature].dailyLimit
  const usage = getUsage(feature).used
  const remaining = Math.max(0, limit - usage)
  return { limit, used: usage, remaining }
}

export function canUseFree(feature: FeatureKey) {
  const { limit, remaining } = remainingForFree(feature)

  // si limit es 0 -> no permitido (ej: crear post)
  if (limit <= 0) return false

  return remaining > 0
}

/** util opcional: texto para UI */
export function nextResetInfoAR() {
  // próximo reset: mañana 00:00 AR
  const now = new Date()
  const today = dayKeyAR(now)

  // construimos fecha "mañana" sumando 1 día en local y formateamos AR
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = dayKeyAR(tomorrow)

  return { today, tomorrow: tomorrowKey, timezone: TZ }
}

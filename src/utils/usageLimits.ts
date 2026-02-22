export type FeatureKey = 'foro' | 'diary' | 'chatbot'

type Period = 'day' | 'month'

type FeatureLimit = {
  limit: number
  label: string
  period: Period
}

const TZ = 'America/Argentina/Buenos_Aires'

export const FEATURE_LIMITS: Record<FeatureKey, FeatureLimit> = {
  foro: { limit: 0, label: 'Foro', period: 'day' },
  diary: { limit: 10, label: 'Diario', period: 'month' },
  chatbot: { limit: 10, label: 'Chatbot', period: 'day' },
}

function partsAR(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
}

function dayKeyAR(date = new Date()) {
  const parts = partsAR(date)
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const d = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${y}-${m}-${d}`
}

function monthKeyAR(date = new Date()) {
  const parts = partsAR(date)
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  return `${y}-${m}`
}

function windowKeyAR(feature: FeatureKey, date = new Date()) {
  const { period } = FEATURE_LIMITS[feature]
  return period === 'month' ? monthKeyAR(date) : dayKeyAR(date)
}

function storageKey(feature: FeatureKey) {
  return `nura_usage_${feature}`
}

type StoredUsage = {
  window: string
  used: number
}

export function getUsage(feature: FeatureKey) {
  const raw = localStorage.getItem(storageKey(feature))
  const currentWindow = windowKeyAR(feature)

  if (!raw) {
    const initial: StoredUsage = { window: currentWindow, used: 0 }
    localStorage.setItem(storageKey(feature), JSON.stringify(initial))
    return initial
  }

  try {
    const parsed = JSON.parse(raw) as StoredUsage

    if (parsed.window !== currentWindow) {
      const reset: StoredUsage = { window: currentWindow, used: 0 }
      localStorage.setItem(storageKey(feature), JSON.stringify(reset))
      return reset
    }

    return parsed
  } catch {
    const reset: StoredUsage = { window: currentWindow, used: 0 }
    localStorage.setItem(storageKey(feature), JSON.stringify(reset))
    return reset
  }
}

export function setUsage(feature: FeatureKey, used: number) {
  const currentWindow = windowKeyAR(feature)
  const next: StoredUsage = { window: currentWindow, used: Math.max(0, used) }
  localStorage.setItem(storageKey(feature), JSON.stringify(next))
  return next
}

export function incrementUsage(feature: FeatureKey, amount = 1) {
  const current = getUsage(feature)
  return setUsage(feature, current.used + Math.max(0, amount))
}

export function remainingForFree(feature: FeatureKey) {
  const { limit } = FEATURE_LIMITS[feature]
  const usage = getUsage(feature).used
  const remaining = Math.max(0, limit - usage)
  return { limit, used: usage, remaining }
}

export function canUseFree(feature: FeatureKey) {
  const { limit, remaining } = remainingForFree(feature)
  if (limit <= 0) return false
  return remaining > 0
}

export function nextResetInfoAR(feature: FeatureKey) {
  const { period } = FEATURE_LIMITS[feature]

  if (period === 'month') {
    const now = new Date()
    const current = monthKeyAR(now)
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextKey = monthKeyAR(next)
    return { current, next: nextKey, timezone: TZ, period }
  }

  const now = new Date()
  const today = dayKeyAR(now)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = dayKeyAR(tomorrow)
  return { current: today, next: tomorrowKey, timezone: TZ, period }
}
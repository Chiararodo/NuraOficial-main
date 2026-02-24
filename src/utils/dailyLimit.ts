export type DailyLimitState = {
  dateKey: string
  used: number
  remaining: number
  limit: number
}

const TZ_AR = 'America/Argentina/Buenos_Aires'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/** YYYY-MM-DD en horario de Argentina */
export function getTodayKeyAR(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_AR,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const y = parts.find((p) => p.type === 'year')?.value ?? '0000'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const d = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${y}-${m}-${d}`
}

function storageKey(feature: string, dateKey: string) {
  return `nura_daily_${feature}_${dateKey}`
}

export function getDailyUsed(feature: string, dateKey = getTodayKeyAR()): number {
  const raw = localStorage.getItem(storageKey(feature, dateKey))
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export function setDailyUsed(feature: string, used: number, dateKey = getTodayKeyAR()) {
  const safe = Math.max(0, Math.floor(used))
  localStorage.setItem(storageKey(feature, dateKey), String(safe))
}

export function getDailyState(
  feature: string,
  limit: number,
  dateKey = getTodayKeyAR()
): DailyLimitState {
  const used = getDailyUsed(feature, dateKey)
  const remaining = Math.max(0, limit - used)
  return { dateKey, used, remaining, limit }
}

/** Incrementa 1 uso y devuelve el estado actualizado */
export function consumeDaily(feature: string, limit: number): DailyLimitState {
  const dateKey = getTodayKeyAR()
  const used = getDailyUsed(feature, dateKey)
  const nextUsed = used + 1
  setDailyUsed(feature, nextUsed, dateKey)
  return getDailyState(feature, limit, dateKey)
}

/** Resetea el contador del día */
export function resetDaily(feature: string, dateKey = getTodayKeyAR()) {
  localStorage.removeItem(storageKey(feature, dateKey))
}


export function dailyLabelAR(dateKey: string) {

  const [y, m, d] = dateKey.split('-').map((x) => Number(x))
  return `${pad2(d)}/${pad2(m)}/${y}`
}

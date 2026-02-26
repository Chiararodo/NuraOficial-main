const KEY = 'nura_cache_especialistas_v1'
const TTL_MS = 120_000 // 120s (cambiá a 30_000 si querés 30s)

export function saveEspecialistasCache(data: unknown) {
  localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), data }))
}

export function readEspecialistasCache() {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.ts) return null
    // si querés TTL estricto:
    // if (Date.now() - parsed.ts > TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}
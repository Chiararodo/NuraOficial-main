import { ref } from 'vue'

function normalizeBase(base: string) {
  return base.replace(/\/+$/, '')
}

const API_BASE = normalizeBase(import.meta.env.VITE_NURA_API_URL || '/api')

/** =======================
 * Cache (B) - LocalStorage
 * ======================= */
const ESPECIALISTAS_CACHE_KEY = 'nura_cache_especialistas_v1'

function saveEspecialistasCache(data: unknown) {
  try {
    localStorage.setItem(
      ESPECIALISTAS_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data })
    )
  } catch {
    // ignore (quota/private mode)
  }
}

function readEspecialistasCache<T = any>(): T | null {
  try {
    const raw = localStorage.getItem(ESPECIALISTAS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return (parsed?.data ?? null) as T | null
  } catch {
    return null
  }
}

/** =======================
 * Fetch helpers
 * ======================= */
async function fetchWithTimeout(url: string, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(t)
  }
}

function isTransientStatus(status: number) {
  return status === 502 || status === 503 || status === 504
}

async function fetchJsonWithRetry(url: string, retries = 2, timeoutMs = 10_000) {
  let lastErr: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, timeoutMs)

      if (!res.ok) {
        // retry solo para errores típicos de gateway/timeouts
        if (isTransientStatus(res.status) && attempt < retries) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
          continue
        }
        throw new Error(`Error ${res.status}`)
      }

      return await res.json()
    } catch (e) {
      lastErr = e
      if (attempt >= retries) break
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
    }
  }

  throw lastErr ?? new Error('Error de red')
}

export function useNuraApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Te devuelvo:
   * - data: lista o payload
   * - fromCache: true si cayó al cache local
   *
   * En Cartilla podés usar `fromCache` para mostrar un aviso.
   */
  async function fetchEspecialistas(
    params: Record<string, string | undefined> = {}
  ): Promise<{ data: any; fromCache: boolean }> {
    loading.value = true
    error.value = null

    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value && value.trim() !== '') searchParams.append(key, value.trim())
    })

    const url =
      `${API_BASE}/especialistas` +
      (searchParams.toString() ? `?${searchParams.toString()}` : '')

    try {
      const json = await fetchJsonWithRetry(url, 2, 10_000)

      const data = (json?.data ?? json) // soporta {data: ...} o directo
      saveEspecialistasCache(data)

      return { data, fromCache: false }
    } catch (e: any) {
      // Fallback cache
      const cached = readEspecialistasCache()
      if (cached) {
        error.value = null
        return { data: cached, fromCache: true }
      }

      error.value = e?.message || 'Error de red'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchEspecialidades() {
    loading.value = true
    error.value = null

    try {
      const json = await fetchJsonWithRetry(`${API_BASE}/especialidades`, 1, 10_000)
      return json.data ?? json
    } catch (e: any) {
      error.value = e?.message || 'Error cargando especialidades'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { API_BASE, loading, error, fetchEspecialistas, fetchEspecialidades }
}
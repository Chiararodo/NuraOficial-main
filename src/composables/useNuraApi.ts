// src/composables/useNuraApi.ts
import { ref } from 'vue'

function normalizeBase(base: string) {
  return base.replace(/\/+$/, '')
}

const API_BASE = normalizeBase(
  import.meta.env.VITE_NURA_API_URL || '/api'
)

export function useNuraApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchEspecialistas(params: Record<string, string | undefined> = {}) {
    loading.value = true
    error.value = null

    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value && value.trim() !== '') searchParams.append(key, value.trim())
    })

    const url =
      `${API_BASE}/especialistas` +
      (searchParams.toString() ? `?${searchParams.toString()}` : '')

    const res = await fetch(url)
    if (!res.ok) {
      error.value = `Error ${res.status}`
      loading.value = false
      throw new Error(error.value)
    }

    const json = await res.json()
    loading.value = false
    return json.data ?? json
  }

  async function fetchEspecialidades() {
    const res = await fetch(`${API_BASE}/especialidades`)
    if (!res.ok) throw new Error('Error cargando especialidades')
    const json = await res.json()
    return json.data ?? json
  }

  return { API_BASE, loading, error, fetchEspecialistas, fetchEspecialidades }
}
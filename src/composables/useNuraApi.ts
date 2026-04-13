import { ref } from 'vue'

function normalizeBase(base: string) {
  return base.replace(/\/+$/, '')
}

const API_BASE = normalizeBase(
  import.meta.env.VITE_NURA_API_URL || 'https://backend-nura.onrender.com/api'
)

type CrearTurnoPayload = {
  especialistaId: string
  pacienteNombre: string
  pacienteEmail: string
  start: string
  end: string
  notes?: string
}

export function useNuraApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchEspecialistas(
    params: Record<string, string | undefined> = {}
  ) {
    loading.value = true
    error.value = null

    try {
      const searchParams = new URLSearchParams()

      Object.entries(params).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          searchParams.append(key, value.trim())
        }
      })

      const url =
        `${API_BASE}/especialistas` +
        (searchParams.toString() ? `?${searchParams.toString()}` : '')

      const res = await fetch(url)

      if (!res.ok) {
        error.value = `Error ${res.status}`
        throw new Error(error.value)
      }

      const json = await res.json()
      return json.data ?? json
    } finally {
      loading.value = false
    }
  }

  async function fetchEspecialidades() {
    const res = await fetch(`${API_BASE}/especialidades`)
    if (!res.ok) throw new Error('Error cargando especialidades')
    const json = await res.json()
    return json.data ?? json
  }

  async function fetchTurnosByEspecialista(especialistaId: string) {
    const res = await fetch(`${API_BASE}/turnos/especialista/${especialistaId}`)
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.message || `Error ${res.status}`)
    }

    return json?.data ?? []
  }

  async function fetchDisponibilidad(especialistaId: string, from: string, to: string) {
    const params = new URLSearchParams({ from, to })
    const res = await fetch(`${API_BASE}/turnos/disponibilidad/${especialistaId}?${params.toString()}`)
    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.message || 'No se pudo obtener la disponibilidad')
    }

    return json?.data ?? { ocupados: [] }
  }

  async function crearTurno(payload: CrearTurnoPayload) {
    const res = await fetch(`${API_BASE}/turnos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.message || 'No se pudo crear el turno')
    }

    return json?.data ?? json
  }

  async function editarTurno(turnoId: string, payload: Partial<CrearTurnoPayload>) {
    const res = await fetch(`${API_BASE}/turnos/${turnoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.message || 'No se pudo editar el turno')
    }

    return json?.data ?? json
  }

  async function cancelarTurno(turnoId: string) {
    const res = await fetch(`${API_BASE}/turnos/${turnoId}/cancelar`, {
      method: 'PATCH'
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.message || 'No se pudo cancelar el turno')
    }

    return json?.data ?? json
  }

  async function syncGoogleCalendar(especialistaId: string) {
    const res = await fetch(`${API_BASE}/google-sync/${especialistaId}/sync`, {
      method: 'POST'
    })

    const json = await res.json().catch(() => null)

    if (!res.ok) {
      throw new Error(json?.message || 'No se pudo sincronizar Google Calendar')
    }

    return json?.data ?? json
  }

  function getGoogleConnectUrl(especialistaId: string) {
    return `${API_BASE}/google/connect/${especialistaId}`
  }

  return {
    API_BASE,
    loading,
    error,
    fetchEspecialistas,
    fetchEspecialidades,
    fetchTurnosByEspecialista,
    fetchDisponibilidad,
    crearTurno,
    editarTurno,
    cancelarTurno,
    syncGoogleCalendar,
    getGoogleConnectUrl
  }
}
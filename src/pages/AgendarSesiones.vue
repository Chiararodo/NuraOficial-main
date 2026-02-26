<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const auth = useAuthStore()

type SesionDb = {
  id: string
  title: string
  professional: string
  role: string
  date: string
  hour: string
  modality: string
  capacity: number
  registered: number | null
  description: string | null
  image_path: string | null
  disponible?: boolean | null
  meet_url?: string | null
}

type Sesion = {
  id: string
  titulo: string
  profesional: string
  rol: string
  fecha: string
  fechaISO: string
  hora: string
  modalidad: string
  descripcion: string
  imagen: string
  capacidad: number
  registrados: number
  disponible: boolean
  meetUrl?: string
}

const sesiones = ref<Sesion[]>([])
const loading = ref(true)

const myRegs = ref<Set<string>>(new Set())
const busyId = ref<string | null>(null)

const showInfo = ref(false)
const infoTitle = ref('')
const infoText = ref('')

function openInfo(title: string, text: string) {
  infoTitle.value = title
  infoText.value = text
  showInfo.value = true
}

const showConfirm = ref(false)
const confirmTitle = ref('')
const confirmText = ref('')
const confirmBusy = ref(false)
const pendingSession = ref<Sesion | null>(null)

function openConfirmCancel(s: Sesion) {
  pendingSession.value = s
  confirmTitle.value = '¿Seguro que querés cancelar tu lugar?'
  confirmText.value =
    'Si cancelás, liberás tu cupo para otra persona. Si más adelante hay lugar, vas a poder anotarte de nuevo.'
  showConfirm.value = true
}

function closeConfirm() {
  if (!confirmBusy.value) {
    showConfirm.value = false
    pendingSession.value = null
  }
}

function goBackToAgendar() {
  router.push('/app/agendar')
}
function goEventos() {
  router.push('/app/agendar/eventos')
}

async function createNotification(title: string, body: string, type: string | null = null) {
  if (!auth.user) return
  await supabase.from('notifications').insert({
    user_id: auth.user.id,
    title,
    body,
    type
  })
}

function formatFecha(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

async function loadMySessionRegistrations() {
  if (!auth.user) {
    myRegs.value = new Set()
    return
  }

  const { data, error } = await supabase
    .from('session_registrations')
    .select('session_id')
    .eq('user_id', auth.user.id)

  if (error) {
    myRegs.value = new Set()
    return
  }

  myRegs.value = new Set((data || []).map((r: any) => r.session_id))
}

async function loadSesiones() {
  loading.value = true

  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, professional, role, date, hour, modality, capacity, registered, description, image_path, disponible, meet_url')
    .order('date', { ascending: true })
    .order('hour', { ascending: true })

  if (error) {
    sesiones.value = []
    loading.value = false
    return
  }

  const rows = (data || []) as SesionDb[]

  sesiones.value = rows.map((r) => ({
    id: r.id,
    titulo: r.title,
    profesional: r.professional,
    rol: r.role,
    fechaISO: r.date,
    fecha: formatFecha(r.date),
    hora: r.hour,
    modalidad: r.modality,
    descripcion: r.description ?? '',
    imagen: r.image_path || '/covers/placeholder-session.jpg',
    capacidad: r.capacity,
    registrados: r.registered ?? 0,
    disponible: !!r.disponible,
    meetUrl: r.meet_url || undefined
  }))

  loading.value = false
}

async function loadSessionCounts() {
  const ids = sesiones.value.map((s) => s.id)
  if (!ids.length) return

  const { data, error } = await supabase
    .from('session_registrations')
    .select('session_id')
    .in('session_id', ids)

  if (error) return

  const counts = new Map<string, number>()
  for (const row of data || []) {
    const id = (row as any).session_id as string
    counts.set(id, (counts.get(id) || 0) + 1)
  }

  sesiones.value = sesiones.value.map((s) => ({
    ...s,
    registrados: counts.get(s.id) || 0
  }))
}

function isRegistered(s: Sesion) {
  return myRegs.value.has(s.id)
}

function estaLlena(s: Sesion) {
  return s.registrados >= s.capacidad
}

function cuposTexto(s: Sesion) {
  if (estaLlena(s)) return 'Cupos completos'
  return `Cupos: ${s.registrados}/${s.capacidad}`
}

function canRegister(s: Sesion) {
  if (!auth.user) return true
  if (isRegistered(s)) return false
  if (estaLlena(s)) return false
  if (busyId.value) return false
  return true
}

async function registrarmeSesion(s: Sesion) {
  if (!auth.user) {
    openInfo('Necesitás iniciar sesión', 'Iniciá sesión para poder anotarte en una sesión.')
    return
  }
  if (isRegistered(s)) {
    openInfo('Ya tenés un lugar', 'Tu lugar ya está reservado para esta sesión.')
    return
  }
  if (estaLlena(s)) {
    openInfo('Sesión completa', 'Esta sesión ya no tiene cupos disponibles.')
    return
  }

  busyId.value = s.id

  const { error } = await supabase
    .from('session_registrations')
    .upsert(
      { user_id: auth.user.id, session_id: s.id },
      { onConflict: 'user_id,session_id', ignoreDuplicates: true }
    )

  if (error) {
    busyId.value = null
    openInfo('No pudimos registrarte', 'Hubo un problema al reservar tu lugar. Probá nuevamente.')
    return
  }

  myRegs.value = new Set([...myRegs.value, s.id])
  await loadSessionCounts()

  await createNotification(
    'Sesión reservada',
    `Tu lugar quedó reservado para "${s.titulo}" (${s.fecha} a las ${s.hora}).`,
    'session'
  )

  busyId.value = null
  openInfo('¡Listo!', 'Tu lugar quedó reservado. Te vamos a avisar cuando se acerque la sesión.')
}

async function desregistrarmeSesion(s: Sesion) {
  if (!auth.user) return
  if (!isRegistered(s)) return

  busyId.value = s.id

  const { data: row } = await supabase
    .from('session_registrations')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('session_id', s.id)
    .maybeSingle()

  if (!row?.id) {
    await loadMySessionRegistrations()
    busyId.value = null
    return
  }

  const { error } = await supabase.from('session_registrations').delete().eq('id', row.id)

  if (error) {
    busyId.value = null
    openInfo('No pudimos cancelar', 'Hubo un problema al cancelar tu lugar. Probá de nuevo.')
    return
  }

  const next = new Set(myRegs.value)
  next.delete(s.id)
  myRegs.value = next
  await loadSessionCounts()

  await createNotification('Lugar cancelado', `Cancelaste tu lugar en "${s.titulo}".`, 'session')

  busyId.value = null
  openInfo('Listo', 'Tu lugar fue cancelado. Si querés, podés anotarte de nuevo si hay cupos.')
}

async function confirmCancel() {
  if (!pendingSession.value) return
  confirmBusy.value = true
  await desregistrarmeSesion(pendingSession.value)
  confirmBusy.value = false
  showConfirm.value = false
  pendingSession.value = null
}

function unirmeSesion(s: Sesion) {
  if (!s.disponible || !s.meetUrl) {
    openInfo(
      'Todavía no está habilitado',
      'Esta sesión se va a habilitar el día y horario indicados. Cuando esté disponible, vas a poder unirte desde acá.'
    )
    return
  }
  window.open(s.meetUrl, '_blank')
}

onMounted(async () => {
  await Promise.all([loadSesiones(), loadMySessionRegistrations()])
  await loadSessionCounts()
})
</script>

<template>
  <h1 class="visually-hidden">Agendar sesiones</h1>

  <main class="agendar-sub">
    <header class="sub-header">
      <button class="back-link" type="button" @click="goBackToAgendar">
        <span class="arrow">←</span>
      </button>
      <h1>Sesiones</h1>
    </header>

    <div class="tabs-row">
      <button class="tab-pill" type="button" @click="goEventos">Eventos</button>
      <button class="tab-pill tab-pill--active" type="button">Sesiones</button>
    </div>

    <p v-if="loading" class="state">Cargando sesiones…</p>

    <section v-else class="lista">
      <article v-for="s in sesiones" :key="s.id" class="card">
        <div class="card-img">
          <img :src="s.imagen" :alt="s.titulo" />
        </div>

        <div class="card-body">
          <h2 class="title">{{ s.titulo }}</h2>

          <p class="meta">
            Con: {{ s.profesional }} — {{ s.rol }}<br />
            {{ s.fecha }} · {{ s.hora }} hs · {{ s.modalidad }}
          </p>

          <p class="desc">{{ s.descripcion }}</p>

          <div class="actions">
            <button
              v-if="!isRegistered(s)"
              class="action-btn action-btn--primary"
              type="button"
              :disabled="!canRegister(s)"
              @click="registrarmeSesion(s)"
            >
              {{ cuposTexto(s) }}
            </button>

            <button
              v-else
              class="action-btn action-btn--danger"
              type="button"
              :disabled="busyId === s.id"
              @click="openConfirmCancel(s)"
            >
              Cancelar
            </button>

            <button
              class="action-btn action-btn--primary"
              :class="{ 'action-btn--soft-disabled': !s.disponible }"
              type="button"
              @click="unirmeSesion(s)"
            >
              {{ s.disponible ? 'Unirme ahora' : 'Próximamente' }}
            </button>
          </div>
        </div>
      </article>
    </section>

    <div v-if="showInfo" class="modal" @click.self="showInfo = false">
      <div class="modal-box">
        <h3 class="modal-title">{{ infoTitle }}</h3>
        <p class="modal-text">{{ infoText }}</p>
        <button class="action-btn action-btn--primary" type="button" @click="showInfo = false">
          Entendido
        </button>
      </div>
    </div>

    <div v-if="showConfirm" class="modal" @click.self="closeConfirm">
      <div class="modal-box">
        <h3 class="modal-title">{{ confirmTitle }}</h3>
        <p class="modal-text">{{ confirmText }}</p>
        <div class="modal-actions">
          <button class="action-btn action-btn--ghost" type="button" :disabled="confirmBusy" @click="closeConfirm">
            No, volver
          </button>
          <button class="action-btn action-btn--danger" type="button" :disabled="confirmBusy" @click="confirmCancel">
            {{ confirmBusy ? 'Cancelando…' : 'Sí, cancelar' }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.agendar-sub {
  background: #fff;
  padding: 20px 18px 40px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
}

.sub-header {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 1400px;
  margin: 0 auto 14px;
}
.sub-header h1 {
  margin: 0;
  font-size: 1.4rem;
  color: #46bdbd;
  font-weight: 700;
}
.back-link {
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  padding: 0;
}
.arrow {
  font-size: 1.5rem;
  color: #46bdbd;
}

.tabs-row {
  max-width: 1100px;
  margin: 4px auto 18px;
  display: flex;
  justify-content: flex-start;
  gap: 24px;
}
@media (min-width: 800px) {
  .tabs-row {
    justify-content: center;
    gap: 80px;
  }
}
.tab-pill {
 padding: 10px 20px;
  border-radius: 999px;
  border: none;
  background: #85b6e0;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.18s ease, background 0.18s ease;
}
.tab-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1);
}

.state {
  font-size: 0.9rem;
  color: #4b5563;
  margin-bottom: 12px;
}

.lista {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  margin: 0 auto;
}
@media (max-width: 900px) {
  .lista {
    grid-template-columns: 1fr;
  }
}

.card {
 display: flex;
  flex-direction: row;
  align-items: center;
  gap: 18px;
  margin: 0;
  min-height: 200px;
  padding: 18px 18px;
  border-radius: 20px;
  border: 1px solid #e2edf7;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  transition: transform 0.12s ease, box-shadow 0.18s ease, border-color 0.18s ease;

}
.card:hover {
  transform: translateY(-1px);
  border-color: #b6ebe5;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.1);
}

.card-img {
  flex: 0 0 130px;
}
.card-img img {
  width: 130px;
  height: 130px;
  object-fit: cover;
  border-radius: 18px;
  display: block;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 10px;
}


/* ====== MOBILE ====== */
@media (max-width: 700px) {
  .card {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-img {
    flex: none;
    width: 100%;
    height: 170px; 
  }

  .card-img img {
    width: 100%;
    height: 100%;
    object-fit: cover; 
    display: block;
  }
   .action-btn {
     padding: 16px 12px 14px;
     font-size: small;
  }
}

.title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
}
.meta {
  margin: 0;
  font-size: 0.92rem;
  color: #6b7280;
}
.desc {
  margin: 2px 0 0;
  font-size: 1.05rem;
  color: #374151;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 1rem;
  border: none;
  background: var(--nura-green);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.15s ease, opacity 0.15s ease;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.28);
  width: 40%;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.24);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
  box-shadow: none;
}

.action-btn--soft-disabled {
  opacity: 0.75;
}
.action-btn--soft-disabled:hover:not(:disabled) {
  transform: none;
}

.action-btn--danger {
  background: #ef5350;
  box-shadow: 0 8px 18px rgba(239, 83, 80, 0.2);
}
.action-btn--danger:hover:not(:disabled) {
  box-shadow: 0 10px 22px rgba(239, 83, 80, 0.18);
}

.action-btn--ghost {
  background: #eef6ff;
  color: #1f2937;
  box-shadow: none;
}
.action-btn--ghost:hover:not(:disabled) {
  background: #e3f0ff;
  transform: translateY(-1px);
}

@media (max-width: 520px) {
  .action-btn {
     padding: 16px 12px 14px;
     font-size: small;
  }
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 40;
}
.modal-box {
  background: #ffffff;
  border-radius: 18px;
  padding: 18px 18px 16px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
  text-align: center;
}
.modal-title {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 800;
  color: #111827;
}
.modal-text {
  margin: 0 0 12px;
  font-size: 0.92rem;
  color: #4b5563;
}
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
@media (max-width: 520px) {
  .modal-actions {
    flex-direction: column;
  }
}
</style>
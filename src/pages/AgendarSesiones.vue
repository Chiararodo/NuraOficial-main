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

async function createNotification(
  title: string,
  body: string,
  type: string | null = null
) {
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
    .select(
      'id, title, professional, role, date, hour, modality, capacity, registered, description, image_path, disponible, meet_url'
    )
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
    openInfo(
      'Necesitás iniciar sesión',
      'Iniciá sesión para poder anotarte en una sesión.'
    )
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

  const { error } = await supabase.from('session_registrations').upsert(
    { user_id: auth.user.id, session_id: s.id },
    { onConflict: 'user_id,session_id', ignoreDuplicates: true }
  )

  if (error) {
    busyId.value = null
    openInfo(
      'No pudimos registrarte',
      'Hubo un problema al reservar tu lugar. Probá nuevamente.'
    )
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
  openInfo(
    '¡Listo!',
    'Tu lugar quedó reservado. Te vamos a avisar cuando se acerque la sesión.'
  )
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

  const { error } = await supabase
    .from('session_registrations')
    .delete()
    .eq('id', row.id)

  if (error) {
    busyId.value = null
    openInfo(
      'No pudimos cancelar',
      'Hubo un problema al cancelar tu lugar. Probá de nuevo.'
    )
    return
  }

  const next = new Set(myRegs.value)
  next.delete(s.id)
  myRegs.value = next
  await loadSessionCounts()

  await createNotification(
    'Lugar cancelado',
    `Cancelaste tu lugar en "${s.titulo}".`,
    'session'
  )

  busyId.value = null
  openInfo(
    'Listo',
    'Tu lugar fue cancelado. Si querés, podés anotarte de nuevo si hay cupos.'
  )
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
    <header class="page-head">
      <div class="page-top">
        <button
          class="back-link"
          type="button"
          @click="goBackToAgendar"
          aria-label="Volver"
        >
          <span class="arrow">←</span>
        </button>

        <div class="page-copy">
          <h2 class="page-title">Sesiones</h2>
          <p class="page-sub">
            Reservá tu lugar en sesiones grupales y accedé al enlace cuando esté habilitado.
          </p>
        </div>
      </div>

      <div class="tabs-row" role="tablist" aria-label="Navegación de agenda">
        <button class="tab-pill" type="button" @click="goEventos">
          Eventos
        </button>
        <button class="tab-pill tab-pill--active" type="button" aria-current="page">
          Sesiones
        </button>
      </div>
    </header>

    <p v-if="loading" class="state">Cargando sesiones…</p>

    <section v-else class="lista" aria-label="Lista de sesiones">
      <article v-for="s in sesiones" :key="s.id" class="card">
        <div class="card-img">
          <img :src="s.imagen" :alt="s.titulo" />
        </div>

        <div class="card-body">
          <h3 class="title">{{ s.titulo }}</h3>

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
              class="action-btn"
              :class="s.disponible ? 'action-btn--primary' : 'action-btn--soft-disabled'"
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
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="info-modal-title">
        <h2 id="info-modal-title" class="modal-title">{{ infoTitle }}</h2>
        <p class="modal-text">{{ infoText }}</p>
        <button
          class="action-btn action-btn--primary modal-btn"
          type="button"
          @click="showInfo = false"
        >
          Entendido
        </button>
      </div>
    </div>

    <div v-if="showConfirm" class="modal" @click.self="closeConfirm">
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <h2 id="confirm-modal-title" class="modal-title">{{ confirmTitle }}</h2>
        <p class="modal-text">{{ confirmText }}</p>
        <div class="modal-actions">
          <button
            class="action-btn action-btn--ghost"
            type="button"
            :disabled="confirmBusy"
            @click="closeConfirm"
          >
            No, volver
          </button>
          <button
            class="action-btn action-btn--danger"
            type="button"
            :disabled="confirmBusy"
            @click="confirmCancel"
          >
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
  padding: 20px 18px 48px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
}

.page-head {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}

.page-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.page-copy {
  display: grid;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 800;
  color: #50bdbd;
}

.page-sub {
  margin: 0;
  color: #475569;
  font-size: 0.96rem;
  line-height: 1.4;
  max-width: 72ch;
}

.back-link {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 999px;
  background: #e8fbf8;
  color: #50bdbd;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .back-link:hover {
    background: #d8f6f1;
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(80, 189, 189, 0.14);
  }
}

.arrow {
  font-size: 1.35rem;
  line-height: 1;
}

.tabs-row {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tab-pill {
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  background: #85b6e0;
  color: #fff;
  font-size: 0.96rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

@media (hover: hover) {
  .tab-pill:hover {
    background: #50bdbd;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.18);
  }
}

.tab-pill--active {
  background: #50bdbd;
  box-shadow: 0 0 0 2px rgba(80, 189, 189, 0.15) inset;
}

.state {
  font-size: 0.92rem;
  color: #4b5563;
  margin: 0 0 12px;
}

.lista {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
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
  padding: 18px;
  border-radius: 20px;
  border: 1px solid #e2edf7;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease,
    background-color 0.22s ease;
  box-sizing: border-box;
}

@media (hover: hover) {
  .card:hover {
    transform: translateY(-4px);
    border-color: #b6ebe5;
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
    background: #ffffff;
  }
}

.card-img {
  flex: 0 0 130px;
  width: 130px;
  height: 130px;
  border-radius: 18px;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #e8eef5;
}

.card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 10px;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #111827;
}

.meta {
  margin: 0;
  font-size: 0.92rem;
  color: #6b7280;
  line-height: 1.45;
}

.desc {
  margin: 0;
  font-size: 0.98rem;
  color: #374151;
  line-height: 1.45;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.action-btn {
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 0.95rem;
  border: none;
  background: #50bdbd;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  min-width: 170px;
  max-width: 240px;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
  box-sizing: border-box;
  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease,
    opacity 0.15s ease,
    border-color 0.2s ease;
}

@media (hover: hover) {
  .action-btn:hover:not(:disabled) {
    background: #3ea9a9;
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(80, 189, 189, 0.3);
  }
}

.action-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
  box-shadow: none;
}

.action-btn--primary {
  background: #50bdbd;
}

.action-btn--soft-disabled {
  background: #d7eeee;
  color: #2f5f5f;
  box-shadow: none;
}

@media (hover: hover) {
  .action-btn--soft-disabled:hover:not(:disabled) {
    transform: none;
    background: #d7eeee;
    box-shadow: none;
  }
}

.action-btn--danger {
  background: #ef5350;
  box-shadow: 0 8px 18px rgba(239, 83, 80, 0.2);
}

@media (hover: hover) {
  .action-btn--danger:hover:not(:disabled) {
    background: #e53935;
    box-shadow: 0 14px 28px rgba(239, 83, 80, 0.24);
  }
}

.action-btn--ghost {
  background: #eef6ff;
  color: #1f2937;
  box-shadow: none;
  border: 1px solid #d7e6f6;
}

@media (hover: hover) {
  .action-btn--ghost:hover:not(:disabled) {
    background: #e3f0ff;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(148, 163, 184, 0.12);
  }
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
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
  border: 1px solid #e2edf7;
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
  line-height: 1.45;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.modal-btn {
  margin-inline: auto;
}

.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
}

@media (max-width: 700px) {
  .agendar-sub {
    padding: 16px 12px 96px;
  }

  .page-title {
    font-size: 1.35rem;
  }

  .card {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px 14px;
    min-height: auto;
  }

  .card-img {
    flex: none;
    width: 100%;
    height: 180px;
  }

  .card-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .title {
    font-size: 1.05rem;
  }

  .desc {
    font-size: 0.92rem;
  }
}

@media (max-width: 520px) {
  .actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .action-btn {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .tabs-row {
    flex-wrap: nowrap;
    gap: 10px;
  }

  .tab-pill {
    width: 50%;
    text-align: center;
  }

  .modal-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .modal-actions .action-btn,
  .modal-btn {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }
}

@media (max-width: 360px) {
  .tab-pill {
    padding: 8px 10px;
    font-size: 0.85rem;
  }

  .modal-actions {
    gap: 8px;
  }

  .modal-actions .action-btn {
    font-size: 0.85rem;
    padding: 9px 10px;
  }
}
</style>
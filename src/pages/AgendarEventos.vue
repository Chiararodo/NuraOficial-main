<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const auth = useAuthStore()

type Evento = {
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
  disponible: boolean
  meetUrl?: string
  capacidad: number
  registrados: number
}

const eventos = ref<Evento[]>([
  {
    id: 'ev-hoy',
    titulo: 'Evento: Respiración consciente',
    profesional: 'Lic. Martina López',
    rol: 'Psicóloga',
    fecha: 'Hoy',
    fechaISO: '2026-03-03',
    hora: '13:00',
    modalidad: 'Virtual',
    descripcion: 'Sesión en vivo para practicar respiración consciente y cerrar el día con calma.',
    imagen: '/covers/repiracionconciente.jpg',
    disponible: true,
    meetUrl: 'https://meet.google.com/fgz-jnmc-mkm',
    capacidad: 30,
    registrados: 0
  },
  {
    id: 'ev1',
    titulo: 'Evento: Alimentación consciente',
    profesional: 'Dra. Flor Acosta',
    rol: 'Nutricionista',
    fecha: 'Jueves 24 de abril 2026',
    fechaISO: '2026-04-24',
    hora: '18:00',
    modalidad: 'Virtual',
    descripcion: 'Aprendé a reconocer señales de hambre real, ansiedad y hábitos más conscientes.',
    imagen: '/covers/alimentacionconciente.jpg',
    disponible: false,
    capacidad: 40,
    registrados: 0
  },
  {
    id: 'ev2',
    titulo: 'Evento: Ansiedad y respiración',
    profesional: 'Lic. Martín Fernández',
    rol: 'Psicólogo',
    fecha: 'Sábado 27 de julio 2026',
    fechaISO: '2026-07-27',
    hora: '10:30',
    modalidad: 'Virtual',
    descripcion: 'Técnicas de respiración para regular el sistema nervioso y reducir la ansiedad cotidiana.',
    imagen: '/covers/ansiedadyrespiración.jpg',
    disponible: false,
    capacidad: 35,
    registrados: 0
  },
  {
    id: 'ev3',
    titulo: 'Autoestima y bienestar emocional',
    profesional: 'Lic. Natalia Navarro',
    rol: 'Psicóloga',
    fecha: 'Martes 30 de septiembre 2026',
    fechaISO: '2026-09-30',
    hora: '17:00',
    modalidad: 'Virtual',
    descripcion: 'Espacio para construir una autoestima más compasiva y herramientas para el día a día.',
    imagen: '/covers/bienestaremocional.jpg',
    disponible: false,
    capacidad: 50,
    registrados: 0
  }
])

const myEventRegs = ref<Set<string>>(new Set())
const busyId = ref<string | null>(null)

/* Modal (info) */
const showInfo = ref(false)
const infoTitle = ref('')
const infoText = ref('')

function openInfo(title: string, text: string) {
  infoTitle.value = title
  infoText.value = text
  showInfo.value = true
}

/* Modal (confirmación) */
const showConfirm = ref(false)
const confirmTitle = ref('')
const confirmText = ref('')
const confirmBusy = ref(false)
const pendingEvent = ref<Evento | null>(null)

function openConfirmCancel(e: Evento) {
  pendingEvent.value = e
  confirmTitle.value = '¿Cancelar tu registro?'
  confirmText.value =
    'Si cancelás, vas a liberar tu cupo para otra persona. Podés volver a registrarte más adelante si hay disponibilidad.'
  showConfirm.value = true
}

function closeConfirm() {
  if (!confirmBusy.value) {
    showConfirm.value = false
    pendingEvent.value = null
  }
}

function goBackToAgendar() {
  router.push('/app/agendar')
}
function goSesiones() {
  router.push('/app/agendar/sesiones')
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

async function loadMyEventRegistrations() {
  if (!auth.user) {
    myEventRegs.value = new Set()
    return
  }

  const { data, error } = await supabase
    .from('event_registrations')
    .select('event_id')
    .eq('user_id', auth.user.id)

  if (error) {
    myEventRegs.value = new Set()
    return
  }

  myEventRegs.value = new Set((data || []).map((r: any) => r.event_id))
}

async function loadEventCounts() {
  const ids = eventos.value.map((e) => e.id)
  if (!ids.length) return

  const { data, error } = await supabase
    .from('event_registrations')
    .select('event_id')
    .in('event_id', ids)

  if (error) return

  const counts = new Map<string, number>()
  for (const row of data || []) {
    const id = (row as any).event_id as string
    counts.set(id, (counts.get(id) || 0) + 1)
  }

  eventos.value = eventos.value.map((e) => ({
    ...e,
    registrados: counts.get(e.id) || 0
  }))
}

function isRegistered(e: Evento) {
  return myEventRegs.value.has(e.id)
}

function estaLleno(e: Evento) {
  return e.registrados >= e.capacidad
}

function cuposTexto(e: Evento) {
  if (estaLleno(e)) return 'Cupos completos'
  return `Cupos: ${e.registrados}/${e.capacidad}`
}

function canRegister(e: Evento) {
  if (!auth.user) return true
  if (isRegistered(e)) return false
  if (estaLleno(e)) return false
  if (busyId.value) return false
  return true
}

async function registrarmeEvento(e: Evento) {
  if (!auth.user) {
    openInfo('Necesitás iniciar sesión', 'Iniciá sesión para poder registrarte en un evento.')
    return
  }
  if (isRegistered(e)) {
    openInfo('Ya estás registrada', 'Tu registro ya está guardado para este evento.')
    return
  }
  if (estaLleno(e)) {
    openInfo('Evento completo', 'Este evento ya no tiene cupos disponibles.')
    return
  }

  busyId.value = e.id

  const { error } = await supabase
    .from('event_registrations')
    .insert({ user_id: auth.user.id, event_id: e.id })

  if (error) {
    busyId.value = null
    openInfo('No pudimos registrarte', 'Hubo un problema al reservar tu cupo. Probá nuevamente.')
    return
  }

  myEventRegs.value = new Set([...myEventRegs.value, e.id])
  await loadEventCounts()

  await createNotification(
    'Evento reservado',
    `Tu cupo quedó reservado para "${e.titulo}" (${e.fecha} a las ${e.hora}).`,
    'event'
  )

  busyId.value = null
  openInfo('¡Listo!', 'Tu cupo quedó reservado. Te vamos a avisar cuando se acerque el evento.')
}

async function desregistrarmeEvento(e: Evento) {
  if (!auth.user) return
  if (!isRegistered(e)) return

  busyId.value = e.id

  const { data: row } = await supabase
    .from('event_registrations')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('event_id', e.id)
    .maybeSingle()

  if (!row?.id) {
    await loadMyEventRegistrations()
    busyId.value = null
    return
  }

  const { error } = await supabase
    .from('event_registrations')
    .delete()
    .eq('id', row.id)

  if (error) {
    busyId.value = null
    openInfo('No pudimos cancelar', 'Hubo un problema al cancelar tu registro. Probá de nuevo.')
    return
  }

  const next = new Set(myEventRegs.value)
  next.delete(e.id)
  myEventRegs.value = next
  await loadEventCounts()

  await createNotification(
    'Registro cancelado',
    `Cancelaste tu registro en "${e.titulo}".`,
    'event'
  )

  busyId.value = null
  openInfo('Hecho', 'Tu registro fue cancelado. Si querés, podés registrarte nuevamente si hay cupos.')
}

async function confirmCancel() {
  if (!pendingEvent.value) return
  confirmBusy.value = true
  await desregistrarmeEvento(pendingEvent.value)
  confirmBusy.value = false
  showConfirm.value = false
  pendingEvent.value = null
}

function unirmeEvento(e: Evento) {
  if (!e.disponible || !e.meetUrl) {
    openInfo(
      'Todavía no está habilitado',
      'Este evento se va a habilitar el día y horario indicados. Cuando esté disponible, vas a poder unirte desde acá.'
    )
    return
  }
  window.open(e.meetUrl, '_blank')
}

onMounted(async () => {
  await Promise.all([loadMyEventRegistrations(), loadEventCounts()])
})
</script>

<template>
  <h1 class="visually-hidden">Agendar eventos</h1>
  <main class="agendar-sub">
    <header class="sub-header">
      <button class="back-link" type="button" @click="goBackToAgendar">
        <span class="arrow">←</span>
      </button>
      <h1>Eventos</h1>
    </header>

    <div class="tabs-row">
      <button class="tab-pill tab-pill--active" type="button">Eventos</button>
      <button class="tab-pill" type="button" @click="goSesiones">Sesiones</button>
    </div>

    <section class="lista">
      <article v-for="e in eventos" :key="e.id" class="card">
        <div class="card-img">
          <img :src="e.imagen" :alt="e.titulo" />
        </div>

        <div class="card-body">
          <h2 class="title">{{ e.titulo }}</h2>
          <p class="meta">
            Con: {{ e.profesional }} — {{ e.rol }}<br />
            {{ e.fecha }} · {{ e.hora }} hs · {{ e.modalidad }}
          </p>

          <p class="desc">{{ e.descripcion }}</p>

          <div class="actions">
            <button
              v-if="!isRegistered(e)"
              class="action-btn action-btn--primary"
              type="button"
              :disabled="!canRegister(e)"
              @click="registrarmeEvento(e)"
            >
              {{ cuposTexto(e) }}
            </button>

            <button
              v-else
              class="action-btn action-btn--danger"
              type="button"
              :disabled="busyId === e.id"
              @click="openConfirmCancel(e)"
            >
              Cancelar 
            </button>

           
<button
  class="action-btn action-btn--primary"
  :class="{ 'action-btn--soft-disabled': !e.disponible }"
  type="button"
  @click="unirmeEvento(e)"
>
  {{ e.disponible ? 'Unirme ahora' : 'Próximamente' }}
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
  background: #ffffff;
  padding: 20px 18px 40px;
}

.sub-header {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 1100px;
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
  padding: 7px 26px;
  border-radius: 999px;
  border: none;
  background: #85b6e0;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.18s ease, background 0.18s ease;
}
.tab-pill--active {
  background: #50bdbd;
}
.tab-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1);
}

.title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
}
.meta {
  margin: 0;
  font-size: 0.82rem;
  color: #6b7280;
}
.desc {
  margin: 2px 0 0;
  font-size: 0.9rem;
  color: #374151;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn,
.perfil-btn,
.cupos-btn,
.btn-close {
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.86rem;
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

.action-btn:hover:not(:disabled),
.perfil-btn:hover:not(:disabled),
.cupos-btn:hover:not(:disabled),
.btn-close:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.24);
}

.action-btn:disabled,
.perfil-btn:disabled,
.cupos-btn:disabled,
.btn-close:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
  box-shadow: none;
}

.action-btn--soft-disabled {
  opacity: 0.75;
}
.action-btn--soft-disabled:hover {
  transform: none;
}

.action-btn--danger,
.perfil-btn--danger {
  background: #ef5350;
  box-shadow: 0 8px 18px rgba(239, 83, 80, 0.2);
}

.action-btn--danger:hover:not(:disabled),
.perfil-btn--danger:hover:not(:disabled) {
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
  .action-btn,
  .perfil-btn,
  .cupos-btn,
  .btn-close {
    width: 100%;
  }
}

.lista {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  max-width: 1050px;
  margin: 0 auto;
}


.card,
.ses-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 18px;
  width: 92%;
  margin: 0 auto;
  min-height: 200px;
  padding: 18px 18px;
  border-radius: 20px;
   border: 1px solid #e2edf7;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.card:hover,
.ses-card:hover {
  transform: translateY(-1px);
  border-color: #b6ebe5;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.1);
}

.card-img,
.ses-img {
  flex: 0 0 130px;
}

.card-img img,
.ses-img img {
  width: 130px;
  height: 130px;
  object-fit: cover;
  border-radius: 18px;
  display: block;
}

.card-body,
.ses-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 10px;
}

@media (max-width: 700px) {
  .card,
  .ses-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .card-img,
  .ses-img {
    flex: none;
  }

  .card-img img,
  .ses-img img {
    width: 100%;
    height: auto;
  }
}

@media (max-width: 900px) {
  .lista {
    grid-template-columns: 1fr;
  }
}

/* modal */
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
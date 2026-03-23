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

/* Modal info */
const showInfo = ref(false)
const infoTitle = ref('')
const infoText = ref('')

function openInfo(title: string, text: string) {
  infoTitle.value = title
  infoText.value = text
  showInfo.value = true
}

/* Modal confirmación */
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
          <h2 class="page-title">Eventos</h2>
          <p class="page-sub">
            Reservá tu lugar en eventos especiales y accedé al enlace cuando esté habilitado.
          </p>
        </div>
      </div>

      <div class="tabs-row" role="tablist" aria-label="Navegación de agenda">
        <button class="tab-pill tab-pill--active" type="button" aria-current="page">
          Eventos
        </button>
        <button class="tab-pill" type="button" @click="goSesiones">
          Sesiones
        </button>
      </div>
    </header>

    <section class="lista" aria-label="Lista de eventos">
      <article v-for="e in eventos" :key="e.id" class="card">
        <div class="card-img">
          <img :src="e.imagen" :alt="e.titulo" />
        </div>

        <div class="card-body">
          <h3 class="title">{{ e.titulo }}</h3>

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
              class="action-btn"
              :class="e.disponible ? 'action-btn--primary' : 'action-btn--soft-disabled'"
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
            {{ confirmBusy ? 'Cancelando…' : 'Cancelar' }}
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
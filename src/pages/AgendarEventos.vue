<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const auth = useAuthStore()

/* =========================================
   TYPES
========================================= */

type EventoDb = {
  id: string
  title: string
  professional: string
  role: string
  date: string
  hour: string
  modality: string
  description: string | null
  image_path: string | null
  join_url: string | null
  capacity: number
  registered: number | null
  disponible: boolean | null
}

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

type EventForm = {
  title: string
  professional: string
  role: string
  date: string
  hour: string
  modality: string
  description: string
  image_path: string
  join_url: string
  capacity: number
  disponible: boolean
}

/* =========================================
   ESTADO GENERAL
========================================= */

const eventos = ref<Evento[]>([])
const loading = ref(true)
const isAdmin = ref(false)

const myEventRegs = ref<Set<string>>(new Set())
const busyId = ref<string | null>(null)

/* =========================================
   TOAST
========================================= */

const toast = ref<{
  message: string
  kind: 'success' | 'error'
} | null>(null)

function showToast(
  message: string,
  kind: 'success' | 'error' = 'success'
) {
  toast.value = {
    message,
    kind
  }

  window.setTimeout(() => {
    if (toast.value?.message === message) {
      toast.value = null
    }
  }, 2500)
}

/* =========================================
   MODAL INFORMACIÓN
========================================= */

const showInfo = ref(false)
const infoTitle = ref('')
const infoText = ref('')

function openInfo(
  title: string,
  text: string
) {
  infoTitle.value = title
  infoText.value = text
  showInfo.value = true
}

function closeInfo() {
  showInfo.value = false
}

/* =========================================
   CANCELAR INSCRIPCIÓN
========================================= */

const showConfirm = ref(false)
const confirmTitle = ref('')
const confirmText = ref('')
const confirmBusy = ref(false)
const pendingEvent = ref<Evento | null>(null)

function openConfirmCancel(evento: Evento) {
  pendingEvent.value = evento

  confirmTitle.value =
    '¿Seguro que querés cancelar tu registro?'

  confirmText.value =
    'Si cancelás, liberás tu cupo para otra persona. Si más adelante hay lugar, vas a poder registrarte nuevamente.'

  showConfirm.value = true
}

function closeConfirm() {
  if (confirmBusy.value) {
    return
  }

  showConfirm.value = false
  pendingEvent.value = null
}

/* =========================================
   NAVEGACIÓN
========================================= */

function goBackToAgendar() {
  router.push('/app/agendar')
}

function goSesiones() {
  router.push('/app/agendar/sesiones')
}

/* =========================================
   ADMIN
========================================= */

async function loadAdminState() {
  if (!auth.user) {
    isAdmin.value = false
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (error) {
    console.error(
      'Error verificando administrador:',
      error
    )
  }

  isAdmin.value =
    !error &&
    data?.is_admin === true
}

/* =========================================
   FORMATO FECHA
========================================= */

function formatFecha(dateStr: string) {
  if (!dateStr) {
    return ''
  }

  const date = new Date(
    `${dateStr}T00:00:00`
  )

  const formatted =
    date.toLocaleDateString(
      'es-AR',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    )

  return (
    formatted.charAt(0).toUpperCase() +
    formatted.slice(1)
  )
}

/* =========================================
   CARGAR EVENTOS
========================================= */

async function loadEventos() {
  loading.value = true

  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      title,
      professional,
      role,
      date,
      hour,
      modality,
      description,
      image_path,
      join_url,
      capacity,
      registered,
      disponible
    `)
    .order('date', {
      ascending: true
    })
    .order('hour', {
      ascending: true
    })

  if (error) {
    console.error(
      'Error cargando eventos:',
      error
    )

    eventos.value = []
    loading.value = false

    showToast(
      'No se pudieron cargar los eventos.',
      'error'
    )

    return
  }

  const rows =
    (data || []) as EventoDb[]

  eventos.value = rows.map((row) => ({
    id:
      row.id,

    titulo:
      row.title,

    profesional:
      row.professional,

    rol:
      row.role,

    fechaISO:
      row.date,

    fecha:
      formatFecha(row.date),

    hora:
      row.hour,

    modalidad:
      row.modality,

    descripcion:
      row.description || '',

    imagen:
      row.image_path ||
      '/covers/placeholder-event.jpg',

    disponible:
      Boolean(row.disponible),

    meetUrl:
      row.join_url || undefined,

    capacidad:
      row.capacity || 30,

    registrados:
      row.registered || 0
  }))

  loading.value = false
}

/* =========================================
   INSCRIPCIONES DEL USUARIO
========================================= */

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
    console.error(
      'Error cargando registros:',
      error
    )

    myEventRegs.value = new Set()
    return
  }

  myEventRegs.value =
    new Set(
      (data || []).map(
        (row: any) =>
          row.event_id
      )
    )
}

/* =========================================
   CONTAR INSCRIPTOS
========================================= */

async function loadEventCounts() {
  const ids =
    eventos.value.map(
      (evento) => evento.id
    )

  if (!ids.length) {
    return
  }

  const { data, error } = await supabase
    .from('event_registrations')
    .select('event_id')
    .in('event_id', ids)

  if (error) {
    console.error(
      'Error cargando cupos:',
      error
    )

    return
  }

  const counts =
    new Map<string, number>()

  for (const row of data || []) {
    const id =
      (row as any).event_id as string

    counts.set(
      id,
      (counts.get(id) || 0) + 1
    )
  }

  eventos.value =
    eventos.value.map(
      (evento) => ({
        ...evento,

        registrados:
          counts.get(evento.id) || 0
      })
    )
}

/* =========================================
   HELPERS REGISTRO
========================================= */

function isRegistered(evento: Evento) {
  return myEventRegs.value.has(
    evento.id
  )
}

function estaLleno(evento: Evento) {
  return (
    evento.registrados >=
    evento.capacidad
  )
}

function cuposTexto(evento: Evento) {
  if (estaLleno(evento)) {
    return 'Cupos completos'
  }

  return `Cupos: ${evento.registrados}/${evento.capacidad}`
}

function canRegister(evento: Evento) {
  if (!auth.user) {
    return true
  }

  if (isRegistered(evento)) {
    return false
  }

  if (estaLleno(evento)) {
    return false
  }

  if (busyId.value) {
    return false
  }

  return true
}

/* =========================================
   NOTIFICACIONES
========================================= */

async function createNotification(
  title: string,
  body: string,
  type: string | null = null
) {
  if (!auth.user) {
    return
  }

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: auth.user.id,
      title,
      body,
      type
    })

  if (error) {
    console.error(
      'Error creando notificación:',
      error
    )
  }
}

/* =========================================
   REGISTRARSE EVENTO
========================================= */

async function registrarmeEvento(
  evento: Evento
) {
  if (!auth.user) {
    openInfo(
      'Necesitás iniciar sesión',
      'Iniciá sesión para poder registrarte en un evento.'
    )

    return
  }

  if (isRegistered(evento)) {
    openInfo(
      'Ya estás registrada',
      'Tu registro ya está guardado para este evento.'
    )

    return
  }

  if (estaLleno(evento)) {
    openInfo(
      'Evento completo',
      'Este evento ya no tiene cupos disponibles.'
    )

    return
  }

  busyId.value = evento.id

  const { error } = await supabase
    .from('event_registrations')
    .insert({
      user_id: auth.user.id,
      event_id: evento.id
    })

  if (error) {
    console.error(
      'Error registrando evento:',
      error
    )

    busyId.value = null

    openInfo(
      'No pudimos registrarte',
      'Hubo un problema al reservar tu cupo. Probá nuevamente.'
    )

    return
  }

  myEventRegs.value =
    new Set([
      ...myEventRegs.value,
      evento.id
    ])

  await loadEventCounts()

  await createNotification(
    'Evento reservado',
    `Tu cupo quedó reservado para "${evento.titulo}" (${evento.fecha} a las ${evento.hora}).`,
    'event'
  )

  busyId.value = null

  openInfo(
    '¡Listo!',
    'Tu cupo quedó reservado. Te vamos a avisar cuando se acerque el evento.'
  )
}

/* =========================================
   CANCELAR REGISTRO
========================================= */

async function desregistrarmeEvento(
  evento: Evento
) {
  if (!auth.user) {
    return
  }

  if (!isRegistered(evento)) {
    return
  }

  busyId.value = evento.id

  const {
    data: row,
    error: findError
  } = await supabase
    .from('event_registrations')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('event_id', evento.id)
    .maybeSingle()

  if (findError) {
    console.error(findError)
  }

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
    console.error(
      'Error cancelando registro:',
      error
    )

    busyId.value = null

    openInfo(
      'No pudimos cancelar',
      'Hubo un problema al cancelar tu registro. Probá nuevamente.'
    )

    return
  }

  const next =
    new Set(myEventRegs.value)

  next.delete(evento.id)

  myEventRegs.value = next

  await loadEventCounts()

  await createNotification(
    'Registro cancelado',
    `Cancelaste tu registro en "${evento.titulo}".`,
    'event'
  )

  busyId.value = null

  openInfo(
    'Listo',
    'Tu registro fue cancelado correctamente. Podés volver a registrarte si todavía quedan cupos.'
  )
}

async function confirmCancel() {
  if (!pendingEvent.value) {
    return
  }

  confirmBusy.value = true

  await desregistrarmeEvento(
    pendingEvent.value
  )

  confirmBusy.value = false
  showConfirm.value = false
  pendingEvent.value = null
}

/* =========================================
   UNIRSE EVENTO
========================================= */

function unirmeEvento(evento: Evento) {
  if (
    !evento.disponible ||
    !evento.meetUrl
  ) {
    openInfo(
      'Todavía no está habilitado',
      'El enlace se habilitará el día y horario del evento.'
    )

    return
  }

  window.open(
    evento.meetUrl,
    '_blank',
    'noopener,noreferrer'
  )
}

/* =========================================
   NUEVO EVENTO
========================================= */

const eventCreateForm =
  ref<EventForm>({
    title: '',
    professional: '',
    role: '',
    date: '',
    hour: '',
    modality: 'Virtual',
    description: '',
    image_path: '',
    join_url: '',
    capacity: 30,
    disponible: false
  })

function resetEventCreateForm() {
  eventCreateForm.value = {
    title: '',
    professional: '',
    role: '',
    date: '',
    hour: '',
    modality: 'Virtual',
    description: '',
    image_path: '',
    join_url: '',
    capacity: 30,
    disponible: false
  }
}

function validateEventForm(
  form: EventForm
) {
  if (!form.title.trim()) {
    return 'Ingresá el título.'
  }

  if (!form.professional.trim()) {
    return 'Ingresá el profesional.'
  }

  if (!form.role.trim()) {
    return 'Ingresá el rol.'
  }

  if (!form.date) {
    return 'Seleccioná una fecha.'
  }

  if (!form.hour) {
    return 'Seleccioná una hora.'
  }

  if (
    !Number.isFinite(
      Number(form.capacity)
    ) ||
    Number(form.capacity) < 1
  ) {
    return 'La capacidad debe ser mayor a cero.'
  }

  if (
    form.disponible &&
    !form.join_url.trim()
  ) {
    return 'Ingresá el enlace si el evento está habilitado.'
  }

  return ''
}

async function createEvent() {
  const form =
    eventCreateForm.value

  const validation =
    validateEventForm(form)

  if (validation) {
    showToast(
      validation,
      'error'
    )

    return
  }

  const payload = {
    title:
      form.title.trim(),

    professional:
      form.professional.trim(),

    role:
      form.role.trim(),

    date:
      form.date,

    hour:
      form.hour,

    modality:
      form.modality,

    description:
      form.description.trim() ||
      null,

    image_path:
      form.image_path.trim() ||
      null,

    join_url:
      form.join_url.trim() ||
      null,

    capacity:
      Number(form.capacity),

    registered: 0,

    disponible:
      form.disponible
  }

  const { error } = await supabase
    .from('events')
    .insert(payload)

  if (error) {
    console.error(
      'Error creando evento:',
      error
    )

    showToast(
      'No se pudo crear el evento.',
      'error'
    )

    return
  }

  showToast(
    'Evento creado correctamente.'
  )

  resetEventCreateForm()

  await loadEventos()
  await loadEventCounts()
}

/* =========================================
   EDITAR EVENTO
========================================= */

const editModal = ref<
  (EventForm & {
    id: string
  }) | null
>(null)

function startEditEvent(
  evento: Evento
) {
  editModal.value = {
    id:
      evento.id,

    title:
      evento.titulo,

    professional:
      evento.profesional,

    role:
      evento.rol,

    date:
      evento.fechaISO,

    hour:
      evento.hora,

    modality:
      evento.modalidad,

    description:
      evento.descripcion,

    image_path:
      evento.imagen ===
      '/covers/placeholder-event.jpg'
        ? ''
        : evento.imagen,

    join_url:
      evento.meetUrl || '',

    capacity:
      evento.capacidad,

    disponible:
      evento.disponible
  }
}

function closeEditModal() {
  editModal.value = null
}

async function saveEdit() {
  if (!editModal.value) {
    return
  }

  const form =
    editModal.value

  const validation =
    validateEventForm(form)

  if (validation) {
    showToast(
      validation,
      'error'
    )

    return
  }

  const payload = {
    title:
      form.title.trim(),

    professional:
      form.professional.trim(),

    role:
      form.role.trim(),

    date:
      form.date,

    hour:
      form.hour,

    modality:
      form.modality,

    description:
      form.description.trim() ||
      null,

    image_path:
      form.image_path.trim() ||
      null,

    join_url:
      form.join_url.trim() ||
      null,

    capacity:
      Number(form.capacity),

    disponible:
      form.disponible
  }

  const { error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', form.id)

  if (error) {
    console.error(
      'Error editando evento:',
      error
    )

    showToast(
      'No se pudieron guardar los cambios.',
      'error'
    )

    return
  }

  closeEditModal()

  showToast(
    'Evento actualizado correctamente.'
  )

  await loadEventos()
  await loadEventCounts()
}

/* =========================================
   ELIMINAR EVENTO
========================================= */

const confirmDelete =
  ref<Evento | null>(null)

const deletingEvent =
  ref(false)

function askDelete(
  evento: Evento
) {
  confirmDelete.value =
    evento
}

function cancelDelete() {
  if (deletingEvent.value) {
    return
  }

  confirmDelete.value = null
}

async function performDelete() {
  if (!confirmDelete.value) {
    return
  }

  deletingEvent.value = true

  const eventId =
    confirmDelete.value.id

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  deletingEvent.value = false

  if (error) {
    console.error(
      'Error eliminando evento:',
      error
    )

    showToast(
      'No se pudo eliminar el evento.',
      'error'
    )

    return
  }

  confirmDelete.value = null

  showToast(
    'Evento eliminado correctamente.'
  )

  await loadEventos()
}

/* =========================================
   CARGA INICIAL
========================================= */

onMounted(async () => {
  await Promise.all([
    loadAdminState(),
    loadEventos(),
    loadMyEventRegistrations()
  ])

  await loadEventCounts()
})
</script>

<template>
  <h1 class="visually-hidden">
    Agendar eventos
  </h1>

  <main class="agendar-sub">

    <!-- =====================================
         ENCABEZADO
    ====================================== -->

    <header class="page-head">
      <div class="page-top">

        <button
          class="back-link"
          type="button"
          aria-label="Volver a Agendar"
          @click="goBackToAgendar"
        >
          <i
            class="fa-solid fa-arrow-left arrow"
            aria-hidden="true"
          ></i>
        </button>

        <div class="page-copy">
          <h2 class="page-title">
            Eventos
          </h2>

          <p class="page-sub">
            Reservá tu lugar en eventos especiales y accedé al enlace cuando esté habilitado.
          </p>
        </div>
      </div>

      <nav
        class="tabs-row"
        aria-label="Navegación de agenda"
      >
        <button
          class="tab-pill tab-pill--active"
          type="button"
          aria-current="page"
        >
          Eventos
        </button>

        <button
          class="tab-pill"
          type="button"
          @click="goSesiones"
        >
          Sesiones
        </button>
      </nav>
    </header>

    <!-- =====================================
         ADMIN
    ====================================== -->

    <div
      v-if="isAdmin"
      class="content-row"
    >

      <!-- LISTADO -->

      <div class="content-main">

        <p
          v-if="loading"
          class="state"
          role="status"
          aria-live="polite"
        >
          Cargando eventos…
        </p>

        <p
          v-else-if="!eventos.length"
          class="state"
        >
          No hay eventos cargados.
        </p>

        <section
          v-else
          class="lista"
          aria-label="Lista de eventos"
        >

          <article
            v-for="evento in eventos"
            :key="evento.id"
            class="card"
          >

            <div class="card-img">
              <img
                :src="evento.imagen"
                :alt="`Imagen de ${evento.titulo}`"
              />
            </div>

            <div class="card-body">

              <h3 class="title">
                {{ evento.titulo }}
              </h3>

              <p class="meta">
                Con:
                {{ evento.profesional }}
                —
                {{ evento.rol }}

                <br />

                {{ evento.fecha }}
                ·
                {{ evento.hora }} hs
                ·
                {{ evento.modalidad }}
              </p>

              <p class="desc">
                {{ evento.descripcion }}
              </p>

              <!-- ACCIONES USUARIO -->

              <div class="actions">

                <button
                  v-if="!isRegistered(evento)"
                  class="action-btn action-btn--primary"
                  type="button"
                  :disabled="!canRegister(evento)"
                  :aria-label="`${cuposTexto(evento)} en ${evento.titulo}`"
                  @click="registrarmeEvento(evento)"
                >
                  {{ cuposTexto(evento) }}
                </button>

                <button
                  v-else
                  class="action-btn action-btn--danger"
                  type="button"
                  :disabled="busyId === evento.id"
                  :aria-label="`Cancelar registro en ${evento.titulo}`"
                  @click="openConfirmCancel(evento)"
                >
                  Cancelar
                </button>

                <button
                  class="action-btn"
                  :class="
                    evento.disponible
                      ? 'action-btn--primary'
                      : 'action-btn--soft-disabled'
                  "
                  type="button"
                  :aria-label="
                    evento.disponible
                      ? `Unirse a ${evento.titulo}`
                      : `${evento.titulo} todavía no está disponible`
                  "
                  @click="unirmeEvento(evento)"
                >
                  {{
                    evento.disponible
                      ? 'Unirme ahora'
                      : 'Próximamente'
                  }}
                </button>
              </div>

              <!-- ABM -->

              <div class="small-actions">

                <button
                  class="abm-btn abm-btn--edit"
                  type="button"
                  :aria-label="`Editar evento ${evento.titulo}`"
                  @click="startEditEvent(evento)"
                >
                  Editar
                </button>

                <button
                  class="abm-btn abm-btn--delete"
                  type="button"
                  :aria-label="`Eliminar evento ${evento.titulo}`"
                  @click="askDelete(evento)"
                >
                  Eliminar
                </button>

              </div>
            </div>
          </article>
        </section>
      </div>

      <!-- ===================================
           NUEVO EVENTO
      ==================================== -->

      <section
        class="abm card abm-box"
        aria-labelledby="new-event-title"
      >

        <h3
          id="new-event-title"
          class="abm-title"
        >
          Nuevo evento
        </h3>

        <div class="abm-grid">

          <!-- TÍTULO -->

          <div class="field">
            <label for="event-title">
              Título
            </label>

            <input
              id="event-title"
              v-model="eventCreateForm.title"
              type="text"
              autocomplete="off"
              required
              aria-required="true"
              :aria-invalid="
                eventCreateForm.title.trim()
                  ? 'false'
                  : 'true'
              "
              aria-describedby="event-title-help"
            />

            <small
              id="event-title-help"
              class="field-help"
            >
              Ingresá el nombre del evento.
            </small>
          </div>

          <!-- PROFESIONAL -->

          <div class="field">
            <label for="event-professional">
              Profesional
            </label>

            <input
              id="event-professional"
              v-model="eventCreateForm.professional"
              type="text"
              autocomplete="off"
              required
              aria-required="true"
              :aria-invalid="
                eventCreateForm.professional.trim()
                  ? 'false'
                  : 'true'
              "
              aria-describedby="event-professional-help"
            />

            <small
              id="event-professional-help"
              class="field-help"
            >
              Nombre del profesional que coordina el evento.
            </small>
          </div>

          <!-- ROL -->

          <div class="field">
            <label for="event-role">
              Rol
            </label>

            <input
              id="event-role"
              v-model="eventCreateForm.role"
              type="text"
              autocomplete="off"
              required
              aria-required="true"
              :aria-invalid="
                eventCreateForm.role.trim()
                  ? 'false'
                  : 'true'
              "
              aria-describedby="event-role-help"
            />

            <small
              id="event-role-help"
              class="field-help"
            >
              Por ejemplo: Psicóloga o Nutricionista.
            </small>
          </div>

          <!-- FECHA -->

          <div class="field">
            <label for="event-date">
              Fecha
            </label>

            <input
              id="event-date"
              v-model="eventCreateForm.date"
              type="date"
              lang="es-AR"
              required
              aria-required="true"
              :aria-invalid="
                eventCreateForm.date
                  ? 'false'
                  : 'true'
              "
              aria-describedby="event-date-help"
            />

            <small
              id="event-date-help"
              class="field-help"
            >
              Seleccioná la fecha del evento.
            </small>
          </div>

          <!-- HORA -->

          <div class="field">
            <label for="event-hour">
              Hora
            </label>

            <input
              id="event-hour"
              v-model="eventCreateForm.hour"
              type="time"
              lang="es-AR"
              required
              aria-required="true"
              :aria-invalid="
                eventCreateForm.hour
                  ? 'false'
                  : 'true'
              "
              aria-describedby="event-hour-help"
            />

            <small
              id="event-hour-help"
              class="field-help"
            >
              Seleccioná el horario de inicio.
            </small>
          </div>

          <!-- MODALIDAD -->

          <div class="field">
            <label for="event-modality">
              Modalidad
            </label>

            <select
              id="event-modality"
              v-model="eventCreateForm.modality"
              aria-describedby="event-modality-help"
            >
              <option value="Virtual">
                Virtual
              </option>

              <option value="Presencial">
                Presencial
              </option>

              <option value="Mixta">
                Mixta
              </option>
            </select>

            <small
              id="event-modality-help"
              class="field-help"
            >
              Elegí cómo se realizará el evento.
            </small>
          </div>

          <!-- CAPACIDAD -->

          <div class="field">
            <label for="event-capacity">
              Capacidad
            </label>

            <input
              id="event-capacity"
              v-model.number="eventCreateForm.capacity"
              type="number"
              min="1"
              required
              aria-required="true"
              :aria-invalid="
                eventCreateForm.capacity > 0
                  ? 'false'
                  : 'true'
              "
              aria-describedby="event-capacity-help"
            />

            <small
              id="event-capacity-help"
              class="field-help"
            >
              Cantidad máxima de participantes.
            </small>
          </div>

          <!-- IMAGEN -->

          <div class="field">
            <label for="event-image">
              Ruta de la imagen
            </label>

            <input
              id="event-image"
              v-model="eventCreateForm.image_path"
              type="text"
              placeholder="Ingresá la ruta de la imagen"
              aria-describedby="event-image-help"
            />

            <small
              id="event-image-help"
              class="field-help"
            >
              Ingresá la ubicación de la imagen de portada.
            </small>
          </div>

          <!-- ENLACE -->

          <div class="field">
            <label for="event-url">
              Enlace del evento
            </label>

            <input
              id="event-url"
              v-model="eventCreateForm.join_url"
              type="url"
              placeholder="Pegá aquí el enlace para unirse"
              aria-describedby="event-url-help"
            />

            <small
              id="event-url-help"
              class="field-help"
            >
              Puede ser un enlace de Google Meet u otra plataforma.
            </small>
          </div>

          <!-- DISPONIBLE -->

          <div class="check-wrap">

            <label
              class="check-field"
              for="event-available"
            >
              <input
                id="event-available"
                v-model="eventCreateForm.disponible"
                type="checkbox"
                aria-describedby="event-available-help"
              />

              Habilitar “Unirme ahora”
            </label>

            <small
              id="event-available-help"
              class="field-help"
            >
              Activá esta opción cuando el enlace ya pueda utilizarse.
            </small>
          </div>

          <!-- DESCRIPCIÓN -->

          <div class="field">
            <label for="event-description">
              Descripción
            </label>

            <textarea
              id="event-description"
              v-model="eventCreateForm.description"
              rows="3"
              aria-describedby="event-description-help"
            ></textarea>

            <small
              id="event-description-help"
              class="field-help"
            >
              Contá brevemente de qué se trata el evento.
            </small>
          </div>

        </div>

        <div class="abm-actions">

          <button
            class="pill pill--primary"
            type="button"
            @click="createEvent"
          >
            Crear evento
          </button>

          <button
            class="pill pill--soft"
            type="button"
            @click="resetEventCreateForm"
          >
            Limpiar
          </button>

        </div>
      </section>
    </div>

    <!-- =====================================
         USUARIO NORMAL
    ====================================== -->

    <template v-else>

      <p
        v-if="loading"
        class="state"
        role="status"
        aria-live="polite"
      >
        Cargando eventos…
      </p>

      <p
        v-else-if="!eventos.length"
        class="state"
      >
        No hay eventos disponibles.
      </p>

      <section
        v-else
        class="lista"
        aria-label="Lista de eventos"
      >

        <article
          v-for="evento in eventos"
          :key="evento.id"
          class="card"
        >

          <div class="card-img">
            <img
              :src="evento.imagen"
              :alt="`Imagen de ${evento.titulo}`"
            />
          </div>

          <div class="card-body">

            <h3 class="title">
              {{ evento.titulo }}
            </h3>

            <p class="meta">
              Con:
              {{ evento.profesional }}
              —
              {{ evento.rol }}

              <br />

              {{ evento.fecha }}
              ·
              {{ evento.hora }} hs
              ·
              {{ evento.modalidad }}
            </p>

            <p class="desc">
              {{ evento.descripcion }}
            </p>

            <div class="actions">

              <button
                v-if="!isRegistered(evento)"
                class="action-btn action-btn--primary"
                type="button"
                :disabled="!canRegister(evento)"
                :aria-label="`${cuposTexto(evento)} en ${evento.titulo}`"
                @click="registrarmeEvento(evento)"
              >
                {{ cuposTexto(evento) }}
              </button>

              <button
                v-else
                class="action-btn action-btn--danger"
                type="button"
                :disabled="busyId === evento.id"
                :aria-label="`Cancelar registro en ${evento.titulo}`"
                @click="openConfirmCancel(evento)"
              >
                Cancelar
              </button>

              <button
                class="action-btn"
                :class="
                  evento.disponible
                    ? 'action-btn--primary'
                    : 'action-btn--soft-disabled'
                "
                type="button"
                @click="unirmeEvento(evento)"
              >
                {{
                  evento.disponible
                    ? 'Unirme ahora'
                    : 'Próximamente'
                }}
              </button>

            </div>
          </div>
        </article>
      </section>
    </template>

    <!-- =====================================
         MODAL EDITAR EVENTO
    ====================================== -->

    <div
      v-if="editModal"
      class="overlay"
      @click.self="closeEditModal"
    >
      <div
        class="modal-card edit-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-event-heading"
      >

        <header class="edit-header">

          <h2
            id="edit-event-heading"
            class="edit-title"
          >
            Editar evento
          </h2>

          <button
            class="edit-close"
            type="button"
            aria-label="Cerrar edición del evento"
            @click="closeEditModal"
          >
            ×
          </button>

        </header>

        <section class="edit-body">

          <div class="abm-grid">

            <div class="field">
              <label for="edit-event-title">
                Título
              </label>

              <input
                id="edit-event-title"
                v-model="editModal.title"
                type="text"
                required
                aria-required="true"
              />
            </div>

            <div class="field">
              <label for="edit-event-professional">
                Profesional
              </label>

              <input
                id="edit-event-professional"
                v-model="editModal.professional"
                type="text"
                required
                aria-required="true"
              />
            </div>

            <div class="field">
              <label for="edit-event-role">
                Rol
              </label>

              <input
                id="edit-event-role"
                v-model="editModal.role"
                type="text"
                required
                aria-required="true"
              />
            </div>

            <div class="field">
              <label for="edit-event-date">
                Fecha
              </label>

              <input
                id="edit-event-date"
                v-model="editModal.date"
                type="date"
                lang="es-AR"
                required
                aria-required="true"
              />
            </div>

            <div class="field">
              <label for="edit-event-hour">
                Hora
              </label>

              <input
                id="edit-event-hour"
                v-model="editModal.hour"
                type="time"
                lang="es-AR"
                required
                aria-required="true"
              />
            </div>

            <div class="field">
              <label for="edit-event-modality">
                Modalidad
              </label>

              <select
                id="edit-event-modality"
                v-model="editModal.modality"
              >
                <option value="Virtual">
                  Virtual
                </option>

                <option value="Presencial">
                  Presencial
                </option>

                <option value="Mixta">
                  Mixta
                </option>
              </select>
            </div>

            <div class="field">
              <label for="edit-event-capacity">
                Capacidad
              </label>

              <input
                id="edit-event-capacity"
                v-model.number="editModal.capacity"
                type="number"
                min="1"
                required
              />
            </div>

            <div class="field">
              <label for="edit-event-image">
                Ruta de la imagen
              </label>

              <input
                id="edit-event-image"
                v-model="editModal.image_path"
                type="text"
                placeholder="Ingresá la ruta de la imagen"
              />
            </div>

            <div class="field">
              <label for="edit-event-url">
                Enlace del evento
              </label>

              <input
                id="edit-event-url"
                v-model="editModal.join_url"
                type="url"
                placeholder="Pegá aquí el enlace para unirse"
              />
            </div>

            <div class="check-wrap">

              <label
                class="check-field"
                for="edit-event-available"
              >
                <input
                  id="edit-event-available"
                  v-model="editModal.disponible"
                  type="checkbox"
                />

                Habilitar “Unirme ahora”
              </label>

            </div>

            <div class="field">
              <label for="edit-event-description">
                Descripción
              </label>

              <textarea
                id="edit-event-description"
                v-model="editModal.description"
                rows="3"
              ></textarea>
            </div>

          </div>
        </section>

        <footer class="edit-footer">

          <button
            class="pill pill--soft"
            type="button"
            @click="closeEditModal"
          >
            Cancelar
          </button>

          <button
            class="pill pill--primary"
            type="button"
            @click="saveEdit"
          >
            Guardar cambios
          </button>

        </footer>
      </div>
    </div>

    <!-- =====================================
         MODAL ELIMINAR EVENTO
    ====================================== -->

    <div
      v-if="confirmDelete"
      class="overlay"
      @click.self="cancelDelete"
    >
      <div
        class="modal-card confirm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-event-heading"
      >

        <h2
          id="delete-event-heading"
          class="confirm-title"
        >
          ¿Eliminar evento?
        </h2>

        <p class="confirm-text">
          Se eliminará

          <strong>
            «{{ confirmDelete.titulo }}»
          </strong>.

          Esta acción no se puede deshacer.
        </p>

        <div class="confirm-actions">

          <button
            class="pill pill--soft"
            type="button"
            :disabled="deletingEvent"
            @click="cancelDelete"
          >
            Cancelar
          </button>

          <button
            class="pill pill--danger"
            type="button"
            :disabled="deletingEvent"
            @click="performDelete"
          >
            {{
              deletingEvent
                ? 'Eliminando…'
                : 'Eliminar'
            }}
          </button>

        </div>
      </div>
    </div>

    <!-- =====================================
         MODAL INFORMACIÓN
    ====================================== -->

    <div
      v-if="showInfo"
      class="modal"
      @click.self="closeInfo"
    >
      <div
        class="modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
      >

        <h2
          id="info-modal-title"
          class="modal-title"
        >
          {{ infoTitle }}
        </h2>

        <p class="modal-text">
          {{ infoText }}
        </p>

        <button
          class="action-btn action-btn--primary modal-btn"
          type="button"
          @click="closeInfo"
        >
          Entendido
        </button>

      </div>
    </div>

    <!-- =====================================
         MODAL CANCELAR REGISTRO
    ====================================== -->

    <div
      v-if="showConfirm"
      class="modal"
      @click.self="closeConfirm"
    >
      <div
        class="modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >

        <h2
          id="confirm-modal-title"
          class="modal-title"
        >
          {{ confirmTitle }}
        </h2>

        <p class="modal-text">
          {{ confirmText }}
        </p>

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
            {{
              confirmBusy
                ? 'Cancelando…'
                : 'Sí, cancelar'
            }}
          </button>

        </div>
      </div>
    </div>

    <!-- =====================================
         TOAST ACCESIBLE
    ====================================== -->

    <div
      v-if="toast"
      class="toast"
      :class="toast.kind"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ toast.message }}
    </div>

  </main>
</template>

<style scoped>
.agendar-sub {
  background: #ffffff;
  padding: 20px 18px 48px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: var(--font-main);
}

/* =========================================
   HEADER
========================================= */

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
  color: #50bdbd;
  font-size: 1.55rem;
  font-weight: 800;
}

.page-sub {
  max-width: 72ch;
  margin: 0;
  color: #475569;
  font-size: 0.96rem;
  line-height: 1.4;
}

/* =========================================
   BACK
========================================= */

.back-link {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border: none;
  border-radius: 999px;

  background: #e8fbf8;
  color: #50bdbd;

  cursor: pointer;

  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

.arrow {
  font-size: 1.25rem;
  line-height: 1;
}

@media (hover: hover) {
  .back-link:hover {
    background: #d8f6f1;
    transform: translateY(-1px);

    box-shadow:
      0 8px 16px
      rgba(80, 189, 189, 0.14);
  }
}

.back-link:focus-visible,
.tab-pill:focus-visible,
.action-btn:focus-visible,
.abm-btn:focus-visible,
.pill:focus-visible,
.edit-close:focus-visible,
.field input:focus-visible,
.field select:focus-visible,
.field textarea:focus-visible {
  outline: 3px solid rgba(80, 189, 189, 0.35);
  outline-offset: 2px;
}

/* =========================================
   TABS
========================================= */

.tabs-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tab-pill {
  padding: 10px 18px;

  border: none;
  border-radius: 999px;

  background: #85b6e0;
  color: #ffffff;

  font-family: inherit;
  font-size: 0.96rem;
  font-weight: 700;

  cursor: pointer;

  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.tab-pill--active {
  background: #50bdbd;

  box-shadow:
    0 0 0 2px
    rgba(80, 189, 189, 0.15)
    inset;
}

@media (hover: hover) {
  .tab-pill:hover {
    background: #50bdbd;
    transform: translateY(-1px);

    box-shadow:
      0 10px 18px
      rgba(80, 189, 189, 0.18);
  }
}

/* =========================================
   LAYOUT ABM
========================================= */

.content-row {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.content-main {
  flex: 1 1 auto;
  min-width: 0;
}

.abm-box {
  flex: 0 0 320px;
  max-width: 320px;
}

/* =========================================
   LISTA
========================================= */

.lista {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 18px;
}

/* =========================================
   CARDS
========================================= */

.card {
  width: 100%;
  box-sizing: border-box;

  background: #ffffff;

  border:
    1px solid #e2edf7;

  border-radius: 18px;

  padding: 14px;

  box-shadow:
    0 12px 28px
    rgba(15, 23, 42, 0.08);

  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.lista .card {
  display: flex;
  align-items: center;
  gap: 18px;

  min-height: 200px;
}

@media (hover: hover) {
  .card:hover {
    transform: translateY(-4px);

    border-color:
      #b6ebe5;

    box-shadow:
      0 20px 40px
      rgba(15, 23, 42, 0.12);
  }
}

/* =========================================
   IMAGEN
========================================= */

.card-img {
  width: 130px;
  height: 130px;
  flex: 0 0 130px;

  overflow: hidden;

  border:
    1px solid #e8eef5;

  border-radius: 18px;

  background: #f8fafc;
}

.card-img img {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;
}

/* =========================================
   CONTENIDO CARD
========================================= */

.card-body {
  min-width: 0;
  flex: 1;

  display: flex;
  flex-direction: column;

  gap: 10px;
}

.title {
  margin: 0;

  color: #111827;

  font-size: 1.15rem;
  font-weight: 700;
}

.meta {
  margin: 0;

  color: #6b7280;

  font-size: 0.92rem;
  line-height: 1.45;
}

.desc {
  margin: 0;

  color: #374151;

  font-size: 0.98rem;
  line-height: 1.45;
}

/* =========================================
   ACTIONS
========================================= */

.actions,
.small-actions,
.abm-actions,
.edit-footer,
.confirm-actions,
.modal-actions {
  display: flex;
  align-items: center;

  gap: 10px;

  flex-wrap: wrap;
}

.action-btn {
  min-width: 150px;
  min-height: 40px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 8px 15px;

  border: none;
  border-radius: 999px;

  background: #50bdbd;
  color: #ffffff;

  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 700;

  cursor: pointer;

  box-shadow:
    0 8px 18px
    rgba(80, 189, 189, 0.22);

  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: default;
  box-shadow: none;
}

.action-btn--primary {
  background: #50bdbd;
}

.action-btn--danger {
  background: #ef5350;
}

.action-btn--ghost {
  border: 1px solid #d7e6f6;

  background: #eef6ff;
  color: #1f2937;

  box-shadow: none;
}

.action-btn--soft-disabled {
  background: #d7eeee;
  color: #2f5f5f;

  box-shadow: none;
}

/* =========================================
   EDITAR / ELIMINAR
========================================= */

.small-actions {
  margin-top: 4px;
}

.abm-btn {
  min-height: 34px;

  padding: 7px 14px;

  border:
    1px solid #b6ebe5;

  border-radius: 999px;

  background: #ffffff;

  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 700;

  cursor: pointer;

  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

.abm-btn--edit {
  color: #50bdbd;
}

.abm-btn--delete {
  color: #e53935;

  border-color:
    rgba(229, 57, 53, 0.5);
}

@media (hover: hover) {
  .abm-btn--edit:hover {
    background: #f3fffe;
    transform: translateY(-1px);
  }

  .abm-btn--delete:hover {
    background:
      rgba(229, 57, 53, 0.08);

    transform: translateY(-1px);
  }
}

/* =========================================
   ABM
========================================= */

.abm {
  display: grid;
  gap: 14px;
}

.abm-title {
  margin: 0;

  color: #50bdbd;

  font-size: 1.08rem;
  font-weight: 800;
}

.abm-grid {
  display: grid;
  gap: 12px;
}

/* =========================================
   CAMPOS
========================================= */

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label,
.check-field {
  color: #50bdbd;

  font-size: 0.86rem;
  font-weight: 700;
}

.field input,
.field textarea,
.field select {
  width: 100%;

  box-sizing: border-box;

  padding: 9px 12px;

  border:
    1.5px solid #dbe7f3;

  border-radius: 12px;

  background: #ffffff;

  font: inherit;
  font-size: 0.92rem;

  outline: none;

  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  border-color: #50bdbd;

  box-shadow:
    0 0 0 3px
    rgba(80, 189, 189, 0.18);
}

.field input[aria-invalid="true"] {
  border-color: #ef4444;
}

.field-help {
  display: block;

  margin-top: 1px;

  color: #64748b;

  font-size: 0.78rem;
  line-height: 1.35;
}

/* =========================================
   CHECKBOX
========================================= */

.check-wrap {
  display: grid;
  gap: 4px;
}

.check-field {
  display: flex;
  align-items: center;

  gap: 8px;

  cursor: pointer;
}

.check-field input {
  width: 18px;
  height: 18px;

  flex: 0 0 18px;

  accent-color: #50bdbd;
}

/* =========================================
   PILLS
========================================= */

.pill {
  min-height: 38px;

  padding: 8px 16px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border: none;
  border-radius: 999px;

  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 700;

  cursor: pointer;

  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.pill--primary {
  background: #50bdbd;
  color: #ffffff;

  box-shadow:
    0 8px 18px
    rgba(80, 189, 189, 0.22);
}

.pill--soft {
  border:
    1px solid #b6ebe5;

  background: #ffffff;
  color: #50bdbd;
}

.pill--danger {
  background: #e53935;
  color: #ffffff;
}

@media (hover: hover) {
  .pill--primary:hover {
    background: #3ea9a9;
    transform: translateY(-1px);
  }

  .pill--soft:hover {
    background: #e0faf7;
    transform: translateY(-1px);
  }

  .pill--danger:hover {
    background: #c62828;
    transform: translateY(-1px);
  }
}

/* =========================================
   MODALES
========================================= */

.overlay,
.modal {
  position: fixed;
  inset: 0;

  z-index: 2000;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 16px;

  background:
    rgba(15, 23, 42, 0.4);

  backdrop-filter: blur(4px);
}

.modal-card,
.modal-box {
  width: min(440px, 96vw);

  max-height: 90vh;

  overflow-y: auto;

  box-sizing: border-box;

  border:
    1px solid #e8eef3;

  border-radius: 18px;

  background: #ffffff;

  box-shadow:
    0 18px 40px
    rgba(30, 41, 59, 0.22);
}

.modal-box {
  padding: 18px;

  text-align: center;
}

.edit-header {
  padding: 14px 18px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  border-bottom:
    1px solid #eef2f7;
}

.edit-title {
  margin: 0;

  color: #50bdbd;

  font-size: 1.15rem;
  font-weight: 800;
}

.edit-close {
  width: 34px;
  height: 34px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border: none;
  border-radius: 50%;

  background: #f0f4f8;
  color: #111827;

  font-size: 1.1rem;

  cursor: pointer;
}

.edit-body {
  padding: 18px;
}

.edit-footer {
  justify-content: flex-end;

  padding:
    14px
    18px
    18px;

  border-top:
    1px solid #eef2f7;
}

/* =========================================
   CONFIRM
========================================= */

.confirm-card {
  max-width: 400px;

  padding: 20px;
}

.confirm-title,
.modal-title {
  margin:
    0
    0
    8px;

  color: #111827;

  font-size: 1.15rem;
  font-weight: 800;
}

.confirm-text,
.modal-text {
  margin:
    0
    0
    16px;

  color: #475569;

  font-size: 0.92rem;
  line-height: 1.45;
}

.confirm-actions,
.modal-actions {
  justify-content: center;
}

/* =========================================
   TOAST
========================================= */
.toast {
  position: fixed;
  right: 18px;
  z-index: 5000;
  max-width: min(420px, calc(100vw - 36px));
  padding: 11px 16px;
  border-radius: 12px;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.35;
  box-sizing: border-box;
  box-shadow:
    0 10px 28px
    rgba(15, 23, 42, 0.24);
}

.toast.success {
  bottom: 20px;
  background: #50bdbd;
}

.toast.error {
  top: 18px;
  bottom: auto;
  background: #ef4444;
}


/* =========================================
   STATE
========================================= */

.state {
  margin:
    0
    0
    12px;

  color: #6b7280;

  font-size: 0.92rem;
}

/* =========================================
   SCREEN READER
========================================= */

.visually-hidden {
  position: absolute !important;

  width: 1px;
  height: 1px;

  padding: 0;
  margin: -1px;

  overflow: hidden;

  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);

  white-space: nowrap;

  border: 0;
}

/* =========================================
   RESPONSIVE
========================================= */

@media (max-width: 980px) {
  .content-row {
    flex-direction: column-reverse;
  }

  .abm-box {
    width: 100%;

    max-width: 100%;

    flex: none;
  }
}

@media (max-width: 900px) {
  .lista {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
 .toast {
    left: 12px;
    right: 12px;
    width: auto;
    max-width: none;
    text-align: center;
  }

  .toast.success {
    top: auto;
    bottom: 82px;
  }

  .toast.error {
    top: 12px;
    bottom: auto;
  }
}

@media (max-width: 700px) {
  .agendar-sub {
    padding:
      16px
      12px
      96px;
  }

  .page-title {
    font-size: 1.35rem;
  }

  .page-sub {
    font-size: 0.9rem;
  }

  .lista .card {
    min-height: 160px;

    padding: 12px;

    gap: 12px;
  }

  .card-img {
    width: 100px;
    height: 100px;

    flex-basis: 100px;
  }

  .action-btn {
    min-width: 110px;
    min-height: 34px;

    padding:
      7px
      11px;

    font-size: 0.76rem;
  }
}

@media (max-width: 520px) {
  .tabs-row {
    flex-wrap: nowrap;
  }

  .tab-pill {
    min-width: 100px;

    padding:
      7px
      12px;

    font-size: 0.8rem;
  }

  .title {
    font-size: 0.92rem;
  }

  .meta,
  .desc {
    font-size: 0.78rem;
  }

  .field-help {
    font-size: 0.74rem;
  }

  .abm-btn {
    min-height: 30px;

    padding:
      5px
      9px;

    font-size: 0.7rem;
  }

  .modal-actions,
  .confirm-actions,
  .edit-footer {
    flex-direction: row;
  }

  .pill {
    min-width: 105px;

    padding:
      7px
      12px;

    font-size: 0.76rem;
  }

  .toast {
    left: 12px;
    right: 12px;
    bottom: 82px;

    text-align: center;
  }
}

@media (max-width: 390px) {
  .lista .card {
    flex-direction: column;
    align-items: stretch;
  }

  .card-img {
    width: 100%;
    height: 140px;

    flex: none;
  }

  .actions {
    width: 100%;
  }
}
</style>
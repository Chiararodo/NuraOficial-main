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
  disponible: boolean | null
  meet_url: string | null
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

type SessionForm = {
  title: string
  professional: string
  role: string
  date: string
  hour: string
  modality: string
  capacity: number
  description: string
  image_path: string
  meet_url: string
  disponible: boolean
}

/* =========================================
   ESTADO GENERAL
========================================= */

const sesiones = ref<Sesion[]>([])
const loading = ref(true)
const isAdmin = ref(false)

const myRegs = ref<Set<string>>(new Set())
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
   MODAL DE INFORMACIÓN
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
const pendingSession = ref<Sesion | null>(null)

function openConfirmCancel(sesion: Sesion) {
  pendingSession.value = sesion

  confirmTitle.value =
    '¿Seguro que querés cancelar tu lugar?'

  confirmText.value =
    'Si cancelás, liberás tu cupo para otra persona. Si más adelante hay lugar, vas a poder anotarte nuevamente.'

  showConfirm.value = true
}

function closeConfirm() {
  if (confirmBusy.value) {
    return
  }

  showConfirm.value = false
  pendingSession.value = null
}

/* =========================================
   NAVEGACIÓN
========================================= */

function goBackToAgendar() {
  router.push('/app/agendar')
}

function goEventos() {
  router.push('/app/agendar/eventos')
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
   FORMATO DE FECHA
========================================= */

function formatFecha(dateStr: string) {
  if (!dateStr) {
    return ''
  }

  /*
   * Evita que la zona horaria cambie
   * accidentalmente el día.
   */
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
   CARGAR SESIONES
========================================= */

async function loadSesiones() {
  loading.value = true

  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      title,
      professional,
      role,
      date,
      hour,
      modality,
      capacity,
      registered,
      description,
      image_path,
      disponible,
      meet_url
    `)
    .order('date', {
      ascending: true
    })
    .order('hour', {
      ascending: true
    })

  if (error) {
    console.error(
      'Error cargando sesiones:',
      error
    )

    sesiones.value = []
    loading.value = false

    showToast(
      'No se pudieron cargar las sesiones.',
      'error'
    )

    return
  }

  const rows =
    (data || []) as SesionDb[]

  sesiones.value = rows.map((row) => ({
    id: row.id,

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
      '/covers/placeholder-session.jpg',

    capacidad:
      row.capacity || 30,

    registrados:
      row.registered || 0,

    disponible:
      Boolean(row.disponible),

    meetUrl:
      row.meet_url || undefined
  }))

  loading.value = false
}

/* =========================================
   INSCRIPCIONES DEL USUARIO
========================================= */

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
    console.error(
      'Error cargando inscripciones:',
      error
    )

    myRegs.value = new Set()
    return
  }

  myRegs.value =
    new Set(
      (data || []).map(
        (row: any) =>
          row.session_id
      )
    )
}

/* =========================================
   CONTAR INSCRIPTOS
========================================= */

async function loadSessionCounts() {
  const ids =
    sesiones.value.map(
      (sesion) => sesion.id
    )

  if (!ids.length) {
    return
  }

  const { data, error } = await supabase
    .from('session_registrations')
    .select('session_id')
    .in('session_id', ids)

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
      (row as any).session_id as string

    counts.set(
      id,
      (counts.get(id) || 0) + 1
    )
  }

  sesiones.value =
    sesiones.value.map(
      (sesion) => ({
        ...sesion,

        registrados:
          counts.get(sesion.id) || 0
      })
    )
}

/* =========================================
   HELPERS DE REGISTRO
========================================= */

function isRegistered(sesion: Sesion) {
  return myRegs.value.has(
    sesion.id
  )
}

function estaLlena(sesion: Sesion) {
  return (
    sesion.registrados >=
    sesion.capacidad
  )
}

function cuposTexto(sesion: Sesion) {
  if (estaLlena(sesion)) {
    return 'Cupos completos'
  }

  return `Cupos: ${sesion.registrados}/${sesion.capacidad}`
}

function canRegister(sesion: Sesion) {
  if (!auth.user) {
    return true
  }

  if (isRegistered(sesion)) {
    return false
  }

  if (estaLlena(sesion)) {
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
   REGISTRARSE EN SESIÓN
========================================= */

async function registrarmeSesion(
  sesion: Sesion
) {
  if (!auth.user) {
    openInfo(
      'Necesitás iniciar sesión',
      'Iniciá sesión para poder anotarte en una sesión.'
    )

    return
  }

  if (isRegistered(sesion)) {
    openInfo(
      'Ya tenés un lugar',
      'Tu lugar ya está reservado para esta sesión.'
    )

    return
  }

  if (estaLlena(sesion)) {
    openInfo(
      'Sesión completa',
      'Esta sesión ya no tiene cupos disponibles.'
    )

    return
  }

  busyId.value = sesion.id

  const { error } = await supabase
    .from('session_registrations')
    .upsert(
      {
        user_id: auth.user.id,
        session_id: sesion.id
      },
      {
        onConflict:
          'user_id,session_id',
        ignoreDuplicates: true
      }
    )

  if (error) {
    console.error(
      'Error registrando sesión:',
      error
    )

    busyId.value = null

    openInfo(
      'No pudimos registrarte',
      'Hubo un problema al reservar tu lugar. Probá nuevamente.'
    )

    return
  }

  myRegs.value =
    new Set([
      ...myRegs.value,
      sesion.id
    ])

  await loadSessionCounts()

  await createNotification(
    'Sesión reservada',
    `Tu lugar quedó reservado para "${sesion.titulo}" (${sesion.fecha} a las ${sesion.hora}).`,
    'session'
  )

  busyId.value = null

  openInfo(
    '¡Listo!',
    'Tu lugar quedó reservado. Te vamos a avisar cuando se acerque la sesión.'
  )
}

/* =========================================
   CANCELAR REGISTRO
========================================= */

async function desregistrarmeSesion(
  sesion: Sesion
) {
  if (!auth.user) {
    return
  }

  if (!isRegistered(sesion)) {
    return
  }

  busyId.value = sesion.id

  const {
    data: row,
    error: findError
  } = await supabase
    .from('session_registrations')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('session_id', sesion.id)
    .maybeSingle()

  if (findError) {
    console.error(findError)
  }

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
    console.error(
      'Error cancelando sesión:',
      error
    )

    busyId.value = null

    openInfo(
      'No pudimos cancelar',
      'Hubo un problema al cancelar tu lugar. Probá nuevamente.'
    )

    return
  }

  const next =
    new Set(myRegs.value)

  next.delete(sesion.id)
  myRegs.value = next

  await loadSessionCounts()

  await createNotification(
    'Lugar cancelado',
    `Cancelaste tu lugar en "${sesion.titulo}".`,
    'session'
  )

  busyId.value = null

  openInfo(
    'Listo',
    'Tu lugar fue cancelado correctamente. Podés volver a anotarte si todavía quedan cupos.'
  )
}

async function confirmCancel() {
  if (!pendingSession.value) {
    return
  }

  confirmBusy.value = true

  await desregistrarmeSesion(
    pendingSession.value
  )

  confirmBusy.value = false
  showConfirm.value = false
  pendingSession.value = null
}

/* =========================================
   UNIRSE A SESIÓN
========================================= */

function unirmeSesion(sesion: Sesion) {
  if (
    !sesion.disponible ||
    !sesion.meetUrl
  ) {
    openInfo(
      'Todavía no está habilitado',
      'El enlace se habilitará el día y horario de la sesión.'
    )

    return
  }

  window.open(
    sesion.meetUrl,
    '_blank',
    'noopener,noreferrer'
  )
}

/* =========================================
   NUEVA SESIÓN
========================================= */

const sessionCreateForm =
  ref<SessionForm>({
    title: '',
    professional: '',
    role: '',
    date: '',
    hour: '',
    modality: 'Virtual',
    capacity: 30,
    description: '',
    image_path: '',
    meet_url: '',
    disponible: false
  })

function resetSessionCreateForm() {
  sessionCreateForm.value = {
    title: '',
    professional: '',
    role: '',
    date: '',
    hour: '',
    modality: 'Virtual',
    capacity: 30,
    description: '',
    image_path: '',
    meet_url: '',
    disponible: false
  }
}

function validateSessionForm(
  form: SessionForm
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
    !form.meet_url.trim()
  ) {
    return 'Ingresá el enlace si la sesión está habilitada.'
  }

  return ''
}

async function createSession() {
  const form =
    sessionCreateForm.value

  const validation =
    validateSessionForm(form)

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

    capacity:
      Number(form.capacity),

    registered: 0,

    description:
      form.description.trim() ||
      null,

    image_path:
      form.image_path.trim() ||
      null,

    meet_url:
      form.meet_url.trim() ||
      null,

    disponible:
      form.disponible
  }

  const { error } = await supabase
    .from('sessions')
    .insert(payload)

  if (error) {
    console.error(
      'Error creando sesión:',
      error
    )

    showToast(
      'No se pudo crear la sesión.',
      'error'
    )

    return
  }

  showToast(
    'Sesión creada correctamente.'
  )

  resetSessionCreateForm()

  await loadSesiones()
  await loadSessionCounts()
}

/* =========================================
   EDITAR SESIÓN
========================================= */

const editModal = ref<
  (SessionForm & {
    id: string
  }) | null
>(null)

function startEditSession(
  sesion: Sesion
) {
  editModal.value = {
    id: sesion.id,

    title:
      sesion.titulo,

    professional:
      sesion.profesional,

    role:
      sesion.rol,

    date:
      sesion.fechaISO,

    hour:
      sesion.hora,

    modality:
      sesion.modalidad,

    capacity:
      sesion.capacidad,

    description:
      sesion.descripcion,

    image_path:
      sesion.imagen ===
      '/covers/placeholder-session.jpg'
        ? ''
        : sesion.imagen,

    meet_url:
      sesion.meetUrl || '',

    disponible:
      sesion.disponible
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
    validateSessionForm(form)

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

    capacity:
      Number(form.capacity),

    description:
      form.description.trim() ||
      null,

    image_path:
      form.image_path.trim() ||
      null,

    meet_url:
      form.meet_url.trim() ||
      null,

    disponible:
      form.disponible
  }

  const { error } = await supabase
    .from('sessions')
    .update(payload)
    .eq('id', form.id)

  if (error) {
    console.error(
      'Error editando sesión:',
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
    'Sesión actualizada correctamente.'
  )

  await loadSesiones()
  await loadSessionCounts()
}

/* =========================================
   ELIMINAR SESIÓN
========================================= */

const confirmDelete =
  ref<Sesion | null>(null)

const deletingSession =
  ref(false)

function askDelete(
  sesion: Sesion
) {
  confirmDelete.value =
    sesion
}

function cancelDelete() {
  if (deletingSession.value) {
    return
  }

  confirmDelete.value = null
}

async function performDelete() {
  if (!confirmDelete.value) {
    return
  }

  deletingSession.value = true

  const sessionId =
    confirmDelete.value.id

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  deletingSession.value = false

  if (error) {
    console.error(
      'Error eliminando sesión:',
      error
    )

    showToast(
      'No se pudo eliminar la sesión.',
      'error'
    )

    return
  }

  confirmDelete.value = null

  showToast(
    'Sesión eliminada correctamente.'
  )

  await loadSesiones()
}

/* =========================================
   CARGA INICIAL
========================================= */

onMounted(async () => {
  await Promise.all([
    loadAdminState(),
    loadSesiones(),
    loadMySessionRegistrations()
  ])

  await loadSessionCounts()
})
</script>

<template>
  <h1 class="visually-hidden">
    Agendar sesiones
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
            Sesiones
          </h2>

          <p class="page-sub">
            Reservá tu lugar en sesiones grupales y accedé al enlace cuando esté habilitado.
          </p>
        </div>
      </div>

      <nav
        class="tabs-row"
        aria-label="Navegación de agenda"
      >
        <button
          class="tab-pill"
          type="button"
          @click="goEventos"
        >
          Eventos
        </button>

        <button
          class="tab-pill tab-pill--active"
          type="button"
          aria-current="page"
        >
          Sesiones
        </button>
      </nav>
    </header>

    <!-- =====================================
         ADMIN
         IGUAL A CONTENIDO / EVENTOS
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
          Cargando sesiones…
        </p>

        <p
          v-else-if="!sesiones.length"
          class="state"
        >
          No hay sesiones cargadas.
        </p>

        <section
          v-else
          class="lista"
          aria-label="Lista de sesiones"
        >

          <article
            v-for="sesion in sesiones"
            :key="sesion.id"
            class="card"
          >

            <div class="card-img">
              <img
                :src="sesion.imagen"
                :alt="`Imagen de ${sesion.titulo}`"
              />
            </div>

            <div class="card-body">

              <h3 class="title">
                {{ sesion.titulo }}
              </h3>

              <p class="meta">
                Con:
                {{ sesion.profesional }}
                —
                {{ sesion.rol }}

                <br />

                {{ sesion.fecha }}
                ·
                {{ sesion.hora }} hs
                ·
                {{ sesion.modalidad }}
              </p>

              <p class="desc">
                {{ sesion.descripcion }}
              </p>

              <!-- BOTONES USUARIO -->

              <div class="actions">

                <button
                  v-if="!isRegistered(sesion)"
                  class="action-btn action-btn--primary"
                  type="button"
                  :disabled="!canRegister(sesion)"
                  :aria-label="`${cuposTexto(sesion)} en ${sesion.titulo}`"
                  @click="registrarmeSesion(sesion)"
                >
                  {{ cuposTexto(sesion) }}
                </button>

                <button
                  v-else
                  class="action-btn action-btn--danger"
                  type="button"
                  :disabled="busyId === sesion.id"
                  :aria-label="`Cancelar registro en ${sesion.titulo}`"
                  @click="openConfirmCancel(sesion)"
                >
                  Cancelar
                </button>

                <button
                  class="action-btn"
                  :class="
                    sesion.disponible
                      ? 'action-btn--primary'
                      : 'action-btn--soft-disabled'
                  "
                  type="button"
                  :aria-label="
                    sesion.disponible
                      ? `Unirse a ${sesion.titulo}`
                      : `${sesion.titulo} todavía no está disponible`
                  "
                  @click="unirmeSesion(sesion)"
                >
                  {{
                    sesion.disponible
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
                  :aria-label="`Editar sesión ${sesion.titulo}`"
                  @click="startEditSession(sesion)"
                >
                  Editar
                </button>

                <button
                  class="abm-btn abm-btn--delete"
                  type="button"
                  :aria-label="`Eliminar sesión ${sesion.titulo}`"
                  @click="askDelete(sesion)"
                >
                  Eliminar
                </button>
              </div>

            </div>
          </article>
        </section>
      </div>

      <!-- ===================================
           FORMULARIO NUEVA SESIÓN
      ==================================== -->

      <section
        class="abm card abm-box"
        aria-labelledby="new-session-title"
      >

        <h3
          id="new-session-title"
          class="abm-title"
        >
          Nueva sesión
        </h3>

        <div class="abm-grid">

          <!-- TÍTULO -->

          <div class="field">
            <label for="session-title">
              Título
            </label>

            <input
              id="session-title"
              v-model="sessionCreateForm.title"
              type="text"
              autocomplete="off"
              required
              aria-required="true"
              :aria-invalid="
                sessionCreateForm.title.trim()
                  ? 'false'
                  : 'true'
              "
              aria-describedby="session-title-help"
            />

            <small
              id="session-title-help"
              class="field-help"
            >
              Ingresá el nombre de la sesión.
            </small>
          </div>

          <!-- PROFESIONAL -->

          <div class="field">
            <label for="session-professional">
              Profesional
            </label>

            <input
              id="session-professional"
              v-model="sessionCreateForm.professional"
              type="text"
              autocomplete="off"
              required
              aria-required="true"
              :aria-invalid="
                sessionCreateForm.professional.trim()
                  ? 'false'
                  : 'true'
              "
              aria-describedby="session-professional-help"
            />

            <small
              id="session-professional-help"
              class="field-help"
            >
              Nombre del profesional que coordina la sesión.
            </small>
          </div>

          <!-- ROL -->

          <div class="field">
            <label for="session-role">
              Rol
            </label>

            <input
              id="session-role"
              v-model="sessionCreateForm.role"
              type="text"
              autocomplete="off"
              required
              aria-required="true"
              :aria-invalid="
                sessionCreateForm.role.trim()
                  ? 'false'
                  : 'true'
              "
              aria-describedby="session-role-help"
            />

            <small
              id="session-role-help"
              class="field-help"
            >
              Por ejemplo: Psicóloga o Nutricionista.
            </small>
          </div>

          <!-- FECHA -->

          <div class="field">
            <label for="session-date">
              Fecha
            </label>

            <input
              id="session-date"
              v-model="sessionCreateForm.date"
              type="date"
              lang="es-AR"
              required
              aria-required="true"
              :aria-invalid="
                sessionCreateForm.date
                  ? 'false'
                  : 'true'
              "
              aria-describedby="session-date-help"
            />

            <small
              id="session-date-help"
              class="field-help"
            >
              Seleccioná la fecha de la sesión.
            </small>
          </div>

          <!-- HORA -->

          <div class="field">
            <label for="session-hour">
              Hora
            </label>

            <input
              id="session-hour"
              v-model="sessionCreateForm.hour"
              type="time"
              lang="es-AR"
              required
              aria-required="true"
              :aria-invalid="
                sessionCreateForm.hour
                  ? 'false'
                  : 'true'
              "
              aria-describedby="session-hour-help"
            />

            <small
              id="session-hour-help"
              class="field-help"
            >
              Seleccioná el horario de inicio.
            </small>
          </div>

          <!-- MODALIDAD -->

          <div class="field">
            <label for="session-modality">
              Modalidad
            </label>

            <select
              id="session-modality"
              v-model="sessionCreateForm.modality"
              aria-describedby="session-modality-help"
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
              id="session-modality-help"
              class="field-help"
            >
              Elegí cómo se realizará la sesión.
            </small>
          </div>

          <!-- CAPACIDAD -->

          <div class="field">
            <label for="session-capacity">
              Capacidad
            </label>

            <input
              id="session-capacity"
              v-model.number="sessionCreateForm.capacity"
              type="number"
              min="1"
              required
              aria-required="true"
              :aria-invalid="
                sessionCreateForm.capacity > 0
                  ? 'false'
                  : 'true'
              "
              aria-describedby="session-capacity-help"
            />

            <small
              id="session-capacity-help"
              class="field-help"
            >
              Cantidad máxima de participantes.
            </small>
          </div>

          <!-- IMAGEN -->

          <div class="field">
            <label for="session-image">
              Ruta de la imagen
            </label>

            <input
              id="session-image"
              v-model="sessionCreateForm.image_path"
              type="text"
              placeholder="Ingresá la ruta de la imagen"
              aria-describedby="session-image-help"
            />

            <small
              id="session-image-help"
              class="field-help"
            >
              Ingresá la ubicación de la imagen de portada.
            </small>
          </div>

          <!-- ENLACE -->

          <div class="field">
            <label for="session-url">
              Enlace de la sesión
            </label>

            <input
              id="session-url"
              v-model="sessionCreateForm.meet_url"
              type="url"
              placeholder="Pegá aquí el enlace para unirse"
              aria-describedby="session-url-help"
            />

            <small
              id="session-url-help"
              class="field-help"
            >
              Puede ser un enlace de Google Meet u otra plataforma.
            </small>
          </div>

          <!-- HABILITAR -->

          <div class="check-wrap">

            <label
              class="check-field"
              for="session-available"
            >
              <input
                id="session-available"
                v-model="sessionCreateForm.disponible"
                type="checkbox"
                aria-describedby="session-available-help"
              />

              Habilitar “Unirme ahora”
            </label>

            <small
              id="session-available-help"
              class="field-help"
            >
              Activá esta opción cuando el enlace ya pueda utilizarse.
            </small>
          </div>

          <!-- DESCRIPCIÓN -->

          <div class="field">
            <label for="session-description">
              Descripción
            </label>

            <textarea
              id="session-description"
              v-model="sessionCreateForm.description"
              rows="3"
              aria-describedby="session-description-help"
            ></textarea>

            <small
              id="session-description-help"
              class="field-help"
            >
              Contá brevemente de qué se trata la sesión.
            </small>
          </div>
        </div>

        <!-- BOTONES CREAR / LIMPIAR -->

        <div class="abm-actions">

          <button
            class="pill pill--primary"
            type="button"
            @click="createSession"
          >
            Crear sesión
          </button>

          <button
            class="pill pill--soft"
            type="button"
            @click="resetSessionCreateForm"
          >
            Limpiar
          </button>
        </div>
      </section>
    </div>

    <!-- =====================================
         USUARIO NO ADMIN
    ====================================== -->

    <template v-else>

      <p
        v-if="loading"
        class="state"
        role="status"
        aria-live="polite"
      >
        Cargando sesiones…
      </p>

      <p
        v-else-if="!sesiones.length"
        class="state"
      >
        No hay sesiones disponibles.
      </p>

      <section
        v-else
        class="lista"
        aria-label="Lista de sesiones"
      >

        <article
          v-for="sesion in sesiones"
          :key="sesion.id"
          class="card"
        >

          <div class="card-img">
            <img
              :src="sesion.imagen"
              :alt="`Imagen de ${sesion.titulo}`"
            />
          </div>

          <div class="card-body">

            <h3 class="title">
              {{ sesion.titulo }}
            </h3>

            <p class="meta">
              Con:
              {{ sesion.profesional }}
              —
              {{ sesion.rol }}

              <br />

              {{ sesion.fecha }}
              ·
              {{ sesion.hora }} hs
              ·
              {{ sesion.modalidad }}
            </p>

            <p class="desc">
              {{ sesion.descripcion }}
            </p>

            <div class="actions">

              <button
                v-if="!isRegistered(sesion)"
                class="action-btn action-btn--primary"
                type="button"
                :disabled="!canRegister(sesion)"
                :aria-label="`${cuposTexto(sesion)} en ${sesion.titulo}`"
                @click="registrarmeSesion(sesion)"
              >
                {{ cuposTexto(sesion) }}
              </button>

              <button
                v-else
                class="action-btn action-btn--danger"
                type="button"
                :disabled="busyId === sesion.id"
                :aria-label="`Cancelar registro en ${sesion.titulo}`"
                @click="openConfirmCancel(sesion)"
              >
                Cancelar
              </button>

              <button
                class="action-btn"
                :class="
                  sesion.disponible
                    ? 'action-btn--primary'
                    : 'action-btn--soft-disabled'
                "
                type="button"
                @click="unirmeSesion(sesion)"
              >
                {{
                  sesion.disponible
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
         MODAL EDITAR SESIÓN
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
        aria-labelledby="edit-session-heading"
      >

        <header class="edit-header">

          <h2
            id="edit-session-heading"
            class="edit-title"
          >
            Editar sesión
          </h2>

          <button
            class="edit-close"
            type="button"
            aria-label="Cerrar edición de sesión"
            @click="closeEditModal"
          >
            ×
          </button>
        </header>

        <section class="edit-body">
          <div class="abm-grid">

            <div class="field">
              <label for="edit-session-title">
                Título
              </label>

              <input
                id="edit-session-title"
                v-model="editModal.title"
                type="text"
                required
                aria-required="true"
              />
            </div>

            <div class="field">
              <label for="edit-session-professional">
                Profesional
              </label>

              <input
                id="edit-session-professional"
                v-model="editModal.professional"
                type="text"
                required
                aria-required="true"
              />
            </div>

            <div class="field">
              <label for="edit-session-role">
                Rol
              </label>

              <input
                id="edit-session-role"
                v-model="editModal.role"
                type="text"
                required
                aria-required="true"
              />
            </div>

            <div class="field">
              <label for="edit-session-date">
                Fecha
              </label>

              <input
                id="edit-session-date"
                v-model="editModal.date"
                type="date"
                lang="es-AR"
                required
                aria-required="true"
              />
            </div>

            <div class="field">
              <label for="edit-session-hour">
                Hora
              </label>

              <input
                id="edit-session-hour"
                v-model="editModal.hour"
                type="time"
                lang="es-AR"
                required
                aria-required="true"
              />
            </div>

            <div class="field">
              <label for="edit-session-modality">
                Modalidad
              </label>

              <select
                id="edit-session-modality"
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
              <label for="edit-session-capacity">
                Capacidad
              </label>

              <input
                id="edit-session-capacity"
                v-model.number="editModal.capacity"
                type="number"
                min="1"
                required
              />
            </div>

            <div class="field">
              <label for="edit-session-image">
                Ruta de la imagen
              </label>

              <input
                id="edit-session-image"
                v-model="editModal.image_path"
                type="text"
                placeholder="Ingresá la ruta de la imagen"
              />
            </div>

            <div class="field">
              <label for="edit-session-url">
                Enlace de la sesión
              </label>

              <input
                id="edit-session-url"
                v-model="editModal.meet_url"
                type="url"
                placeholder="Pegá aquí el enlace para unirse"
              />
            </div>

            <div class="check-wrap">
              <label
                class="check-field"
                for="edit-session-available"
              >
                <input
                  id="edit-session-available"
                  v-model="editModal.disponible"
                  type="checkbox"
                />

                Habilitar “Unirme ahora”
              </label>
            </div>

            <div class="field">
              <label for="edit-session-description">
                Descripción
              </label>

              <textarea
                id="edit-session-description"
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
         MODAL ELIMINAR SESIÓN
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
        aria-labelledby="delete-session-heading"
      >

        <h2
          id="delete-session-heading"
          class="confirm-title"
        >
          ¿Eliminar sesión?
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
            :disabled="deletingSession"
            @click="cancelDelete"
          >
            Cancelar
          </button>

          <button
            class="pill pill--danger"
            type="button"
            :disabled="deletingSession"
            @click="performDelete"
          >
            {{
              deletingSession
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
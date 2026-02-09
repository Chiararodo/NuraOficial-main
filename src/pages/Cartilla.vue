<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'
import flatpickr from 'flatpickr'
import { Spanish } from 'flatpickr/dist/l10n/es.js'
import 'flatpickr/dist/flatpickr.css'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

type Contact = {
  email?: string
  whatsapp?: string
}

type Profesional = {
  _id?: string
  id?: string | number
  name?: string
  specialty?: string
  type?: string
  modality?: string
  coverage?: string
  city?: string
  province?: string
  insurance?: string | string[]
  bio?: string
  contact?: Contact
  avatar?: string
}

type AppointmentRow = {
  id: string
  on_date: string
  at_time: string | null
  title: string
  details: string | null
  modality?: string | null
}

const auth = useAuthStore()

const profesionales = ref<Profesional[]>([])
const loading = ref(true)
const errorMsg = ref('')

const search = ref('')
const filterSpecialty = ref('')
const filterCity = ref('')
const filterModality = ref('')
const filterInsurance = ref('')

const API_URL = '/api/especialistas'
const IMAGE_BASE_URL = 'https://nura-backend-vvuv.onrender.com'

const getAvatarUrl = (p: Profesional): string => {
  const avatar = p.avatar || ''
  if (!avatar) return ''
  if (avatar.startsWith('http')) return avatar
  return IMAGE_BASE_URL + (avatar.startsWith('/') ? avatar : `/${avatar}`)
}

const getEmail = (p: Profesional): string => {
  return p.contact?.email || ''
}

/* ================= CARGA CARTILLA ================= */

async function loadProfesionales() {
  loading.value = true
  errorMsg.value = ''

  try {
    const res = await fetch(API_URL)
    if (!res.ok) throw new Error('No se pudo cargar la cartilla.')
    const data = await res.json()
    profesionales.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch (err: any) {
    errorMsg.value = err?.message || 'Error al cargar la cartilla.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadProfesionales()
  await loadAppointments()

  if (route.query.verTurnos === '1') {
    showAppointmentsModal.value = true
    router.replace({ path: route.path, query: {} })
  }
})

/* ================= FILTROS ================= */

const normalize = (val: unknown): string => {
  if (Array.isArray(val)) {
    return val.map((v) => String(v ?? '')).join(' ').toLowerCase()
  }
  return String(val ?? '').toLowerCase()
}

const specialties = computed(() => {
  const set = new Set<string>()
  for (const p of profesionales.value) {
    const s = String(p.specialty || p.type || '').trim()
    if (s) set.add(s)
  }
  return Array.from(set).sort()
})

const cities = computed(() => {
  const set = new Set<string>()
  for (const p of profesionales.value) {
    const c = String(p.city || '').trim()
    if (c) set.add(c)
  }
  return Array.from(set).sort()
})

const modalities = computed(() => {
  const set = new Set<string>()
  for (const p of profesionales.value) {
    const m = String(p.modality || '').trim()
    if (m) set.add(m)
  }
  return Array.from(set).sort()
})

const insurances = computed(() => {
  const set = new Set<string>()
  for (const p of profesionales.value) {
    const raw = p.insurance as any
    if (Array.isArray(raw)) {
      raw.forEach((i) => {
        const s = String(i ?? '').trim()
        if (s) set.add(s)
      })
    } else {
      const s = String(raw ?? '').trim()
      if (s) set.add(s)
    }
  }
  return Array.from(set).sort()
})

const filteredProfesionales = computed(() => {
  const term = search.value.trim().toLowerCase()
  return profesionales.value.filter((p) => {
    const name = normalize(p.name)
    const specialty = normalize(p.specialty || p.type)
    const city = normalize(p.city)
    const modality = normalize(p.modality)
    const bio = normalize(p.bio)
    const insurance = normalize(p.insurance)

    const matchSearch =
      !term ||
      name.includes(term) ||
      specialty.includes(term) ||
      city.includes(term) ||
      bio.includes(term)

    const matchSpecialty =
      !filterSpecialty.value ||
      specialty === filterSpecialty.value.toLowerCase()
    const matchCity =
      !filterCity.value || city === filterCity.value.toLowerCase()
    const matchModality =
      !filterModality.value || modality === filterModality.value.toLowerCase()
    const matchInsurance =
      !filterInsurance.value ||
      insurance.includes(filterInsurance.value.toLowerCase())

    return (
      matchSearch &&
      matchSpecialty &&
      matchCity &&
      matchModality &&
      matchInsurance
    )
  })
})

function resetFilters() {
  search.value = ''
  filterSpecialty.value = ''
  filterCity.value = ''
  filterModality.value = ''
  filterInsurance.value = ''
}

/* ============ TURNOS ============ */

const showBookingModal = ref(false)
const selectedPro = ref<Profesional | null>(null)
const bookingDate = ref('')
const bookingTime = ref('')
const bookingMode = ref<'Presencial' | 'Virtual'>('Presencial')
const bookingHasSingleMode = ref(false)
const bookingEmail = ref('')
const bookingSaving = ref(false)
const bookingError = ref('')
const turnoConfirmado = ref(false)

const paymentError = ref('')

const showAppointmentsModal = ref(false)
const appointments = ref<AppointmentRow[]>([])
const loadingAppointments = ref(false)
const editingAppointmentId = ref<string | null>(null)

const confirmDeleteAppt = ref<{ id: string; professional: string } | null>(
  null
)

/* ===== Modal de política de turnos ===== */

const showPolicyModal = ref(false)
const pendingProForPolicy = ref<Profesional | null>(null)

/* ===== Cancelación tardía ===== */

const tooLateCancelModalVisible = ref(false)
const lateCancelMessage = ref('')
const lateCancelProfessionalName = ref('')

/* ========== NOTIFICACIONES  ========== */

async function createNotification(opts: {
  title: string
  body?: string
  type?: string
}) {
  if (!auth.user) return

  const { error } = await supabase.from('notifications').insert({
    user_id: auth.user.id,
    title: opts.title,
    body: opts.body ?? null,
    type: opts.type ?? null
  })

  if (error) {
    console.error('Error creando notificación:', error)
  }
}

/* ====== Choque de turno ====== */

const clashModalVisible = ref(false)
const clashMessage = ref('')

/* ====== Constantes horario / cancelación ====== */

const START_HOUR = 9
const END_HOUR = 18
const CANCEL_LIMIT_HOURS = 48

function makeApptDateTime(on_date: string, at_time: string | null): Date | null {
  if (!on_date) return null
  const [y, m, d] = on_date.split('-').map((n) => Number(n))
  if (!y || !m || !d) return null

  const timeStr = (at_time || '09:00').slice(0, 5)
  const [hh, mm] = timeStr.split(':').map((n) => Number(n))

  const dt = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0)
  if (isNaN(dt.getTime())) return null
  return dt
}

function validateTimeRange(): boolean {
  if (!bookingTime.value) return false
  const [hh, mm] = bookingTime.value.slice(0, 5).split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false

  const total = hh * 60 + mm
  const start = START_HOUR * 60
  const end = END_HOUR * 60

  return total >= start && total <= end
}

/* ====== Flatpickr ====== */

let fp: any = null

function initDatepicker() {
  nextTick(() => {
    if (fp) fp.destroy()
    const input = document.querySelector(
      '#nura-datepicker'
    ) as HTMLInputElement
    if (!input) return
    fp = flatpickr(input, {
      locale: Spanish,
      dateFormat: 'Y-m-d',
      minDate: 'today',
      allowInput: true
    })
  })
}

/* ====== Flujo: política + modal de turno ====== */

function openPolicyModal(p: Profesional) {
  if (!auth.user) {
    alert('Tenés que iniciar sesión para agendar un turno.')
    return
  }
  pendingProForPolicy.value = p
  showPolicyModal.value = true
}

function closePolicyModal() {
  showPolicyModal.value = false
  pendingProForPolicy.value = null
}

function acceptPolicyAndContinue() {
  if (!pendingProForPolicy.value) return
  const pro = pendingProForPolicy.value
  closePolicyModal()
  openBookingModal(pro)
}

/* ====== Modal de turno ====== */

function openBookingModal(p: Profesional) {
  if (!auth.user) {
    bookingError.value = 'Tenés que iniciar sesión.'
    return
  }

  selectedPro.value = p
  bookingDate.value = new Date().toISOString().slice(0, 10)
  bookingTime.value = '09:00'

  const modRaw = String(p.modality || '')
  const mod = modRaw.toLowerCase()

  const isMixta = mod.includes('mixta')
  const multi = /,|\/|y/.test(mod)

  bookingHasSingleMode.value = !!mod && !multi && !isMixta

  if (bookingHasSingleMode.value) {
    bookingMode.value = mod.includes('virtual') ? 'Virtual' : 'Presencial'
  } else {
    bookingMode.value = 'Presencial'
  }

  bookingEmail.value = auth.user?.email ?? ''

  bookingError.value = ''
  paymentError.value = ''
  showBookingModal.value = true
  editingAppointmentId.value = null

  initDatepicker()
}

function closeBookingModal() {
  showBookingModal.value = false
  bookingError.value = ''
  paymentError.value = ''
  selectedPro.value = null
  editingAppointmentId.value = null
}

/* ====== Guardar turno ====== */

async function saveAppointment() {
  if (!auth.user || !selectedPro.value) {
    bookingError.value = 'Falta información.'
    return
  }

  if (!bookingDate.value || !bookingTime.value) {
    bookingError.value = 'Completá fecha y horario.'
    return
  }

  if (!validateTimeRange()) {
    bookingError.value = 'El horario debe estar entre las 09:00 y las 18:00 hs.'
    return
  }

  const selectedDateTime = makeApptDateTime(
    bookingDate.value,
    bookingTime.value
  )
  if (!selectedDateTime) {
    bookingError.value = 'Fecha u horario inválidos.'
    return
  }

  if (selectedDateTime.getTime() <= Date.now()) {
    bookingError.value =
      'No podés agendar turnos en el pasado. Elegí una fecha u horario posterior.'
    return
  }

  if (!bookingEmail.value || !bookingEmail.value.includes('@')) {
    bookingError.value = 'Ingresá un email válido para la confirmación.'
    return
  }

  bookingSaving.value = true
  bookingError.value = ''

  const professionalField = `${selectedPro.value.name ?? ''} – ${
    selectedPro.value.specialty ?? selectedPro.value.type ?? ''
  }`

  const modalityField = selectedPro.value.modality ?? bookingMode.value

  const locationExtra =
    selectedPro.value.city || selectedPro.value.province
      ? `Ubicación: ${selectedPro.value.city ?? ''}${
          selectedPro.value.city && selectedPro.value.province ? ', ' : ''
        }${selectedPro.value.province ?? ''}`
      : ''

  const detailsParts = [
    `Modalidad: ${bookingMode.value}`,
    `Email: ${bookingEmail.value}`
  ]
  if (locationExtra) detailsParts.push(locationExtra)
  const detailsField = detailsParts.join(' · ')

  const payload: any = {
    user_id: auth.user.id,
    on_date: bookingDate.value,
    at_time: bookingTime.value,
    title: `Turno con ${selectedPro.value.name}`,
    details: detailsField,
    professional: professionalField,
    modality: modalityField
  }

  try {
    const { data: existing, error: clashError } = await supabase
      .from('appointments')
      .select('id')
      .eq('professional', professionalField)
      .eq('on_date', bookingDate.value)
      .eq('at_time', bookingTime.value)

    if (clashError) throw clashError

    const yaOcupado = (existing ?? []).some(
      (row) => row.id !== editingAppointmentId.value
    )

    if (yaOcupado) {
      clashMessage.value =
        'Ya hay un turno reservado con este profesional en ese horario. Elegí otro horario por favor.'
      clashModalVisible.value = true
      bookingSaving.value = false
      return
    }

    if (editingAppointmentId.value) {
      const { error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', editingAppointmentId.value)
        .eq('user_id', auth.user.id)

      if (error) throw error
    } else {
      const { error } = await supabase.from('appointments').insert(payload)
      if (error) throw error
    }

    await loadAppointments()

    const esEdicion = !!editingAppointmentId.value

    await createNotification({
      title: esEdicion ? 'Turno actualizado' : 'Turno agendado',
      body: esEdicion
        ? `Actualizaste tu turno con ${selectedPro.value.name} para el ${bookingDate.value} a las ${bookingTime.value} hs.`
        : `Agendaste un turno con ${selectedPro.value.name} para el ${bookingDate.value} a las ${bookingTime.value} hs.`,
      type: 'appointment'
    })

    closeBookingModal()
    turnoConfirmado.value = true

    setTimeout(() => (turnoConfirmado.value = false), 4000)
  } catch (err) {
    console.error(err)
    bookingError.value = 'Error al guardar.'
  } finally {
    bookingSaving.value = false
  }
}

/* ====== Cargar turnos (solo futuros) ====== */

async function loadAppointments() {
  if (!auth.user) return
  loadingAppointments.value = true

  try {
    const { data } = await supabase
      .from('appointments')
      .select('id,on_date,at_time,title,details,modality')
      .eq('user_id', auth.user.id)
      .order('on_date')
      .order('at_time')

    const now = Date.now()

    appointments.value = (data || []).filter((a) => {
      const dt = makeApptDateTime(a.on_date, a.at_time)
      if (!dt) return false
      return dt.getTime() >= now
    })
  } catch (err) {
    console.error(err)
  } finally {
    loadingAppointments.value = false
  }
}

function openAppointmentsModal() {
  showAppointmentsModal.value = true
}

function openAppointmentsFromToast() {
  turnoConfirmado.value = false
  showAppointmentsModal.value = true
}

function closeAppointmentsModal() {
  showAppointmentsModal.value = false
}

/* ====== Helpers de fecha/hora ====== */

function formatDate(d: string) {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  })
}

function formatTime(t: string | null) {
  if (!t) return ''
  return t.slice(0, 5)
}

/* ====== Editar / cancelar ====== */

function startEditAppointment(a: AppointmentRow) {
  editingAppointmentId.value = a.id
  bookingDate.value = a.on_date
  bookingTime.value = a.at_time ?? '09:00'

  selectedPro.value = {
    name: a.title.replace(/^Turno con\s*/i, '').trim()
  } as Profesional

  const fromDetails = a.details?.match(
    /Modalidad:\s*(Virtual|Presencial)/i
  )?.[1]
  bookingMode.value = fromDetails === 'Virtual' ? 'Virtual' : 'Presencial'

  bookingHasSingleMode.value = false
  bookingEmail.value = auth.user?.email ?? ''

  showAppointmentsModal.value = false
  showBookingModal.value = true
  initDatepicker()
}

function askDeleteAppointment(a: AppointmentRow) {
  const professional = a.title.replace(/^Turno con\s*/i, '').trim()

  const apptDateTime = makeApptDateTime(a.on_date, a.at_time)
  if (!apptDateTime) return

  const diffMs = apptDateTime.getTime() - Date.now()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < CANCEL_LIMIT_HOURS) {
    lateCancelProfessionalName.value = professional
    lateCancelMessage.value =
      'Este turno está dentro de las 48 horas previas, por lo que no puede cancelarse desde la app. ' +
      'La seña no es reembolsable, pero podés reprogramarlo sacando un nuevo turno con el profesional.'
    tooLateCancelModalVisible.value = true
    return
  }

  confirmDeleteAppt.value = { id: a.id, professional }
}

async function confirmDeleteAppointment() {
  if (!auth.user || !confirmDeleteAppt.value) return

  await supabase
    .from('appointments')
    .delete()
    .eq('id', confirmDeleteAppt.value.id)
    .eq('user_id', auth.user.id)

  await loadAppointments()

  await createNotification({
    title: 'Turno cancelado',
    body: `Cancelaste tu turno con ${confirmDeleteAppt.value.professional}.`,
    type: 'appointment_cancelled'
  })

  confirmDeleteAppt.value = null
}

function cancelDeleteAppointment() {
  confirmDeleteAppt.value = null
}

function closeTooLateCancelModal() {
  tooLateCancelModalVisible.value = false
}

function goToProfessionalForRebook() {
  const name = lateCancelProfessionalName.value
  if (!name) {
    closeTooLateCancelModal()
    return
  }

  const lower = name.toLowerCase()
  const pro = profesionales.value.find((p) =>
    normalize(p.name).includes(lower)
  )

  closeTooLateCancelModal()
  showAppointmentsModal.value = false

  if (pro) {
    openBookingModal(pro)
  } else {
    search.value = name
  }
}

/* ===== Pago: seña con MP ===== */

function startPayment() {
  paymentError.value = ''

  const mpUrl = import.meta.env.VITE_MP_TURNO_URL

  if (!mpUrl) {
    paymentError.value =
      'No se encontró el link de pago. Verificá la configuración de Mercado Pago.'
    return
  }

  try {
    window.open(mpUrl, '_blank')
  } catch (e) {
    console.error(e)
    paymentError.value = 'No se pudo abrir la ventana de pago.'
  }
}
</script>

<template>
  <h1 class="visually-hidden">Cartilla</h1>
  <main class="contenido">
    <header class="page-head">
      <div>
        <h2>Cartilla de especialistas</h2>
        <p class="page-sub">
          Buscá por nombre, especialidad, ciudad, modalidad u obra social.
        </p>
      </div>

      <button
        type="button"
        class="pill pill--outline"
        @click="openAppointmentsModal"
      >
        Mis turnos
      </button>
    </header>

    <section class="filters card">
      <div class="filters-row">
        <div class="field field--search">
          <label>Buscar</label>
          <div class="search-input">
            <input
              v-model="search"
              type="search"
              placeholder="Nombre, ciudad etc"
            />
            <button
              v-if="search"
              type="button"
              class="pill pill--ghost"
              @click="search = ''"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div class="field">
          <label>Especialidad</label>
          <select v-model="filterSpecialty">
            <option value="">Todas</option>
            <option v-for="s in specialties" :key="s" :value="s">
              {{ s }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Ciudad</label>
          <select v-model="filterCity">
            <option value="">Todas</option>
            <option v-for="c in cities" :key="c" :value="c">
              {{ c }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Modalidad</label>
          <select v-model="filterModality">
            <option value="">Todas</option>
            <option v-for="m in modalities" :key="m" :value="m">
              {{ m }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Obra social / prepaga</label>
          <select v-model="filterInsurance">
            <option value="">Todas</option>
            <option v-for="i in insurances" :key="i" :value="i">
              {{ i }}
            </option>
          </select>
        </div>
      </div>

      <div class="filters-footer">
        <span v-if="!loading" class="count">
          {{ filteredProfesionales.length }} de {{ profesionales.length }}
          profesionales
        </span>
        <button
          type="button"
          class="pill pill--ghost-limpiar"
          @click="resetFilters"
        >
          Limpiar filtros
        </button>
      </div>
    </section>

    <p v-if="loading" class="state">Cargando cartilla…</p>
    <p v-else-if="errorMsg" class="state state--error">
      {{ errorMsg }}
    </p>
    <p v-else-if="!filteredProfesionales.length" class="state">
      No encontramos profesionales con esos filtros. Probá cambiarlos o
      limpiarlos.
    </p>

    <section v-else class="list">
      <article
        v-for="p in filteredProfesionales"
        :key="p._id || p.id"
        class="card prof-card"
      >
        <div v-if="getAvatarUrl(p)" class="prof-avatar">
          <img :src="getAvatarUrl(p)" :alt="p.name" loading="lazy" />
        </div>

        <div class="prof-main">
          <h3 class="prof-name">{{ p.name }}</h3>
          <p class="prof-specialty">{{ p.specialty || p.type }}</p>

          <p v-if="p.city || p.province" class="prof-location">
            {{ p.city }}
            <span v-if="p.city && p.province"> · </span>
            {{ p.province }}
          </p>

          <div class="tags">
            <span v-if="p.modality" class="tag tag--primary">
              {{ p.modality }}
            </span>
            <span v-if="Array.isArray(p.insurance)" class="tag">
              {{ p.insurance.join(' · ') }}
            </span>
            <span v-else-if="p.insurance" class="tag">{{ p.insurance }}</span>
          </div>

          <p v-if="p.bio" class="prof-bio">{{ p.bio }}</p>
        </div>

        <div class="prof-actions">
          <button
            type="button"
            class="pill pill--primary"
            @click="openPolicyModal(p)"
          >
            Agendar turno
          </button>

          <a
            v-if="getEmail(p)"
            class="content-btn"
            :href="`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
              getEmail(p)
            )}`"
            target="_blank"
          >
            <i class="fa-solid fa-envelope"></i>
          </a>
        </div>
      </article>
    </section>

    <!-- MODAL POLÍTICA DE TURNOS -->
    <div
      v-if="showPolicyModal"
      class="modal-backdrop"
      @click.self="closePolicyModal"
    >
      <div class="modal-card modal-policy animate-fade-in">
        <header class="modal-header">
          <h3 class="modal-title">Política de turnos</h3>
          <button class="modal-close" @click="closePolicyModal">×</button>
        </header>

        <section class="modal-body modal-body-scroll">
          <p class="modal-note">
            Para reservar un turno abonás una seña mediante Mercado Pago. Esta
            seña asegura tu lugar con el profesional.
          </p>
          <ul class="policy-list">
            <li>
              Los turnos se reservan entre las
              <strong>09:00</strong> y las <strong>18:00</strong> hs.
            </li>
            <li>
              Si cancelás con al menos <strong>48 horas</strong> de
              anticipación, la seña se devuelve.
            </li>
            <li>
              Si querés cancelar dentro de las 48&nbsp;hs previas, la seña no es
              reembolsable. Podés reprogramar el turno coordinando una nueva
              fecha directamente con el profesional.
            </li>
          </ul>
          <p class="modal-note">
            Al continuar confirmás que leíste y aceptás estas condiciones.
          </p>
        </section>

        <footer class="modal-footer">
          <button class="pill pill--danger" @click="closePolicyModal">
            Cancelar
          </button>
          <button class="pill pill--primary" @click="acceptPolicyAndContinue">
            Acepto y continuar
          </button>
        </footer>
      </div>
    </div>

    <!-- MODAL AGENDAR / EDITAR -->
    <div
      v-if="showBookingModal"
      class="modal-backdrop"
      @click.self="closeBookingModal"
    >
      <div class="modal-card modal-appointment animate-fade-in">
        <header class="modal-header">
          <h3 class="modal-title">
            {{ editingAppointmentId ? 'Editar turno' : 'Agendar turno' }}
          </h3>
          <button
            type="button"
            class="modal-close"
            @click="closeBookingModal"
          >
            ×
          </button>
        </header>

        <section class="modal-body">
          <div class="prof-summary">
            <img
              v-if="selectedPro?.avatar"
              :src="getAvatarUrl(selectedPro as Profesional)"
              class="prof-summary-avatar"
            />
            <div>
              <p class="prof-summary-name">{{ selectedPro?.name }}</p>
              <p class="prof-summary-type">
                {{ selectedPro?.specialty || selectedPro?.type }}
              </p>
            </div>
          </div>

          <div class="modal-field">
            <label for="nura-datepicker">Fecha</label>
            <input
              id="nura-datepicker"
              v-model="bookingDate"
              type="text"
              aria-label="Fecha del turno"
            />
          </div>

          <div class="modal-field">
            <label for="booking-time">Horario</label>
            <input
              id="booking-time"
              v-model="bookingTime"
              type="time"
              aria-label="Horario del turno"
            />
          </div>

          <div v-if="!bookingHasSingleMode" class="modal-field">
            <label for="booking-mode">Modalidad</label>
            <select
              id="booking-mode"
              v-model="bookingMode"
              aria-label="Modalidad del turno"
            >
              <option value="Presencial">Presencial</option>
              <option value="Virtual">Virtual</option>
            </select>
          </div>

          <div v-else class="modal-field">
            <label>Modalidad</label>
            <span class="modal-readonly-pill">{{ bookingMode }}</span>
          </div>

          <div class="modal-field">
            <label for="booking-email">Email de contacto</label>
            <input
              id="booking-email"
              v-model="bookingEmail"
              type="email"
              aria-label="Email de contacto para el turno"
              placeholder="tucorreo@mail.com"
            />
          </div>

          <div class="modal-field">
            <label>Reserva de turno</label>
           
            <p class="modal-note">
              Abonás una seña para reservar tu lugar. Si cancelás con al menos
              48&nbsp;horas de anticipación, se te reintegra la seña. El día del
              turno abonás el resto directamente al profesional.
            </p>
             <button
              type="button"
              class="pill pill--primary mp-button"
              @click="startPayment"
            >
              Pagar reserva con Mercado Pago
            </button>
            <p v-if="paymentError" class="modal-error">
              {{ paymentError }}
            </p>
          </div>

          <p v-if="bookingError" class="modal-error">
            {{ bookingError }}
          </p>
        </section>

        <footer class="modal-footer">
          <button
            class="pill pill--danger"
            @click="closeBookingModal"
            :disabled="bookingSaving"
          >
            Cancelar
          </button>
          <button
            class="pill pill--primary"
            @click="saveAppointment"
            :disabled="bookingSaving"
          >
            {{ bookingSaving ? 'Guardando…' : 'Confirmar turno' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- TOAST TURNO CONFIRMADO -->
    <div v-if="turnoConfirmado" class="turno-confirmado">
      <span class="check">✔</span>
      <div class="turno-text">
        <p>Tu turno fue confirmado</p>
        <button
          class="pill pill--sm pill--light"
          type="button"
          @click="openAppointmentsFromToast"
        >
          Ver mis turnos
        </button>
      </div>
    </div>

    <!-- MODAL VER TURNOS -->
    <div
      v-if="showAppointmentsModal"
      class="modal-backdrop"
      @click.self="closeAppointmentsModal"
    >
      <div class="modal-card modal-appointments-list animate-fade-in">
        <header class="modal-header">
          <h3 class="modal-title">Mis turnos</h3>
          <button class="modal-close" @click="closeAppointmentsModal">
            ×
          </button>
        </header>

        <section class="modal-body modal-body-scroll">
          <p v-if="loadingAppointments" class="modal-note">
            Cargando turnos…
          </p>

          <p v-else-if="!appointments.length" class="modal-note">
            Todavía no tenés turnos agendados.
          </p>

          <ul v-else class="appt-list">
            <li v-for="a in appointments" :key="a.id" class="appt-item">
              <div class="appt-main">
                <h4 class="appt-title">{{ a.title }}</h4>
                <p class="appt-meta">
                  {{ formatDate(a.on_date) }} · {{ formatTime(a.at_time) }}
                  <span v-if="a.modality"> · {{ a.modality }}</span>
                </p>
              </div>

              <div class="appt-actions">
                <button class="link-btn" @click="startEditAppointment(a)">
                  Editar
                </button>
                <button
                  class="link-btn danger"
                  @click="askDeleteAppointment(a)"
                >
                  Cancelar
                </button>
              </div>
            </li>
          </ul>
        </section>

        <footer class="modal-footer">
          <button
            class="pill pill--danger"
            @click="closeAppointmentsModal"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>

    <!-- MODAL HORARIO OCUPADO -->
    <div
      v-if="clashModalVisible"
      class="modal-backdrop"
      @click.self="clashModalVisible = false"
    >
      <div class="modal-card modal-clash animate-fade-in">
        <header class="modal-header modal-header--clash">
          <div class="modal-header-left">
            <span class="modal-badge-alert">!</span>
            <div>
              <h3 class="modal-title">Horario no disponible</h3>
              <p class="modal-subtitle">Ese turno ya está reservado</p>
            </div>
          </div>
        </header>

        <section class="modal-body modal-body--clash">
          <p class="modal-note modal-note--clash">
            {{ clashMessage }}
          </p>
        </section>

        <footer class="modal-footer modal-footer--clash">
          <button
            class="pill pill--primary pill--clash"
            type="button"
            @click="clashModalVisible = false"
          >
            Entendido
          </button>
        </footer>
      </div>
    </div>

    <!-- MODAL CANCELACIÓN TARDÍA -->
    <div
      v-if="tooLateCancelModalVisible"
      class="modal-backdrop"
      @click.self="closeTooLateCancelModal"
    >
      <div class="modal-card modal-late-cancel animate-fade-in">
        <header class="modal-header">
          <h3 class="modal-title">No es posible cancelar</h3>
          <button class="modal-close" @click="closeTooLateCancelModal">
            ×
          </button>
        </header>
        <section class="modal-body">
          <p class="modal-note">
            {{ lateCancelMessage }}
          </p>
          <p class="modal-note">
            Te vamos a llevar a la cartilla para que saques un nuevo turno con
            el profesional.
          </p>
        </section>
        <footer class="modal-footer">
          <button class="pill pill--ghost" @click="closeTooLateCancelModal">
            Cerrar
          </button>
          <button
            v-if="lateCancelProfessionalName"
            class="pill pill--primary"
            @click="goToProfessionalForRebook"
          >
            Reprogramar turno
          </button>
        </footer>
      </div>
    </div>

    <!-- MODAL CONFIRMAR CANCELACIÓN -->
    <div
      v-if="confirmDeleteAppt"
      class="modal-backdrop"
      @click.self="cancelDeleteAppointment"
    >
      <div class="modal-card modal-confirm-cancel animate-fade-in">
        <header class="modal-header">
          <h3 class="modal-title">Cancelar turno</h3>
          <button class="modal-close" @click="cancelDeleteAppointment">
            ×
          </button>
        </header>

        <section class="modal-body">
          <p>
            ¿Querés cancelar tu turno con
            <strong>{{ confirmDeleteAppt.professional }}</strong>?
          </p>
          <p class="modal-note">Esta acción no se puede deshacer.</p>
        </section>

        <footer class="modal-footer">
          <button class="pill pill--ghost" @click="cancelDeleteAppointment">
            Mantener turno
          </button>
          <button class="pill pill--danger" @click="confirmDeleteAppointment">
            Cancelar turno
          </button>
        </footer>
      </div>
    </div>
  </main>
</template>


<style scoped>
.contenido {
  background: #fff;
  padding: 24px 18px 48px;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
}

/* HEADER CARTILLA */
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 18px;
}

.page-head h2 {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 650;
  color: var(--nura-green);
}

.page-sub {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: #4b5563;
}

/* ===== CARD / FILTROS ===== */

.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 14px 18px;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.32);
}

.card:hover {
  background: #d9f5f5;
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
}

.filters {
  margin-bottom: 26px;
  background: #d9f5f5;
}

.filters-row {
  display: grid;
  gap: 12px;
}

@media (min-width: 900px) {
  .filters-row {
    grid-template-columns: 1.15fr repeat(4, minmax(0, 1fr));
    align-items: flex-end;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: #000000ff;
}

/* inputs y selects redondeados tipo chip */
.field input,
.field select {
  border-radius: 999px;
  border: 1.5px solid #50bdbd;
  padding: 9px 14px;
  font-size: 0.85rem;
  outline: none;
  background: #ecfcfcff;
  transition: border-color 0.12s ease, box-shadow 0.12s ease,
    background-color 0.12s ease;
}

.field input:focus,
.field select:focus {
  border-color: var(--nura-green);
  background: #e6fbfb;
  box-shadow: 0 0 0 2px rgba(80, 189, 189, 0.18);
}

/* ===== SELECTS ===== */
.field select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;

  background-image: url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='10' stroke='%2350bdbd' stroke-width='2'/%3E%3Cpath d='M8 10L12 14L16 10' stroke='%2350bdbd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 18px center;
  background-size: 22px;

  padding-right: 50px;
}

.field select::-ms-expand {
  display: none;
}

/* BUSCADOR */
.field--search .search-input {
  display: flex;
  gap: 8px;
  align-items: center;
  border-radius: 999px;
  background: #d9f5f5;
  padding: 4px 6px 4px 12px;
  border: 2px solid #50bdbd;
  position: relative;
}

.field--search .search-input::before {
  content: '🔍';
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  opacity: 0.45;
}

.field--search input {
  border: none;
  background: transparent;
  padding-left: 24px;
}

.field--search input:focus {
  outline: none;
}

/* FOOTER FILTROS */

.filters-footer {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #e4f2f2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: #6b7280;
}

.count {
  white-space: nowrap;
  padding: 4px 10px;
  border-radius: 999px;
  background: #d9f5f5;
  color: var(--nura-green);
  font-weight: 600;
  border: 1px solid #c0eaea;
}

/* ===== BOTONES GENERALES ===== */

.pill {
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 0.8rem;
  border: none;
  background: var(--nura-green);
  color: #ffffff;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.15s ease;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.35);
}

.pill:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}

.pill--primary {
  padding: 10px 22px;
  font-size: 0.9rem;
   font-weight: 600;
}

.pill--ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 40%;
  background: #50bdbd;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(80, 189, 189, 0.3);
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
}

.pill--ghost:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(80, 189, 189, 0.35);
}

.pill--ghost-limpiar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #50bdbd;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  width: 25%;
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(80, 189, 189, 0.3);
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
}

.pill--ghost-limpiar:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(80, 189, 189, 0.35);
}

.pill--danger {
  padding: 10px 18px;
  border-radius: 999px;
  background: #ef4444;
  color: #ffffff;
  border: none;
  font-size: 0.85rem;
  box-shadow: 0 8px 18px rgba(239, 68, 68, 0.4);
}

.pill--danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.pill--sm {
  padding: 5px 12px;
  font-size: 0.78rem;
  box-shadow: none;
}

.pill--outline {
  background: #e0faf7;
  color: var(--nura-green);
  border: 1px solid #b6ebe5;
  box-shadow: none;
}

.pill--outline:hover {
  background: #caf4ee;
}

.pill--light {
  background: #ffffff;
  color: var(--nura-green);
  border: 1px solid #b6ebe5;
  box-shadow: none;
}

.pill--light:hover {
  background: #e0faf7;
}

/* LINK BUTTONS */

.link-btn {
  border:2.1px solid #50bdbd;
  border-radius: 20px;
  padding: 5px 14px;
  background: transparent;
  color: #50bdbd;
  font-size: 15px;
  font-weight: 550;
  cursor: pointer;
  transition: 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.link-btn:hover {
  background: #85b5e046;
  border-color: #85b6e0;
  transform: translateY(-2px);
}

.link-btn.danger {
  color: #f10909;
}

.link-btn.danger:hover {
  background: #ff1c1c20;
  border-color: #c20808;
  transform: translateY(-2px);
}

/* ESTADOS */

.state {
  font-size: 0.9rem;
  color: #6b7280;
  padding: 18px 2px;
}

.state--error {
  color: #b91c1c;
}

/* LISTA PROFESIONALES */

.list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: stretch;
}

@media (min-width: 768px) {
  .list {
    grid-template-columns: repeat(2, 1fr);
  }
  
 .modal-card {
    max-width: 100%;
    border-radius: 18px;
    max-height: 88vh;
    /* hereda overflow-y: auto del bloque principal */
  }
  .turno-confirmado {
    left: 12px;
    right: 12px;
    bottom: 80px;  /* aprox. altura de la nav + un margen */
    border-radius: 14px;
    justify-content: flex-start;
  }
  .modal-appointments-list {
  max-width: 450px;  
  margin-left: 2px;
  margin-right:2px;
}
  .appt-item {
    width: 87%;   /* DESKTOP/TABLET vuelve al base */
  }
}


@media (min-width: 1100px) {
  .list {
    grid-template-columns: repeat(3, 1fr);
  }
}

.prof-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  min-height: 160px;
}

.prof-avatar img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.prof-main {
  flex: 1;
}

.prof-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #111827;
}

.prof-specialty {
  margin: 4px 0;
  font-size: 0.9rem;
  color: #4b5563;
}

.prof-location {
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 4px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.tag {
  font-size: 0.72rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
}

.tag--primary {
  background: rgba(80, 189, 189, 0.18);
  color: var(--nura-green);
}

.prof-bio {
  font-size: 0.8rem;
  color: #4b5563;
  margin-top: 6px;
}

.prof-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ICONO MAIL */

.content-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 999px;
  background: #81c8d9;
  color: #fff;
  border: none;
  box-shadow: 0 6px 16px rgba(80, 189, 189, 0.3);
  transition: 0.15s ease;
}

.content-btn:hover {
  background: #56bfcf;
  transform: translateY(-1px);
}

.content-btn i {
  margin: 0;
  font-size: 1.1rem;
}

/* BACKDROP */

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

/* MODAL CARD */
.modal-card {
  background: #ffffff;
  border-radius: 22px;
  width: 100%;
  max-width: 480px;          /* un poco más angosto */
  max-height: 90vh;          /* nunca más alto que la pantalla */
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 36px rgba(30, 41, 59, 0.22);
  overflow: hidden;          /* el scroll lo maneja el body */
  animation: modalFadeIn 0.25s ease-out;
}

.modal-appointment .modal-body {
  flex: 1;
  min-height: 0;
  max-height: 60vh;      /* parte central scrolleable */
  overflow-y: auto;
  
}

.modal-note {
  font-size: 1rem;
  color: #4b5563;
  margin: 0;
  width: 90%;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-confirm-cancel {
  max-width: 430px;
}

/* HEADER MODAL */

.modal-header {
  padding: 4px 12px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.modal-close {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f0f4f8;
  border: none;
  font-size: 1.1rem;
  font-weight: 500;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000000ff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-close:hover {
  background: #e2e8f0;
  transform: scale(1.05);
}

/* BODY MODAL */

.modal-body {
  padding: 20px 22px;
  width: 100%;
  text-align: left; 
}

.modal-body-scroll {
  flex: 1;
  min-height: 0;
  max-height: 60vh;       /* parte central scrolleable */
  overflow-y: auto;
  padding: 16px 18px;
}


/* FOOTER MODAL */

.modal-footer {
  padding: 16px 22px;
  border-top: 1px solid #eef2f7;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* CAMPOS MODAL */

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.modal-field label {
  font-size: 0.9rem;
  font-weight: 800;
  color: #50bdbd;
  letter-spacing: 0.04em;
}

.modal-field input,
.modal-field select {
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  padding: 10px 14px;
  background: #d0f5f5ff;
  font-size: 0.95rem;
  color: #50bdbd;
}

/* que los inputs NO sobresalgan del modal */
.modal-appointment .modal-field input,
.modal-appointment .modal-field select {
  width: 90%;
  max-width: 100%;
  box-sizing: border-box;
}

/* pill de modalidad fija */

.modal-readonly-pill {
  display: block;
  width: 90%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  border-radius: 14px;
  background: #d0f5f5ff;
  color: #50bdbd;
  font-size: 0.95rem;
  font-weight: 500;
}

.modal-field .mp-button {
  display: block;
  width: 90%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  border-radius: 14px;
  justify-content: center;
  margin-top: 4px;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.35);
  font-weight: 600;
}

/* ICONO RELOJ */

.modal-field input[type='time']::-webkit-calendar-picker-indicator {
  opacity: 1;
  cursor: pointer;
  width: 18px;
  height: 17px;
  transform: scale(1.25);
  filter: invert(64%) sepia(35%) saturate(535%) hue-rotate(131deg)
    brightness(94%) contrast(92%);
}

/* CALENDARIO INPUT DE FECHA */
.modal-field #nura-datepicker {
  background-image: url("data:image/svg+xml,%3Csvg width='17' height='15' viewBox='0 0 24 24' fill='none' stroke='%2350bdbd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='3' y='4' width='18' height='18' rx='3'/%3E%3Cpath d='M3 10h18'/%3E%3Cpath d='M8 2v4'/%3E%3Cpath d='M16 2v4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 22px;
  padding-right: 40px;
  cursor: pointer;
}

/* FLECHA DEL SELECT */

.modal-field select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='%2350bdbd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M9 11l3 3 3-3'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 21.5px;
  padding-right: 46px;
}

.modal-field select::-ms-expand {
  display: none;
}

/* PROFESIONAL EN MODAL */

.prof-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}

.prof-summary-avatar {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 6px 14px rgba(80, 189, 189, 0.35);
}

.prof-summary-name {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: #111827;
}

.prof-summary-type {
  color: #64748b;
  font-size: 0.88rem;
}

/* LISTA DE TURNOS */

.appt-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
}

.appt-item {
  background: #ffffff;
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  border: 1px solid #eef2f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 87%;
}

.appt-actions {
  display: flex;
  gap: 3px;
padding: 4px 16px;
}

.appt-title {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 4px 0;
}

.appt-meta {
  font-size: 0.85rem;
  color: #475569;
}

/* TOAST CONFIRMADO */
/* Desktop / general */
.turno-confirmado {
  position: fixed;
  right: 22px;
  left: auto;
  bottom: 90px;             
  z-index: 2000;
  animation: fadeInUp 0.4s ease-out;
  background: #50bdbd;
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 16px;
  padding: 14px 20px;
  box-shadow: 0 8px 22px rgba(0,0,0,0.15);
}




.turno-confirmado .check {
  font-size: 1.1rem;
}

.turno-text p {
  margin: 0 0 4px;
  font-size: 0.9rem;
}


/* ===== MODAL HORARIO OCUPADO (estilo especial) ===== */

.modal-clash {
  max-width: 420px;
  border-radius: 26px;
  overflow: hidden;
  background: radial-gradient(circle at top, #e0faf7 0, #ffffff 55%);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
  border: 1px solid #c4f1ee;
}

/* header con badge de alerta */
.modal-header--clash {
  border-bottom: 1px solid #e2f3f3;
  padding: 14px 20px;
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-badge-alert {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #fee2e2;
  color: #ef4444;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
  box-shadow: 0 6px 14px rgba(248, 113, 113, 0.45);
}

.modal-subtitle {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}

/* cuerpo centrado y más aire */
.modal-body--clash {
  padding: 20px 11px 3px;
}

.modal-note--clash {
  font-size: 1em;
  color: #374151;
  line-height: 1.5;
  text-align: left;
  width: 90%;
}

/* footer + botón */
.modal-footer--clash {
  border-top: none;
  padding: 10px 24px 18px;
  display: flex;
  justify-content: flex-end;
}

.pill--clash {
  min-width: 140px;
  justify-content: center;
  background: linear-gradient(135deg, #50bdbd, #14b8a6);
  box-shadow: 0 10px 24px rgba(45, 212, 191, 0.45);
}

.pill--clash:hover {
  background: linear-gradient(135deg, #3ea9a9, #0f766e);
  transform: translateY(-1px);
}

/* Modal cancelación tardía */

.modal-late-cancel {
  max-width: 420px;
  border-radius: 26px;
 box-shadow: 0 20px 45px rgba(15, 23, 42, 0.35);
}

.modal-late-cancel .modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #50bdbd;
}

.modal-late-cancel .modal-note {
  font-size: 0.95rem;
  color: #4b5563;
  line-height: 1.5;
    width: 90%;
}

/* Modal política de turnos */

.modal-policy {
  max-width: 520px;
}

.policy-list {
  margin: 12px 0 10px;
  padding-left: 18px;
  font-size: 0.9rem;
  color: #4b5563;
}

.policy-list li {
  margin-bottom: 6px;
    width: 90%;
}

.policy-list li::marker {
  content: '✓ ';
  color: #50bdbd;
  font-weight: 800;
}


/* Asegura que el calendario de flatpickr quede por encima del backdrop */
.flatpickr-calendar {
  z-index: 2001 !important;
}

:global(.flatpickr-calendar) {
  z-index: 2001 !important;   /* por encima del backdrop (1000) y del modal */
}

/* Modal "Mis turnos" un poco más ancho y equilibrado */
.modal-appointments-list {
  max-width: 550px;  
  margin-left: 2px;
  margin-right:2px;
}
 

/* El cuerpo scrolleable de "Mis turnos" */
.modal-appointments-list .modal-body-scroll {
  max-height: 55vh;           /* suficiente para ver varias tarjetas */
  overflow-y: auto;
}

.modal-appointments-list .modal-footer {
  padding-bottom: 16px;
}

@media (max-width: 768px) {
  .modal-backdrop {
    padding: 8px;
  }

  .modal-card {
    max-width: 100%;
    border-radius: 18px;
    max-height: 88vh;
  }

  .turno-confirmado {
    left: 12px;
    right: 12px;
    bottom: 80px;   /* queda por encima de la navbar de iPhone */
    border-radius: 14px;
    justify-content: flex-start;
  }
 
.appt-item {
  width: 80%;
}

  .appt-actions {
    gap: 2px;
  }

  .appt-actions .link-btn {
    padding: 5px 7px;      /* menos alto y ancho */
    font-size: 0.85rem;     /* texto más chico */
    border-radius: 16px;    /* menos redondeado = se ve más liviano */
  }

  /* Botón "Cerrar" del modal Mis turnos un toque más chico */
  .modal-appointments-list .modal-footer .pill {
    padding: 8px 18px;
    font-size: 0.8rem;
  }
}


/* MOBILE REAL (≤ 420px) */
@media (max-width: 420px) {
  .appt-item {
    width: 80%;
  }
}

/* INTERMEDIO CHICO (421px – 514px) */
@media (min-width: 421px) and (max-width: 514px) {
  .appt-item {
    width: 85%;
    max-width: 420px;
  }
}

/* INTERMEDIO GRANDE (515px – 770px) */
@media (min-width: 515px) and (max-width: 770px) {
  .appt-item {
    width: 90%;      /* ocupa todo el modal */
    max-width: none;  /* sin límite artificial */
  }
}

/* DESKTOP / TABLET GRANDE (≥ 771px) */
@media (min-width: 771px) {
  .appt-item {
    width: 87%;
  }
}


</style>


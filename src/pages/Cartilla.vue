<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'
import flatpickr from 'flatpickr'
import { Spanish } from 'flatpickr/dist/l10n/es.js'
import 'flatpickr/dist/flatpickr.css'
import { useRoute, useRouter } from 'vue-router'
import { useNuraApi } from '@/composables/useNuraApi'
import { useNotificationSettings } from '@/composables/useNotificationSettings'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()


const MP_DEPOSIT_URL = 'https://mpago.la/2b1Jhzj'

const prefs = useNotificationSettings()

type Contact = { email?: string; whatsapp?: string }

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
  avatar_url?: string
  is_virtual?: boolean
}

type AppointmentRow = {
  id: string
  on_date: string
  at_time: string | null
  title: string
  details: string | null
  modality?: string | null
  professional?: string | null
}

const profesionales = ref<Profesional[]>([])
const loading = ref(true)
const errorMsg = ref('')

const search = ref('')
const filterSpecialty = ref('')
const filterCity = ref('')
const filterModality = ref('')
const filterInsurance = ref('')

const { fetchEspecialistas } = useNuraApi()

const IMAGE_BASE_URL = 'https://nura-backend-vvuv.onrender.com'

const START_HOUR = 9
const END_HOUR = 18
const TIME_STEP_MINUTES = 15
const CANCEL_LIMIT_HOURS = 48

const normalize = (val: unknown): string => {
  if (Array.isArray(val)) return val.map((v) => String(v ?? '')).join(' ').toLowerCase()
  return String(val ?? '').toLowerCase()
}

const getAvatarUrl = (p: Profesional): string => {
  const avatar = (p.avatar_url || p.avatar || '').trim()
  if (!avatar) return ''
  if (avatar.startsWith('http')) return avatar
  return IMAGE_BASE_URL + (avatar.startsWith('/') ? avatar : `/${avatar}`)
}

const getEmail = (p: Profesional): string => (p.contact?.email || '').trim()

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function normalizeTimeToHHMMSS(t: string): string {
  const s = (t || '').trim()
  if (!s) return ''
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s
  const hhmm = s.slice(0, 5)
  return /^\d{2}:\d{2}$/.test(hhmm) ? `${hhmm}:00` : ''
}

function makeApptDateTime(on_date: string, at_time: string | null): Date | null {
  if (!on_date) return null
  const [y, m, d] = on_date.split('-').map((n) => Number(n))
  if (!y || !m || !d) return null

  const timeStr =
    normalizeTimeToHHMMSS((at_time || `${pad2(START_HOUR)}:00`).slice(0, 8)) || `${pad2(START_HOUR)}:00:00`

  const [hh, mm] = timeStr.slice(0, 5).split(':').map((n) => Number(n))
  const dt = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0)
  if (isNaN(dt.getTime())) return null
  return dt
}

function validateTimeRangeHHMM(timeHHMM: string): boolean {
  const t = (timeHHMM || '').slice(0, 5)
  const [hh, mm] = t.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false
  const total = hh * 60 + mm
  const start = START_HOUR * 60
  const end = END_HOUR * 60
  return total >= start && total <= end
}

function nextValidDefaultSlot(): { date: string; time: string } {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const mins = now.getHours() * 60 + now.getMinutes()
  const step = TIME_STEP_MINUTES
  const rounded = Math.ceil(mins / step) * step

  const start = START_HOUR * 60
  const end = END_HOUR * 60

  const useToday = rounded <= end && rounded >= start
  const targetMins = useToday ? rounded : start
  const hh = Math.floor(targetMins / 60)
  const mm = targetMins % 60

  if (useToday) return { date: today, time: `${pad2(hh)}:${pad2(mm)}` }

  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  return { date: tomorrow.toISOString().slice(0, 10), time: `${pad2(START_HOUR)}:00` }
}

/* ================= CARGA CARTILLA ================= */
async function loadProfesionales() {
  loading.value = true
  errorMsg.value = ''
  try {
    const arr = await fetchEspecialistas()
    if (Array.isArray(arr) && arr.length) {
      profesionales.value = arr
      return
    }
  } catch {
    // fallback
  } finally {
    loading.value = false
  }

  loading.value = true
  try {
    const { data, error } = await supabase.from('professionals').select('*').order('name', { ascending: true })
    if (error) throw error

    profesionales.value = (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      specialty: r.specialty,
      type: r.type,
      city: r.city,
      province: r.province,
      insurance: r.insurance,
      bio: r.bio,
      contact: r.contact,
      avatar: r.avatar,
      avatar_url: r.avatar_url,
      is_virtual: r.is_virtual,
      modality:
        r.modality ||
        (typeof r.is_virtual === 'boolean' ? (r.is_virtual ? 'Virtual' : 'Presencial') : '')
    }))
  } catch (err) {
    console.error(err)
    errorMsg.value = 'No se pudo cargar la cartilla.'
  } finally {
    loading.value = false
  }
}

/* ================= FILTROS ================= */
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
    if (Array.isArray(raw)) raw.forEach((i) => String(i ?? '').trim() && set.add(String(i ?? '').trim()))
    else String(raw ?? '').trim() && set.add(String(raw ?? '').trim())
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
      !term || name.includes(term) || specialty.includes(term) || city.includes(term) || bio.includes(term)

    const matchSpecialty = !filterSpecialty.value || specialty === filterSpecialty.value.toLowerCase()
    const matchCity = !filterCity.value || city === filterCity.value.toLowerCase()
    const matchModality = !filterModality.value || modality === filterModality.value.toLowerCase()
    const matchInsurance = !filterInsurance.value || insurance.includes(filterInsurance.value.toLowerCase())

    return matchSearch && matchSpecialty && matchCity && matchModality && matchInsurance
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

const showAppointmentsModal = ref(false)
const appointments = ref<AppointmentRow[]>([])
const loadingAppointments = ref(false)
const editingAppointmentId = ref<string | null>(null)

const showPolicyModal = ref(false)
const pendingProForPolicy = ref<Profesional | null>(null)

let fp: any = null

function initDatepicker() {
  nextTick(() => {
    if (fp) fp.destroy()

    const input = document.querySelector('#nura-datepicker') as HTMLInputElement
    if (!input) return

    fp = flatpickr(input, {
      locale: Spanish,
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd/m/Y',
      altInputClass: 'nura-date-input',
      minDate: 'today',
      allowInput: false,
      defaultDate: bookingDate.value || undefined,
      onChange: (_selectedDates: Date[], dateStr: string) => {
        bookingDate.value = dateStr
      }
    })
  })
}

/* ========== NOTIFICACIONES (RESPETA SETTINGS) ========== */
function categoryFromType(type?: string | null): 'bienestar' | 'profesional' | 'app_updates' {
  const t = String(type || '').toLowerCase()
  if (t.includes('bienestar') || t.includes('wellbeing') || t.includes('reminder')) return 'bienestar'
  if (t.includes('appointment') || t.includes('turno') || t.includes('professional') || t.includes('profesional'))
    return 'profesional'
  return 'app_updates'
}

async function createNotification(opts: { title: string; body?: string; type?: string }) {
  if (!auth.user) return
  const cat = categoryFromType(opts.type ?? null)
  if (!prefs.categoryEnabled(cat)) return

  const { error } = await supabase.from('notifications').insert({
    user_id: auth.user.id,
    title: opts.title,
    body: opts.body ?? null,
    type: opts.type ?? null
  })
  if (error) console.error('Error creando notificación:', error)
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

function inferBookingModeFromProfessional(p: Profesional) {
  const modRaw = String(p.modality || '').toLowerCase()
  const isMixta = modRaw.includes('mixta')
  const multi = /,|\/|y/.test(modRaw)

  bookingHasSingleMode.value = !!modRaw && !multi && !isMixta

  if (bookingHasSingleMode.value) bookingMode.value = modRaw.includes('virtual') ? 'Virtual' : 'Presencial'
  else bookingMode.value = 'Presencial'

  if (!modRaw && typeof p.is_virtual === 'boolean') {
    bookingHasSingleMode.value = true
    bookingMode.value = p.is_virtual ? 'Virtual' : 'Presencial'
  }
}

function openBookingModal(p: Profesional) {
  if (!auth.user) {
    bookingError.value = 'Tenés que iniciar sesión.'
    return
  }
  selectedPro.value = p

  const nextSlot = nextValidDefaultSlot()
  bookingDate.value = nextSlot.date
  bookingTime.value = nextSlot.time

  inferBookingModeFromProfessional(p)

  bookingEmail.value = auth.user?.email ?? ''
  bookingError.value = ''
  showBookingModal.value = true
  editingAppointmentId.value = null

  initDatepicker()
}
function closeBookingModal() {
  showBookingModal.value = false
  bookingError.value = ''
  selectedPro.value = null
  editingAppointmentId.value = null
}

/* PAGO SEÑA (Mercado Pago) */
const mpLoading = ref(false)
const mpError = ref('')

async function payDepositWithMercadoPago() {
  mpError.value = ''

  if (!selectedPro.value) {
    mpError.value = 'Seleccioná un profesional primero.'
    return
  }
  if (!bookingDate.value || !bookingTime.value) {
    mpError.value = 'Elegí fecha y horario antes de pagar.'
    return
  }
  if (!validateTimeRangeHHMM(bookingTime.value)) {
    mpError.value = `El horario debe estar entre ${pad2(START_HOUR)}:00 y ${pad2(END_HOUR)}:00.`
    return
  }
  if (!bookingEmail.value || !bookingEmail.value.includes('@')) {
    mpError.value = 'Ingresá un email válido.'
    return
  }

  mpLoading.value = true
  try {
    // (Opcional) guardar una “intención de pago” en details para tener rastro
    // Esto NO confirma el turno: solo registra que el usuario inició pago.
    const details = [
      `Modalidad: ${bookingMode.value}`,
      `Email: ${bookingEmail.value}`,
      `Seña: Iniciada`,
      `MP: ${MP_DEPOSIT_URL}`
    ].join(' · ')

    // si querés, podés comentarlo y listo:
    await supabase.from('appointments').insert({
      user_id: auth.user?.id,
      on_date: bookingDate.value,
      at_time: normalizeTimeToHHMMSS(bookingTime.value),
      title: `Seña (pendiente) – ${selectedPro.value.name ?? 'Profesional'}`,
      details,
      professional: `${selectedPro.value.name ?? ''} – ${selectedPro.value.specialty ?? selectedPro.value.type ?? ''}`.trim(),
      modality: selectedPro.value.modality ?? bookingMode.value
    })

    window.open(MP_DEPOSIT_URL, '_blank', 'noopener,noreferrer')
  } catch (e) {
    console.error(e)
    mpError.value = 'No se pudo iniciar el pago. Probá de nuevo.'
  } finally {
    mpLoading.value = false
  }
}

/* ====== Guardar turno ====== (tu lógica la dejé igual; pegá la tuya acá si querés) */
async function loadAppointments() {
  if (!auth.user) return
  loadingAppointments.value = true
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id,on_date,at_time,title,details,modality,professional')
      .eq('user_id', auth.user.id)
      .order('on_date')
      .order('at_time')
    if (error) throw error

    const now = Date.now()
    appointments.value = (data || []).filter((a: any) => {
      const dt = makeApptDateTime(a.on_date, a.at_time)
      return dt ? dt.getTime() >= now : false
    })
  } catch (err) {
    console.error(err)
  } finally {
    loadingAppointments.value = false
  }
}

onMounted(async () => {
  prefs.loadFromLocal()
  await prefs.loadFromSupabase()

  await loadProfesionales()
  await loadAppointments()

  if (route.query.verTurnos === '1') {
    showAppointmentsModal.value = true
    router.replace({ path: route.path, query: {} })
  }
})

/* =========================
   HELPERS UI / TURNOS
========================= */

// ✅ Modal "Mis turnos"
async function openAppointmentsModal() {
  showAppointmentsModal.value = true
  await loadAppointments()
}
function closeAppointmentsModal() {
  showAppointmentsModal.value = false
}

// ✅ Toast -> abrir turnos
async function openAppointmentsFromToast() {
  turnoConfirmado.value = false
  await openAppointmentsModal()
}

// ✅ Formateos
function formatDate(iso: string) {
  // iso: YYYY-MM-DD
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
function formatTime(t: string | null) {
  if (!t) return ''
  return String(t).slice(0, 5) // HH:MM
}

/* =========================
   CONFLICTO DE HORARIO
========================= */
const clashModalVisible = ref(false)
const clashMessage = ref('')

function showClash(msg: string) {
  clashMessage.value = msg
  clashModalVisible.value = true
}

/* =========================
   GUARDAR / EDITAR TURNO
========================= */
async function saveAppointment() {
  bookingError.value = ''

  if (!auth.user) {
    bookingError.value = 'Tenés que iniciar sesión.'
    return
  }
  if (!selectedPro.value) {
    bookingError.value = 'Seleccioná un profesional.'
    return
  }
  if (!bookingDate.value || !bookingTime.value) {
    bookingError.value = 'Elegí fecha y horario.'
    return
  }
  if (!validateTimeRangeHHMM(bookingTime.value)) {
    bookingError.value = `El horario debe estar entre ${pad2(START_HOUR)}:00 y ${pad2(END_HOUR)}:00.`
    return
  }
  if (!bookingEmail.value || !bookingEmail.value.includes('@')) {
    bookingError.value = 'Ingresá un email válido.'
    return
  }

  const timeHHMMSS = normalizeTimeToHHMMSS(bookingTime.value)

  // ✅ Chequear choque contra tus propios turnos futuros (mismo día/hora)
  // (si estás editando, ignoramos el mismo id)
  const sameSlot = appointments.value.find((a) => {
    const same = a.on_date === bookingDate.value && normalizeTimeToHHMMSS(a.at_time || '') === timeHHMMSS
    if (!same) return false
    if (editingAppointmentId.value && a.id === editingAppointmentId.value) return false
    return true
  })
  if (sameSlot) {
    showClash(`Ya tenés un turno el ${formatDate(bookingDate.value)} a las ${formatTime(timeHHMMSS)}.`)
    return
  }

  bookingSaving.value = true
  try {
    const professionalLabel = `${selectedPro.value.name ?? ''} – ${
      selectedPro.value.specialty ?? selectedPro.value.type ?? ''
    }`.trim()

    const payload = {
      user_id: auth.user.id,
      on_date: bookingDate.value,
      at_time: timeHHMMSS,
      title: `Turno – ${selectedPro.value.name ?? 'Profesional'}`,
      details: `Modalidad: ${bookingMode.value} · Email: ${bookingEmail.value}`,
      professional: professionalLabel,
      modality: selectedPro.value.modality ?? bookingMode.value
    }

    if (editingAppointmentId.value) {
      const { error } = await supabase.from('appointments').update(payload).eq('id', editingAppointmentId.value)
      if (error) throw error
    } else {
      const { error } = await supabase.from('appointments').insert(payload)
      if (error) throw error
    }

    await loadAppointments()
    showBookingModal.value = false
    turnoConfirmado.value = true
    editingAppointmentId.value = null
  } catch (e) {
    console.error(e)
    bookingError.value = 'No se pudo guardar el turno. Probá de nuevo.'
  } finally {
    bookingSaving.value = false
  }
}

function startEditAppointment(a: AppointmentRow) {
  // Abrimos modal de agendar pre-cargado
  // (no tenemos profesional exacto en AppointmentRow, así que dejamos selectedPro como el que estaba
  // o uno "mock" para que el modal no quede vacío)
  const proName = (a.professional || a.title || '').split('–')[0].trim()

  selectedPro.value = selectedPro.value ?? ({ name: proName || 'Profesional' } as Profesional)

  bookingDate.value = a.on_date
  bookingTime.value = formatTime(a.at_time)
  bookingMode.value = (a.modality as any) || 'Presencial'
  bookingHasSingleMode.value = false
  bookingEmail.value = auth.user?.email ?? ''
  editingAppointmentId.value = a.id

  showAppointmentsModal.value = false
  showBookingModal.value = true
  initDatepicker()
}

/* =========================
   CANCELAR TURNO (con regla 48h)
========================= */
const confirmDeleteAppt = ref<AppointmentRow | null>(null)

const tooLateCancelModalVisible = ref(false)
const lateCancelMessage = ref('')
const lateCancelProfessionalName = ref('')

function cancelDeleteAppointment() {
  confirmDeleteAppt.value = null
}

function closeTooLateCancelModal() {
  tooLateCancelModalVisible.value = false
  lateCancelMessage.value = ''
  lateCancelProfessionalName.value = ''
}

function hoursUntilAppointment(a: AppointmentRow): number | null {
  const dt = makeApptDateTime(a.on_date, a.at_time)
  if (!dt) return null
  const diffMs = dt.getTime() - Date.now()
  return diffMs / (1000 * 60 * 60)
}

function askDeleteAppointment(a: AppointmentRow) {
  confirmDeleteAppt.value = a
}

async function confirmDeleteAppointment() {
  if (!confirmDeleteAppt.value) return

  const a = confirmDeleteAppt.value
  const hrs = hoursUntilAppointment(a)

  // Si está dentro de las 48h => no se puede cancelar
  if (hrs !== null && hrs < CANCEL_LIMIT_HOURS) {
    confirmDeleteAppt.value = null
    lateCancelProfessionalName.value = (a.professional || '').split('–')[0].trim()
    lateCancelMessage.value = `Este turno es dentro de menos de ${CANCEL_LIMIT_HOURS} horas, por lo que no es posible cancelarlo y recibir reintegro de la seña.`
    tooLateCancelModalVisible.value = true
    return
  }

  try {
    const { error } = await supabase.from('appointments').delete().eq('id', a.id)
    if (error) throw error
    confirmDeleteAppt.value = null
    await loadAppointments()
  } catch (e) {
    console.error(e)
    // si querés, podés mostrar un modal de error; por ahora lo dejamos simple
    confirmDeleteAppt.value = null
    alert('No se pudo cancelar el turno. Probá de nuevo.')
  }
}

function goToProfessionalForRebook() {
  // UX simple: cerramos modal y dejamos un search armado para que lo encuentre rápido
  if (lateCancelProfessionalName.value) {
    search.value = lateCancelProfessionalName.value
  }
  closeTooLateCancelModal()
  showAppointmentsModal.value = false
}

</script>

<template>
  <h1 class="visually-hidden">Cartilla</h1>

  <main class="contenido">
    <!-- Header -->
    <header class="page-head">
      <div>
        <h2>Cartilla de especialistas</h2>
        <p class="page-sub">Buscá por nombre, especialidad, ciudad, modalidad u obra social.</p>
      </div>

      <button type="button" class="pill pill--outline" @click="openAppointmentsModal">
        Mis turnos
      </button>
    </header>

    <!-- Filtros -->
    <section class="filters card">
      <div class="filters-row">
        <div class="field field--search">
          <label>Buscar</label>
          <div class="search-input">
            <input v-model="search" type="search" placeholder="Nombre, ciudad etc" />
            <button v-if="search" type="button" class="pill pill--ghost" @click="search = ''">
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
          {{ filteredProfesionales.length }} de {{ profesionales.length }} profesionales
        </span>

        <button type="button" class="pill pill--ghost-limpiar" @click="resetFilters">
          Limpiar filtros
        </button>
      </div>
    </section>

    <!-- Estados -->
    <p v-if="loading" class="state">Cargando cartilla…</p>

    <p v-else-if="errorMsg" class="state state--error">
      {{ errorMsg }}
    </p>

    <p v-else-if="!filteredProfesionales.length" class="state">
      No encontramos profesionales con esos filtros. Probá cambiarlos o limpiarlos.
    </p>

    <!-- Lista -->
    <section v-else class="list">
      <article v-for="p in filteredProfesionales" :key="p._id || p.id" class="card prof-card">
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
          <button type="button" class="pill pill--primary" @click="openPolicyModal(p)">
            Agendar turno
          </button>

          <a
            v-if="getEmail(p)"
            class="content-btn"
            :href="`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(getEmail(p))}`"
            target="_blank"
            rel="noopener"
          >
            <i class="fa-solid fa-envelope"></i>
          </a>
        </div>
      </article>
    </section>

    <!-- Modal Política -->
    <div v-if="showPolicyModal" class="modal-backdrop" @click.self="closePolicyModal">
      <div class="modal-card modal-policy animate-fade-in">
        <header class="modal-header">
          <h3 class="modal-title">Política de turnos</h3>
          <button class="modal-close" @click="closePolicyModal">×</button>
        </header>

        <section class="modal-body modal-body-scroll">
          <p class="modal-note">
            Para reservar un turno abonás una seña mediante Mercado Pago. Esta seña asegura tu lugar con el profesional.
          </p>

          <ul class="policy-list">
            <li>
              Los turnos se reservan entre las
              <strong>{{ String(START_HOUR).padStart(2, '0') }}:00</strong> y las
              <strong>{{ String(END_HOUR).padStart(2, '0') }}:00</strong> hs.
            </li>
            <li>
              Si cancelás con al menos <strong>48 horas</strong> de anticipación, la seña se devuelve.
            </li>
            <li>
              Si querés cancelar dentro de las 48&nbsp;hs previas, la seña no es reembolsable. Podés reprogramarlo sacando un nuevo turno con el profesional.
            </li>
          </ul>

          <p class="modal-note">
            Al continuar confirmás que leíste y aceptás estas condiciones.
          </p>
        </section>

        <footer class="modal-footer">
          <button class="pill pill--danger" @click="closePolicyModal">Cancelar</button>
          <button class="pill pill--primary" @click="acceptPolicyAndContinue">Acepto y continuar</button>
        </footer>
      </div>
    </div>

    <!-- Modal Agendar -->
    <div v-if="showBookingModal" class="modal-backdrop" @click.self="closeBookingModal">
      <div class="modal-card modal-appointment animate-fade-in">
        <header class="modal-header">
          <h3 class="modal-title">{{ editingAppointmentId ? 'Editar turno' : 'Agendar turno' }}</h3>
          <button type="button" class="modal-close" @click="closeBookingModal">×</button>
        </header>

        <section class="modal-body modal-body-scroll">
          <div class="prof-summary">
            <img
              v-if="selectedPro && getAvatarUrl(selectedPro)"
              :src="getAvatarUrl(selectedPro as any)"
              class="prof-summary-avatar"
              alt=""
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
            <input id="nura-datepicker" v-model="bookingDate" type="text" aria-label="Fecha del turno" />
          </div>

          <div class="modal-field">
            <label for="booking-time">
              Horario ({{ String(START_HOUR).padStart(2, '0') }}:00 - {{ String(END_HOUR).padStart(2, '0') }}:00)
            </label>
            <input
              id="booking-time"
              v-model="bookingTime"
              type="time"
              aria-label="Horario del turno"
              :min="`${String(START_HOUR).padStart(2, '0')}:00`"
              :max="`${String(END_HOUR).padStart(2, '0')}:00`"
              :step="TIME_STEP_MINUTES * 60"
            />
          </div>

          <div v-if="!bookingHasSingleMode" class="modal-field">
            <label for="booking-mode">Modalidad</label>
            <select id="booking-mode" v-model="bookingMode" aria-label="Modalidad del turno">
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

          <!-- Pago seña -->
          <div class="modal-field">
            <label>Reserva de turno</label>

            <p class="modal-note">
              Abonás una seña para reservar tu lugar. Si cancelás con al menos 48&nbsp;horas de anticipación, se te reintegra la seña.
              El día del turno abonás el resto directamente al profesional.
            </p>

            <button
              type="button"
              class="pill pill--primary mp-button"
              :disabled="mpLoading"
              @click="payDepositWithMercadoPago"
            >
              {{ mpLoading ? 'Redirigiendo a Mercado Pago…' : 'Pagar seña con Mercado Pago' }}
            </button>

            <p v-if="mpError" class="modal-error">{{ mpError }}</p>
          </div>

          <p v-if="bookingError" class="modal-error">{{ bookingError }}</p>
        </section>

        <footer class="modal-footer">
          <button class="pill pill--danger" @click="closeBookingModal" :disabled="bookingSaving">
            Cancelar
          </button>

          <!-- OJO: esto requiere que exista saveAppointment en tu script -->
          <button class="pill pill--primary" @click="saveAppointment" :disabled="bookingSaving">
            {{ bookingSaving ? 'Guardando…' : 'Confirmar turno' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="turnoConfirmado" class="turno-confirmado">
      <span class="check">✔</span>
      <div class="turno-text">
        <p>Tu turno fue confirmado</p>
        <button class="pill pill--sm pill--light" type="button" @click="openAppointmentsFromToast">
          Ver mis turnos
        </button>
      </div>
    </div>

    <!-- Modal Mis turnos -->
    <div v-if="showAppointmentsModal" class="modal-backdrop" @click.self="closeAppointmentsModal">
      <div class="modal-card modal-appointments-list animate-fade-in">
        <header class="modal-header">
          <h3 class="modal-title">Mis turnos</h3>
          <button class="modal-close" @click="closeAppointmentsModal">×</button>
        </header>

        <section class="modal-body modal-body-scroll">
          <p v-if="loadingAppointments" class="modal-note">Cargando turnos…</p>
          <p v-else-if="!appointments.length" class="modal-note">Todavía no tenés turnos agendados.</p>

          <ul v-else class="appt-list">
            <li v-for="a in appointments" :key="a.id" class="appt-item">
              <div class="appt-main">
                <h4 class="appt-title">{{ a.title }}</h4>

                <!-- OJO: esto requiere que existan formatDate / formatTime en tu script -->
                <p class="appt-meta">
                  {{ formatDate(a.on_date) }} · {{ formatTime(a.at_time) }}
                  <span v-if="a.modality"> · {{ a.modality }}</span>
                </p>
              </div>

              <div class="appt-actions">
                <button class="link-btn" @click="startEditAppointment(a)">Editar</button>
                <button class="link-btn danger" @click="askDeleteAppointment(a)">Cancelar</button>
              </div>
            </li>
          </ul>
        </section>

        <footer class="modal-footer">
          <button class="pill pill--danger" @click="closeAppointmentsModal">Cerrar</button>
        </footer>
      </div>
    </div>

    <!-- Modales extra (si ya los tenías) -->
    <div v-if="clashModalVisible" class="modal-backdrop" @click.self="clashModalVisible = false">
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
          <p class="modal-note modal-note--clash">{{ clashMessage }}</p>
        </section>

        <footer class="modal-footer modal-footer--clash">
          <button class="pill pill--primary pill--clash" type="button" @click="clashModalVisible = false">
            Entendido
          </button>
        </footer>
      </div>
    </div>

    <div v-if="tooLateCancelModalVisible" class="modal-backdrop" @click.self="closeTooLateCancelModal">
      <div class="modal-card modal-late-cancel animate-fade-in">
        <header class="modal-header">
          <h3 class="modal-title">No es posible cancelar</h3>
          <button class="modal-close" @click="closeTooLateCancelModal">×</button>
        </header>

        <section class="modal-body">
          <p class="modal-note">{{ lateCancelMessage }}</p>
          <p class="modal-note">
            Te vamos a llevar a la cartilla para que saques un nuevo turno con el profesional.
          </p>
        </section>

        <footer class="modal-footer">
          <button class="pill pill--ghost" @click="closeTooLateCancelModal">Cerrar</button>
          <button v-if="lateCancelProfessionalName" class="pill pill--primary" @click="goToProfessionalForRebook">
            Reprogramar turno
          </button>
        </footer>
      </div>
    </div>

    <div v-if="confirmDeleteAppt" class="modal-backdrop" @click.self="cancelDeleteAppointment">
      <div class="modal-card modal-confirm-cancel animate-fade-in">
        <header class="modal-header">
          <h3 class="modal-title">Cancelar turno</h3>
          <button class="modal-close" @click="cancelDeleteAppointment">×</button>
        </header>

        <section class="modal-body">
          <p>
            ¿Querés cancelar tu turno con
            <strong>{{ confirmDeleteAppt.professional }}</strong>?
          </p>
          <p class="modal-note">Esta acción no se puede deshacer.</p>
        </section>

        <footer class="modal-footer">
          <button class="pill pill--ghost" @click="cancelDeleteAppointment">Mantener turno</button>
          <button class="pill pill--danger" @click="confirmDeleteAppointment">Cancelar turno</button>
        </footer>
      </div>
    </div>
  </main>
</template>

<style scoped>
* { box-sizing: border-box; }

.contenido {
  background: #fff;
  padding: 24px 18px 48px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
}

.visually-hidden {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.head-left { min-width: 240px; }
.page-head h2 {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 650;
  color: var(--nura-green);
}
.page-sub { margin: 4px 0 0; font-size: 0.9rem; color: #4b5563; }

.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 14px 18px;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.18);
}
.filters { margin-bottom: 22px; background: #d9f5f5; }

.filters-row {
  display: grid;
  gap: 12px;
}
@media (min-width: 900px) {
  .filters-row {
    grid-template-columns: 1.15fr repeat(4, minmax(0, 1fr));
    align-items: end;
  }
}
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field label { font-size: 0.75rem; letter-spacing: 0.08em; color: #000; }

.field input, .field select {
  border-radius: 999px;
  border: 1.5px solid #50bdbd;
  padding: 9px 14px;
  font-size: 0.85rem;
  outline: none;
  background: #ecfcfcff;
}
.field input:focus, .field select:focus {
  border-color: var(--nura-green);
  background: #e6fbfb;
  box-shadow: 0 0 0 2px rgba(80, 189, 189, 0.18);
}
.field select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='10' stroke='%2350bdbd' stroke-width='2'/%3E%3Cpath d='M8 10L12 14L16 10' stroke='%2350bdbd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 18px center;
  background-size: 22px;
  padding-right: 50px;
}

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
.field--search input { border: none; background: transparent; padding-left: 24px; width: 100%; }
.field--search input:focus { outline: none; }

.filters-footer {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #e4f2f2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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

.pill {
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 0.8rem;
  border: none;
  background: var(--nura-green);
  color: #fff;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.15s ease;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.35);
}
.pill:hover { background: #3ea9a9; transform: translateY(-1px); }
.pill--primary { font-size: 0.9rem; font-weight: 600; }
.pill--ghost, .pill--ghost-limpiar {
  background: #50bdbd;
  box-shadow: 0 4px 12px rgba(80, 189, 189, 0.3);
  font-weight: 600;
}
.pill--ghost-limpiar { padding: 10px 18px; }
.pill--danger { background: #ef4444; box-shadow: 0 8px 18px rgba(239,68,68,0.4); font-size: 0.9rem; font-weight: 600;}
.pill--outline { background: #e0faf7; color: var(--nura-green); border: 1px solid #b6ebe5; box-shadow: none; }

.pill--outline:hover { background: #ffffff;}

.pill--sm { padding: 5px 12px; font-size: 0.78rem; box-shadow: none; }
.pill--light { background: #fff; color: var(--nura-green); border: 1px solid #b6ebe5; box-shadow: none; }
.pill--light:hover { background: #e0faf7;}


.state { font-size: 0.9rem; color: #6b7280; padding: 18px 2px; }
.state--error { color: #b91c1c; }

.list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: stretch;
}
@media (min-width: 768px) { .list { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1100px) { .list { grid-template-columns: repeat(3, 1fr); } }

.prof-card { display: flex; flex-direction: column; gap: 12px; }
.prof-top { display: flex; gap: 12px; align-items: flex-start; }
.prof-avatar img {
  width: 58px; height: 58px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}
.prof-main { flex: 1; min-width: 0; }
.prof-name { margin: 0; font-size: 1.5rem; font-weight: 700; color: #111827; }
.prof-specialty { margin: 4px 0; font-size: 1rem; color: #4b5563; }
.prof-location { font-size: 0.9rem; color: #6b7280; margin: 0; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.tag { font-size: 0.92rem; padding: 4px 10px; border-radius: 999px; background: #f3f4f6; color: #4b5563; }
.tag--primary { background: rgba(80,189,189,0.18); color: var(--nura-green); }
.prof-bio { margin: 1; font-size: 1rem; color: #4b5563; }
.prof-actions { display: flex; justify-content: flex-end; gap: 10px; align-items: center; }

.content-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border-radius: 999px;
  background: #50bdbd;
  color: #fff;
  border: none;
}

.content-btn:hover {
background: #3ea9a9; transform: translateY(-1px); 
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 10px;
}

.modal-card {
  background: #fff;
  border-radius: 22px;
  width: 80%;
  max-height: 75%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 36px rgba(30, 41, 59, 0.22);
  overflow: hidden;
}

.modal-header {
  padding: 12px 16px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.modal-title { font-size: 1.15rem; font-weight: 650; margin: 0; color: #0f172a; }
.modal-close { width: 34px; height: 34px; border-radius: 50%; background: #f0f4f8; border: none; font-size: 1.1rem; font-weight: 500; line-height: 1; display: flex; align-items: center; justify-content: center; color: #000000ff; cursor: pointer; transition: all 0.15s ease; } .mood-modal-close:hover { background: #e2e8f0; transform: scale(1.05); 

}

.modal-body { padding: 16px; width: 100%; }
.modal-body-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.modal-footer {
  padding: 14px 16px;
  border-top: 1px solid #eef2f7;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.modal-note { font-size: 0.95rem; color: #4b5563; margin: 0 0 10px; }
.modal-error { margin: 10px 0 0; color: #b91c1c; font-weight: 600; }
.hint { display: block; margin-top: 6px; font-size: 0.78rem; color: #64748b; }

.modal-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.modal-field label { font-size: 0.9rem; font-weight: 800; color: #50bdbd; letter-spacing: 0.04em; }
.modal-field input, .modal-field select {
  width: 100%;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  padding: 10px 12px;
  background: #d0f5f5ff;
  font-size: 0.95rem;
  color: #0f172a;
}

.modal-field input[type='time'] {
  padding-right: 24px;
}

.modal-field input[type='mode'] {
  padding-right: 4px;
}

.modal-field input[type='text'],
.modal-field input[type='email'],
.modal-field input[type='time'],
.modal-field select {
  height: 44px;
  line-height: 44px;
}
.modal-readonly-pill {
  width: 100%;
  padding: 10px 12px;
  border-radius: 14px;
  background: #d0f5f5ff;
  color: #0f172a;
}
.mp-button { width: 100%; justify-content: center; font-weight: 550; }



.prof-summary { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.prof-summary-avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; }
.prof-summary-name { margin: 0; font-weight: 800; }
.prof-summary-type { margin: 2px 0 0; color: #64748b; }

.appt-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.appt-item {
  width: 100%;
  background: #fff;
  border-radius: 16px;
  padding: 12px 12px;
  border: 1px solid #eef2f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.appt-main { min-width: 180px; }
.appt-title { margin: 0 0 4px; font-weight: 700; }
.appt-meta { margin: 0; color: #475569; font-size: 0.85rem; }
.appt-actions { display: flex; gap: 8px; }

.link-btn {
  border: 2px solid #50bdbd;
  border-radius: 999px;
  padding: 6px 12px;
  background: transparent;
  color: #50bdbd;
  font-weight: 650;
  cursor: pointer;
}

.link-btn:hover {
  background: #85b5e046;
  border-color: #85b6e0;
  transform: translateY(-2px);
}


.link-btn.danger { color: #ef4444; border-color: #ef4444; font-size: medium;}

.link-btn.danger:hover {
  background: #ff1c1c20;
  border-color: #c20808;
  transform: translateY(-2px);
}
.turno-confirmado {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 90px;
  width: fit-content;
  z-index: 2000;
  background: #50bdbd;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 8px 22px rgba(0,0,0,0.15);
}
@media (min-width: 768px) {
  .turno-confirmado { left: auto; right: 18px; width: 160px; }
  .modal-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
}

@media (width: 568px) {
  .turno-confirmado { left: auto; right: 18px; width: 90px; height: 50px; } }

.policy-list { margin: 8px 0 0; padding-left: 18px; color: #4b5563; }
.policy-list li { margin-bottom: 6px; }
.policy-list li::marker { content: '✓ '; color: #50bdbd; font-weight: 900; }

.modal-clash { border: 1px solid #c4f1ee; }
.modal-header--clash { background: #f6fffe; }
.modal-badge-alert {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: #fee2e2;
  color: #ef4444;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}




:global(.modal-field .nura-date-input),
:global(.modal-field input.nura-date-input),
:global(.modal-field input.flatpickr-input.nura-date-input),
:global(.modal-field input.nura-date-input[readonly]) {
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  padding: 13px 12px;
  background: #d0f5f5ff;
  color: #0f172a;
  font-size: 0.95rem;
  letter-spacing: 0.04em; 
}




.modal-field select#booking-mode {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  width: 100%;
  height: 44px;

  border-radius: 14px;
  border: 1px solid #e5e7eb;

  padding: 0 44px 0 12px; 
  background-color: #d0f5f5ff;
 font-size: 0.95rem;
  color: #0f172a;

  background-image: url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 10L12 14L16 10' stroke='%23000000' stroke-opacity='0.6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 20px center;
  background-size: 28px;

  cursor: pointer;
}

.modal-field select#booking-mode::-ms-expand {
  display: none;
}
</style>
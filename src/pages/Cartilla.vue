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

const prefs = useNotificationSettings()

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

/**
 * IMPORTANTE:
 * Para no depender de Render directo (y evitar CORS),
 * usá SIEMPRE /api en frontend (Netlify -> Render).
 * Entonces para imágenes, si viene una ruta relativa,
 * la resolvemos también por /api.
 */
const IMAGE_PROXY_BASE = '/api' // tu backend debería servir imágenes desde /api/... si corresponde

// Estado UX para cuando se muestra cache
const showingCached = ref(false)
const isOnline = ref<boolean>(navigator.onLine)

window.addEventListener('online', () => (isOnline.value = true))
window.addEventListener('offline', () => (isOnline.value = false))

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

  // Si el backend te devuelve algo tipo "/uploads/xxx.jpg" o "uploads/xxx.jpg"
  // lo resolvemos contra /api para pasar por Netlify proxy.
  const path = avatar.startsWith('/') ? avatar : `/${avatar}`
  return `${IMAGE_PROXY_BASE}${path}`
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
    normalizeTimeToHHMMSS((at_time || `${pad2(START_HOUR)}:00`).slice(0, 8)) ||
    `${pad2(START_HOUR)}:00:00`

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
  showingCached.value = false

  // 1) Backend (Render via Netlify proxy)
try {
  const { data, fromCache } = await fetchEspecialistas()

  if (Array.isArray(data)) {
    showingCached.value = fromCache || !isOnline.value
    profesionales.value = data
    return
  }

  // si el backend devuelve algo raro, igual intentamos setear si es array dentro de data.data
  const maybeArr = (data as any)?.data
  if (Array.isArray(maybeArr)) {
    showingCached.value = fromCache || !isOnline.value
    profesionales.value = maybeArr
    return
  }
} catch (e) {
  console.warn('Fallo fetchEspecialistas, intentando Supabase…', e)
} finally {
  loading.value = false
}

  // 2) Fallback Supabase
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .order('name', { ascending: true })

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
    errorMsg.value = 'No se pudo cargar la cartilla. Revisá tu conexión e intentá de nuevo.'
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

const paymentError = ref('')

const showAppointmentsModal = ref(false)
const appointments = ref<AppointmentRow[]>([])
const loadingAppointments = ref(false)
const editingAppointmentId = ref<string | null>(null)

const confirmDeleteAppt = ref<{ id: string; professional: string } | null>(null)

const showPolicyModal = ref(false)
const pendingProForPolicy = ref<Profesional | null>(null)

const tooLateCancelModalVisible = ref(false)
const lateCancelMessage = ref('')
const lateCancelProfessionalName = ref('')

const clashModalVisible = ref(false)
const clashMessage = ref('')

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
  if (t === 'daily' || t.includes('bienestar') || t.includes('wellbeing') || t.includes('reminder')) return 'bienestar'
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

  if (!validateTimeRangeHHMM(bookingTime.value)) {
    bookingError.value = `El horario debe estar entre las ${pad2(START_HOUR)}:00 y las ${pad2(END_HOUR)}:00 hs.`
    return
  }

  const at_time = normalizeTimeToHHMMSS(bookingTime.value)
  if (!at_time) {
    bookingError.value = 'Horario inválido.'
    return
  }

  const selectedDateTime = makeApptDateTime(bookingDate.value, at_time)
  if (!selectedDateTime) {
    bookingError.value = 'Fecha u horario inválidos.'
    return
  }

  if (selectedDateTime.getTime() <= Date.now()) {
    bookingError.value = 'No podés agendar turnos en el pasado. Elegí una fecha u horario posterior.'
    return
  }

  if (!bookingEmail.value || !bookingEmail.value.includes('@')) {
    bookingError.value = 'Ingresá un email válido para la confirmación.'
    return
  }

  bookingSaving.value = true
  bookingError.value = ''

  const professionalField = `${selectedPro.value.name ?? ''} – ${selectedPro.value.specialty ?? selectedPro.value.type ?? ''}`.trim()
  const modalityField = selectedPro.value.modality ?? bookingMode.value

  const locationExtra =
    selectedPro.value.city || selectedPro.value.province
      ? `Ubicación: ${selectedPro.value.city ?? ''}${selectedPro.value.city && selectedPro.value.province ? ', ' : ''}${
          selectedPro.value.province ?? ''
        }`
      : ''

  const detailsParts = [`Modalidad: ${bookingMode.value}`, `Email: ${bookingEmail.value}`]
  if (locationExtra) detailsParts.push(locationExtra)
  const detailsField = detailsParts.join(' · ')

  const payload: any = {
    user_id: auth.user.id,
    on_date: bookingDate.value,
    at_time,
    title: `Turno con ${selectedPro.value.name}`,
    details: detailsField,
    professional: professionalField || null,
    modality: modalityField || null
  }

  try {
    const { data: existing, error: clashError } = await supabase
      .from('appointments')
      .select('id')
      .eq('professional', professionalField)
      .eq('on_date', bookingDate.value)
      .eq('at_time', at_time)

    if (clashError) throw clashError

    const yaOcupado = (existing ?? []).some((row: any) => row.id !== editingAppointmentId.value)
    if (yaOcupado) {
      clashMessage.value = 'Ya hay un turno reservado con este profesional en ese horario. Elegí otro horario por favor.'
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

function formatDate(d: string) {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: '2-digit' })
}

function formatTime(t: string | null) {
  if (!t) return ''
  return t.slice(0, 5)
}

function startEditAppointment(a: AppointmentRow) {
  editingAppointmentId.value = a.id
  bookingDate.value = a.on_date
  bookingTime.value = (a.at_time ?? `${pad2(START_HOUR)}:00`).slice(0, 5)

  const professionalName =
    (a.professional || '').split('–')[0]?.replace(/^Turno con\s*/i, '').trim() || a.title.replace(/^Turno con\s*/i, '').trim()

  selectedPro.value = { name: professionalName } as Profesional

  const fromDetails = a.details?.match(/Modalidad:\s*(Virtual|Presencial)/i)?.[1]
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
      'Este turno está dentro de las 48 horas previas, por lo que no puede cancelarse desde la app. La seña no es reembolsable, pero podés reprogramarlo sacando un nuevo turno con el profesional.'
    tooLateCancelModalVisible.value = true
    return
  }

  confirmDeleteAppt.value = { id: a.id, professional }
}

async function confirmDeleteAppointment() {
  if (!auth.user || !confirmDeleteAppt.value) return

  await supabase.from('appointments').delete().eq('id', confirmDeleteAppt.value.id).eq('user_id', auth.user.id)

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
  const pro = profesionales.value.find((p) => normalize(p.name).includes(lower))

  closeTooLateCancelModal()
  showAppointmentsModal.value = false

  if (pro) openPolicyModal(pro)
  else search.value = name
}

function startPayment() {
  paymentError.value = ''
  const mpUrl = import.meta.env.VITE_MP_TURNO_URL

  if (!mpUrl) {
    paymentError.value = 'No se encontró el link de pago. Verificá la configuración de Mercado Pago.'
    return
  }

  try {
    window.open(mpUrl, '_blank')
  } catch (e) {
    console.error(e)
    paymentError.value = 'No se pudo abrir la ventana de pago.'
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
</script>
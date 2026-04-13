<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'
import { useRoute, useRouter } from 'vue-router'
import { useNuraApi } from '@/composables/useNuraApi'
import { useNotificationSettings } from '@/composables/useNotificationSettings'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const MP_DEPOSIT_URL = 'https://mpago.la/2b1Jhzj'
const prefs = useNotificationSettings()
const IMAGE_BASE_URL = 'https://backend-nura.onrender.com'
const CANCEL_LIMIT_HOURS = 48

const {
  fetchEspecialistas,
  fetchTurnosByEspecialista,
  fetchDisponibilidad,
  crearTurno,
  editarTurno,
  cancelarTurno,
  syncGoogleCalendar,
  getGoogleConnectUrl
} = useNuraApi()

type Contact = {
  email?: string
  whatsapp?: string
}

type DaySchedule = {
  active?: boolean
  from?: string
  to?: string
}

type Horarios = {
  lunes?: DaySchedule
  martes?: DaySchedule
  miercoles?: DaySchedule
  jueves?: DaySchedule
  viernes?: DaySchedule
  sabado?: DaySchedule
  domingo?: DaySchedule
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
  horarios?: Horarios
  sessionDuration?: number
  googleCalendarConnected?: boolean
  googleCalendar?: {
    connected?: boolean
  }
}

type ApiTurno = {
  _id: string
  especialistaId: string
  pacienteNombre?: string
  pacienteEmail?: string
  start: string
  end: string
  status?: string
  notes?: string
  source?: string
}

type AppointmentRow = {
  id: string
  turnoApiId?: string | null
  on_date: string
  at_time: string | null
  title: string
  details: string | null
  modality?: string | null
  professional?: string | null
}

type WeeklyAvailabilityDay = {
  date: string
  label: string
  shortLabel: string
  slots: string[]
  available: boolean
  isToday: boolean
  isPast: boolean
}

const profesionales = ref<Profesional[]>([])
const loading = ref(true)
const errorMsg = ref('')

const search = ref('')
const filterSpecialty = ref('')
const filterCity = ref('')
const filterModality = ref('')
const filterInsurance = ref('')

const DIAS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' }
] as const

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

function getModalidadLabel(value?: string): string {
  const raw = String(value || '').toLowerCase()
  if (raw === 'presencial') return 'Presencial'
  if (raw === 'virtual') return 'Virtual'
  if (raw === 'mixta') return 'Mixta'
  return value || ''
}

function getCoverageLabel(value?: string): string {
  const raw = String(value || '').toLowerCase()
  if (raw === 'privado') return 'Particular'
  if (raw === 'obra social') return 'Obra social'
  if (raw === 'prepaga') return 'Prepaga'
  return value || ''
}

function formatHorariosResumen(horarios?: Horarios): string {
  if (!horarios || typeof horarios !== 'object') {
    return 'Lunes a viernes de 09:00 a 17:00'
  }

  const activos = DIAS.filter((d) => horarios[d.key]?.active)

  if (!activos.length) {
    return 'Sin horarios cargados'
  }

  return activos
    .map((d) => {
      const item = horarios[d.key]
      const from = item?.from || ''
      const to = item?.to || ''
      return `${d.label}: ${from} a ${to}`
    })
    .join(' · ')
}

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

function normalizeTimeToHHMM(t: string | null | undefined): string {
  return String(t || '').slice(0, 5)
}

function makeApptDateTime(on_date: string, at_time: string | null): Date | null {
  if (!on_date) return null
  const [y, m, d] = on_date.split('-').map((n) => Number(n))
  if (!y || !m || !d) return null

  const timeStr = normalizeTimeToHHMMSS(at_time || '09:00') || '09:00:00'
  const [hh, mm] = timeStr.slice(0, 5).split(':').map((n) => Number(n))
  const dt = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0)
  if (isNaN(dt.getTime())) return null
  return dt
}

function getDayKeyFromDate(dateStr: string): keyof Horarios | '' {
  if (!dateStr) return ''

  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3) return ''

  const [year, month, day] = parts
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return ''

  const jsDay = date.getDay()

  const map: Record<number, keyof Horarios> = {
    0: 'domingo',
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
    4: 'jueves',
    5: 'viernes',
    6: 'sabado'
  }

  return map[jsDay] || ''
}

function hhmmToMinutes(time: string): number {
  const [hh, mm] = String(time || '00:00').slice(0, 5).split(':').map(Number)
  return (hh || 0) * 60 + (mm || 0)
}

function minutesToHHMM(total: number): string {
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function getSessionDuration(p?: Profesional | null): number {
  return Number(p?.sessionDuration) || 60
}

function getScheduleForDate(p: Profesional | null, dateStr: string): DaySchedule | null {
  if (!p?.horarios || !dateStr) return null

  const dayKey = getDayKeyFromDate(dateStr)
  if (!dayKey) return null

  const schedule = p.horarios[dayKey]
  if (!schedule?.active) return null

  return schedule
}

function getProfessionalLabel(p: Profesional | null): string {
  return `${p?.name ?? ''} – ${p?.specialty ?? p?.type ?? ''}`.trim()
}

function buildRawSlots(p: Profesional | null, dateStr: string): string[] {
  const schedule = getScheduleForDate(p, dateStr)
  if (!schedule?.from || !schedule?.to) return []

  const duration = getSessionDuration(p)
  const start = hhmmToMinutes(schedule.from)
  const end = hhmmToMinutes(schedule.to)

  const slots: string[] = []

  for (let current = start; current + duration <= end; current += duration) {
    slots.push(minutesToHHMM(current))
  }

  return slots
}

/* ================= CARGA CARTILLA ================= */
async function loadProfesionales() {
  loading.value = true
  errorMsg.value = ''

  try {
    const arr = await fetchEspecialistas()
    if (Array.isArray(arr)) {
      profesionales.value = arr.map((p: any) => ({
        ...p,
        googleCalendarConnected: Boolean(
          p.googleCalendar?.connected ?? p.googleCalendarConnected
        )
      }))
      return
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }

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
      horarios: r.horarios,
      sessionDuration: r.sessionDuration,
      coverage: r.coverage,
      googleCalendarConnected: Boolean(r.google_calendar_connected),
      modality:
        r.modality ||
        (typeof r.is_virtual === 'boolean'
          ? (r.is_virtual ? 'virtual' : 'presencial')
          : '')
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

const occupiedSlots = ref<string[]>([])
const loadingOccupiedSlots = ref(false)

/* ============ CALENDARIO SEMANAL TIPO CALENDLY ============ */
const weekOffset = ref(0)
const weeklyAvailability = ref<WeeklyAvailabilityDay[]>([])
const loadingWeeklyAvailability = ref(false)
const selectedWeekAnchor = ref('')

function getTodayDateISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

function isPastDate(dateStr: string): boolean {
  return dateStr < getTodayDateISO()
}

function isToday(dateStr: string): boolean {
  return dateStr === getTodayDateISO()
}

function isPastTimeToday(dateStr: string, slotHHMM: string): boolean {
  if (!isToday(dateStr)) return false

  const [hours, minutes] = String(slotHHMM).split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false

  const now = new Date()
  const slotDate = new Date()
  slotDate.setHours(hours, minutes, 0, 0)

  return slotDate.getTime() <= now.getTime()
}

function getStartOfWeek(base = new Date()) {
  const date = new Date(base)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDateISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  })
}

function formatShortDayLabel(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric'
  })
}

const weekLabel = computed(() => {
  if (!weeklyAvailability.value.length) return 'Disponibilidad semanal'

  const first = weeklyAvailability.value[0]?.date
  const last = weeklyAvailability.value[weeklyAvailability.value.length - 1]?.date
  if (!first || !last) return 'Disponibilidad semanal'

  const firstDate = new Date(first + 'T00:00:00')
  const lastDate = new Date(last + 'T00:00:00')

  const firstText = firstDate.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short'
  })

  const lastText = lastDate.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short'
  })

  return `${firstText} al ${lastText}`
})

const selectedDayAvailability = computed(() => {
  return weeklyAvailability.value.find((d) => d.date === bookingDate.value) || null
})

const selectedDaySlots = computed(() => {
  return selectedDayAvailability.value?.slots || []
})

function canGoPrevWeek() {
  return weekOffset.value > 0
}

async function prevWeek() {
  if (!canGoPrevWeek()) return
  weekOffset.value -= 1
  await loadWeeklyAvailability()
}

async function nextWeek() {
  weekOffset.value += 1
  await loadWeeklyAvailability()
}

async function selectDay(date: string) {
  const day = weeklyAvailability.value.find((d) => d.date === date)
  if (!day || day.isPast) return

  bookingDate.value = date

  if (day.slots.length) {
    if (!day.slots.includes(bookingTime.value)) {
      bookingTime.value = day.slots[0]
    }
  } else {
    bookingTime.value = ''
  }
}

function getWeekRange() {
  const start = getStartOfWeek(new Date())
  start.setDate(start.getDate() + weekOffset.value * 7)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  return {
    start,
    end,
    from: formatDateISO(start),
    to: formatDateISO(end)
  }
}

async function loadOccupiedSlotsForDay(pro: Profesional | null, dateStr: string): Promise<string[]> {
  if (!pro || !dateStr) return []

  const professionalId = String(pro._id || pro.id || '')
  if (!professionalId) return []

  const from = `${dateStr}T00:00:00.000-03:00`
  const to = `${dateStr}T23:59:59.999-03:00`

  try {
    const disponibilidad = await fetchDisponibilidad(professionalId, from, to)
    const ocupados = Array.isArray(disponibilidad?.ocupados) ? disponibilidad.ocupados : []

    return ocupados
      .filter((item: any) => {
        if (
          editingAppointmentId.value &&
          item?.turnoId &&
          String(item.turnoId) === String(editingAppointmentId.value)
        ) {
          return false
        }
        return true
      })
      .map((item: any) => {
        const dt = new Date(item.start)
        return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`
      })
      .filter(Boolean)
  } catch (err) {
    console.error(err)
    return []
  }
}

async function loadWeeklyAvailability() {
  weeklyAvailability.value = []

  if (!selectedPro.value) return

  loadingWeeklyAvailability.value = true

  try {
    const { start } = getWeekRange()
    selectedWeekAnchor.value = formatDateISO(start)

    const days: WeeklyAvailabilityDay[] = []

    for (let i = 0; i < 7; i++) {
      const current = new Date(start)
      current.setDate(start.getDate() + i)

      const dateStr = formatDateISO(current)
      const rawSlots = buildRawSlots(selectedPro.value, dateStr)
      const occupied = new Set(await loadOccupiedSlotsForDay(selectedPro.value, dateStr))

      const filteredSlots = rawSlots.filter((slot) => {
        if (occupied.has(slot)) return false
        if (isPastTimeToday(dateStr, slot)) return false
        return true
      })

      const past = isPastDate(dateStr)

      days.push({
        date: dateStr,
        label: formatDayLabel(current),
        shortLabel: formatShortDayLabel(current),
        slots: past ? [] : filteredSlots,
        available: !past && filteredSlots.length > 0,
        isToday: dateStr === getTodayDateISO(),
        isPast: past
      })
    }

    weeklyAvailability.value = days

    const dayStillValid = days.find((d) => d.date === bookingDate.value)
    const currentTimeStillValid =
      !!dayStillValid &&
      dayStillValid.slots.length > 0 &&
      dayStillValid.slots.includes(bookingTime.value)

    if (currentTimeStillValid) return

    const firstAvailableDay = days.find((d) => d.slots.length > 0)

    if (firstAvailableDay) {
      bookingDate.value = firstAvailableDay.date
      bookingTime.value = firstAvailableDay.slots[0] || ''
    } else {
      bookingDate.value = days[0]?.date || ''
      bookingTime.value = ''
    }
  } catch (err) {
    console.error(err)
  } finally {
    loadingWeeklyAvailability.value = false
  }
}

async function loadOccupiedSlotsForSelected() {
  occupiedSlots.value = []

  if (!selectedPro.value || !bookingDate.value) return

  loadingOccupiedSlots.value = true
  try {
    occupiedSlots.value = await loadOccupiedSlotsForDay(selectedPro.value, bookingDate.value)
  } catch (err) {
    console.error(err)
    occupiedSlots.value = []
  } finally {
    loadingOccupiedSlots.value = false
  }
}

const availableSlots = computed(() => {
  const baseSlots = selectedDaySlots.value.length
    ? selectedDaySlots.value
    : buildRawSlots(selectedPro.value, bookingDate.value)

  if (!baseSlots.length) return []

  const occupied = new Set(occupiedSlots.value)

  return baseSlots.filter((slot) => {
    if (editingAppointmentId.value) {
      const ownEditingTime = normalizeTimeToHHMM(
        appointments.value.find((a) => a.id === editingAppointmentId.value)?.at_time
      )
      if (slot === ownEditingTime) return true
    }

    if (occupied.has(slot)) return false
    if (isPastTimeToday(bookingDate.value, slot)) return false

    return true
  })
})

function updateBookingTimeFromDate() {
  if (!availableSlots.value.length) {
    bookingTime.value = ''
    return
  }

  if (!availableSlots.value.includes(bookingTime.value)) {
    bookingTime.value = availableSlots.value[0]
  }
}

function validateTimeRangeHHMM(timeHHMM: string): boolean {
  const t = String(timeHHMM || '').slice(0, 5)
  return availableSlots.value.includes(t)
}

async function nextValidSlotForProfessional(
  p: Profesional | null
): Promise<{ date: string; time: string }> {
  const base = new Date()

  for (let i = 0; i < 21; i++) {
    const date = new Date(base)
    date.setDate(base.getDate() + i)

    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

    const rawSlots = buildRawSlots(p, dateStr)
    if (!rawSlots.length) continue

    const occupied = new Set(await loadOccupiedSlotsForDay(p, dateStr))

    const available = rawSlots.filter((slot) => {
      if (occupied.has(slot)) return false
      if (isPastTimeToday(dateStr, slot)) return false
      return true
    })

    if (available.length) {
      return { date: dateStr, time: available[0] }
    }
  }

  return {
    date: new Date().toISOString().slice(0, 10),
    time: ''
  }
}

/* ========== NOTIFICACIONES ========== */
function categoryFromType(type?: string | null): 'bienestar' | 'profesional' | 'app_updates' {
  const t = String(type || '').toLowerCase()
  if (t.includes('bienestar') || t.includes('wellbeing') || t.includes('reminder')) return 'bienestar'
  if (t.includes('appointment') || t.includes('turno') || t.includes('professional') || t.includes('profesional')) return 'profesional'
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
    bookingError.value = 'Tenés que iniciar sesión para agendar un turno.'
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

async function openBookingModal(p: Profesional) {
  if (!auth.user) {
    bookingError.value = 'Tenés que iniciar sesión.'
    return
  }

  selectedPro.value = p

  const nextSlot = await nextValidSlotForProfessional(p)
  bookingDate.value = nextSlot.date
  bookingTime.value = nextSlot.time

  inferBookingModeFromProfessional(p)

  bookingEmail.value = auth.user?.email ?? ''
  bookingError.value = ''
  showBookingModal.value = true
  editingAppointmentId.value = null
  weekOffset.value = 0

  await loadOccupiedSlotsForSelected()
  await loadWeeklyAvailability()
  updateBookingTimeFromDate()
}

function closeBookingModal() {
  showBookingModal.value = false
  bookingError.value = ''
  selectedPro.value = null
  editingAppointmentId.value = null
  occupiedSlots.value = []
  weeklyAvailability.value = []
  weekOffset.value = 0
  bookingDate.value = ''
  bookingTime.value = ''
}

/* ================= GOOGLE CALENDAR ================= */
const googleSyncLoading = ref(false)
const googleSyncError = ref('')
const googleSyncSuccess = ref('')

async function syncGoogleCalendarAction() {
  googleSyncError.value = ''
  googleSyncSuccess.value = ''

  if (!selectedPro.value) {
    googleSyncError.value = 'Primero seleccioná un profesional.'
    return
  }

  const professionalId = String(selectedPro.value._id || selectedPro.value.id || '')
  if (!professionalId) {
    googleSyncError.value = 'No se pudo identificar al profesional.'
    return
  }

  googleSyncLoading.value = true

  try {
    await syncGoogleCalendar(professionalId)
    await loadOccupiedSlotsForSelected()
    await loadWeeklyAvailability()
    googleSyncSuccess.value = 'Agenda sincronizada correctamente.'
  } catch (err) {
    console.error(err)
    googleSyncError.value = 'No se pudo sincronizar Google Calendar.'
  } finally {
    googleSyncLoading.value = false
  }
}

function connectGoogleCalendarForSelected() {
  googleSyncError.value = ''

  if (!selectedPro.value) {
    googleSyncError.value = 'Primero seleccioná un profesional.'
    return
  }

  const professionalId = String(selectedPro.value._id || selectedPro.value.id || '')
  if (!professionalId) {
    googleSyncError.value = 'No se pudo identificar al profesional.'
    return
  }

  window.location.href = getGoogleConnectUrl(professionalId)
}

/* PAGO SEÑA */
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
    mpError.value = 'Elegí un horario disponible del profesional para ese día.'
    return
  }
  if (!bookingEmail.value || !bookingEmail.value.includes('@')) {
    mpError.value = 'Ingresá un email válido.'
    return
  }

  mpLoading.value = true

  try {
    window.open(MP_DEPOSIT_URL, '_blank', 'noopener,noreferrer')
  } catch (e) {
    console.error(e)
    mpError.value = 'No se pudo iniciar el pago. Probá de nuevo.'
  } finally {
    mpLoading.value = false
  }
}

async function loadAppointments() {
  if (!auth.user) return

  loadingAppointments.value = true
  appointments.value = []

  try {
    for (const pro of profesionales.value) {
      const profesionalId = String(pro._id || pro.id || '')
      if (!profesionalId) continue

      const turnos = await fetchTurnosByEspecialista(profesionalId)

      for (const t of turnos as ApiTurno[]) {
        if (t.status === 'cancelled') continue

        const pacienteEmail = String(t.pacienteEmail || '').trim().toLowerCase()
        const authEmail = String(auth.user?.email || '').trim().toLowerCase()

        if (!authEmail || pacienteEmail !== authEmail) continue

        const notes = String(t.notes || '')
        const modality = notes.includes('Virtual') ? 'Virtual' : 'Presencial'

        appointments.value.push({
          id: String(t._id),
          turnoApiId: String(t._id),
          on_date: new Date(t.start).toISOString().slice(0, 10),
          at_time: new Date(t.start).toISOString().slice(11, 19),
          title: `Turno – ${pro.name ?? 'Profesional'}`,
          details: notes,
          modality,
          professional: getProfessionalLabel(pro)
        })
      }
    }

    const now = Date.now()

    appointments.value = appointments.value
      .filter((a) => {
        const dt = makeApptDateTime(a.on_date, a.at_time)
        return dt ? dt.getTime() >= now : false
      })
      .sort((a, b) => {
        const da = makeApptDateTime(a.on_date, a.at_time)?.getTime() || 0
        const db = makeApptDateTime(b.on_date, b.at_time)?.getTime() || 0
        return da - db
      })
  } catch (err) {
    console.error(err)
  } finally {
    loadingAppointments.value = false
  }
}

/* ================= HELPERS UI ================= */
async function openAppointmentsModal() {
  showAppointmentsModal.value = true
  await loadAppointments()
}

function closeAppointmentsModal() {
  showAppointmentsModal.value = false
}

async function openAppointmentsFromToast() {
  turnoConfirmado.value = false
  await openAppointmentsModal()
}

function formatDate(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function formatTime(t: string | null) {
  if (!t) return ''
  return String(t).slice(0, 5)
}

function formatSelectedDateLong(iso: string) {
  if (!iso) return ''
  const date = new Date(`${iso}T00:00:00`)
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
}

/* ================= CONFLICTO DE HORARIO ================= */
const clashModalVisible = ref(false)
const clashMessage = ref('')

function showClash(msg: string) {
  clashMessage.value = msg
  clashModalVisible.value = true
}

/* ================= GUARDAR / EDITAR TURNO ================= */
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
    bookingError.value = 'Elegí un horario disponible del profesional para ese día.'
    return
  }
  if (!bookingEmail.value || !bookingEmail.value.includes('@')) {
    bookingError.value = 'Ingresá un email válido.'
    return
  }

  const professionalId = String(selectedPro.value._id || selectedPro.value.id || '')
  if (!professionalId) {
    bookingError.value = 'No se pudo identificar al profesional.'
    return
  }

  const duration = getSessionDuration(selectedPro.value)
  const start = new Date(`${bookingDate.value}T${bookingTime.value}:00-03:00`)
  const end = new Date(start.getTime() + duration * 60000)

  bookingSaving.value = true
  try {
    const payload = {
      especialistaId: professionalId,
      pacienteNombre: auth.user?.email || 'Paciente',
      pacienteEmail: bookingEmail.value,
      start: start.toISOString(),
      end: end.toISOString(),
      notes: `Modalidad: ${bookingMode.value}`
    }

    if (editingAppointmentId.value) {
      await editarTurno(editingAppointmentId.value, payload)
    } else {
      await crearTurno(payload)
    }

    await loadAppointments()
    await loadOccupiedSlotsForSelected()
    await loadWeeklyAvailability()

    showBookingModal.value = false
    turnoConfirmado.value = true
    editingAppointmentId.value = null

    await createNotification({
      title: 'Turno confirmado',
      body: `Tu turno con ${selectedPro.value.name ?? 'el profesional'} fue guardado correctamente.`,
      type: 'appointment'
    })
  } catch (e: any) {
    console.error(e)
    bookingError.value = e?.message || 'No se pudo guardar el turno. Probá de nuevo.'
  } finally {
    bookingSaving.value = false
  }
}

async function startEditAppointment(a: AppointmentRow) {
  const proName = (a.professional || a.title || '').split('–')[0].trim()
  const matched = profesionales.value.find(
    (p) =>
      getProfessionalLabel(p) === (a.professional || '').trim() ||
      (p.name || '').trim() === proName
  )

  selectedPro.value = matched ?? ({ name: proName || 'Profesional' } as Profesional)

  bookingDate.value = a.on_date
  bookingTime.value = formatTime(a.at_time)
  bookingMode.value = (a.modality as 'Presencial' | 'Virtual') || 'Presencial'
  bookingHasSingleMode.value = false
  bookingEmail.value = auth.user?.email ?? ''
  editingAppointmentId.value = a.id
  weekOffset.value = 0

  showAppointmentsModal.value = false
  showBookingModal.value = true

  await loadOccupiedSlotsForSelected()
  await loadWeeklyAvailability()
  updateBookingTimeFromDate()
}

/* ================= CANCELAR TURNO ================= */
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

async function confirmDeleteAppointmentAction() {
  if (!confirmDeleteAppt.value) return

  const a = confirmDeleteAppt.value
  const hrs = hoursUntilAppointment(a)

  if (hrs !== null && hrs < CANCEL_LIMIT_HOURS) {
    confirmDeleteAppt.value = null
    lateCancelProfessionalName.value = (a.professional || '').split('–')[0].trim()
    lateCancelMessage.value = `Este turno es dentro de menos de ${CANCEL_LIMIT_HOURS} horas, por lo que no es posible cancelarlo y recibir reintegro de la seña.`
    tooLateCancelModalVisible.value = true
    return
  }

  try {
    await cancelarTurno(a.id)
    confirmDeleteAppt.value = null
    await loadAppointments()
    await loadOccupiedSlotsForSelected()
    await loadWeeklyAvailability()
  } catch (e) {
    console.error(e)
    confirmDeleteAppt.value = null
    bookingError.value = 'No se pudo cancelar el turno. Probá de nuevo.'
  }
}

function goToProfessionalForRebook() {
  if (lateCancelProfessionalName.value) {
    search.value = lateCancelProfessionalName.value
  }
  closeTooLateCancelModal()
  showAppointmentsModal.value = false
}

/* ================= WATCHERS ================= */
watch(
  () => bookingDate.value,
  async () => {
    if (!showBookingModal.value) return
    await loadOccupiedSlotsForSelected()
    updateBookingTimeFromDate()
  }
)

watch(
  () => showBookingModal.value,
  async (open) => {
    if (!open || !selectedPro.value) return
    await loadWeeklyAvailability()
  }
)

/* ================= MOUNT ================= */
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

<template>
  <h1 class="visually-hidden">Cartilla</h1>

  <main class="contenido">
    <header class="page-head">
      <div>
        <h2>Cartilla de especialistas</h2>
        <p class="page-sub">Buscá por nombre, especialidad, ciudad, modalidad u obra social.</p>
      </div>

      <button type="button" class="pill pill--outline" @click="openAppointmentsModal">
        Mis turnos
      </button>
    </header>

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
              {{ getModalidadLabel(m) }}
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

    <p v-if="loading" class="state">Cargando cartilla…</p>

    <p v-else-if="errorMsg" class="state state--error">
      {{ errorMsg }}
    </p>

    <p v-else-if="!filteredProfesionales.length" class="state">
      No encontramos profesionales con esos filtros. Probá cambiarlos o limpiarlos.
    </p>

    <section v-else class="list">
      <article v-for="p in filteredProfesionales" :key="p._id || p.id" class="card prof-card">
        <div v-if="getAvatarUrl(p)" class="prof-avatar">
          <img :src="getAvatarUrl(p)" :alt="p.name" loading="lazy" />
        </div>

        <div class="prof-main">
          <div class="prof-top">
            <div>
              <h3 class="prof-name">{{ p.name }}</h3>
              <p class="prof-specialty">{{ p.specialty || p.type }}</p>
            </div>

            <span v-if="p.googleCalendarConnected" class="sync-badge">
              Agenda sincronizada
            </span>
          </div>

          <p v-if="p.city || p.province" class="prof-location">
            {{ p.city }}
            <span v-if="p.city && p.province"> · </span>
            {{ p.province }}
          </p>

          <div class="tags">
            <span v-if="p.modality" class="tag tag--primary">
              {{ getModalidadLabel(p.modality) }}
            </span>

            <span v-if="p.coverage" class="tag">
              {{ getCoverageLabel(p.coverage) }}
            </span>

            <span v-if="p.sessionDuration" class="tag">
              {{ p.sessionDuration }} min
            </span>

            <span v-if="Array.isArray(p.insurance)" class="tag">
              {{ p.insurance.join(' · ') }}
            </span>

            <span v-else-if="p.insurance" class="tag">
              {{ p.insurance }}
            </span>
          </div>

          <p class="prof-schedule">
            <strong>Horarios:</strong> {{ formatHorariosResumen(p.horarios) }}
          </p>

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
            aria-label="Enviar email"
          >
            <i class="fa-solid fa-envelope"></i>
          </a>
        </div>
      </article>
    </section>

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
            <li>Los turnos se reservan dentro del horario disponible del profesional.</li>
            <li>Si cancelás con al menos <strong>48 horas</strong> de anticipación, la seña se devuelve.</li>
            <li>
              Si querés cancelar dentro de las 48 hs previas, la seña no es reembolsable. Podés
              reprogramarlo sacando un nuevo turno con el profesional.
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

    <div v-if="showBookingModal" class="modal-backdrop" @click.self="closeBookingModal">
      <div class="modal-card modal-appointment modal-appointment-wide animate-fade-in">
        <header class="modal-header">
          <h3 class="modal-title">{{ editingAppointmentId ? 'Editar turno' : 'Agendar turno' }}</h3>
          <button type="button" class="modal-close" @click="closeBookingModal">×</button>
        </header>

        <section class="modal-body modal-body-scroll">
          <div class="booking-topbar">
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

            <div class="sync-actions">
              <button
                type="button"
                class="pill pill--outline sync-btn"
                @click="connectGoogleCalendarForSelected"
              >
                Conectar Google Calendar
              </button>

              <button
                type="button"
                class="pill pill--outline sync-btn"
                :disabled="googleSyncLoading"
                @click="syncGoogleCalendarAction"
              >
                {{ googleSyncLoading ? 'Sincronizando…' : 'Sincronizar agenda' }}
              </button>
            </div>
          </div>

          <p v-if="googleSyncSuccess" class="modal-success">
            {{ googleSyncSuccess }}
          </p>

          <p v-if="googleSyncError" class="modal-error">
            {{ googleSyncError }}
          </p>

          <div class="booking-layout">
            <section class="calendar-panel">
              <div class="calendar-panel-head">
                <div>
                  <p class="calendar-kicker">Disponibilidad</p>
                  <h4 class="calendar-title">{{ weekLabel }}</h4>
                </div>

                <div class="calendar-nav">
                  <button
                    type="button"
                    class="calendar-nav-btn"
                    :disabled="!canGoPrevWeek()"
                    @click="prevWeek"
                    aria-label="Semana anterior"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    class="calendar-nav-btn"
                    @click="nextWeek"
                    aria-label="Semana siguiente"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div v-if="loadingWeeklyAvailability" class="week-grid week-grid--skeleton">
                <div v-for="n in 7" :key="`day-skeleton-${n}`" class="day-card-skeleton"></div>
              </div>

              <div v-else class="week-grid">
                <button
                  v-for="day in weeklyAvailability"
                  :key="day.date"
                  type="button"
                  class="day-card"
                  :class="{
                    'day-card--active': bookingDate === day.date,
                    'day-card--muted': !day.available,
                    'day-card--today': day.isToday,
                    'day-card--past': day.isPast
                  }"
                  @click="selectDay(day.date)"
                  :disabled="day.isPast"
                >
                  <span class="day-card-top">
                    <span class="day-card-label">{{ day.shortLabel }}</span>
                    <span v-if="day.isToday" class="day-chip">Hoy</span>
                  </span>

                  <strong class="day-card-status">
                    {{
                      day.isPast
                        ? 'Día pasado'
                        : day.available
                          ? 'Disponible'
                          : 'Sin horarios'
                    }}
                  </strong>

                  <small class="day-card-count">
                    {{
                      day.isPast
                        ? 'No disponible'
                        : day.available
                          ? `${day.slots.length} horarios`
                          : 'Elegí otro día'
                    }}
                  </small>
                </button>
              </div>
            </section>

            <section class="slots-panel">
              <div class="slots-panel-head">
                <p class="slots-kicker">Horario elegido</p>
                <h4 class="slots-title">
                  {{ bookingDate ? formatSelectedDateLong(bookingDate) : 'Seleccioná un día' }}
                </h4>
                <p v-if="selectedPro && bookingDate" class="modal-note slots-note">
                  Atención:
                  {{ getScheduleForDate(selectedPro, bookingDate)?.from || '--:--' }}
                  a
                  {{ getScheduleForDate(selectedPro, bookingDate)?.to || '--:--' }}
                  ·
                  {{ getSessionDuration(selectedPro) }} min
                </p>
              </div>

              <div v-if="loadingOccupiedSlots" class="slots-grid slots-grid--skeleton">
                <div v-for="n in 8" :key="`slot-skeleton-${n}`" class="slot-skeleton"></div>
              </div>

              <div v-else-if="availableSlots.length" class="slots-grid">
                <button
                  v-for="slot in availableSlots"
                  :key="slot"
                  type="button"
                  class="slot-btn"
                  :class="{ 'slot-btn--active': bookingTime === slot }"
                  @click="bookingTime = slot"
                >
                  {{ slot }}
                </button>
              </div>

              <div v-else class="slots-empty">
                <p>No hay horarios disponibles para este día.</p>
                <small>Probá con otro día de la semana.</small>
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

              <div class="modal-field">
                <label>Reserva de turno</label>

                <p class="modal-note">
                  Abonás una seña para reservar tu lugar. Si cancelás con al menos 48 horas de anticipación,
                  se te reintegra la seña. El día del turno abonás el resto directamente al profesional.
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
          </div>
        </section>

        <footer class="modal-footer">
          <button class="pill pill--danger" @click="closeBookingModal" :disabled="bookingSaving">
            Cancelar
          </button>

          <button class="pill pill--primary" @click="saveAppointment" :disabled="bookingSaving">
            {{ bookingSaving ? 'Guardando…' : 'Confirmar turno' }}
          </button>
        </footer>
      </div>
    </div>

    <div v-if="turnoConfirmado" class="turno-confirmado">
      <span class="check">✔</span>
      <div class="turno-text">
        <p>Tu turno fue confirmado</p>
        <button class="pill pill--sm pill--light" type="button" @click="openAppointmentsFromToast">
          Ver mis turnos
        </button>
      </div>
    </div>

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
                <h4 class="appt-title">{{ a.title || `Turno – ${a.professional || 'Profesional'}` }}</h4>
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
            <strong>{{ confirmDeleteAppt.professional || 'el profesional' }}</strong>?
          </p>
          <p class="modal-note">Esta acción no se puede deshacer.</p>
        </section>

        <footer class="modal-footer">
          <button class="pill pill--ghost" @click="cancelDeleteAppointment">Mantener turno</button>
          <button class="pill pill--danger" @click="confirmDeleteAppointmentAction">Cancelar turno</button>
        </footer>
      </div>
    </div>
  </main>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

:global(:root) {
  --nura-green: #50bdbd;
  --nura-green-dark: #3ea9a9;
  --nura-green-soft: #d9f5f5;
  --nura-green-soft-2: #ecfcfc;
  --nura-border: #d7ecec;
  --nura-text: #0f172a;
  --nura-muted: #64748b;
  --nura-danger: #ef4444;
  --nura-danger-dark: #dc2626;
  --nura-success: #16a34a;
}

.contenido {
  background: #fff;
  padding: 24px 18px 48px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ================= PAGE ================= */

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.page-head h2 {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 650;
  color: var(--nura-green);
}

.page-sub {
  margin: 4px 0 0;
  font-size: 0.92rem;
  color: #4b5563;
}

.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 14px 18px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
}

/* ================= FILTERS ================= */

.filters {
  margin-bottom: 22px;
  background: var(--nura-green-soft);
}

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

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field label {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: #334155;
  font-weight: 600;
}

.field input,
.field select {
  border-radius: 999px;
  border: 1.5px solid var(--nura-green);
  padding: 9px 14px;
  font-size: 0.85rem;
  outline: none;
  background: var(--nura-green-soft-2);
  color: var(--nura-text);
}

.field input:focus,
.field select:focus {
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
  background: var(--nura-green-soft);
  padding: 4px 6px 4px 12px;
  border: 2px solid var(--nura-green);
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
  width: 100%;
}

.field--search input:focus {
  outline: none;
  box-shadow: none;
}

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

/* ================= BUTTONS ================= */

.pill {
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 0.82rem;
  border: none;
  background: var(--nura-green);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease,
    opacity 0.15s ease;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.35);
}

.pill:hover:not(:disabled) {
  background: var(--nura-green-dark);
  transform: translateY(-1px);
}

.pill:disabled {
  opacity: 0.68;
  cursor: not-allowed;
  transform: none;
}

.pill--primary {
  font-size: 0.9rem;
  font-weight: 650;
}

.pill--ghost,
.pill--ghost-limpiar {
  background: var(--nura-green);
  box-shadow: 0 4px 12px rgba(80, 189, 189, 0.3);
  font-weight: 600;
}

.pill--ghost-limpiar {
  padding: 10px 18px;
}

.pill--danger {
  background: var(--nura-danger);
  box-shadow: 0 8px 18px rgba(239, 68, 68, 0.35);
  font-size: 0.9rem;
  font-weight: 650;
}

.pill--danger:hover:not(:disabled) {
  background: var(--nura-danger-dark);
}

.pill--outline {
  background: #e0faf7;
  color: var(--nura-green);
  border: 1px solid #b6ebe5;
  box-shadow: none;
}

.pill--outline:hover:not(:disabled) {
  background: #ffffff;
}

.pill--sm {
  padding: 5px 12px;
  font-size: 0.78rem;
  box-shadow: none;
}

.pill--light {
  background: #fff;
  color: var(--nura-green);
  border: 1px solid #b6ebe5;
  box-shadow: none;
}

.pill--light:hover:not(:disabled) {
  background: #e0faf7;
}

/* ================= STATES ================= */

.state {
  font-size: 0.92rem;
  color: #6b7280;
  padding: 18px 2px;
}

.state--error {
  color: #b91c1c;
  font-weight: 600;
}

/* ================= LIST ================= */

.list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: stretch;
}

@media (min-width: 768px) {
  .list {
    grid-template-columns: repeat(2, 1fr);
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
}

.prof-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.prof-avatar img {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.prof-main {
  flex: 1;
  min-width: 0;
}

.prof-name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.prof-specialty {
  margin: 4px 0;
  font-size: 1rem;
  color: #4b5563;
}

.prof-location {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tag {
  font-size: 0.88rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #4b5563;
}

.tag--primary {
  background: rgba(80, 189, 189, 0.18);
  color: var(--nura-green);
}

.sync-badge {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(22, 163, 74, 0.12);
  color: var(--nura-success);
  font-size: 0.76rem;
  font-weight: 700;
  border: 1px solid rgba(22, 163, 74, 0.18);
}

.prof-schedule {
  margin: 10px 0 0;
  font-size: 0.93rem;
  color: #374151;
  line-height: 1.45;
}

.prof-bio {
  margin: 8px 0 0;
  font-size: 0.98rem;
  color: #4b5563;
  line-height: 1.55;
}

.prof-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  align-items: center;
}

.content-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: var(--nura-green);
  color: #fff;
  border: none;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}

.content-btn:hover {
  background: var(--nura-green-dark);
  transform: translateY(-1px);
}

/* ================= MODALS ================= */

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
  width: min(760px, 96%);
  max-height: 88vh;
  padding: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 36px rgba(30, 41, 59, 0.22);
  overflow: hidden;
}

.modal-appointment-wide {
  width: min(92vw, 1180px);
  max-width: 1180px;
}

.modal-appointment {
  max-height: min(88vh, 920px);
}

.modal-header {
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.modal-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
}

.modal-subtitle {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: var(--nura-muted);
}

.modal-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-close {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f0f4f8;
  border: none;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-close:hover {
  background: #e7edf3;
}

.modal-body {
  padding: 16px;
  width: 100%;
}

.modal-body-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.modal-footer {
  padding: 14px 16px;
  border-top: 1px solid #eef2f7;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.modal-note {
  font-size: 0.95rem;
  color: #4b5563;
  margin: 0 0 10px;
  line-height: 1.5;
}

.modal-note--clash {
  margin: 0;
}

.hint {
  display: block;
  margin-top: 6px;
  font-size: 0.78rem;
  color: #64748b;
}

/* ================= POLICY ================= */

.policy-list {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #4b5563;
}

.policy-list li {
  margin-bottom: 6px;
  line-height: 1.45;
}

.policy-list li::marker {
  content: '✓ ';
  color: var(--nura-green);
  font-weight: 900;
}

/* ================= SUMMARY ================= */

.booking-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.prof-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1 1 260px;
}

.prof-summary-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.prof-summary-name {
  margin: 0;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.prof-summary-type {
  margin: 4px 0 0;
  color: #475569;
  line-height: 1.3;
}

.sync-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
}

.sync-btn {
  white-space: nowrap;
}

/* ================= BOOKING LAYOUT ================= */

.booking-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 20px;
  margin-top: 10px;
  align-items: start;
}

/* ===== panel izquierdo ===== */

.calendar-panel {
  background: #f4fbfb;
  border-radius: 18px;
  padding: 16px;
  border: 1px solid #cfeeee;
}

.calendar-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.calendar-kicker {
  margin: 0 0 4px;
  font-size: 0.76rem;
  color: #475569;
  font-weight: 700;
}

.calendar-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}

/* ===== flechas ===== */

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.calendar-nav-btn {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid #b9e7e7;
  background: #ecfbfb;
  color: #168b8b;
  cursor: pointer;
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.calendar-nav-btn:hover:not(:disabled) {
  background: #d8f6f6;
  border-color: #8ed9d9;
  transform: translateY(-1px);
}

.calendar-nav-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ===== días ===== */

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.day-card,
.day-card-skeleton {
  min-height: 104px;
  border-radius: 14px;
}

.day-card {
  padding: 10px 8px;
  background: #ffffff;
  border: 1px solid #d8ecec;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  text-align: left;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.day-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  border-color: #9ddddd;
}

.day-card--active {
  background: #50bdbd;
  border-color: #50bdbd;
  color: #ffffff;
}

.day-card--active .day-card-count,
.day-card--active .day-card-status,
.day-card--active .day-card-label {
  color: #ffffff;
}

.day-card--today {
  border-width: 2px;
  border-color: #50bdbd;
}

.day-card--muted {
  opacity: 0.72;
}

.day-card--past {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
}

.day-card--past .day-card-status,
.day-card--past .day-card-count,
.day-card--past .day-card-label {
  color: #94a3b8;
}

.day-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
}

.day-card-label {
  font-size: 0.84rem;
  font-weight: 800;
  color: #334155;
  line-height: 1.2;
}

.day-card-status {
  font-size: 0.82rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
}

.day-card-count {
  font-size: 0.74rem;
  color: #64748b;
  line-height: 1.25;
}

.day-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: #50bdbd;
  color: #fff;
  font-size: 0.66rem;
  font-weight: 800;
  white-space: nowrap;
}

.day-card--active .day-chip {
  background: #ffffff;
  color: #168b8b;
}

/* ===== skeleton ===== */

.week-grid--skeleton .day-card-skeleton,
.slots-grid--skeleton .slot-skeleton {
  background: linear-gradient(90deg, #edf7f7 25%, #f8fcfc 37%, #edf7f7 63%);
  background-size: 400% 100%;
  animation: nuraShimmer 1.2s infinite linear;
  border: 1px solid #e1f1f1;
}

.slot-skeleton {
  height: 48px;
  border-radius: 12px;
}

@keyframes nuraShimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

/* ===== panel derecho ===== */

.slots-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.slots-kicker {
  margin: 0 0 4px;
  font-size: 0.76rem;
  color: #475569;
  font-weight: 700;
}

.slots-title {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.3;
}

.slots-note {
  margin-top: 6px;
  color: #475569;
  font-size: 0.92rem;
  line-height: 1.4;
}

/* ===== horarios ===== */

.slots-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.slot-btn {
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px solid #50bdbd;
  background: #ffffff;
  color: #0f172a;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.96rem;
  line-height: 1;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.slot-btn:hover {
  background: #85b6e0;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.14);
}

.slot-btn--active {
  background: #50bdbd;
  color: #ffffff;
  border-color: #50bdbd;
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.22);
}

.slots-empty {
  text-align: center;
  padding: 18px 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
}

.slots-empty p {
  margin: 0 0 6px;
  color: #0f172a;
  font-weight: 700;
}

.slots-empty small {
  color: #64748b;
}

/* ===== campos ===== */

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.modal-field label {
  font-size: 0.88rem;
  font-weight: 800;
  color: #0f766e;
  letter-spacing: 0.02em;
}

.modal-field input,
.modal-field select {
  width: 100%;
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid #cbd5e1;
  padding: 0 14px;
  background: #f8ffff;
  font-size: 0.96rem;
  color: #0f172a;
}

.modal-field input::placeholder {
  color: #64748b;
}

.modal-readonly-pill {
  width: 100%;
  min-height: 46px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #eefcfc;
  border: 1px solid #cfeeee;
  color: #0f172a;
  font-weight: 600;
}

.mp-button {
  width: 100%;
  justify-content: center;
  font-weight: 700;
}

.modal-success {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #ecfdf3;
  border: 1px solid #bbf7d0;
  color: #166534;
  font-weight: 700;
}

.modal-error {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-weight: 700;
}

/* ================= APPOINTMENTS ================= */

.appt-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.appt-item {
  width: 100%;
  background: #fff;
  border-radius: 16px;
  padding: 12px;
  border: 1px solid #eef2f7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.appt-main {
  min-width: 180px;
}

.appt-title {
  margin: 0 0 4px;
  font-weight: 700;
  color: var(--nura-text);
}

.appt-meta {
  margin: 0;
  color: #475569;
  font-size: 0.88rem;
}

.appt-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.link-btn {
  border: 2px solid var(--nura-green);
  border-radius: 999px;
  padding: 6px 12px;
  background: transparent;
  color: var(--nura-green);
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease,
    color 0.15s ease;
}

.link-btn:hover {
  background: #85b5e046;
  border-color: #85b6e0;
  transform: translateY(-1px);
}

.link-btn.danger {
  color: var(--nura-danger);
  border-color: var(--nura-danger);
}

.link-btn.danger:hover {
  background: #ff1c1c20;
  border-color: #c20808;
  color: #c20808;
  transform: translateY(-1px);
}

/* ================= TOAST ================= */

.turno-confirmado {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 90px;
  width: fit-content;
  max-width: calc(100vw - 24px);
  z-index: 2000;
  background: var(--nura-green);
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.15);
}

.turno-text p {
  margin: 0 0 8px;
  font-weight: 700;
}

.check {
  font-size: 1.2rem;
  font-weight: 900;
}

@media (min-width: 768px) {
  .turno-confirmado {
    left: auto;
    right: 18px;
    width: auto;
  }
}

/* ================= ALERT MODALS ================= */

.modal-badge-alert {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #fee2e2;
  color: var(--nura-danger);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}

.modal-header--clash {
  border-bottom: 1px solid #fee2e2;
}

.modal-body--clash {
  padding-top: 18px;
  padding-bottom: 18px;
}

.modal-footer--clash {
  justify-content: flex-end;
}

.pill--clash {
  min-width: 120px;
}

/* ================= DATE INPUT ================= */

:global(.modal-field .nura-date-input),
:global(.modal-field input.nura-date-input),
:global(.modal-field input.flatpickr-input.nura-date-input),
:global(.modal-field input.nura-date-input[readonly]) {
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  padding: 13px 12px;
  background: #d0f5f5;
  color: #0f172a;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

.modal-field select#booking-mode,
.modal-field select#booking-time {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 100%;
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  padding: 0 44px 0 12px;
  background-color: #d0f5f5;
  font-size: 0.95rem;
  color: #0f172a;
  background-image: url("data:image/svg+xml,%3Csvg width='28' height='28' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8 10L12 14L16 10' stroke='%23000000' stroke-opacity='0.6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 20px center;
  background-size: 28px;
  cursor: pointer;
}

.modal-field select#booking-mode::-ms-expand,
.modal-field select#booking-time::-ms-expand {
  display: none;
}

/* ================= RESPONSIVE ================= */

@media (max-width: 1024px) {
  .modal-appointment-wide {
    width: min(96vw, 980px);
  }

  .booking-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .week-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .slots-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .modal-card {
    width: 92%;
    max-height: 90vh;
  }

  .page-head {
    align-items: stretch;
  }

  .prof-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 680px) {
  .prof-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .sync-badge {
    align-self: flex-start;
  }

  .appt-item {
    align-items: flex-start;
  }

  .appt-actions {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .modal-card {
    width: 75%;
    max-width: 80%;
    max-height: 80%;
    border-radius: 5%;
    padding: 0;
  }

  .modal-appointment-wide {
    max-width: 80%;
    max-height: 80%;
     border-radius: 5%;
  }

  .modal-header,
  .modal-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .modal-header {
    position: sticky;
    top: 0;
    z-index: 6;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    padding-top: 14px;
    padding-bottom: 14px;
  }

  .modal-body-scroll {
    padding: 14px 16px 20px;
    max-height: calc(100dvh - 138px);
  }

  .modal-footer {
    position: sticky;
    bottom: 0;
    z-index: 6;
    background: #ffffff;
    border-top: 1px solid #e5e7eb;
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .modal-title {
    font-size: 1.1rem;
    line-height: 1.2;
    padding-right: 8px;
  }

  .booking-topbar {
    align-items: stretch;
  }

  .prof-summary {
    flex: 1 1 100%;
  }

  .sync-actions,
  .sync-btn {
    width: 100%;
  }

  .week-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .day-card,
  .day-card-skeleton {
    min-height: 96px;
    padding: 10px 8px;
  }

  .day-card-label {
    font-size: 0.8rem;
  }

  .day-card-status {
    font-size: 0.78rem;
  }

  .day-card-count {
    font-size: 0.72rem;
  }

  .slots-title {
    font-size: 1rem;
  }

  .slots-grid {
    grid-template-columns: 1fr;
  }

  .slot-btn,
  .modal-field input,
  .modal-field select,
  .modal-readonly-pill {
    min-height: 50px;
  }

  .modal-footer .pill {
    flex: 1 1 calc(50% - 6px);
    justify-content: center;
  }
}

@media (max-width: 500px) {
  .contenido {
    padding: 18px 14px 42px;
  }

  .card {
    padding: 14px;
  }
}

@media (max-width: 380px) {
  .calendar-panel,
  .slots-empty {
    padding-left: 12px;
    padding-right: 12px;
  }

  .calendar-nav-btn {
    width: 34px;
    height: 34px;
    font-size: 1rem;
  }

  .modal-body-scroll {
    padding-left: 12px;
    padding-right: 12px;
  }

  .modal-footer .pill {
    flex: 1 1 100%;
  }
}

/* ================= ANIMATIONS ================= */

.animate-fade-in {
  animation: fadeInSoft 0.2s ease;
}

@keyframes fadeInSoft {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
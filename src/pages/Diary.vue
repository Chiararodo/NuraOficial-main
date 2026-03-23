<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'
import { useFeatureGate } from '@/composables/useFeatureGate'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const gate = useFeatureGate('diary')

const TZ = 'America/Argentina/Buenos_Aires'

function isoDateInAR(d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d)

  const y = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${y}-${m}-${day}`
}

const showSavedModal = ref(false)
const viewDate = ref(new Date())
const selectedDate = ref(new Date())

const loadingEntry = ref(false)
const saving = ref(false)
const errorMsg = ref('')

const existingEntry = ref(false)
const showLimitModal = ref(false)

let tick: number | null = null

onMounted(async () => {
  const param = route.query.date as string | undefined
  if (param) selectedDate.value = new Date(param)

  await gate.reloadPremium()
  await gate.refresh()

  await loadCalendarHistory()
  await loadDraft()

  tick = window.setInterval(() => {
    gate.refresh()
  }, 30_000)
})

onBeforeUnmount(() => {
  if (tick) window.clearInterval(tick)
})

const monthName = computed(() => {
  const str = viewDate.value.toLocaleString('es-AR', {
    month: 'long',
    year: 'numeric'
  })
  return str.charAt(0).toUpperCase() + str.slice(1)
})

const firstOfMonth = computed(
  () => new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), 1)
)

const lastOfMonth = computed(
  () => new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 0)
)

const weekdayFirst = computed(() => (firstOfMonth.value.getDay() + 6) % 7)
const daysInMonth = computed(() => lastOfMonth.value.getDate())

function prevMonth() {
  viewDate.value = new Date(
    viewDate.value.getFullYear(),
    viewDate.value.getMonth() - 1,
    1
  )
}

function nextMonth() {
  viewDate.value = new Date(
    viewDate.value.getFullYear(),
    viewDate.value.getMonth() + 1,
    1
  )
}

const isFuture = (day: number) => {
  const date = new Date(
    viewDate.value.getFullYear(),
    viewDate.value.getMonth(),
    day
  )
  return date > new Date()
}

type Mood = 'triste' | 'normal' | 'bien' | 'muybien'
const calendarMap = ref<Record<string, Mood>>({})

const selectedISO = computed(() => isoDateInAR(selectedDate.value))
const todayISO = computed(() => isoDateInAR(new Date()))

async function loadCalendarHistory() {
  if (!auth.user) return

  const { data, error } = await supabase
    .from('diary_entries')
    .select('on_date,mood')
    .eq('user_id', auth.user.id)

  if (error) {
    console.error(error)
    return
  }

  const map: Record<string, Mood> = {}
  ;(data as any[] | null)?.forEach((d) => {
    if (d?.on_date && d?.mood) map[d.on_date] = d.mood as Mood
  })
  calendarMap.value = map
}

async function pickDay(d: number) {
  if (isFuture(d)) return

  selectedDate.value = new Date(
    viewDate.value.getFullYear(),
    viewDate.value.getMonth(),
    d
  )

  await loadDraft()
}

const mood = ref<Mood>('triste')
const content = ref('')

async function loadDraft() {
  if (!auth.user) return

  loadingEntry.value = true
  errorMsg.value = ''

  try {
    const { data, error } = await supabase
      .from('diary_entries')
      .select('mood, content')
      .eq('user_id', auth.user.id)
      .eq('on_date', selectedISO.value)
      .maybeSingle()

    if (error) throw error

    if (data) {
      existingEntry.value = true
      mood.value = (data.mood as Mood) ?? 'triste'
      content.value = data.content ?? ''
    } else {
      existingEntry.value = false
      mood.value = 'triste'
      content.value = ''
    }
  } catch (e: any) {
    console.error(e)
    errorMsg.value = 'No se pudo cargar tu registro.'
  } finally {
    loadingEntry.value = false
  }
}

function countRealWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function validateEntryContent() {
  const trimmed = content.value.trim()

  if (!trimmed) {
    errorMsg.value = 'Escribí algo en tu registro antes de guardarlo.'
    return false
  }

  const words = countRealWords(trimmed)

  if (words < 3) {
    errorMsg.value = 'Tu registro debe tener al menos 3 palabras.'
    return false
  }

  return true
}

const canSave = computed(() => {
  if (!auth.user) return false
  if (saving.value || loadingEntry.value) return false

  const trimmed = content.value.trim()
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0

  return words >= 3
})

const isPremium = computed(() => !!gate.premium.value)

const remainingThisMonth = computed(() => {
  if (isPremium.value) return Infinity
  return gate.freeStats.value.remaining
})

const canCreateThisMonth = computed(() => {
  if (isPremium.value) return true
  return gate.canUse.value
})

const showPremiumCta = computed(() => {
  if (gate.loading.value) return false
  return !isPremium.value
})

const ctaTitle = computed(() => 'Solo Premium')
const ctaText = computed(() => 'Para crear entradas sin límite necesitás el plan Premium.')
const ctaRight = computed(() => {
  if (gate.loading.value) return ''
  if (isPremium.value) return 'Ilimitado'
  return `Te quedan ${remainingThisMonth.value} usos este mes`
})

async function saveEntry() {
  if (!auth.user) {
    errorMsg.value = 'Tenés que iniciar sesión.'
    return
  }

  if (!validateEntryContent()) {
    return
  }

  const isCreate = !existingEntry.value

  if (isCreate && !canCreateThisMonth.value) {
    showLimitModal.value = true
    return
  }

  saving.value = true
  errorMsg.value = ''

  try {
    const payload = {
      user_id: auth.user.id,
      on_date: selectedISO.value,
      mood: mood.value,
      content: content.value.trim()
    }

    const { error } = await supabase
      .from('diary_entries')
      .upsert(payload, { onConflict: 'user_id,on_date' })

    if (error) throw error

    calendarMap.value[selectedISO.value] = mood.value

    if (isCreate) {
      existingEntry.value = true
      gate.consume(1)
    } else {
      existingEntry.value = true
    }

    content.value = ''
    gate.refresh()

    showSavedModal.value = true
    setTimeout(() => (showSavedModal.value = false), 4000)
  } catch (e: any) {
    console.error(e)
    errorMsg.value = 'Error guardando. Intentá de nuevo.'
  } finally {
    saving.value = false
  }
}

function exportToGoogle() {
  const base = selectedISO.value.replace(/-/g, '')
  const start = `${base}T090000`
  const end = `${base}T100000`

  const moodNames: Record<Mood, string> = {
    triste: 'Triste',
    normal: 'Normal',
    bien: 'Bien',
    muybien: 'Muy bien'
  }

  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', `Registro Nura – ${moodNames[mood.value]}`)
  url.searchParams.set('dates', `${start}/${end}`)
  url.searchParams.set('details', content.value || 'Sin descripción')
  url.searchParams.set('ctz', TZ)

  window.open(url.toString(), '_blank')
}

function goRecent() {
  router.push('/app/diario/entradas')
}

function goPremium() {
  router.push('/app/premium')
}

function dayStyle(day: number) {
  const key = isoDateInAR(
    new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), day)
  )

  if (calendarMap.value[key]) {
    const m = calendarMap.value[key]
    const colors: Record<Mood, string> = {
      triste: '#74c0f4',
      normal: '#b197fc',
      bien: '#8ce99a',
      muybien: '#ffa94d'
    }
    return { background: colors[m], color: 'white', border: 'none' }
  }

  const isToday = key === todayISO.value
  if (isToday) {
    return {
      background: '#50bdbd',
      color: 'white',
      border: 'none',
      boxShadow: '0 0 0 2px rgba(80,189,189,0.25)'
    }
  }

  return {}
}
</script>

<template>
  <main class="contenido">
    <header class="page-head">
      <h1 class="visually-hidden">Diario emocional</h1>
      <h2 class="page-title">Diario emocional</h2>
      <p class="subtitle">Registrá tu estado día por día.</p>

      <section v-if="showPremiumCta" class="premium-cta" aria-labelledby="premium-cta-title">
        <div class="premium-cta__left">
          <div class="premium-cta__top">
            <span class="premium-cta__badge">Gratis</span>
            <span class="premium-cta__right">{{ ctaRight }}</span>
          </div>
          <h2 id="premium-cta-title" class="premium-cta__title">{{ ctaTitle }}</h2>
          <p class="premium-cta__text">{{ ctaText }}</p>
        </div>

        <button type="button" class="premium-cta__btn" @click="goPremium">
          Pasar a Premium
        </button>
      </section>
    </header>

    <section class="diary-grid">
      <section class="card card-calendar" aria-labelledby="calendar-title">
        <header class="card-header">
          <div>
            <h2 id="calendar-title" class="card-title">Mi calendario emocional</h2>
            <p class="card-subtitle-small">Elegí un día.</p>
          </div>

          <div class="month-switch">
            <button type="button" class="month-btn" @click="prevMonth" aria-label="Mes anterior">
              ‹
            </button>
            <span class="month-label">{{ monthName }}</span>
            <button type="button" class="month-btn" @click="nextMonth" aria-label="Mes siguiente">
              ›
            </button>
          </div>
        </header>

        <div class="cal-grid">
          <span class="wd">LUN</span>
          <span class="wd">MAR</span>
          <span class="wd">MIE</span>
          <span class="wd">JUE</span>
          <span class="wd">VIE</span>
          <span class="wd">SÁB</span>
          <span class="wd">DOM</span>

          <span v-for="i in weekdayFirst" :key="'b' + i" class="blank"></span>

          <button
            v-for="d in daysInMonth"
            :key="'d' + d"
            class="cal-day"
            :class="{
              selected:
                selectedDate.getDate() === d &&
                selectedDate.getMonth() === viewDate.getMonth(),
              future: isFuture(d)
            }"
            :disabled="isFuture(d)"
            :style="dayStyle(d)"
            @click="pickDay(d)"
          >
            {{ d }}
          </button>
        </div>

        <button type="button" class="btn-soft" @click="goRecent">
          Ver entradas recientes
        </button>
      </section>

      <section class="card card-form" aria-labelledby="entry-title">
        <h2 id="entry-title" class="card-title">
          Escribí tu registro
        </h2>

        <div class="chips">
          <button
            type="button"
            :class="['chip', 'chip-triste', { active: mood === 'triste' }]"
            @click="mood = 'triste'"
          >
            Triste
          </button>
          <button
            type="button"
            :class="['chip', 'chip-normal', { active: mood === 'normal' }]"
            @click="mood = 'normal'"
          >
            Normal
          </button>
          <button
            type="button"
            :class="['chip', 'chip-bien', { active: mood === 'bien' }]"
            @click="mood = 'bien'"
          >
            Bien
          </button>
          <button
            type="button"
            :class="['chip', 'chip-muybien', { active: mood === 'muybien' }]"
            @click="mood = 'muybien'"
          >
            Muy bien
          </button>
        </div>

        <textarea
          class="area"
          rows="8"
          v-model="content"
          placeholder="Escribí aquí..."
          @input="errorMsg = ''"
        />

        <p v-if="errorMsg" class="err" role="alert">
          {{ errorMsg }}
        </p>
        <p v-else class="helper">
          Escribí al menos 3 palabras para guardar tu registro.
        </p>

        <div class="actions">
          <button type="button" class="btn-primary" :disabled="!canSave" @click="saveEntry">
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
          <button type="button" class="btn-soft" @click="exportToGoogle">
            Añadir a Google Calendar
          </button>
        </div>
      </section>
    </section>

    <div v-if="showSavedModal" class="toast" role="status">
      <div class="toast-content">
        <span class="check">✓</span>
        <div class="textos">
          <p class="titulo">Entrada guardada</p>
          <button type="button" class="toast-btn" @click="goRecent">
            Ver mis entradas
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showLimitModal"
      class="limit-overlay"
      @click.self="showLimitModal = false"
    >
      <div class="limit-card" role="dialog" aria-modal="true" aria-labelledby="limit-title">
        <h2 id="limit-title" class="limit-title">Límite alcanzado</h2>
        <p class="limit-text">
          En el plan gratuito podés <strong>crear</strong> hasta <strong>10 entradas por mes</strong>.
        </p>
        <p class="limit-text">
          Podés esperar al próximo período o pasar a <strong>Premium</strong>.
        </p>

        <div class="limit-actions">
          <button type="button" class="limit-btn soft" @click="showLimitModal = false">
            Entendido
          </button>
          <button type="button" class="limit-btn" @click="goPremium">
            Ver Premium
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.contenido {
  background: #fff;
  padding: 20px 18px 48px;
  max-width: 1400px;
  margin: 0 auto;
  box-sizing: border-box;
}

.page-head {
  display: grid;
  gap: 12px;
  margin-bottom: 18px;
}

.page-title {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 800;
  color: #50bdbd;
}

.subtitle {
  margin: 0;
  color: #5c6a75;
  font-size: 0.98rem;
  line-height: 1.45;
}

.premium-cta {
  margin: 0;
  background: #f6fffe;
  border: 1px solid #b6ebe5;
  border-radius: 18px;
  padding: 12px 14px;
  box-shadow: 0 12px 24px rgba(80, 189, 189, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease,
    border-color 0.22s ease;
}

@media (hover: hover) {
  .premium-cta:hover {
    transform: translateY(-3px);
    box-shadow: 0 18px 34px rgba(80, 189, 189, 0.12);
  }
}

.premium-cta__left {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.premium-cta__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.premium-cta__right {
  font-size: 0.78rem;
  color: #475569;
  font-weight: 800;
  white-space: nowrap;
}

.premium-cta__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(80, 189, 189, 0.15);
  color: #137b7b;
  font-weight: 900;
  font-size: 0.72rem;
}

.premium-cta__title {
  margin: 0;
  font-weight: 900;
  color: #0f172a;
  font-size: 0.95rem;
  line-height: 1.15;
}

.premium-cta__text {
  margin: 0;
  color: #475569;
  font-size: 0.84rem;
  line-height: 1.3;
}

.premium-cta__btn {
  border: none;
  border-radius: 999px;
  padding: 9px 12px;
  min-height: 42px;
  font-weight: 900;
  font-size: 0.84rem;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
  white-space: nowrap;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .premium-cta__btn:hover {
    background: #3daaaa;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.2);
  }
}

.diary-grid {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 24px;
  align-items: start;
}

.card {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: auto;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  padding: 16px 18px 18px;
  border: 1px solid #e2edf7;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease,
    border-color 0.22s ease;
}

@media (hover: hover) {
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
    background: #ffffff;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.card-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #50bdbd;
}

.card-subtitle-small {
  margin: 4px 0 0;
  font-size: 0.92rem;
  color: #6a7a86;
}

.month-switch {
  display: flex;
  align-items: center;
  gap: 6px;
}

.month-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #264055;
}

.month-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid #d7e6f6;
  background: #50bdbd;
  color: #ffffff;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  font-size: 1.15rem;
  font-weight: 700;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .month-btn:hover {
    background: #3daaaa;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.18);
  }
}

.cal-grid {
  display: grid;
  gap: 6px;
  margin-top: 6px;
  margin-bottom: 14px;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.wd {
  text-align: center;
  font-size: 0.75rem;
  opacity: 0.6;
  font-weight: 700;
}

.blank {
  height: 38px;
}

.cal-day {
  color: #1d2b3a;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #e8eef3;
  background: #d9f5f5;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
  font-size: 0.85rem;
}

@media (hover: hover) {
  .cal-day:hover:not(:disabled) {
    border-color: #50bdbd;
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(80, 189, 189, 0.12);
  }
}

.cal-day.selected {
  border: 2px solid #50bdbd;
}

.future {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-soft {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  padding: 10px 16px;
  min-height: 42px;
  background: #ffffff;
  color: #50bdbd;
  border-radius: 999px;
  font-size: 0.92rem;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  border: 1px solid #b6ebe5;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(148, 163, 184, 0.16);
}

@media (hover: hover) {
  .btn-soft:hover {
    background: #e0faf7;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.12);
  }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 8px;
}

.chip {
  border-radius: 999px;
  padding: 0.42rem 0.95rem;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.85rem;
  border-width: 1px;
  border-style: solid;
  background: #ffffff;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

@media (hover: hover) {
  .chip:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
  }
}

.chip-triste {
  border-color: #74c0f4;
  color: #24527a;
}
.chip-triste.active {
  background: #74c0f4;
  color: #ffffff;
}

.chip-normal {
  border-color: #b197fc;
  color: #4b3f86;
}
.chip-normal.active {
  background: #b197fc;
  color: #ffffff;
}

.chip-bien {
  border-color: #8ce99a;
  color: #22543d;
}
.chip-bien.active {
  background: #8ce99a;
  color: #ffffff;
}

.chip-muybien {
  border-color: #ffa94d;
  color: #7c3a03;
}
.chip-muybien.active {
  background: #ffa94d;
  color: #ffffff;
}

.area {
  border: 1.5px solid #dbe7f3;
  width: 100%;
  box-sizing: border-box;
  background: #d9f5f5;
  border-radius: 14px;
  min-height: 190px;
  max-height: 230px;
  padding: 12px;
  resize: vertical;
  font: inherit;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.area:focus {
  border-color: #50bdbd;
  boxShadow: 0 0 0 3px rgba(80, 189, 189, 0.18);
}

.err {
  color: #b42318;
  margin: 8px 0 0;
  font-size: 0.92rem;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 12px;
  padding: 10px 12px;
}

.helper {
  margin: 8px 0 0;
  font-size: 0.9rem;
  color: #6b7280;
}

.actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  min-height: 42px;
  background: #50bdbd;
  color: white;
  border-radius: 999px;
  font-size: 0.92rem;
  font-weight: 700;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
}

@media (hover: hover) {
  .btn-primary:hover:not(:disabled) {
    background: #3daaaa;
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(80, 189, 189, 0.28);
  }
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.toast {
  position: fixed;
  right: 22px;
  left: auto;
  bottom: 90px;
  z-index: 2000;
  animation: fadeInUp 0.4s ease-out;
}

.toast-content {
  background: #50bdbd;
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 16px;
  padding: 14px 20px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.15);
}

.check {
  font-size: 1.4rem;
  font-weight: 700;
}

.titulo {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.toast-btn {
  margin-top: 4px;
  background: white;
  color: #50bdbd;
  border: none;
  padding: 4px 12px;
  font-size: 0.85rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 700;
}

@media (hover: hover) {
  .toast-btn:hover {
    background: #f6fff9;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.limit-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  padding: 16px;
}

.limit-card {
  background: #ffffff;
  border-radius: 18px;
  max-width: 520px;
  width: 100%;
  padding: 18px 18px 14px;
  box-shadow: 0 18px 40px rgba(30, 41, 59, 0.22);
  border: 1px solid #e8eef3;
}

.limit-title {
  margin: 0 0 10px;
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
}

.limit-text {
  margin: 0 0 8px;
  color: #475569;
  line-height: 1.45;
}

.limit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.limit-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 14px;
  min-height: 42px;
  font-weight: 700;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

@media (hover: hover) {
  .limit-btn:hover {
    background: #3daaaa;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.2);
  }
}

.limit-btn.soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
}

@media (hover: hover) {
  .limit-btn.soft:hover {
    background: #e0faf7;
  }
}

.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
}

@media (max-width: 900px) {
  .diary-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .contenido {
    padding: 16px 14px 72px;
  }
}

@media (max-width: 768px) {
  .contenido {
    padding: 16px 12px 72px;
  }

  .page-title {
    font-size: 1.4rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .premium-cta {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 10px 12px;
  }

  .premium-cta__top {
    justify-content: flex-start;
  }

  .premium-cta__right {
    margin-left: auto;
  }

  .premium-cta__btn {
    width: 100%;
    text-align: center;
  }

  .card {
    padding: 14px 14px 16px;
  }

  .month-switch {
    align-self: flex-end;
  }

  .cal-day,
  .blank {
    height: 32px;
  }

  .actions {
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .btn-primary,
  .btn-soft {
    width: auto;
    margin-top: 0;
    padding: 9px 14px;
    font-size: 0.85rem;
    border-radius: 999px;
  }

  .toast {
    right: 12px;
    left: 12px;
    bottom: 90px;
  }

  .toast-content {
    justify-content: space-between;
    width: fit-content;
  }
}

@media (max-width: 520px) {
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 10px;
  }

  .btn-primary,
  .actions .btn-soft {
    width: 100%;
    padding: 9px 10px;
    font-size: 0.82rem;
  }

  .limit-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .limit-actions .limit-btn {
    width: 100%;
  }
}

@media (max-width: 420px) {
  .contenido {
    padding: 14px 12px 72px;
  }

  .card {
    padding: 14px 14px 16px;
  }
}

@media (max-width: 360px) {
  .actions {
    grid-template-columns: 1fr;
  }
}

@supports (-webkit-touch-callout: none) {
  .contenido {
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
  }

  .toast {
    bottom: calc(90px + env(safe-area-inset-bottom));
  }
}
</style>
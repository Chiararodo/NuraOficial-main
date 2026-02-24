<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

import { useFeatureGate } from '@/composables/useFeatureGate'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

/** Gate: 10 por mes para CREAR (editar no consume) */
const gate = useFeatureGate('diary')

/* ========= Fechas AR ========= */
const TZ = 'America/Argentina/Buenos_Aires'
function isoDateInAR(d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)

  const y = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${y}-${m}-${day}`
}

/* ========= Estado UI ========= */
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

  await gate.reloadPremium() // asegura premium actualizado
  await gate.refresh() // refresca stats locales

  await loadCalendarHistory()
  await loadDraft()

  tick = window.setInterval(() => {
    gate.refresh()
  }, 30_000)
})

onBeforeUnmount(() => {
  if (tick) window.clearInterval(tick)
})

/* ========= Calendario ========= */
const monthName = computed(() => {
  const str = viewDate.value.toLocaleString('es-AR', {
    month: 'long',
    year: 'numeric',
  })
  return str.charAt(0).toUpperCase() + str.slice(1)
})

const firstOfMonth = computed(
  () => new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), 1)
)
const lastOfMonth = computed(
  () => new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 0)
)

const weekdayFirst = computed(() => (firstOfMonth.value.getDay() + 6) % 7) // lunes=0
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

/* ========= DB ========= */
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

/* ========= Límite (solo CREAR consume) ========= */
const canSave = computed(() => {
  if (!auth.user) return false
  if (saving.value || loadingEntry.value) return false
  return content.value.trim().length > 1
})

const isPremium = computed(() => !!gate.premium.value)

const remainingThisMonth = computed(() => {
  if (isPremium.value) return Infinity
  return gate.freeStats.value.remaining
})

/** solo aplica para CREAR */
const canCreateThisMonth = computed(() => {
  if (isPremium.value) return true
  return gate.canUse.value
})

/** CTA tipo Foro: siempre visible si NO es premium */
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
  if (!canSave.value) return

  const isCreate = !existingEntry.value

  // SOLO bloquea si es NUEVA entrada
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
      content: content.value.trim(),
    }

    const { error } = await supabase
      .from('diary_entries')
      .upsert(payload, { onConflict: 'user_id,on_date' })

    if (error) throw error

    calendarMap.value[selectedISO.value] = mood.value

    // si era NUEVO, ahora consume 1
    if (isCreate) {
      existingEntry.value = true
      gate.consume(1)
    } else {
      existingEntry.value = true
    }

    // si preferís NO limpiar al editar, comentá la línea:
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

/* ========= Export ========= */
function exportToGoogle() {
  const base = selectedISO.value.replace(/-/g, '')
  const start = `${base}T090000`
  const end = `${base}T100000`

  const moodNames: Record<Mood, string> = {
    triste: 'Triste',
    normal: 'Normal',
    bien: 'Bien',
    muybien: 'Muy bien',
  }

  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', `Registro Nura – ${moodNames[mood.value]}`)
  url.searchParams.set('dates', `${start}/${end}`)
  url.searchParams.set('details', content.value || 'Sin descripción')
  url.searchParams.set('ctz', TZ)

  window.open(url.toString(), '_blank')
}

/* ========= Navegación ========= */
function goRecent() {
  router.push('/app/diario/entradas')
}
function goPremium() {
  router.push('/app/premium')
}

/* ========= Estilos días ========= */
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
      muybien: '#ffa94d',
    }
    return { background: colors[m], color: 'white', border: 'none' }
  }

  const isToday = key === todayISO.value
  if (isToday) {
    return {
      background: '#50bdbd',
      color: 'white',
      border: 'none',
      boxShadow: '0 0 0 2px rgba(80,189,189,0.25)',
    }
  }

  return {}
}
</script>

<template>
  <main class="contenido">
    <header class="page-head">
      <h2>Diario emocional</h2>
      <p class="subtitle">Registrá tu estado día por día.</p>

      <!-- CTA igual Foro (y NO se duplica con banner) -->
      <div v-if="showPremiumCta" class="premium-cta">
        <div class="premium-cta__left">
          <div class="premium-cta__top">
            <span class="premium-cta__badge">Gratis</span>
            <span class="premium-cta__right">{{ ctaRight }}</span>
          </div>
          <p class="premium-cta__title">{{ ctaTitle }}</p>
          <p class="premium-cta__text">{{ ctaText }}</p>
        </div>

        <button type="button" class="premium-cta__btn" @click="goPremium">
          Pasar a Premium
        </button>
      </div>
    </header>

    <section class="diary-grid">
      <section class="card card-calendar">
        <header class="card-header">
          <div>
            <h3 class="card-title">Mi calendario emocional</h3>
            <p class="card-subtitle-small">Elegí un día.</p>
          </div>

          <div class="month-switch">
            <button type="button" class="month-btn" @click="prevMonth">‹</button>
            <span class="month-label">{{ monthName }}</span>
            <button type="button" class="month-btn" @click="nextMonth">›</button>
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
              future: isFuture(d),
            }"
            :disabled="isFuture(d)"
            :style="dayStyle(d)"
            @click="pickDay(d)"
          >
            {{ d }}
          </button>
        </div>

        <button type="button" class="btn-outline" @click="goRecent">
          Ver entradas recientes
        </button>
      </section>

      <section class="card card-form">
        <h3 class="card-title">
          Escribí tu registro
          <span class="mode">
            {{ existingEntry ? '(editando)' : '(nuevo)' }}
          </span>
        </h3>

        <div class="chips">
          <button
            type="button"
            :class="['chip','chip-triste',{ active: mood === 'triste' }]"
            @click="mood='triste'"
          >
            Triste
          </button>
          <button
            type="button"
            :class="['chip','chip-normal',{ active: mood === 'normal' }]"
            @click="mood='normal'"
          >
            Normal
          </button>
          <button
            type="button"
            :class="['chip','chip-bien',{ active: mood === 'bien' }]"
            @click="mood='bien'"
          >
            Bien
          </button>
          <button
            type="button"
            :class="['chip','chip-muybien',{ active: mood === 'muybien' }]"
            @click="mood='muybien'"
          >
            Muy bien
          </button>
        </div>

        <textarea
          class="area"
          rows="8"
          v-model="content"
          placeholder="Escribí aquí..."
        />

        <p v-if="errorMsg" class="err">
          {{ errorMsg }}
        </p>

        <div class="actions">
          <button type="button" class="btn-primary" :disabled="!canSave" @click="saveEntry">
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
          <button type="button" class="btn-outline" @click="exportToGoogle">
            Añadir a Google Calendar
          </button>
        </div>
      </section>
    </section>

    <div v-if="showSavedModal" class="toast">
      <div class="toast-content">
        <span class="check">✓</span>
        <div class="textos">
          <p class="titulo">Entrada guardada</p>
          <button type="button" class="toast-btn" @click="goRecent">Ver mis entradas</button>
        </div>
      </div>
    </div>

    <div
      v-if="showLimitModal"
      class="limit-overlay"
      @click.self="showLimitModal = false"
    >
      <div class="limit-card">
        <h3 class="limit-title">Límite alcanzado</h3>
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
          <button type="button" class="limit-btn" @click="goPremium">Ver Premium</button>
        </div>
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
}

.page-head {
  display: grid;
  gap: 12px;
  margin-bottom: 22px;
}

.page-head h2 {
  margin: 0;
  font-size: 1.9rem;
  font-weight: 800;
  color: #50bdbd;
  padding: 4px 0;
}

.page-head .subtitle {
  margin: 0;
  color: #5c6a75;
  font-size: 1rem;
  line-height: 1.45rem;
}

/* ============================
   PREMIUM CTA (igual Foro)
============================ */
.premium-cta {
  margin: 0;
  background: #f6fffe;
  border: 1px solid #b6ebe5;
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 10px 18px rgba(80, 189, 189, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
  font-size: 0.9rem;
  line-height: 1.15;
}

.premium-cta__text {
  margin: 0;
  color: #475569;
  font-size: 0.82rem;
  line-height: 1.25;
}

.premium-cta__btn {
  border: none;
  border-radius: 999px;
  padding: 7px 10px;
  font-weight: 900;
  font-size: 0.82rem;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
  white-space: nowrap;
  transition: background 0.15s ease, transform 0.15s ease;
}

.premium-cta__btn:hover {
  background: #3daaaa;
  transform: translateY(-1px);
}

/* ============================
   GRID PRINCIPAL
============================ */
.diary-grid {
  max-width: 1120px;
  margin: 18px auto 0;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 24px;
  align-items: flex-start;
}

@media (max-width: 900px) {
  .diary-grid {
    grid-template-columns: 1fr;
  }
}

/* ============================
   CARD BASE
============================ */
.card {
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.07);
  padding: 16px 18px 18px;
  border: 0.3px solid #50bdbd;
}

/* ===== HEADER CARD ===== */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #50bdbd;
}

.mode {
  font-size: 0.85rem;
  color: #5c6a75;
  font-weight: 600;
  margin-left: 6px;
}

.card-subtitle-small {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #6a7a86;
}

/* ===== SWITCH MES ===== */
.month-switch {
  display: flex;
  align-items: center;
  gap: 6px;
}

.month-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #264055;
}

.month-btn {
  width: 28px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid #e3ecf6;
  background: #50bdbd;
  color: #ffffff;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  font-size: 1.5rem;
  font-weight: 500;
  align-items: center;
}

.month-btn:hover {
  background: #3daaaa;
}

/* ===== MODAL LIMITE ===== */
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
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
}

.limit-text {
  margin: 0 0 8px;
  color: #475569;
}

.limit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

.limit-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 14px;
  font-weight: 700;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
}

.limit-btn:hover {
  background: #3daaaa;
}

.limit-btn.soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
}

.limit-btn.soft:hover {
  background: #e0faf7;
}

/* ===== CALENDARIO ===== */
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
}

.blank {
  height: 36px;
}

.cal-day {
  color: #1d2b3a;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #e8eef3;
  background: #d9f5f5;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: 0.15s;
  font-size: 0.85rem;
}

.cal-day:hover {
  border-color: #50bdbd;
}

.cal-day.selected {
  border: 2px solid #50bdbd;
}

.future {
  opacity: 0.4;
  cursor: not-allowed;
}

/* BOTÓN VER ENTRADAS / GOOGLE CALENDAR */
.btn-outline {
  display: inline-block;
  margin-top: 8px;
  padding: 8px 10px;
  background: #50bdbd;
  color: white;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  transition: background 0.2s;
  border: none;
  cursor: pointer;
}

.btn-outline:hover {
  background: #3daaaa;
}

/* ===== FORMULARIO ===== */
.card-form {
  background: #ffffff;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 8px;
}

.chip {
  border-radius: 999px;
  padding: 0.38rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
  border-width: 1px;
  border-style: solid;
  background: #ffffff;
  transition: 0.15s ease;
}

.chip:hover {
  background: #50bdbd3a;
}

/* TRISTE – azul */
.chip-triste { border-color: #74c0f4; color: #24527a; }
.chip-triste.active { background: #74c0f4; color: #ffffff; }

/* NORMAL – violeta */
.chip-normal { border-color: #b197fc; color: #4b3f86; }
.chip-normal.active { background: #b197fc; color: #ffffff; }

/* BIEN – verde */
.chip-bien { border-color: #8ce99a; color: #22543d; }
.chip-bien.active { background: #8ce99a; color: #ffffff; }

/* MUY BIEN – naranja */
.chip-muybien { border-color: #ffa94d; color: #7c3a03; }
.chip-muybien.active { background: #ffa94d; color: #ffffff; }

.area {
  border: none;
  width: 100%;
  box-sizing: border-box;
  background: #d9f5f5;
  border-radius: 12px;
  min-height: 190px;
  max-height: 230px;
  padding: 10px 12px;
  resize: vertical;
  font: inherit;
}

.err {
  color: #b3261e;
  margin: 6px 0 0;
}

/* BOTONES DEL FORM (Guardar + Google) */
.actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.btn-primary {
  display: inline-block;
  margin-top: 8px;
  padding: 8px 14px;
  background: #50bdbd;
  color: white;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.2s;
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background: #3daaaa;
}

/* ===== TOAST ===== */
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
  margin-top: 2px;
  background: white;
  color: #50bdbd;
  border: none;
  padding: 4px 12px;
  font-size: 0.85rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
}

.toast-btn:hover {
  background: #f6fff9;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .contenido {
    padding: 16px 12px 72px;
  }

  .page-head h2 {
    font-size: 1.4rem;
  }

  .page-head .subtitle {
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

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .month-switch {
    align-self: flex-end;
  }

  .cal-day,
  .blank {
    height: 32px;
  }

  .actions {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .btn-primary,
  .actions .btn-outline {
    width: 100%;
    text-align: center;
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

@supports (-webkit-touch-callout: none) {
  .contenido {
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
  }

  .toast {
    bottom: calc(90px + env(safe-area-inset-bottom));
  }
}
</style>
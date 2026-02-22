<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'
import MoodSuccessModal from '@/components/MoodSuccessModal.vue'
import { useI18n } from 'vue-i18n'
import { useFeatureGate } from '@/composables/useFeatureGate'

type ForoResumen = {
  id: string
  title: string
  commentsCount: number
}

type Mood = 'triste' | 'normal' | 'bien' | 'muybien'

type Appt = {
  id: string
  user_id: string
  on_date: string
  at_time: string | null
  title: string
  details: string | null
  professional: string | null
  modality: string | null
}

const router = useRouter()
const auth = useAuthStore()
const { locale, t, tm } = useI18n()

/* ========= Premium Popup (1 vez por día) ========= */
const gate = useFeatureGate('diary')
const showPremiumPopup = ref(false)

const isPremium = computed(() => !!gate.premium.value)

function goPremium() {
  router.push('/app/premium')
}

function premiumPopupKey() {
  return auth.user ? `nura_premium_popup_${auth.user.id}` : 'nura_premium_popup'
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function shouldShowPremiumPopupToday() {
  if (!auth.user) return false
  const last = localStorage.getItem(premiumPopupKey())
  return last !== todayISO()
}

function markPremiumPopupShownToday() {
  if (!auth.user) return
  localStorage.setItem(premiumPopupKey(), todayISO())
}

function openPremiumPopupOncePerDay() {
  if (isPremium.value) return
  if (!shouldShowPremiumPopupToday()) return

  // Marcamos acá para que cuente como "ya mostrado" aunque no lo cierre
  markPremiumPopupShownToday()

  setTimeout(() => {
    showPremiumPopup.value = true
  }, 350)
}

function closePremiumPopup() {
  showPremiumPopup.value = false
 
  markPremiumPopupShownToday()
}

/* ========= Navegación ========= */
function goDiaryList() {
  router.push('/app/diario/entradas')
}

function escribirDiario() {
  router.push('/app/diario')
}

function goToMyAppointments() {
  router.push({
    path: '/app/cartilla',
    query: { verTurnos: '1' }
  })
}

/* ========= Nombre de usuario ========= */
const displayName = computed(() => {
  const metaName = (auth.user?.user_metadata as any)?.name
  if (metaName) return metaName.split(' ')[0]
  const email = auth.user?.email ?? 'usuario'
  return email.split('@')[0]
})

/* ========= Días de cuidado ========= */
const diasCuidado = computed(() => {
  if (!auth.user?.created_at) return 1

  const inicio = new Date(auth.user.created_at)
  const hoy = new Date()
  const diff = Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1
})

const meta = 30
const progresoPorcentaje = computed(() => Math.min((diasCuidado.value / meta) * 100, 100))

/* ========= Foro activo ========= */
const forosActivos = ref<ForoResumen[]>([])

async function cargarForosActivos() {
  const { data, error } = await supabase
    .from('forums')
    .select('id, title')
    .order('created_at', { ascending: false })
    .limit(4)

  if (error || !data) {
    console.error(error)
    forosActivos.value = []
    return
  }

  const ids = data.map((f) => f.id)

  const { data: comentariosData, error: comentariosError } = await supabase
    .from('forum_comments')
    .select('forum_id')
    .in('forum_id', ids)

  if (comentariosError) {
    console.error(comentariosError)
    forosActivos.value = data.map((f) => ({
      id: f.id,
      title: f.title,
      commentsCount: 0
    }))
    return
  }

  const contador: Record<string, number> = {}
  ;(comentariosData || []).forEach((c: any) => {
    contador[c.forum_id] = (contador[c.forum_id] || 0) + 1
  })

  forosActivos.value = data.map((f) => ({
    id: f.id,
    title: f.title,
    commentsCount: contador[f.id] || 0
  }))
}

function irAlForo(id: string) {
  router.push({ path: `/app/foro/${id}` })
}

/* ========= Frase del día (i18n) ========= */
const hoyYYYYMMDD = new Date().toISOString().slice(0, 10)

const frases = computed(() => {
  const arr = tm('home.quotes') as unknown as string[]
  return Array.isArray(arr) && arr.length ? arr : []
})

const fraseDelDia = computed(() => {
  if (!frases.value.length) return ''
  const idx =
    [...hoyYYYYMMDD].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % frases.value.length
  return frases.value[idx]
})

/* ========= Moods ========= */
const showMoodModal = ref(false)
const moodSeleccionado = ref<Mood>('normal')
const moodDate = ref('')

function setMood(mood: Mood) {
  const today = new Date().toISOString().slice(0, 10)

  if (auth.user) {
    const key = `nura_moods_${auth.user.id}`
    const stored = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, Mood>
    stored[today] = mood
    localStorage.setItem(key, JSON.stringify(stored))
  }

  moodSeleccionado.value = mood
  moodDate.value = today
  showMoodModal.value = true
}

function handleWriteDiaryFromModal() {
  showMoodModal.value = false
  escribirDiario()
}

/* ========= Calendario  ========= */
const today = new Date()

const monthName = computed(() => {
  const loc = (locale.value || 'es-AR') as string
  return today.toLocaleString(loc, { month: 'long' })
})

const weekdays = computed(() => tm('home.weekdays') as unknown as string[])

const first = new Date(today.getFullYear(), today.getMonth(), 1)
const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
const mondayBased = (first.getDay() + 6) % 7
const leadingBlanks = mondayBased
const daysInMonth = last.getDate()

/* ========= Actividades (turnos de hoy) ========= */
const activities = ref<Appt[]>([])

function formatTime(ti: string) {
  return ti?.slice(0, 5) ?? ''
}

function exportApptToGoogle(a: Appt) {
  const date = a.on_date.replace(/-/g, '')
  const baseTime = (a.at_time || '09:00').slice(0, 5)
  const [hh, mm] = baseTime.split(':')
  const start = `${date}T${hh}${mm}00`
  const end = `${date}T${String(Number(hh) + 1).padStart(2, '0')}${mm}00`

  const url = new URL('https://calendar.google.com/calendar/render')
  url.searchParams.set('action', 'TEMPLATE')
  url.searchParams.set('text', a.title || t('home.calendar.defaultEventTitle'))
  url.searchParams.set('dates', `${start}/${end}`)
  url.searchParams.set('details', a.details || t('home.calendar.defaultEventDetails'))
  url.searchParams.set('ctz', 'America/Argentina/Buenos_Aires')

  window.open(url.toString(), '_blank')
}

/* ========= onMounted ========= */
onMounted(async () => {
  await cargarForosActivos()

  if (!auth.user) return

  const { data, error } = await supabase
    .from('appointments')
    .select('id,user_id,on_date,at_time,title,details,professional,modality')
    .eq('user_id', auth.user.id)
    .eq('on_date', hoyYYYYMMDD)
    .order('on_date', { ascending: true })
    .order('at_time', { ascending: true })

  if (!error && data) activities.value = data as Appt[]

  // Premium popup (1 vez por día)
  await gate.refresh()
  openPremiumPopupOncePerDay()
})
</script>

<template>
  <h1 class="visually-hidden">Home</h1>

  <main class="home-page">
    <div class="grid">
      <!-- COLUMNA IZQUIERDA -->
      <section class="col">
        <!-- Saludo + Moods -->
        <div class="card">
          <h2>{{ $t('home.greeting', { name: displayName }) }}</h2>
          <p class="sub">{{ $t('home.howFeeling') }}</p>

          <div class="moods">
            <button class="mood" @click="setMood('triste')" type="button">
              <img
                src="/icons/nuri-triste.png"

                :alt="$t('home.moods.sad')"
              />
              <span>{{ $t('home.moods.sad') }}</span>
            </button>

            <button class="mood" @click="setMood('normal')" type="button">
              <img
                src="/icons/nuri-normal.png"
                :alt="$t('home.moods.ok')"
              />
              <span>{{ $t('home.moods.ok') }}</span>
            </button>

            <button class="mood" @click="setMood('bien')" type="button">
              <img
                src="/icons/nuri-bien.png"
                :alt="$t('home.moods.good')"
              />
              <span>{{ $t('home.moods.good') }}</span>
            </button>

            <button class="mood" @click="setMood('muybien')" type="button">
              <img
                src="/icons/nuri-muybien.png"
                :alt="$t('home.moods.great')"
              />
              <span>{{ $t('home.moods.great') }}</span>
            </button>
          </div>
        </div>

        <!-- Frase del día -->
        <div class="card frase-dia-card">
          <h3>{{ $t('home.quoteTitle') }}</h3>

          <div class="quote">"{{ fraseDelDia }}"</div>
          <p class="frase">{{ $t('home.quoteSubtitle') }}</p>

          <div class="progreso-box">
            <div class="progreso-top">
              <span class="progreso-text">
                {{ $t('home.progressText', { days: diasCuidado }) }}
                <span class="star-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill="#50bdbd"
                      d="M12 3.3l2.47 4.99 5.51.8-3.99 3.89.94 5.48L12 15.9l-4.93 2.6.94-5.48L4.02 9.1l5.51-.8L12 3.3z"
                    />
                  </svg>
                </span>
              </span>

              <span class="meta-text">
                {{ $t('home.goal', { goal: meta }) }}
              </span>
            </div>

            <div class="progreso-bar">
              <div
                class="progreso-fill"
                :style="{ width: progresoPorcentaje + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Foro activo -->
        <div class="card">
          <div class="foro-card-header">
            <h3>{{ $t('home.activeForum') }}</h3>
          </div>

          <ul class="foro-list">
            <li
              v-for="f in forosActivos"
              :key="f.id"
              class="foro-item"
              @click="irAlForo(f.id)"
            >
              <span class="foro-title">{{ f.title }}</span>
              <span class="foro-count">{{ f.commentsCount }}</span>
            </li>

            <li v-if="forosActivos.length === 0" class="foro-item vacío">
              <span class="foro-title">{{ $t('home.noActiveForums') }}</span>
            </li>
          </ul>

          <RouterLink class="foro-btn" to="/app/foro">
            {{ $t('home.seeMoreForum') }}
          </RouterLink>
        </div>
      </section>

      <!-- COLUMNA DERECHA -->
      <section class="col">
        <!-- ACTIVIDADES + CALENDARIO -->
        <div class="card">
          <h3>{{ $t('home.todayActivities') }}</h3>

          <div v-if="activities.length" class="activities-wrap">
            <ul class="activities-list">
              <li
                v-for="a in activities"
                :key="a.id"
                class="activity-item"
                @click="goToMyAppointments"
              >
                <div class="activity-time">
                  {{ formatTime(a.at_time || '') }}
                </div>

                <div class="activity-main">
                  <p class="activity-title">{{ a.title }}</p>
                  <p class="activity-meta">
                    {{ a.professional }}
                    <span v-if="a.modality">· {{ a.modality }}</span>
                  </p>
                </div>

                <button
                  type="button"
                  class="google-btn"
                  @click.stop="exportApptToGoogle(a)"
                >
                  {{ $t('home.addToGoogleCalendar') }}
                </button>
              </li>
            </ul>
          </div>

          <p v-else class="no-activities">
            {{ $t('home.noActivities') }}
          </p>

          <!-- CALENDARIO  -->
          <div class="calendar">
            <div class="cal-head">
              <span class="month-and-day">
                {{
                  monthName.charAt(0).toUpperCase() + monthName.slice(1)
                }}
                {{ today.getDate() }}
              </span>
            </div>

            <div class="cal-grid">
              <span v-for="d in weekdays" :key="'w' + d" class="wd">
                {{ d }}
              </span>

              <span v-for="i in leadingBlanks" :key="'b' + i" class="blank" />

              <button
                v-for="d in daysInMonth"
                :key="'d' + d"
                class="cal-day"
                :class="{ today: d === today.getDate() }"
                type="button"
              >
                {{ d }}
              </button>
            </div>
          </div>

          <!-- BOTONES BAJO CALENDARIO -->
          <div class="cal-actions">
            <button type="button" class="foro-btn" @click="goDiaryList">
              {{ $t('home.viewAllEntries') }}
            </button>
            <button type="button" class="foro-btn" @click="escribirDiario">
              {{ $t('home.writeToday') }}
            </button>
          </div>
        </div>

        <!-- NuriChat -->
        <div class="card">
          <h3>{{ $t('home.nurichatTitle') }}</h3>
          <RouterLink to="/app/chatbot" class="chatbot-card">
            <img
              src="/banners/chatbot-home.png"
              :alt="$t('home.nurichatAlt')"
            />
          </RouterLink>
        </div>
      </section>
    </div>
  </main>

  <!-- Premium Popup (al entrar) -->
  <div
    v-if="showPremiumPopup"
    class="premium-pop-overlay"
    @click.self="closePremiumPopup"
  >
    <div class="premium-pop-card" role="dialog" aria-modal="true" aria-label="Pasar a Premium">
      <div class="premium-pop-top">
        <span class="premium-pop-badge">Gratis</span>
        <button class="premium-pop-x" type="button" @click="closePremiumPopup" aria-label="Cerrar">
          ✕
        </button>
      </div>

      <h3 class="premium-pop-title">Pasate a Premium</h3>
      <p class="premium-pop-text">
        Desbloqueá accesos sin límites en Diario, NuraBot y en el Foro.
      </p>

      <div class="premium-pop-benefits">
        <div class="benefit">
          <span class="dot"></span>
          <span>Diario emocional ilimitado</span>
        </div>
        <div class="benefit">
          <span class="dot"></span>
          <span>NuraBot sin límite diario</span>
        </div>
        <div class="benefit">
          <span class="dot"></span>
          <span> Crear y comentar sin límites en el foro</span>
        </div>
      </div>

      <div class="premium-pop-actions">
        <button class="premium-pop-btn soft" type="button" @click="closePremiumPopup">
          Ahora no
        </button>
        <button class="premium-pop-btn" type="button" @click="goPremium">
          Ver Premium
        </button>
      </div>

     
    </div>
  </div>

  <MoodSuccessModal
    :open="showMoodModal"
    :mood="moodSeleccionado"
    :date="moodDate"
    @close="showMoodModal = false"
    @writeDiary="handleWriteDiaryFromModal"
  />
</template>

<style scoped>

.home-page {
  background: #fff;
  padding: 24px 18px 48px;
}

/* Grid */
.grid {
  display: grid;
  gap: 24px;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}

@media (min-width: 1000px) {
  .grid {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    align-items: flex-start;
  }
}

.col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Cards */
.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 14px 18px;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.32);
}

.card:hover {
  background: #fbffffff;
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
}

/* Títulos */
h2 {
  margin: 0 0 6px;
  font-size: 1.4rem;
  color: #50bdbd;
}
h3 {
  margin: 0 0 12px;
  font-size: 1.2rem;
  color: #50bdbd;
}

.sub {
  margin-bottom: 10px;
}

/* Moods */
.moods {
  display: grid;
  grid-template-columns: repeat(4, minmax(70px, 1fr));
  gap: 14px;
}
.mood {
  background: #fff;
  border: 1px solid #e8eef3;
  border-radius: 16px;
  padding: 10px 8px;
  display: grid;
  gap: 6px;
  justify-items: center;
  cursor: pointer;
  transition: box-shadow 0.15s ease, transform 0.05s ease;
}
.mood:hover {
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}
.mood img {
  width: 64px;
  height: 64px;
  object-fit: contain;
}
.mood span {
  font-size: 0.9rem;
  color: #000;
}

/* Frase del día */
.frase-dia-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 1.05rem;
  color: #0f172a;
}

.quote {
  font-size: 1.05rem;
  font-weight: 600;
  background: #f3fbff;
  border-radius: 10px;
  padding: 8px 12px;
  color: #50bdbd;
  border: 1px solid #e0eef4;
}

.progreso-box {
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progreso-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progreso-text {
  font-size: 1rem;
  color: #0f172a;
}
.progreso-text strong {
  color: #50bdbd;
}

.meta-text {
  font-size: 0.8rem;
  color: #6b7280;
}

.progreso-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #dff5f4;
  overflow: hidden;
}

.progreso-fill {
  height: 100%;
  background: linear-gradient(90deg, #50bdbd, #7ed9d3);
  border-radius: 999px;
  transition: width 1s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.star-icon svg {
  transform: translateY(7px);
}

/* Foro */
.foro-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.foro-list {
  padding: 0;
  margin: 0 0 16px 0;
  list-style: none;
}

.foro-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 6px;
  border-bottom: 1px solid #eef3f6;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.15s ease;
}
.foro-item:last-child {
  border-bottom: none;
}
.foro-item:hover {
  background: #e9f7f7;
  transform: translateX(4px);
  border-radius: 8px;
}

.foro-title {
  font-size: 0.95rem;
  color: #2e3a40;
}

.foro-count {
  background: #50bdbd;
  color: white;
  padding: 3px 8px;
  font-size: 0.75rem;
  border-radius: 12px;
  font-weight: 600;
}

/* Botones pill  */
.foro-btn {
  display: inline-block;
  box-sizing: border-box;
  max-width: 100%;
  margin-top: 8px;
  padding: 10px 22px;
  background: #50bdbd;
  color: white;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  border: none;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(80, 189, 189, 0.25);
  transition: background 0.2s, transform 0.12s ease, box-shadow 0.12s ease;
}
.foro-btn:hover {
  background: #3daaaa;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}

/* ==== Calendario  ==== */
.calendar {
  margin-top: 20px;
  padding: 10px 6px 16px;
  border-radius: 18px;
  background: #d4efec;
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.month-and-day {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  font-size: 1.4rem;
  color: #50bdbd;
  padding: 10px 10px 16px;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(32px, 1fr));
  gap: 8px;
  justify-content: center;
}

.wd {
  text-align: center;
  font-size: 0.8rem;
  opacity: 0.6;
  font-weight: 600;
}

.blank {
  height: 40px;
}

.cal-day {
  width: 100%;
  height: 48px;
  border: 1px solid #e4edf4;
  border-radius: 12px;
  background: #f7fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
  color: #1f2937;
  cursor: default;
  transition: 0.15s;
}

.cal-day.today {
  background: #50bdbd;
  color: white;
  border-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.25);
}

/* Acciones debajo del calendario */
.cal-actions {
  display: flex;
  gap: 14px;
  margin-top: 18px;
  flex-wrap: wrap;
}

/* ==== Actividades de hoy ==== */
.activities-wrap {
  margin-bottom: 10px;
}

.activities-list {
  list-style: none;
  padding: 0;
  margin: 0 0 4px;
  display: grid;
  gap: 8px;
}

.activity-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border-radius: 12px;
  background: #d4efec;
  border: 1px solid #cbecee;
  cursor: pointer;
}

.activity-item:hover {
  background: #d9f5f5;
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
}

.activity-time {
  font-weight: 700;
  font-size: 0.9rem;
  color: #0f766e;
  padding-right: 4px;
}

.activity-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.activity-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
}

.activity-meta {
  margin: 0;
  font-size: 0.8rem;
  color: #4b5563;
}

.google-btn {
  border-radius: 999px;
  border: none;
  padding: 6px 10px;
  font-size: 0.75rem;
  background: #ffffff;
  color: #50bdbd;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(80, 189, 189, 0.3);
  white-space: nowrap;
}
.google-btn:hover {
  background: #e0faf7;
}

.no-activities {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: #6b7280;
}

/* =========================
   PREMIUM POPUP (HOME)
========================= */
.premium-pop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 16px;
}

.premium-pop-card {
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border-radius: 18px;
  padding: 14px 14px 12px;
  border: 1px solid #e8eef3;
  box-shadow: 0 18px 40px rgba(30, 41, 59, 0.22);
}

.premium-pop-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.premium-pop-badge {
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

.premium-pop-x {
  width: 50px;
  height: 45px;
  border-radius: 999px;
  border: 1px solid #e8eef3;
  background: #ffffff;
  cursor: pointer;
  font-weight: 900;
  color: #0f172a;
}

.premium-pop-x:hover {
  background: #f6fffe;
  border-color: #b6ebe5;
}

.premium-pop-title {
  margin: 0 0 6px;
  font-size: 1.25rem;
  font-weight: 950;
  color: #50bdbd;
}

.premium-pop-text {
  margin: 0 0 12px;
  color: #475569;
  line-height: 1.35;
  font-size: 0.92rem;
}

.premium-pop-benefits {
  border: 1px solid #b6ebe5;
  background: #f6fffe;
  border-radius: 14px;
  padding: 10px 12px;
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.benefit {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0f172a;
  font-weight: 650;
  font-size: 0.9rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.18);
}

.premium-pop-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.premium-pop-btn {
  border-radius: 999px;
  border: none;
  padding: 9px 14px;
  font-weight: 900;
  cursor: pointer;
  background: #50bdbd;
  color: #fff;
}

.premium-pop-btn:hover {
  background: #3daaaa;
}

.premium-pop-btn.soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
}

.premium-pop-btn.soft:hover {
  background: #e0faf7;
}

.premium-pop-foot {
  margin: 10px 0 0;
  font-size: 0.78rem;
  color: #6b7280;
}

@media (max-width: 768px) {
  .premium-pop-card {
    max-width: 520px;
    padding: 12px 12px 10px;
  }
  .premium-pop-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .premium-pop-btn {
    width: 100%;
  }
}

/* ===== Chatbot Banner (NuriChat) ===== */
.chatbot-card {
  display: block;
  overflow: hidden;
  border-radius: 20px;
  max-width: 100%;
}

.chatbot-card img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: inherit;
  object-fit: cover;
}

/* ===== MOBILE (iPhone / <= 768px) ===== */
@media (max-width: 768px) {
  .home-page {
    padding: 16px 12px 96px;
  }

  h2 {
    font-size: 1.25rem;
  }

  h3 {
    font-size: 1.1rem;
  }

  .grid {
    gap: 18px;
  }

  .card {
    padding: 14px 14px;
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
  }

  .moods {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .mood img {
    width: 52px;
    height: 52px;
  }

  .mood span {
    font-size: 0.85rem;
  }

  .frase-dia-card {
    font-size: 0.95rem;
  }

  .quote {
    font-size: 0.95rem;
  }

  .month-and-day {
    font-size: 1.1rem;
    padding: 8px 10px 10px;
  }

  .cal-grid {
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
  }

  .cal-day {
    height: 36px;
    font-size: 0.75rem;
    border-radius: 10px;
  }

  .blank {
    height: 36px;
  }

  .activities-list {
    gap: 6px;
  }

  .activity-item {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .activity-time {
    font-size: 0.8rem;
  }

  .google-btn {
    margin-top: 6px;
    width: 100%;
    text-align: center;
  }

  .cal-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .foro-btn {
    width: 100%;
  }

  .chatbot-card {
    border-radius: 18px;
    margin-top: 4px;
  }

  .chatbot-card img {
    max-height: 220px;
  }
}
</style>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()

/* ========= Saludo ========= */
const auth = useAuthStore()
const displayName = computed(() => {
  const metaName = (auth.user?.user_metadata as any)?.name
  if (metaName) return metaName.split(' ')[0]
  const email = auth.user?.email ?? 'usuario'
  return email.split('@')[0]
})

/* ========= Frase del día ========= */
const frases = [
  'Sé amable con vos.',
  'Un paso a la vez.',
  'Respirá profundo y seguí.',
  'Tu proceso importa.',
  'Cuidarte también es avanzar.',
  'El descanso también es productivo.',
  'Soltar no es rendirse.',
  'Hoy merecés calma.',
  'Celebrá los pequeños logros.',
  'Pedí ayuda cuando lo necesites.',
]
const hoyYYYYMMDD = new Date().toISOString().slice(0, 10)
const fraseDelDia = frases[
  [...hoyYYYYMMDD].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % frases.length
]

/* ========= Guardar estado de ánimo SIN SUPABASE ========= */
function setMood(mood: 'triste' | 'normal' | 'bien' | 'muybien') {
  const today = new Date().toISOString().slice(0, 10)

  const stored = JSON.parse(localStorage.getItem('nura_moods') || '{}')
  stored[today] = mood
  localStorage.setItem('nura_moods', JSON.stringify(stored))

  router.push({
    name: 'mood-success',
    query: { mood, date: today }
  })
}

/* ========= Calendario del mes ========= */
const today = new Date()
const monthName = today.toLocaleString('es-AR', { month: 'long' })
const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const first = new Date(today.getFullYear(), today.getMonth(), 1)
const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
const jsWeekday = first.getDay()
const mondayBased = (jsWeekday + 6) % 7

const leadingBlanks = mondayBased
const daysInMonth = last.getDate()

/* ========= Actividades de hoy ========= */
type Appt = {
  id: string
  user_id: string
  on_date: string
  starts_at: string
  title: string
  place: string | null
}
const activities = ref<Appt[]>([])

function formatTime(t: string) {
  return t?.slice(0, 5) ?? ''
}

onMounted(async () => {
  if (!auth.user) return
  const { data, error } = await supabase
    .from('appointments')
    .select('id,user_id,on_date,starts_at,title,place')
    .eq('user_id', auth.user.id)
    .eq('on_date', hoyYYYYMMDD)
    .order('starts_at', { ascending: true })

  if (!error && data) activities.value = data as Appt[]
})
</script>

<template>
  <main class="home-page">
    <div class="grid">

      <!-- COLUMNA IZQUIERDA -->
      <section class="col">
        <!-- Saludo + Moods -->
        <div class="card">
          <h2>¡Hola, {{ displayName }}!</h2>
          <p class="sub">¿Cómo te sentís hoy?</p>

          <div class="moods">
            <button class="mood" @click="setMood('triste')">
              <img src="/icons/nuri-triste.png" alt="Triste" />
              <span>Triste</span>
            </button>
            <button class="mood" @click="setMood('normal')">
              <img src="/icons/nuri-normal.png" alt="Normal" />
              <span>Normal</span>
            </button>
            <button class="mood" @click="setMood('bien')">
              <img src="/icons/nuri-bien.png" alt="Bien" />
              <span>Bien</span>
            </button>
            <button class="mood" @click="setMood('muybien')">
              <img src="/icons/nuri-muybien.png" alt="Muy bien" />
              <span>Muy bien</span>
            </button>
          </div>
        </div>

        <!-- Frase del día -->
        <div class="card">
          <h3>Frase del día</h3>
          <div class="quote">"{{ fraseDelDia }}"</div>
        </div>

        <!-- Foro activo -->
        <div class="card">
          <div class="foro-header">
            <h3>Foro activo</h3>
          </div>

          <ul class="foro-list">
            <li>Tips para manejar la ansiedad <small>(15)</small></li>
            <li>Cómo transitar eventos sociales <small>(40)</small></li>
            <li>Tips para controlar la respiración <small>(30)</small></li>
            <li>Tips para organizar las comidas <small>(25)</small></li>
          </ul>

          <RouterLink class="btn-outline" to="/app/foro">Ver más del foro</RouterLink>
        </div>
      </section>

      <!-- COLUMNA DERECHA -->
      <section class="col">
        <div class="card">
          <h3>Actividades de hoy</h3>

          <div class="calendar">
            <div class="cal-head">
              <span class="month">{{ monthName.toUpperCase() }}</span>
              <span class="day-big">{{ today.getDate() }}</span>
            </div>

            <div class="cal-grid">
              <span v-for="d in weekdays" :key="`w-${d}`" class="wd">{{ d }}</span>
              <span v-for="i in leadingBlanks" :key="`b-${i}`" class="blank"></span>

              <button
                v-for="d in daysInMonth"
                :key="`d-${d}`"
                class="cal-day"
                :class="{ today: d === today.getDate() }"
              >
                {{ d }}
              </button>
            </div>
          </div>

          <ul v-if="activities.length" class="act-list">
            <li v-for="a in activities" :key="a.id">
              <strong>{{ formatTime(a.starts_at) }}</strong>
              <span> {{ a.title }}</span>
              <small v-if="a.place"> — {{ a.place }}</small>
            </li>
          </ul>

          <p v-else class="empty">No tenés actividades para hoy.</p>
        </div>

        <div>
          <h3>NuriChat</h3>
          <RouterLink to="/app/chatbot" class="chatbot-card">
            <img src="/banners/chatbot-home.png" alt="Tu guía de bienestar, ahora en un chat" />
          </RouterLink>
        </div>
      </section>

    </div>
  </main>
</template>


<style scoped>
/* Fondo general */
.home-page {
  background: #fff;
  padding: 24px 18px 48px;
}

/* Grid */
.grid {
  display: grid;
  gap: 24px;
}
@media (min-width: 1000px) {
  .grid {
    grid-template-columns: 1.1fr 0.9fr;
    max-width: 1100px;
    margin: 0 auto;
  }
}

.col {
  display: grid;
  gap: 20px;
}

/* Cards */
.card {
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
  padding: 18px 18px 20px;
}

/* Títulos */
h2 {
  margin: 0 0 6px;
  font-size: 1.4rem;
}
h3 {
  margin: 0 0 12px;
  font-size: 1.1rem;
}
.sub {
  margin: 0 0 12px;
  color: #000;
  opacity: 0.8;
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

/* Frase */
.quote {
  background: #f6fbff;
  border: 1px solid #e8eef3;
  border-radius: 12px;
  padding: 12px 14px;
}

/* Foro */
.foro-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #50bdbd;
}
.foro-list {
  margin: 10px 0 16px 18px;
}
.foro-list li {
  margin: 6px 0;
}
.foro-list small {
  opacity: 0.7;
}
.btn-outline {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid #85b6e0;
  color: #2d2d2d;
}

/* Calendario */
.calendar {
  display: grid;
  gap: 12px;
  margin-bottom: 10px;
}

.cal-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
}

.month {
  letter-spacing: 1px;
  color: #000;
}

.day-big {
  font-size: 2rem;
  font-weight: 800;
  color: #000;
  line-height: 1;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 32px);
  gap: 6px;
}

.wd {
  font-size: 0.8rem;
  opacity: 0.6;
  text-align: center;
}

.blank {
  border: 1px solid #e8eef3;
  background: #fff;
  border-radius: 8px;
  height: 32px;
  opacity: 0.35;
}

.cal-day {
  border: 1px solid #e8eef3;
  background: #fff;
  border-radius: 8px;
  height: 32px;
  font-size: 0.9rem;
  display: grid;
  place-items: center;
  color: #2d2d2d;
}

.cal-day.today {
  border-color: #50bdbd;
  box-shadow: 0 0 0 2px rgba(80, 189, 189, 0.15) inset;
}

/* Lista actividades */
.act-list {
  margin-top: 6px;
  display: grid;
  gap: 8px;
}
.act-list li {
  list-style: none;
}
.act-list strong {
  color: #000;
}
.act-list small {
  opacity: 0.7;
}
.empty {
  margin: 6px 0 0;
  opacity: 0.75;
}

/* Chatbot Banner */
.chatbot-card {
  display: block;
  overflow: hidden;
  border-radius: 20px;
}

.chatbot-card img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: inherit;
}
</style>

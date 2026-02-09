<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

type SessionItem = {
  id: string
  title: string
  type: string
  day: string
  time: string
  modality: string
}

const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const isPremium = ref(false)

const weeklySessions = ref<SessionItem[]>([
  {
    id: 'sesion-1',
    title: 'Respiración y calma para cerrar el día',
    type: 'Videollamada grupal',
    day: 'Martes',
    time: '19:00 hs',
    modality: 'Online por Zoom',
  },
  {
    id: 'sesion-2',
    title: 'Herramientas para gestionar la ansiedad',
    type: 'Taller exclusivo',
    day: 'Jueves',
    time: '18:30 hs',
    modality: 'Online por Zoom',
  },
  {
    id: 'sesion-3',
    title: 'Movimiento suave y relajación',
    type: 'Videollamada grupal',
    day: 'Domingo',
    time: '11:00 hs',
    modality: 'Online por Zoom',
  },
])

const userName = computed(() => {
  const metaName = (auth.user?.user_metadata as any)?.name
  if (metaName) return metaName.split(' ')[0]
  const email = auth.user?.email ?? 'usuario'
  return email.split('@')[0]
})

onMounted(async () => {
  if (localStorage.getItem('nura_is_premium') === 'true') {
    isPremium.value = true
    loading.value = false
    return
  }

  if (auth.user) {
    const { data, error } = await supabase
      .from('profiles')
      .select('premium')
      .eq('id', auth.user.id)
      .maybeSingle()

    if (!error && data?.premium) {
      isPremium.value = true
      localStorage.setItem('nura_is_premium', 'true')
    }
  }

  loading.value = false
})

function goPlans() {
  router.push('/app/premium')
}
function goAgenda() {
  router.push('/app/agendar/eventos')
}
function goForo() {
  router.push('/app/foro')
}
function goDiario() {
  router.push('/app/diario')
}
function goChatbot() {
  router.push('/app/chatbot')
}
</script>

<template>
  <h1 class="visually-hidden">Área Premium</h1>

  <main class="page">
    <header class="page-head">
      <div class="head-left">
        <h2>Área Premium</h2>
        <p class="page-sub">
          Acceso completo a herramientas, encuentros en vivo y funciones ilimitadas.
        </p>
      </div>

      <div
        v-if="!loading"
        class="status-pill"
        :class="{ 'status-pill--active': isPremium }"
      >
        <span class="status-dot" :class="{ 'status-dot--active': isPremium }"></span>
        <span class="status-text">
          {{ isPremium ? 'Plan Premium activo' : 'Plan inactivo' }}
        </span>
      </div>
    </header>

    <section v-if="loading" class="state card">
      Cargando tu acceso…
    </section>

    <section v-else-if="!isPremium" class="card locked">
      <h3>Tu plan actual no incluye esta sección</h3>
      <p class="muted">
        Para acceder al área Premium necesitás activar el plan. Podés comparar planes y
        elegir el que mejor se adapte a vos.
      </p>

      <div class="actions">
        <button class="btn-primary" type="button" @click="goPlans">
          Ver planes y beneficios
        </button>
        <button class="btn-secondary" type="button" @click="router.push('/app/perfil')">
          Volver al perfil
        </button>
      </div>
    </section>

    <section v-else class="content">
      <!-- HERO -->
      <section class="card hero">
        <div class="hero-main">
          <p class="kicker">Bienvenido, {{ userName }}</p>
          <h3>Tu espacio Premium en Nura</h3>
          <p class="muted">
            Desde acá vas a poder acceder a experiencias en vivo, herramientas ilimitadas
            y atajos directos a las secciones más usadas.
          </p>
        </div>

        <div class="hero-aside">
          <div class="hero-badge">
            <p class="badge-title">Plan Premium</p>
            <p class="badge-sub">Acceso activo</p>
          </div>
        </div>
      </section>

    

      <!-- BENEFICIOS (formal) -->
      <section class="features-grid">
        <article class="card feature">
          <h4>Herramientas ilimitadas</h4>
          <p class="muted">
            Acceso completo a las funciones de Nura para sostener hábitos y seguimiento.
          </p>
          <ul class="bullets">
            <li>Foro: Crear publicaciones + comentar sin límites.</li>
            <li>Diario: Entradas ilimitadas.</li>
            <li>Chatbot: Usos ilimitados.</li>
          </ul>
        </article>

        <article class="card feature">
          <h4>Encuentros en vivo</h4>
          <p class="muted">
            Espacios guiados por profesionales para trabajar herramientas prácticas.
          </p>
          <ul class="bullets">
            <li>Videollamadas grupales semanales.</li>
            <li>Talleres exclusivos en vivo.</li>
            <li>Material y consignas para aplicar durante la semana.</li>
          </ul>
        </article>
      </section>



        <!-- ACCESOS RÁPIDOS (cards con explicación) -->
      <section class="card">
        <div class="section-head">
          <div>
            <h3 class="section-title">Accesos rápidos</h3>
            <p class="section-sub">
              Entrá directo a las herramientas y funciones principales.
            </p>
          </div>
        </div>

        <div class="quick-grid">
          <article class="quick-card">
            <p class="quick-name">Foro</p>
            <p class="quick-desc">
              Participá en la comunidad: creá publicaciones, comentá y compartí experiencias.
            </p>
            <button class="btn-primary small" type="button" @click="goForo">
              Abrir Foro
            </button>
          </article>

          <article class="quick-card">
            <p class="quick-name">Diario</p>
            <p class="quick-desc">
              Registrá tu día y tus emociones. Entradas ilimitadas con tu plan Premium.
            </p>
            <button class="btn-primary small" type="button" @click="goDiario">
              Escribir en el Diario
            </button>
          </article>

          <article class="quick-card">
            <p class="quick-name">Chatbot</p>
            <p class="quick-desc">
              Orientación y apoyo guiado. Usos ilimitados para acompañarte cuando lo necesites.
            </p>
            <button class="btn-primary small" type="button" @click="goChatbot">
              Abrir Chat de ayuda
            </button>
          </article>

          <article class="quick-card">
            <p class="quick-name">Agenda</p>
            <p class="quick-desc">
              Consultá próximos eventos y reservá tu lugar en sesiones grupales y talleres.
            </p>
            <button class="btn-primary small" type="button" @click="goAgenda">
              Ver Agenda
            </button>
          </article>
        </div>
      </section>


      <!-- PRÓXIMOS ENCUENTROS -->
      <section class="card sessions">
        <div class="section-head row-between">
          <div>
            <h3 class="section-title">Próximos encuentros</h3>
            <p class="section-sub">
              Reservá tu lugar en los encuentros incluidos en tu plan.
            </p>
          </div>

          <button class="btn-secondary" type="button" @click="goAgenda">
            Ver agenda completa
          </button>
        </div>

        <ul class="sessions-list">
          <li v-for="s in weeklySessions" :key="s.id" class="session-item">
            <div class="session-main">
              <p class="session-type">{{ s.type }}</p>
              <p class="session-title">{{ s.title }}</p>
              <p class="session-meta">{{ s.day }} · {{ s.time }} · {{ s.modality }}</p>
            </div>

            <button class="btn-primary small" type="button" @click="goAgenda">
              Reservar lugar
            </button>
          </li>
        </ul>
      </section>
    </section>
  </main>
</template>

<style scoped>
.page {
  background: #ffffff;
  padding: 24px 18px 48px;
  max-width: 1100px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 18px;
}

.head-left h2 {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 750;
  color: #50bdbd;
}

.page-sub {
  margin: 6px 0 0;
  font-size: 0.92rem;
  color: #4b5563;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  border: 1.5px solid #e2e8f0;
  padding: 7px 12px;
  background: #ffffff;
  font-size: 0.84rem;
  color: #6b7280;
}

.status-pill--active {
  border-color: #50bdbd;
  background: #e0faf7;
  color: #0f766e;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #9ca3af;
}

.status-dot--active {
  background: #22c55e;
}

.status-text {
  font-weight: 700;
}

/* Cards */
.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 16px 18px;
  border: 1px solid #e2edf7;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
}

.state {
  color: #6b7280;
  font-size: 0.95rem;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  background: linear-gradient(135deg, #e3f6fb, #f0f9ff);
}

.kicker {
  margin: 0 0 6px;
  font-weight: 700;
  color: #0f766e;
  font-size: 0.92rem;
}

.hero h3 {
  margin: 0 0 6px;
  color: #0f172a;
  font-size: 1.35rem;
}

.muted {
  margin: 0;
  color: #4b5563;
  font-size: 0.95rem;
  line-height: 1.45;
}

.hero-aside {
  min-width: 180px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}

.hero-badge {
  width: 100%;
  border-radius: 16px;
  border: 1px solid #b6ebe5;
  background: #ffffff;
  padding: 12px 12px;
}

.badge-title {
  margin: 0;
  font-weight: 800;
  color: #0f172a;
}

.badge-sub {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: #0f766e;
  font-weight: 700;
}

/* Headings */
.section-head {
  margin-bottom: 12px;
}
.section-title {
  margin: 0;
  font-size: 1.12rem;
  color: #0f172a;
  font-weight: 800;
}
.section-sub {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}
.row-between {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

/* Quick cards */
.quick-grid {
  display: grid;
  gap: 12px;
}
@media (min-width: 900px) {
  .quick-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.quick-card {
  border: 1px solid #e2edf7;
  border-radius: 16px;
  padding: 14px 14px 12px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 160px;
}
.quick-name {
  margin: 0;
  font-weight: 900;
  color: #0f172a;
}
.quick-desc {
  margin: 0;
  color: #4b5563;
  font-size: 0.9rem;
  line-height: 1.35;
}

/* Features */
.features-grid {
  display: grid;
  gap: 12px;
}
@media (min-width: 900px) {
  .features-grid {
    grid-template-columns: 1fr 1fr;
  }
}
.feature h4 {
  margin: 0 0 6px;
  color: #0f172a;
  font-weight: 900;
}
.bullets {
  margin: 10px 0 0;
  padding-left: 18px;
  color: #334155;
  font-size: 0.92rem;
}
.bullets li {
  margin-bottom: 6px;
}
.bullets li::marker {
  content: '✓ ';
  color: #50bdbd;
  font-weight: 900;
}

/* Sessions */
.sessions-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}
.session-main {
  flex: 1;
  min-width: 0;
}
.session-type {
  margin: 0 0 2px;
  font-size: 0.78rem;
  font-weight: 900;
  color: #0f766e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.session-title {
  margin: 0 0 2px;
  font-size: 0.98rem;
  font-weight: 800;
  color: #111827;
}
.session-meta {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
}

/* Buttons */
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.btn-primary,
.btn-secondary {
  border-radius: 999px;
  border: none;
  font-size: 0.95rem;
  font-weight: 750;
  cursor: pointer;
  padding: 9px 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
  text-decoration: none;
}

.btn-primary {
  background: #50bdbd;
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.32);
}
.btn-primary:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.38);
}

.btn-secondary {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
  box-shadow: 0 4px 12px rgba(148, 163, 184, 0.22);
}
.btn-secondary:hover {
  background: #e0faf7;
  transform: translateY(-1px);
}

.small {
  padding: 8px 12px;
  font-size: 0.9rem;
}

/* Locked */
.locked h3 {
  margin: 0 0 8px;
  color: #0f172a;
  font-weight: 900;
}

@media (max-width: 720px) {
  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }
  .hero {
    flex-direction: column;
  }
  .hero-aside {
    width: 100%;
    justify-content: flex-start;
  }
  .row-between {
    flex-direction: column;
    align-items: flex-start;
  }
  .session-item {
    flex-direction: column;
    align-items: flex-start;
  }
  .session-item .btn-primary {
    width: 100%;
  }
}
</style>

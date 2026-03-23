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
    modality: 'Online por Zoom'
  },
  {
    id: 'sesion-2',
    title: 'Herramientas para gestionar la ansiedad',
    type: 'Taller exclusivo',
    day: 'Jueves',
    time: '18:30 hs',
    modality: 'Online por Zoom'
  },
  {
    id: 'sesion-3',
    title: 'Movimiento suave y relajación',
    type: 'Videollamada grupal',
    day: 'Domingo',
    time: '11:00 hs',
    modality: 'Online por Zoom'
  }
])

const userName = computed(() => {
  const metaName = (auth.user?.user_metadata as any)?.name
  if (metaName) return metaName.split(' ')[0]
  const email = auth.user?.email ?? 'usuario'
  return email.split('@')[0]
})

onMounted(async () => {
  loading.value = true

  if (auth.user) {
    const { data, error } = await supabase
      .from('profiles')
      .select('premium')
      .eq('id', auth.user.id)
      .maybeSingle()

    if (!error && data?.premium) {
      isPremium.value = true
      localStorage.setItem('nura_is_premium', 'true')
      loading.value = false
      return
    }
  }

  isPremium.value = localStorage.getItem('nura_is_premium') === 'true'
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
function goPerfil() {
  router.push('/app/perfil')
}
</script>

<template>
  <h1 class="visually-hidden">Área Premium</h1>

  <main class="page">
    <header class="page-head">
      <div class="head-left">
        <p class="kicker">Premium</p>
        <h2 class="page-title">Área Premium</h2>
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

    <section v-if="loading" class="card state" aria-live="polite">
      <p>Cargando tu acceso…</p>
    </section>

    <section v-else-if="!isPremium" class="card locked" aria-labelledby="locked-title">
      <h2 id="locked-title" class="section-title">
        Tu plan actual no incluye esta sección
      </h2>

      <p class="muted">
        Para acceder al área Premium necesitás activar el plan. Podés comparar planes y
        elegir el que mejor se adapte a vos.
      </p>

      <div class="actions">
        <button class="btn btn-primary" type="button" @click="goPlans">
          Ver planes y beneficios
        </button>
        <button class="btn btn-soft" type="button" @click="goPerfil">
          Volver al perfil
        </button>
      </div>
    </section>

    <section v-else class="content">
      <section class="card hero" aria-labelledby="hero-title">
        <div class="hero-main">
          <p class="kicker kicker-hero">Bienvenida, {{ userName }}</p>
          <h2 id="hero-title" class="hero-title">Tu espacio Premium en Nura</h2>
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

      <section class="features-grid" aria-label="Beneficios premium">
        <article class="card feature">
          <h2 class="section-title">Herramientas ilimitadas</h2>
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
          <h2 class="section-title">Encuentros en vivo</h2>
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

      <section class="card" aria-labelledby="quick-access-title">
        <div class="section-head">
          <div>
            <h2 id="quick-access-title" class="section-title">Accesos rápidos</h2>
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
            <button class="btn btn-primary small" type="button" @click="goForo">
              Abrir Foro
            </button>
          </article>

          <article class="quick-card">
            <p class="quick-name">Diario</p>
            <p class="quick-desc">
              Registrá tu día y tus emociones. Entradas ilimitadas con tu plan Premium.
            </p>
            <button class="btn btn-primary small" type="button" @click="goDiario">
              Escribir en el Diario
            </button>
          </article>

          <article class="quick-card">
            <p class="quick-name">Chatbot</p>
            <p class="quick-desc">
              Orientación y apoyo guiado. Usos ilimitados para acompañarte cuando lo necesites.
            </p>
            <button class="btn btn-primary small" type="button" @click="goChatbot">
              Abrir Chat de ayuda
            </button>
          </article>

          <article class="quick-card">
            <p class="quick-name">Agenda</p>
            <p class="quick-desc">
              Consultá próximos eventos y reservá tu lugar en sesiones grupales y talleres.
            </p>
            <button class="btn btn-primary small" type="button" @click="goAgenda">
              Ver Agenda
            </button>
          </article>
        </div>
      </section>

      <section class="card sessions" aria-labelledby="sessions-title">
        <div class="section-head row-between">
          <div>
            <h2 id="sessions-title" class="section-title">Próximos encuentros</h2>
            <p class="section-sub">
              Reservá tu lugar en los encuentros incluidos en tu plan.
            </p>
          </div>

          <button class="btn btn-soft" type="button" @click="goAgenda">
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

            <button class="btn btn-primary small" type="button" @click="goAgenda">
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
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 18px;
}

.kicker {
  margin: 0 0 6px;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 800;
}

.kicker-hero {
  color: #0f766e;
  font-size: 0.92rem;
  letter-spacing: normal;
  text-transform: none;
}

.page-title {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 850;
  color: #50bdbd;
}

.page-sub {
  margin: 6px 0 0;
  font-size: 0.95rem;
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
  box-shadow: 0 0 0 2px #bbf7d0;
}

.status-text {
  font-weight: 700;
}

.card {
  width: 100%;
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 18px;
  padding: 18px 18px 16px;
  border: 1px solid #e2edf7;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
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

.state p {
  margin: 0;
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

.hero-title {
  margin: 0 0 6px;
  color: #0f172a;
  font-size: 1.35rem;
  font-weight: 850;
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
  padding: 12px;
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

.section-head {
  margin-bottom: 12px;
}

.section-title {
  margin: 0;
  font-size: 1.12rem;
  color: #50bdbd;
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
  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

@media (hover: hover) {
  .quick-card:hover {
    transform: translateY(-3px);
    border-color: #9be9e0;
    background: rgba(155, 233, 224, 0.14);
    box-shadow: 0 16px 34px rgba(80, 189, 189, 0.14);
  }
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

.features-grid {
  display: grid;
  gap: 12px;
}

@media (min-width: 900px) {
  .features-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.feature {
  min-height: 100%;
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
  padding: 12px;
  border-radius: 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

@media (hover: hover) {
  .session-item:hover {
    background: #eefafa;
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(80, 189, 189, 0.12);
    border-color: #d7f1ef;
  }
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

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.btn {
  border-radius: 999px;
  border: none;
  font-size: 0.95rem;
  font-weight: 750;
  cursor: pointer;
  padding: 10px 16px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.18s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
  text-decoration: none;
  box-sizing: border-box;
}

.btn-primary {
  background: #50bdbd;
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.22);
}

@media (hover: hover) {
  .btn-primary:hover:not(:disabled) {
    background: #3ea9a9;
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(80, 189, 189, 0.3);
  }
}

.btn-soft {
  background: #ffffff;
  color: #50bdbd;
  border: 1px solid #b6ebe5;
  box-shadow: 0 4px 12px rgba(148, 163, 184, 0.16);
}

@media (hover: hover) {
  .btn-soft:hover:not(:disabled) {
    background: #e0faf7;
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(80, 189, 189, 0.12);
  }
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.small {
  padding: 8px 12px;
  font-size: 0.9rem;
  min-height: 40px;
}

.locked .section-title {
  margin-bottom: 8px;
}

.visually-hidden {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

@media (max-width: 720px) {
  .page {
    padding: 16px 12px 96px;
  }

  .page-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .page-title {
    font-size: 1.4rem;
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

  .session-item .btn,
  .actions .btn,
  .row-between .btn {
    width: 100%;
  }

  .card {
    padding: 16px 14px;
  }
}
</style>
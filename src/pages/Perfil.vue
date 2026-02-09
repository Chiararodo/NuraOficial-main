<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

type Mood = 'triste' | 'normal' | 'bien' | 'muybien'

const router = useRouter()
const auth = useAuthStore()

/* ===== PERFIL + PREMIUM EN SUPABASE ===== */

const profile = ref<{
  id: string
  name?: string | null
  avatar_url?: string | null
  premium?: boolean | null
  created_at?: string
} | null>(null)

const user = ref<any>(null)

/* nombre mostrado */
const profileName = computed(() => {
  const nameFromProfile = profile.value?.name
  if (nameFromProfile && nameFromProfile.trim()) return nameFromProfile

  const metaName = (auth.user?.user_metadata as any)?.name
  if (metaName && metaName.trim()) return metaName

  return (auth.user?.email || 'Usuario').split('@')[0]
})

const userEmail = computed(() => auth.user?.email ?? '')

/* path del avatar (guardado en user_metadata / profiles) */
const avatarPath = computed<string | null>(() => {
  const meta = (auth.user?.user_metadata as any) || {}
  const fromProfile = profile.value?.avatar_url as string | null | undefined
  const fromMeta = meta.avatar_url as string | null | undefined
  return fromProfile || fromMeta || null
})

/* URL que se muestra en <img>, puede ser signed URL o placeholder */
const avatarUrl = ref<string>('')

function buildPlaceholder() {
  const base = profileName.value || auth.user?.email || 'U'
  const first = base.trim()[0]?.toUpperCase() || 'U'
  return `https://placehold.co/120x120/50bdbd/FFFFFF?text=${first}&font=Montserrat`
}

/* resolver signed URL si hay path, si no usar placeholder */
async function resolveAvatarUrl() {
  const path = avatarPath.value
  if (!path) {
    avatarUrl.value = buildPlaceholder()
    return
  }

  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 días

  if (error || !data?.signedUrl) {
    console.error('Error creando signed URL de avatar:', error)
    avatarUrl.value = buildPlaceholder()
    return
  }

  avatarUrl.value = data.signedUrl
}


const memberSince = computed(() => {
  const iso = auth.user?.created_at
  if (!iso) return ''
  return `Usuario desde ${new Date(iso).getFullYear()}`
})

const isPremiumLS = computed(
  () => localStorage.getItem('nura_is_premium') === 'true',
)

/* carga perfil desde tabla profiles */
async function loadProfile() {
  if (!auth.user) return

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (error) {
    console.error('Error cargando perfil:', error)
  }

  if (!data) {
    const fallback = {
      id: auth.user.id as string,
      name:
        (auth.user.user_metadata as any)?.name ??
        auth.user.email?.split('@')[0] ??
        'Usuario',
      avatar_url: null,
      premium: false,
      created_at: auth.user.created_at as string,
    }
    profile.value = fallback
    user.value = fallback
    return
  }

  profile.value = {
    ...data,
    name:
      (auth.user.user_metadata as any)?.name ??
      auth.user.email?.split('@')[0] ??
      'Usuario',
  }
  user.value = profile.value
}

/* ========================= MEDICACIONES ========================= */

const meds = ref<any[]>([])
const loadingMeds = ref(true)

async function loadMeds() {
  if (!auth.user) {
    loadingMeds.value = false
    return
  }

  const { data, error } = await supabase
    .from('medications')
    .select('id, name, dose')
    .eq('user_id', auth.user.id)

  if (!error && data) {
    meds.value = data
  }

  loadingMeds.value = false
}

function goMeds() {
  router.push('/app/medicaciones')
}

/* =================== ESTADOS DE ÁNIMO + DIARIO =================== */

const moodsHistory = ref<{ date: string; mood: Mood }[]>([])
const diaryPreview = ref<{ date: string; mood: Mood; snippet: string }[]>([])

function loadLocalData() {
  if (!auth.user) return

  const moodsKey = `nura_moods_${auth.user.id}`
  const storedMoods = JSON.parse(localStorage.getItem(moodsKey) || '{}') as Record<
    string,
    Mood
  >

  const today = new Date()
  const sevenDaysAgoDate = new Date()
  sevenDaysAgoDate.setDate(today.getDate() - 6)

  const todayStr = today.toISOString().slice(0, 10)
  const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().slice(0, 10)

  moodsHistory.value = Object.entries(storedMoods)
    .filter(([dateStr]) => dateStr >= sevenDaysAgoStr && dateStr <= todayStr)
    .map(([date, mood]) => ({ date, mood }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
}

const recentMoods = computed(() => {
  if (!auth.user) return []

  const key = `nura_moods_${auth.user.id}`
  const stored = JSON.parse(localStorage.getItem(key) || '{}')
  const entries = Object.entries(stored) as [string, Mood][]

  const sorted = entries.sort(
    (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
  )

  return sorted.slice(0, 3)
})

function setMood(mood: Mood) {
  const today = new Date().toISOString().slice(0, 10)
  if (auth.user) {
    const key = `nura_moods_${auth.user.id}`
    const stored = JSON.parse(localStorage.getItem(key) || '{}') as Record<
      string,
      Mood
    >
    stored[today] = mood
    localStorage.setItem(key, JSON.stringify(stored))
  }

  router.push({
    name: 'mood-success',
    query: { mood, date: today },
  })
}

function goDiaryList() {
  router.push('/app/diario/entradas')
}

function escribirDiario() {
  router.push('/app/diario')
}

/* ============================ LOGOUT ============================ */

const showLogoutModal = ref(false)
const loggingOut = ref(false)

function openLogoutModal() {
  showLogoutModal.value = true
}

function closeLogoutModal() {
  if (!loggingOut.value) showLogoutModal.value = false
}

async function confirmLogout() {
  loggingOut.value = true
  await supabase.auth.signOut()
  auth.$reset?.()
  router.replace('/login')
}

/* ============================ MOUNT ============================= */

onMounted(() => {
  loadProfile()
  loadLocalData()
  setTimeout(loadMeds, 150)
  resolveAvatarUrl()
})

watch(avatarPath, () => {
  resolveAvatarUrl()
})
</script>

<template>
<h1 class="visually-hidden">Perfil </h1>

  <main class="contenido">
    <header class="page-head">
      <h2>Perfil</h2>
    </header>


    <div class="grid">
      <!-- IZQUIERDA -->
      <section class="col">
        <!-- PERFIL -->
        <div class="card profile-head">
          <div class="avatar-container">
            <img :src="avatarUrl" class="avatar-img" />
          </div>

          <div class="who">
            <h1 class="name">{{ profileName }}</h1>
            <p class="email">{{ userEmail }}</p>
            <p class="since">{{ memberSince }}</p>

            <button class="btn-edit "
             @click="router.push('/app/perfil/editar')">
              Editar
            </button>
          </div>
        </div>

<!-- PLAN -->
<div class="card premium-box">
  <template v-if="user">
    <div class="premium-head-row">
      <h3>{{ (user.premium === true || isPremiumLS) ? 'Plan Premium' : 'Plan Gratuito' }}</h3>

      <span
        class="premium-pill"
        :class="{ 'premium-pill--free': !(user.premium === true || isPremiumLS) }"
      >
        <span
          class="premium-dot"
          :class="{ 'premium-dot--free': !(user.premium === true || isPremiumLS) }"
        ></span>
        {{ (user.premium === true || isPremiumLS) ? 'Plan activo' : 'Plan actual' }}
      </span>
    </div>

    <p class="muted" v-if="!(user.premium === true || isPremiumLS)">
      Acceso esencial para empezar a usar Nura.
    </p>

    <ul class="plan-limits" v-if="!(user.premium === true || isPremiumLS)">
      <li><strong>Foro:</strong> podés comentar, pero no crear publicaciones.</li>
      <li><strong>Diario:</strong> hasta <strong>10 entradas por mes</strong>.</li>
      <li><strong>Chatbot:</strong> hasta <strong>5 usos por mes</strong>.</li>
    </ul>

    <p class="muted" v-else>
      Tenés acceso ilimitado al Foro, Diario y Chatbot, además de beneficios exclusivos.
    </p>

    <RouterLink :to="{ name: 'premium' }" class="foro-btn premium-link">
      {{ (user.premium === true || isPremiumLS) ? 'Ver detalles del plan' : 'Ver planes y beneficios' }}
    </RouterLink>
  </template>

  <template v-else>
    <p class="muted small">Cargando plan...</p>
  </template>
</div>



        <!-- ÚLTIMOS ESTADOS DE ÁNIMO -->
        <div class="card">
          <h3 class="card-title">Últimos estados de ánimo</h3>

          <p v-if="recentMoods.length === 0">
            Todavía no registraste tu estado esta semana.
          </p>

          <ul v-else class="mood-history">
            <li v-for="(item, i) in recentMoods" :key="i">
              <span class="date">{{ item[0] }}</span>
              <span class="tag tag--mood">{{ item[1] }}</span>
            </li>
          </ul>
        </div>

        <!-- MEDICACIONES -->
        <div class="card meds-preview">
          <h3 class="card-title">Medicaciones</h3>

          <p v-if="loadingMeds">Cargando medicaciones…</p>

          <p v-else-if="meds.length === 0">
            No tenés medicaciones cargadas.
          </p>

          <ul v-else class="moods-list">
            <li v-for="m in meds" :key="m.id">
              {{ m.name }} — {{ m.dose }} 
            </li>
          </ul>

          <button class="btn" @click="goMeds">
            Mis medicaciones
          </button>
        </div>

        <!-- DIARIO -->
        <div class="card">
          <h3>Mi Diario</h3>

          <ul v-if="diaryPreview.length" class="diary-list">
            <li v-for="d in diaryPreview" :key="d.date">
              <span class="date">{{ d.date }}</span>
              <span class="mood-pill">{{ d.mood }}</span>
              <span class="snippet">{{ d.snippet }}</span>
            </li>
          </ul>

          <p v-else class="muted small"></p>

          <div class="row between">
            <button class="btn-ghost" @click="goDiaryList">
              Ver todas mis entradas
            </button>
            <button class="btn" @click="escribirDiario">Escribir hoy</button>
          </div>
        </div>
      </section>

      <!-- DERECHA -->
      <section class="col">
          <!-- TÍTULO AJUSTES -->
        <div class="card aside-card">
          <h3 class="aside-title">Ajustes</h3>
          <p class="aside-subtitle">
            Configurá cómo querés usar Nura.
          </p>
        </div>

        <div class="card">
          <h3>Notificaciones</h3>
          <p class="muted">Elegí qué alertas recibir.</p>
          <div class="row end">
            <button class="btn" @click="router.push('/app/notificaciones')">
              Editar
            </button>
          </div>
        </div>

        <div class="card">
          <h3>Privacidad</h3>
          <p class="muted">Cómo cuidamos tu información.</p>
          <div class="row end">
            <button class="btn" @click="router.push('/app/privacidad')">
              Leer
            </button>
          </div>
        </div>

        <div class="card">
          <h3>Idioma</h3>
          <p class="muted">Disponible sólo en castellano.</p>
          <div class="row end">
            <button class="btn" @click="router.push('/app/idioma')">
              Editar
            </button>
          </div>
        </div>

        <div class="card">
          <h3>Chat de ayuda</h3>
          <p class="muted">Hablá con Nuri cuando quieras.</p>
          <div class="row end">
            <button class="btn" @click="router.push('/app/chatbot')">
              Abrir chat
            </button>
          </div>
        </div>

        <div class="card">
          <h3>Cuenta</h3>
          <div class="row end">
            <button class="btn btn-danger" @click="openLogoutModal">
              Cerrar sesión
            </button>
          </div>
        </div>
      </section>
    </div>

    <!-- MODAL LOGOUT -->
    <div
      v-if="showLogoutModal"
      class="modal-backdrop"
      @click.self="closeLogoutModal"
    >
      <div class="modal-card">
        <h3>¿Cerrar sesión?</h3>
        <p>Podés volver a iniciar sesión cuando quieras.</p>

        <div class="modal-actions">
          <button class="btn-secondary" @click="closeLogoutModal">
            Cancelar
          </button>
          <button class="btn btn-danger" @click="confirmLogout">
            {{ loggingOut ? 'Cerrando…' : 'Cerrar sesión' }}
          </button>
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
  gap: 15px;
  margin-bottom: 12px;
}
h2 {
  margin: 0;
  padding: 10px;
}

.back-btn {
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  border-radius: 8px;
}
.arrow-left {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-left: 3px solid #50bdbd;
  border-bottom: 3px solid #50bdbd;
  transform: rotate(45deg);
}

/* grid */
.grid {
  display: grid;
  gap: 22px;
  max-width: 1100px;
  margin: 0 auto;
}
@media (min-width: 980px) {
  .grid {
    grid-template-columns: 1.15fr 0.85fr;
  }
}
.col {
  display: grid;
  gap: 18px;
}

/* card genérica */
.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: 0 38px 58px rgba(0, 0, 0, 0.32);
}

.card:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
}


/* perfil */
.profile-head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.avatar-container {
  width: 70px;
  height: 70px;
  border-radius: 999px;
  overflow: hidden;
  background: #d8f0ec;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.name {
  font-size: 1.25rem;
  margin: 0;
}
.email {
  font-size: 0.95rem;
  color: #4b5563;
}
.since {
  font-size: 0.85rem;
  color: #6b7280;
}

/* botones */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #50bdbd;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  width: 50%;
  text-decoration: none;
  box-shadow: 0 3px 10px rgba(80, 189, 189, 0.25);
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
}
.btn:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
}


.btn-edit{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #50bdbd;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  text-decoration: none;
  box-shadow: 0 3px 10px rgba(80, 189, 189, 0.25);
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
}
.btn-edit:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
}


.btn-danger {
  background: #ef5350;
  box-shadow: 0 3px 10px rgba(239, 83, 80, 0.3);
   font-size: 0.95rem;
  font-weight: 600;
}
.btn-danger:hover {
  background: #e53935;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #e3ecf6;
  color: #1f2937;
  border: none;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  width: 50%;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #50bdbd;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 7px 14px;
   font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  width: 50%;
  text-decoration: none;
  box-shadow: 0 3px 10px rgba(80, 189, 189, 0.25);
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
}
.btn-ghost:hover {
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
}

/* premium */
.premium-box {
  background: #ffffff;
  border-radius: 18px;
  padding: 16px 18px;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.32);
}

.plan-limits {
  margin: 10px 0 14px;
  padding-left: 18px;
  color: #334155;
  font-size: 0.92rem;
}
.plan-limits li {
  margin-bottom: 6px;
}

.premium-pill--free {
  border-color: #cbd5e1;
  background: #f1f5f9;
  color: #475569;
}
.premium-dot--free {
  background: #94a3b8;
  box-shadow: none;
}


.muted-list {
  margin: 8px 0 12px;
  padding-left: 18px;
  color: #4b5563;
  font-size: 0.9rem;
}
.muted-list li {
  margin-bottom: 6px;
}

.premium-box:hover {
  transform: translateY(-1px);
  box-shadow: 0 5px 14px rgba(80, 189, 189, 0.35);
}
.premium-head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.premium-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1.5px solid #50bdbd;
  background: #e0faf7;
  font-size: 0.8rem;
  font-weight: 600;
  color: #0f766e;
  white-space: nowrap;
}

.premium-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 2px #bbf7d0;
}


.foro-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #50bdbd;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  width: 50%;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(80, 189, 189, 0.3);
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
}
.foro-btn:hover {
  background: #3ea9a9;
}

/* meds */
.meds-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* mood history */
.mood-history {
  display: grid;
  gap: 8px;
  margin-top: 6px;
  padding: 0;
  list-style: none;
}
.mood-history li {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mood-history .date {
  font-weight: 450;
  color: #222;
}
.tag--mood {
  background: #50bdbd;
  color: white;
  padding: 4px 10px;
  font-size: 0.75rem;
  border-radius: 999px;
  text-transform: capitalize;
}

 /* card título ajustes (sin hover de botón) */
.aside-card {
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.07);
  padding: 16px 18px 18px;
  border: 0.3px solid #50bdbd;
}
.aside-card:hover {
  transform: none;
  box-shadow: none;
}

.aside-title {
  margin: 0 0 4px;
  font-size: 1.2rem;
  font-weight: 700;
  color: #50bdbd;
}

.aside-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #4b5563 ;
}

/* modal logout */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 40;
}
.modal-card {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}
</style>

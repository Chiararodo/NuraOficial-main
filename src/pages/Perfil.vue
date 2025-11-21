<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

const router = useRouter()
const auth = useAuthStore()

/* ============================
   DATOS DEL USUARIO
============================ */
const profileName = computed(() => {
  const name = (auth.user?.user_metadata as any)?.name
  if (name && name.trim() !== '') return name
  const email = auth.user?.email ?? 'Usuario'
  return email.split('@')[0]
})

const userEmail = computed(() => auth.user?.email ?? 'Sin email registrado')

const avatarUrl = computed(() =>
  (auth.user?.user_metadata as any)?.avatar_url || '/icons/default-avatar.png'
)

const memberSince = computed(() => {
  const iso = auth.user?.created_at
  if (!iso) return `Usuario desde ${new Date().getFullYear()}`
  return `Usuario desde ${new Date(iso).getFullYear()}`
})

/* ============================
   ESTADOS DE ÁNIMO
============================ */
const moodsHistory = ref<{ date: string; mood: string }[]>([])

onMounted(() => {
  const stored = JSON.parse(localStorage.getItem("nura_moods") || "{}")
  moodsHistory.value = Object.entries(stored)
    .map(([date, mood]) => ({ date, mood }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
})

/* ============================
   TURNOS
============================ */
const hasTurnos = ref(false)

onMounted(() => {
  // Simulación → después lo conectamos a supabase si querés
  hasTurnos.value = false
})

const showNoTurnosModal = ref(false)

/* ============================
   NAVEGACIÓN / ACCIONES
============================ */
function goEditarPerfil() {
  router.push('/app/perfil/editar')
}

function goNotificaciones() {
  router.push('/app/notificaciones')
}

function goChatbot() {
  router.push('/app/chatbot')
}

function goContenido() {
  router.push('/app/contenido')
}

function goPremium() {
  router.push('/app/premium')
}

function editarMedicacion() {
  router.push('/app/medicaciones')
}

function verEstados() {
  router.push('/app/estados')
}

function verTurnos() {
  if (!hasTurnos.value) {
    showNoTurnosModal.value = true
    return
  }
  router.push('/app/turnos')
}

function goDiaryList() {
  router.push('/app/diario/entradas')
}

function escribirDiario() {
  router.push('/app/diario')
}

function editarPrivacidad() {
  router.push('/app/privacidad')
}

function editarIdioma() {
  router.push('/app/idioma')
}

/* ============================
   LOGOUT MODAL
============================ */
const showLogoutModal = ref(false)
const loggingOut = ref(false)

function openLogoutModal() {
  showLogoutModal.value = true
}

function closeLogoutModal() {
  if (!loggingOut.value) showLogoutModal.value = false
}

async function confirmLogout() {
  if (loggingOut.value) return
  loggingOut.value = true

  const { error } = await supabase.auth.signOut()

  if (error) {
    alert("No se pudo cerrar sesión.")
    loggingOut.value = false
    return
  }

  try { auth.$reset?.() } catch {}

  showLogoutModal.value = false
  loggingOut.value = false
  router.replace('/login')
}
</script>

<template>
  <main class="perfil-page">

  <button class="back-btn" @click="router.back()">
  <span class="arrow-left"></span>
</button>


    <div class="grid">
      
      <!-- IZQUIERDA -->
      <section class="col">

        <!-- PERFIL -->
        <div class="card profile-head">
          <div class="avatar-container">
            <img :src="avatarUrl" class="avatar-img" alt="" />
          </div>

          <div class="who">
            <h1 class="name">{{ profileName }}</h1>
            <p class="email">{{ userEmail }}</p>
            <p class="since">{{ memberSince }}</p>

            <button class="btn edit-btn" @click="goEditarPerfil">Editar perfil</button>
          </div>
        </div>

         <!-- PREMIUM -->
        <div class="card premium-box">
          <h3>Plan Premium</h3>
          <p class="muted">Accedé a sesiones grupales, audio-guías y contenido exclusivo.</p>
          <button class="btn premium-btn" @click="goPremium">Suscribirme</button>
        </div>

        <!-- ESTADOS DE ÁNIMO -->
        <div class="card">
          <h3>Últimos estados de ánimo</h3>

          <ul class="moods-list">
            <li v-for="m in moodsHistory" :key="m.date">
              <strong>{{ m.date }}</strong> — <span class="tag">{{ m.mood }}</span>
            </li>
          </ul>

          <p v-if="!moodsHistory.length">Todavía no registraste tu estado.</p>
        </div>

        <!-- TURNOS -->
        <div class="card">
          <h3 class="card-title">Mis turnos</h3>

          <template v-if="hasTurnos">
            <div class="row between">
              <p class="muted">Dra. Pérez – Miér 13:30 hs</p>
              <button class="btn" @click="verTurnos">Ver detalles</button>
            </div>
          </template>

          <template v-else>
            <p class="muted">No tenés turnos asignados.</p>
            <button class="btn" @click="verTurnos">Agendar uno</button>
          </template>
        </div>

        <!-- MEDICACIONES -->
        <div class="card">
          <h3 class="card-title">Medicaciones</h3>
          <p class="muted">Sertralina 50 mg — 8:30 y 20:00</p>
          <div class="row end">
            <button class="btn" @click="editarMedicacion">Editar</button>
          </div>
        </div>

        <!-- DIARIO -->
        <div class="card">
          <h3 class="card-title">Mi Diario</h3>
          <div class="row between">
            <button class="btn-ghost" @click="goDiaryList">Ver mis entradas</button>
            <button class="btn" @click="escribirDiario">Escribir</button>
          </div>
        </div>

       

      </section>

      <!-- DERECHA -->
      <section class="col">

        <div class="card">
          <h3 class="aside-title">Ajustes</h3>
        </div>

        <div class="card">
          <h4 class="card-title">Notificaciones</h4>
          <p class="muted">Elige qué tipo de alertas recibir.</p>
          <div class="row end">
            <button class="btn" @click="goNotificaciones">Editar</button>
          </div>
        </div>

        <div class="card">
          <h4 class="card-title">Privacidad</h4>
          <p class="muted">Cómo cuidamos tu información personal.</p>
          <div class="row end">
            <button class="btn" @click="editarPrivacidad">Editar</button>
          </div>
        </div>

        <div class="card">
          <h4 class="card-title">Idioma</h4>
          <p class="muted">Solo disponible en castellano por ahora.</p>
          <div class="row end">
            <button class="btn" @click="editarIdioma">Editar</button>
          </div>
        </div>

        <div class="card">
          <h4 class="card-title">Chat de ayuda</h4>
          <p class="muted">Hablá con Nuri cuando quieras.</p>
          <div class="row end">
            <button class="btn" @click="goChatbot">Abrir chat</button>
          </div>
        </div>

        <!-- CERRAR SESIÓN -->
        <div class="card">
          <h4 class="card-title">Cuenta</h4>
          <div class="row end">
            <button class="btn btn-danger" @click="openLogoutModal">Cerrar sesión</button>
          </div>
        </div>

      </section>
    </div>

    <!-- MODAL SIN TURNOS -->
    <div v-if="showNoTurnosModal" class="modal-backdrop" @click.self="showNoTurnosModal=false">
      <div class="modal-card">
        <h3>No tenés turnos</h3>
        <p class="modal-text">Podés reservar uno ahora desde la cartilla.</p>
        <div class="modal-actions">
          <button class="btn" @click="router.push('/app/cartilla')">Ir a Cartilla</button>
          <button class="btn-ghost" @click="showNoTurnosModal=false">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- MODAL LOGOUT -->
    <div v-if="showLogoutModal" class="modal-backdrop" @click.self="closeLogoutModal">
      <div class="modal-card">
        <h3 class="modal-title">¿Cerrar sesión?</h3>
        <p class="modal-text">Podés volver a iniciar sesión cuando quieras.</p>

        <div class="modal-actions">
          <button class="btn-secondary" @click="closeLogoutModal">Cancelar</button>
          <button class="btn btn-danger" @click="confirmLogout">
            {{ loggingOut ? 'Cerrando…' : 'Cerrar sesión' }}
          </button>
        </div>
      </div>
    </div>

  </main>
</template>

<style scoped>
/* --- BACK BUTTON --- */
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
  border-left: 3px solid white;
  border-bottom: 3px solid white;
  transform: rotate(45deg);
}


/* PAGE */
.perfil-page {
  background: #fff;
  padding: 18px 16px 32px;
}

/* GRID */
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

/* CARDS */
.card {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.07);
  border: 1px solid #eef2f7;
  padding: 16px 18px;
}

/* PERFIL HEAD */
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

/* LISTA ESTADOS */
.moods-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 6px;
}
.tag {
  background: #50bdbd;
  color: white;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.8rem;
}

/* BUTTONS */
.btn {
  background: #85b6e0;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 7px 14px;
  cursor: pointer;
}
.btn-danger {
  background: #ef5350;
}
.btn-ghost {
  background: #eef7ff;
  border: 1px solid #d6e6f4;
  color: #2c3e50;
  border-radius: 12px;
  padding: 6px 12px;
}
.btn-secondary {
  background: #e3ecf6;
  color: #1f2937;
  border-radius: 12px;
  padding: 7px 14px;
}

/* PREMIUM BOX */
.premium-box {
  background: #f0faf9;
  border: 1px solid #d4efec;
}
.premium-btn {
  background: #50bdbd;
}

/* MODALS */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
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
  box-shadow: 0 12px 30px rgba(0,0,0,0.25);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}
</style>

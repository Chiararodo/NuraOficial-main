<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { onMounted, computed, ref } from 'vue'
import InstallButton from './InstallButton.vue'
import { useNotificationsStore } from '@/store/notifications'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

const route = useRoute()
const router = useRouter()

const auth = useAuthStore()
const notifStore = useNotificationsStore()

// -------- Notificaciones --------
onMounted(() => {
  if (auth.user) {
    notifStore.refreshTodayCount()
    notifStore.initRealtime()
  }
})

const notifCount = computed(() => notifStore.count)

const isNotisActive = computed(() => route.path === '/app/notis')
const isChatActive = computed(() => route.path === '/app/chatbot')
const isPremiumActive = computed(() => route.name === 'premium-area')

function goToNotifications() {
  router.push('/app/notis')
}

function goToChatbot() {
  router.push('/app/chatbot')
}

function goToPremium() {
  router.push({ name: 'premium-area' })
}

// -------- Premium flag --------
const isPremium = ref(false)

onMounted(async () => {
  if (localStorage.getItem('nura_is_premium') === 'true') {
    isPremium.value = true
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
})
</script>

<template>
  <h1 class="visually-hidden">Header</h1>
  <header class="nura-header">
    <!-- Logo -->
    <RouterLink to="/app/home" class="logo-link">
      <img src="/logos/OFICIALwhite.png" alt="Nura" class="logo" />
    </RouterLink>

    <!-- Nav (solo desktop) -->
    <nav class="topnav desktop-only">
      <RouterLink to="/app/home">Inicio</RouterLink>
      <RouterLink to="/app/cartilla">Cartilla</RouterLink>
      <RouterLink to="/app/agendar">Agendar</RouterLink>
      <RouterLink to="/app/contenido">Contenido</RouterLink>
      <RouterLink to="/app/perfil">Perfil</RouterLink>
    </nav>

    <!-- Acciones derecha -->
    <div class="header-actions">
      <!-- Notificaciones -->
      <button
        class="icon-btn bell-wrapper"
        :class="{ 'icon-active': isNotisActive, 'has-new': notifCount > 0 }"
        type="button"
        title="Notificaciones"
        @click="goToNotifications"
      >
        <img src="/icons/notif.png" alt="Notificaciones" />
        <span v-if="notifCount > 0" class="notif-badge">
          {{ notifCount }}
        </span>
      </button>

      <!-- Chatbot -->
      <button
        class="icon-btn"
        :class="{ 'icon-active': isChatActive }"
        type="button"
        title="Chatbot"
        @click="goToChatbot"
      >
        <img src="/icons/chat.png" alt="Chatbot" />
      </button>

      <!-- Premium (solo si es premium) -->
      <button
        v-if="isPremium"
        class="icon-btn premium-btn"
        :class="{ 'icon-active': isPremiumActive }"
        type="button"
        title="Premium"
        @click="goToPremium"
      >
        <span class="premium-star">
          <svg viewBox="0 0 24 24" aria-hidden="true" class="premium-star-svg">
            <path
              d="M12 3.3l2.47 4.99 5.51.8-3.99 3.89.94 5.48L12 15.9l-4.93 2.6.94-5.48L4.02 9.1l5.51-.8L12 3.3z"
              fill="none"
              stroke="#ffffff"
              stroke-width="1.8"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>

    <!-- Botón instalar solo en desktop -->
    <div class="install-wrapper desktop-only">
      <InstallButton />
    </div>
  </header>
</template>

<style scoped>
.nura-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #46bdbd;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  min-height: 64px;
}

.logo-link {
  display: flex;
  align-items: center;
}

.logo {
  height: 38px;
  width: auto;
}

/* Nav desktop */
.topnav {
  display: flex;
  gap: 26px;
  font-weight: 500;
}

.topnav a {
  padding-bottom: 4px;
  border-bottom: 2px solid transparent;
  color: #fff;
  text-decoration: none;
  font-size: 1.05rem;
  font-weight: 550;
  letter-spacing: 0.3px;
}

.topnav a:hover {
  text-decoration: underline;
}

.topnav a.router-link-active,
.topnav a.router-link-exact-active {
  color: #633266;
  font-weight: 600;
  text-decoration: none;
}

/* Acciones */
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Botones de íconos */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  transition: transform 0.2s ease;
  position: relative;
}

.icon-btn img {
  width: 26px;
  height: 26px;
  filter: brightness(0) invert(1);
}

/* Badge de notificaciones */
.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 10px;
  height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  background: #50bdbd;
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1.5px #ffffffd0;
}

/* Icono activo */
.icon-active img {
  filter: brightness(0) invert(28%) sepia(14%) saturate(2476%)
    hue-rotate(276deg) brightness(94%) contrast(87%);
}
.icon-active {
  transform: scale(1.12);
  transition: transform 0.2s ease;
}

/* Animación cuando hay nuevas notificaciones */
.icon-btn.has-new {
  animation: nuraPulse 0.8s ease-out;
}

@keyframes nuraPulse {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.22);
  }
  70% {
    transform: scale(0.94);
  }
  100% {
    transform: scale(1);
  }
}

/* Install button */
.install-wrapper {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9999;
}

/* desktop-only */
.desktop-only {
  display: none !important;
}

@media (min-width: 900px) {
  .desktop-only {
    display: inline-flex !important;
  }
}

/* PREMIUM ICON */
.premium-btn {
  padding: 0;
}

.premium-star {
  width: 29px;
  height: 29px;
  border-radius: 999px;
  background: #50bdbd;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(80, 189, 189, 0.45);
}

.premium-star-svg {
  width: 30px;
  height: 30px;
}

/* glow cuando está activo */
.icon-active .premium-star {
  box-shadow: 0 0 0 3px #ffffff55, 0 10px 22px rgba(80, 189, 189, 0.6);
}
</style>

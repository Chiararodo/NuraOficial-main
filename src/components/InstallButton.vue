<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const canInstall = ref(false)
const showIOSHelp = ref(false)

function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true // iOS standalone
  )
}

function isIOSDevice() {
  const ua = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(ua)
  // iPadOS a veces se identifica como Mac; este fallback ayuda:
  const isIPadOS =
    navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1
  return isIOS || isIPadOS
}

function refreshVisibility() {
  const installed = isInstalled()
  const ios = isIOSDevice()

  // Si ya está instalada: no mostrar nada
  if (installed) {
    canInstall.value = false
    showIOSHelp.value = false
    return
  }

  // iOS: no hay beforeinstallprompt, así que mostramos ayuda
  if (ios) {
    canInstall.value = false
    showIOSHelp.value = true
    return
  }

  // Otros navegadores:
  // el botón real solo aparece cuando capturamos beforeinstallprompt
  // (igual lo dejamos en false hasta que llegue el evento)
  showIOSHelp.value = false
}

function onBeforeInstallPrompt(e: Event) {
  e.preventDefault()
  deferredPrompt.value = e as BeforeInstallPromptEvent

  // Mostrar botón SI NO está instalada (en cualquier dispositivo)
  canInstall.value = !isInstalled()
}

async function install() {
  if (!deferredPrompt.value) return
  await deferredPrompt.value.prompt()

  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    canInstall.value = false
    deferredPrompt.value = null
  }
}

function onAppInstalled() {
  canInstall.value = false
  showIOSHelp.value = false
  deferredPrompt.value = null
}

onMounted(() => {
  refreshVisibility()

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as any)
  window.addEventListener('appinstalled', onAppInstalled)

  // Por si cambia el display-mode / vuelve desde instalación, etc.
  window.addEventListener('resize', refreshVisibility)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as any)
  window.removeEventListener('appinstalled', onAppInstalled)
  window.removeEventListener('resize', refreshVisibility)
})
</script>

<template>
  <!-- Botón real (Chrome/Edge/Android, etc.) -->
  <button v-if="canInstall" class="install-btn" @click="install">
    Instalar
  </button>

  <!-- iOS (Safari): no se puede disparar instalación por JS -->
  <button v-else-if="showIOSHelp" class="install-btn" type="button">
    Agregar a inicio
  </button>
</template>

<style scoped>
.install-btn {
  background: #633266; /* violeta Nura */
  color: #ffffff;
  border: none;
  border-radius: 999px; /* súper redondo */
  padding: 10px 24px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;

  box-shadow: 0 10px 24px rgba(99, 50, 102, 0.35);
  transition:
    background-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

/* hover verde */
.install-btn:hover {
  background: #50bdbd; /* verde Nura */
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(80, 189, 189, 0.45);
}

.install-btn:active {
  transform: translateY(0);
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.3);
}
</style>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const deferredPrompt = ref<any>(null)
const canInstall = ref(false)

function checkInstalled() {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window as any).navigator.standalone === true // iOS
  return isStandalone
}

function onBeforeInstallPrompt(e: any) {
  e.preventDefault()
  deferredPrompt.value = e
  // Mostrar botón solo si NO está instalada y NO es mobile
  canInstall.value =
    !checkInstalled() && !/iphone|ipad|ipod|android/i.test(navigator.userAgent)
}

async function install() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    canInstall.value = false
    deferredPrompt.value = null
  }
}

function onAppInstalled() {
  canInstall.value = false
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
  canInstall.value =
    !checkInstalled() && !/iphone|ipad|ipod|android/i.test(navigator.userAgent)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.removeEventListener('appinstalled', onAppInstalled)
})
</script>

<template>
  <!-- este botón lo vamos a posicionar desde el header -->
  <button v-if="canInstall" class="install-btn" @click="install">
    Instalar
  </button>
</template>

<style scoped>
.install-btn {
  background: #633266;          /* violeta Nura */
  color: #ffffff;
  border: none;
  border-radius: 999px;         /* súper redondo */
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
  background: #50bdbd;          /* verde Nura */
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(80, 189, 189, 0.45);
}

.install-btn:active {
  transform: translateY(0);
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.3);
}
</style>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'


const deferredPrompt = ref<any>(null)
const canInstall = ref(false)


function checkInstalled() {
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
|| (window as any).navigator.standalone === true // iOS
return isStandalone
}


function onBeforeInstallPrompt(e: any) {
e.preventDefault()
deferredPrompt.value = e
// Mostrar botón solo si NO está instalada y estamos en desktop/web
canInstall.value = !checkInstalled() && !/iphone|ipad|ipod|android/i.test(navigator.userAgent)
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


function onAppInstalled() { canInstall.value = false }


onMounted(() => {
window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
window.addEventListener('appinstalled', onAppInstalled)
canInstall.value = !checkInstalled() && !/iphone|ipad|ipod|android/i.test(navigator.userAgent)
})


onBeforeUnmount(() => {
window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
window.removeEventListener('appinstalled', onAppInstalled)
})
</script>


<template>
<button v-if="canInstall" class="install-btn" @click="install">Instalar</button>
</template>


<style scoped>
.install-btn{ padding:.6rem 1rem;border-radius:10px; box-shadow:0 6px 16px rgba(0,0,0,.2); font-weight:600 }
</style>
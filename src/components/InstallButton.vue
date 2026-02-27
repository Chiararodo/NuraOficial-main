<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)

// UI state
const showInstallBtn = ref(false) // muestra el botón (si NO está instalada y es pantalla chica)
const showHelpModal = ref(false)  // modal (solo en pantalla chica)
const isIOS = ref(false)

//  Solo mobile/tablet (ajustá el valor si querés)
const MAX_WIDTH_FOR_INSTALL_UI = 1024
let mqSmall: MediaQueryList | null = null

function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true // iOS standalone
  )
}

function isIOSDevice() {
  const ua = navigator.userAgent.toLowerCase()
  const isiOS = /iphone|ipad|ipod/.test(ua)
  const isIPadOS =
    navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1
  return isiOS || isIPadOS
}

function isSmallScreen() {
  // matchMedia es mejor que window.innerWidth (responde a cambios reales)
  return window.matchMedia(`(max-width: ${MAX_WIDTH_FOR_INSTALL_UI}px)`).matches
}

function refreshVisibility() {
  const installed = isInstalled()
  isIOS.value = isIOSDevice()
  const small = isSmallScreen()

  //  Botón visible SOLO si:
  // - NO está instalada
  // - es pantalla chica
  showInstallBtn.value = !installed && small

  //  Si no es pantalla chica, cerramos UI de instalación
  if (!small) {
    showHelpModal.value = false
  }

  //  Si se instaló, cerramos todo
  if (installed) {
    showHelpModal.value = false
    deferredPrompt.value = null
  }
}

function onBeforeInstallPrompt(e: Event) {
  // Chrome/Edge/Android: capturamos el evento y habilitamos instalación
  e.preventDefault()
  deferredPrompt.value = e as BeforeInstallPromptEvent
  refreshVisibility()
}

function onAppInstalled() {
  deferredPrompt.value = null
  showHelpModal.value = false
  refreshVisibility()
}

async function handleInstallClick() {
  //  Si no es pantalla chica, no hacemos nada
  if (!isSmallScreen()) return

  // iOS: siempre modal
  if (isIOS.value) {
    showHelpModal.value = true
    return
  }

  // Android/otros: si tenemos prompt nativo, lo usamos
  if (deferredPrompt.value) {
    await deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice

    if (outcome === 'accepted') {
      deferredPrompt.value = null
      refreshVisibility()
    }
    return
  }

  // Fallback
  showHelpModal.value = true
}

function closeModal() {
  showHelpModal.value = false
}

// listeners
let mmDisplayMode: MediaQueryList | null = null

function onDisplayModeChange() {
  refreshVisibility()
}

function onSmallScreenChange() {
  refreshVisibility()
}

onMounted(() => {
  refreshVisibility()

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as any)
  window.addEventListener('appinstalled', onAppInstalled)

  // Mejor que resize: escucha cambios reales
  mmDisplayMode = window.matchMedia('(display-mode: standalone)')
  if ('addEventListener' in mmDisplayMode) mmDisplayMode.addEventListener('change', onDisplayModeChange)
  else (mmDisplayMode as any).addListener(onDisplayModeChange)

  //  escucha cambios de tamaño/rotación con media query
  mqSmall = window.matchMedia(`(max-width: ${MAX_WIDTH_FOR_INSTALL_UI}px)`)
  if ('addEventListener' in mqSmall) mqSmall.addEventListener('change', onSmallScreenChange)
  else (mqSmall as any).addListener(onSmallScreenChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as any)
  window.removeEventListener('appinstalled', onAppInstalled)

  if (mmDisplayMode) {
    if ('removeEventListener' in mmDisplayMode) mmDisplayMode.removeEventListener('change', onDisplayModeChange)
    else (mmDisplayMode as any).removeListener(onDisplayModeChange)
  }

  if (mqSmall) {
    if ('removeEventListener' in mqSmall) mqSmall.removeEventListener('change', onSmallScreenChange)
    else (mqSmall as any).removeListener(onSmallScreenChange)
  }
})
</script>

<template>
  <!-- Botón: solo pantalla chica + NO instalada -->
  <button
    v-if="showInstallBtn"
    class="install-btn"
    type="button"
    @click="handleInstallClick"
  >
    {{ isIOS ? 'Agregar a inicio' : 'Instalar' }}
  </button>

  <!-- Modal instrucciones (solo si está abierto; en desktop se fuerza cerrado por refreshVisibility) -->
  <div
    v-if="showHelpModal"
    class="install-modal-backdrop"
    @click.self="closeModal"
  >
    <div class="install-modal">
      <button
        class="install-modal-close"
        type="button"
        @click="closeModal"
        aria-label="Cerrar"
      >
        ✕
      </button>

      <h3 class="install-modal-title">
        {{ isIOS ? 'Agregar Nura al inicio' : 'Instalar Nura' }}
      </h3>

      <div v-if="isIOS" class="install-modal-body">
        <p>Seguí estos pasos:</p>
        <ol>
          <li>Tocá el botón <b>Compartir</b> (cuadradito con flecha).</li>
          <li>Elegí <b>“Agregar a pantalla de inicio”</b>.</li>
          <li>Confirmá con <b>Agregar</b>.</li>
        </ol>
        <p class="install-modal-tip">
          Tip: si no ves la opción, asegurate de estar en <b>Safari</b>.
        </p>
      </div>

      <div v-else class="install-modal-body">
        <p>
          Tu navegador no habilitó el instalador automático. Probá esto:
        </p>
        <ol>
          <li>Abrí el menú ⋮ del navegador.</li>
          <li>Elegí <b>“Instalar app”</b> o <b>“Agregar a pantalla de inicio”</b>.</li>
        </ol>
      </div>

      <div class="install-modal-actions">
        <button class="install-modal-ok" type="button" @click="closeModal">
          Listo
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.install-btn {
  position: fixed;
  bottom: 88px;
  left: 16px;
  z-index: 40;

  background: #633266;
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 8px 18px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;

  box-shadow: 0 8px 20px rgba(99, 50, 102, 0.35);
  transition:
    background-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.install-btn:hover {
  background: #50bdbd;
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.45);
}

.install-btn:active {
  transform: translateY(0);
  box-shadow: 0 8px 18px rgba(80, 189, 189, 0.3);
}

/* Modal */
.install-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  padding: 16px;
}

.install-modal {
  width: min(520px, 100%);
  background: #ffffff;
  border-radius: 18px;
  padding: 16px 16px 14px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
  position: relative;
}

.install-modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
}

.install-modal-title {
  margin: 4px 0 10px;
  font-size: 1.05rem;
  font-weight: 800;
  color: #1f1f1f;
}

.install-modal-body {
  font-size: 0.95rem;
  color: #2b2b2b;
  line-height: 1.35;
}

.install-modal-body ol {
  margin: 10px 0 10px 18px;
}

.install-modal-tip {
  margin-top: 10px;
  font-size: 0.9rem;
  color: #5a5a5a;
}

.install-modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.install-modal-ok {
  background: #50bdbd;
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  font-weight: 800;
  cursor: pointer;
}
</style>
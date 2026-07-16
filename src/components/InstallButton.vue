<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)

const isIOS = ref(false)
const isInstalled = ref(false)
const isSmallScreen = ref(false)

const showHelpModal = ref(false)
const installing = ref(false)
const dismissed = ref(false)

const MAX_WIDTH = 1024

let screenMediaQuery: MediaQueryList | null = null
let displayModeMediaQuery: MediaQueryList | null = null

const showInstallBanner = computed(() => {
  return (
    !isInstalled.value &&
    isSmallScreen.value &&
    !dismissed.value
  )
})

const installButtonText = computed(() => {
  if (installing.value) return 'Abriendo…'
  if (isIOS.value) return 'Agregar a inicio'
  return 'Instalar'
})

const installDescription = computed(() => {
  if (isIOS.value) {
    return 'Agregá Nura a tu pantalla de inicio.'
  }

  if (deferredPrompt.value) {
    return 'Instalá Nura para abrirla más rápido.'
  }

  return 'Guardá Nura como una app.'
})

function detectInstalledMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & {
      standalone?: boolean
    }).standalone === true
  )
}

function detectIOS() {
  const userAgent = navigator.userAgent.toLowerCase()

  const regularIOS = /iphone|ipad|ipod/.test(userAgent)

  const iPadOS =
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1

  return regularIOS || iPadOS
}

function refreshState() {
  isIOS.value = detectIOS()
  isInstalled.value = detectInstalledMode()
  isSmallScreen.value = window.matchMedia(
    `(max-width: ${MAX_WIDTH}px)`
  ).matches

  if (isInstalled.value) {
    deferredPrompt.value = null
    showHelpModal.value = false
    dismissed.value = true
  }

  if (!isSmallScreen.value) {
    showHelpModal.value = false
  }
}

function handleBeforeInstallPrompt(event: Event) {
  event.preventDefault()

  deferredPrompt.value =
    event as BeforeInstallPromptEvent

  dismissed.value = false
  refreshState()
}

function handleAppInstalled() {
  deferredPrompt.value = null
  installing.value = false
  isInstalled.value = true
  showHelpModal.value = false
  dismissed.value = true
}

async function handleInstallClick() {
  if (installing.value) return

  /*
   * iOS no ofrece el prompt automático.
   * Mostramos instrucciones.
   */
  if (isIOS.value) {
    showHelpModal.value = true
    return
  }

  /*
   * Chrome, Edge, Samsung Internet, etc.
   * Si el navegador emitió beforeinstallprompt,
   * abrimos el instalador directamente.
   */
  if (deferredPrompt.value) {
    installing.value = true

    try {
      await deferredPrompt.value.prompt()

      const choice =
        await deferredPrompt.value.userChoice

      if (choice.outcome === 'accepted') {
        deferredPrompt.value = null
        dismissed.value = true
      }
    } catch (error) {
      console.error(
        'No se pudo abrir el instalador:',
        error
      )

      showHelpModal.value = true
    } finally {
      installing.value = false
      refreshState()
    }

    return
  }

  /*
   * Si todavía no llegó el evento o el navegador
   * no lo soporta, mostramos ayuda.
   */
  showHelpModal.value = true
}

function dismissBanner() {
  dismissed.value = true
}

function closeModal() {
  showHelpModal.value = false
}

function handleScreenChange() {
  refreshState()
}

function handleDisplayModeChange() {
  refreshState()
}

onMounted(() => {
  refreshState()

  window.addEventListener(
    'beforeinstallprompt',
    handleBeforeInstallPrompt
  )

  window.addEventListener(
    'appinstalled',
    handleAppInstalled
  )

  screenMediaQuery = window.matchMedia(
    `(max-width: ${MAX_WIDTH}px)`
  )

  displayModeMediaQuery = window.matchMedia(
    '(display-mode: standalone)'
  )

  screenMediaQuery.addEventListener(
    'change',
    handleScreenChange
  )

  displayModeMediaQuery.addEventListener(
    'change',
    handleDisplayModeChange
  )
})

onBeforeUnmount(() => {
  window.removeEventListener(
    'beforeinstallprompt',
    handleBeforeInstallPrompt
  )

  window.removeEventListener(
    'appinstalled',
    handleAppInstalled
  )

  screenMediaQuery?.removeEventListener(
    'change',
    handleScreenChange
  )

  displayModeMediaQuery?.removeEventListener(
    'change',
    handleDisplayModeChange
  )
})
</script>

<template>
  <Transition name="install-slide">
    <aside
      v-if="showInstallBanner"
      class="install-banner"
      aria-label="Instalar la aplicación Nura"
    >
     <div class="install-banner__icon" aria-hidden="true">
  <img
    src="/icons/NuriBienvenida.png"
    alt="Nuri"
  />
</div>

      <div class="install-banner__copy">
        <strong>Instalá Nura</strong>
        <span>{{ installDescription }}</span>
      </div>

      <button
        class="install-banner__action"
        type="button"
        :disabled="installing"
        @click="handleInstallClick"
      >
        {{ installButtonText }}
      </button>

      <button
        class="install-banner__close"
        type="button"
        aria-label="Ocultar aviso de instalación"
        @click="dismissBanner"
      >
        ×
      </button>
    </aside>
  </Transition>

  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="showHelpModal"
        class="install-modal-backdrop"
        @click.self="closeModal"
      >
        <section
          class="install-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-modal-title"
        >
          <button
            class="install-modal__close"
            type="button"
            aria-label="Cerrar"
            @click="closeModal"
          >
            ×
          </button>

          <div class="install-modal__icon" aria-hidden="true">
  <img
    src="/icons/NuriBienvenida.png"
    alt="Nuri"
  />
</div>

          <h2
            id="install-modal-title"
            class="install-modal__title"
          >
            {{
              isIOS
                ? 'Agregar Nura al inicio'
                : 'Instalar Nura'
            }}
          </h2>

          <div
            v-if="isIOS"
            class="install-modal__body"
          >
            <p>
              Para usar Nura como una aplicación:
            </p>

            <ol>
              <li>
                Abrí esta página desde
                <strong>Safari</strong>.
              </li>

              <li>
                Tocá el botón
                <strong>Compartir</strong>.
              </li>

              <li>
                Elegí
                <strong>
                  Agregar a pantalla de inicio
                </strong>.
              </li>

              <li>
                Confirmá tocando
                <strong>Agregar</strong>.
              </li>
            </ol>
          </div>

          <div
            v-else
            class="install-modal__body"
          >
            <p>
              El instalador automático todavía no está
              disponible en este navegador.
            </p>

            <ol>
              <li>
                Abrí el menú del navegador
                <strong>⋮</strong>.
              </li>

              <li>
                Elegí
                <strong>Instalar aplicación</strong>
                o
                <strong>
                  Agregar a pantalla de inicio
                </strong>.
              </li>
            </ol>
          </div>

          <button
            class="install-modal__ok"
            type="button"
            @click="closeModal"
          >
            Entendido
          </button>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* =====================================================
   BANNER DE INSTALACIÓN
===================================================== */

.install-banner {
  position: fixed;
  left: 10px;
  bottom: calc(74px + env(safe-area-inset-bottom));
  z-index: 55;
  width: min(230px, calc(100vw - 20px));
  min-height: 52px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 7px 32px 7px 8px;
  border: 1px solid rgba(80, 189, 189, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow:
    0 10px 26px rgba(15, 23, 42, 0.12),
    0 2px 8px rgba(15, 23, 42, 0.06);
}

.install-banner__icon {
  width: 38px;
  height: 38px;

  display: grid;
  place-items: center;

  overflow: hidden;

  border-radius: 50%;
  background: rgba(216, 240, 236, 0.76);
}

.install-banner__icon img {
  width: 34px;
  height: 34px;

  display: block;
  object-fit: contain;

  animation: nuri-install-float 2.8s ease-in-out infinite;
}

.install-banner__copy {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.install-banner__copy strong {
  color: #0f172a;
  font-size: 0.72rem;
  line-height: 1.15;
}

.install-banner__copy span {
  overflow: hidden;

  color: #475569;
  font-size: 0.58rem;
  line-height: 1.25;

  white-space: nowrap;
  text-overflow: ellipsis;
}

.install-banner__action {
  min-height: 28px;
  padding: 5px 10px;

  border: none;
  border-radius: 999px;

  background: #50bdbd;
  color: #fff;

  font-size: 0.64rem;
  font-weight: 700;
  line-height: 1;

  cursor: pointer;
}

.install-banner__close {
  position: absolute;
  top: 3px;
  right: 4px;

  width: 22px;
  height: 22px;

  display: grid;
  place-items: center;

  padding: 0;
  border: none;
  border-radius: 50%;

  background: transparent;
  color: #64748b;

  font-size: 1rem;
  cursor: pointer;
}

@keyframes nuri-install-float {
  0%,
  100% {
    transform: translateY(0) rotate(0);
  }

  50% {
    transform: translateY(-3px) rotate(-2deg);
  }
}

/* =====================================================
   MODAL
===================================================== */

.install-modal-backdrop {
  position: fixed;
  inset: 0;

  z-index: 2000;

  display: grid;
  place-items: center;

  padding: 16px;

  background: rgba(15, 23, 42, 0.52);

  backdrop-filter: blur(4px);
}

.install-modal {
  position: relative;

  width: min(430px, 100%);

  padding: 24px;

  border: 1px solid #e2edf7;
  border-radius: 22px;

  background: #ffffff;

  box-shadow: 0 22px 60px rgba(15, 23, 42, 0.24);
}

.install-modal__close {
  position: absolute;
  top: 10px;
  right: 10px;

  width: 32px;
  height: 32px;

  display: grid;
  place-items: center;

  padding: 0;

  border: none;
  border-radius: 50%;

  background: #f1f5f9;
  color: #475569;

  font-size: 1.2rem;
  line-height: 1;

  cursor: pointer;
}

.install-modal__icon {
  width: 54px;
  height: 54px;

  display: grid;
  place-items: center;

  margin-bottom: 14px;

  overflow: hidden;
  border-radius: 18px;

  background: #dff7f4;
}

.install-modal__icon img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.install-modal__title {
  margin: 0 36px 10px 0;

  color: #0f172a;

  font-size: 1.2rem;
  font-weight: 800;
}

.install-modal__body {
  color: #475569;

  font-size: 0.87rem;
  line-height: 1.55;
}

.install-modal__body p {
  margin: 0 0 12px;
}

.install-modal__body ol {
  margin: 0;
  padding-left: 20px;
}

.install-modal__body li + li {
  margin-top: 8px;
}

.install-modal__body strong {
  color: #0f172a;
}

.install-modal__ok {
  min-height: 36px;

  margin-top: 20px;
  padding: 8px 16px;

  border: none;
  border-radius: 999px;

  background: #50bdbd;
  color: #ffffff;

  font-size: 0.8rem;
  font-weight: 700;

  cursor: pointer;
}

/* =====================================================
   TRANSICIONES
===================================================== */

.install-slide-enter-active,
.install-slide-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.install-slide-enter-from,
.install-slide-leave-to {
  opacity: 0;
  transform: translateY(18px);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* =====================================================
   RESPONSIVE
===================================================== */

@media (max-width: 520px) {
  .install-banner {
    right: auto;
    left: 8px;
    bottom: calc(72px + env(safe-area-inset-bottom));

    width: min(220px, calc(100vw - 16px));
    min-height: 50px;

    padding: 7px 30px 7px 7px;

    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 6px;

    border-radius: 14px;
  }

  .install-banner__icon {
    width: 34px;
    height: 34px;
  }

  .install-banner__icon img {
    width: 31px;
    height: 31px;
  }

  .install-banner__copy strong {
    font-size: 0.7rem;
  }

  .install-banner__copy span {
    font-size: 0.55rem;
  }

  .install-banner__action {
    min-height: 27px;
    padding: 5px 8px;
    font-size: 0.61rem;
  }
}

@media (max-width: 360px) {
  .install-banner {
    width: min(210px, calc(100vw - 16px));
    left: 8px;

    grid-template-columns: 34px minmax(0, 1fr);
    gap: 6px;
  }

  .install-banner__icon {
    width: 34px;
    height: 34px;
  }

  .install-banner__icon img {
    width: 30px;
    height: 30px;
  }

  .install-banner__action {
    grid-column: 2;
    justify-self: start;

    min-height: 26px;
    padding: 5px 9px;
  }

  .install-banner__copy span {
    display: none;
  }
}

/* Accesibilidad: desactiva animaciones si el usuario lo pidió */
@media (prefers-reduced-motion: reduce) {
  .install-banner,
  .install-banner *,
  .install-modal,
  .install-modal * {
    transition: none !important;
  }
}
</style>